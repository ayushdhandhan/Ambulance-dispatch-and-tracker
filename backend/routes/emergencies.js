const express = require('express');
const crypto = require('crypto');
const db = require('../db');
const { sendSMS } = require('../services/twilio');
const { normalizeIndianPhone } = require('../utils/phone');
const { attachRegion } = require('../utils/regions');

const router = express.Router();

router.get('/', async (req, res) => {
  try {
    const { rows } = await db.query(`
      SELECT id, priority, description, ST_X(location) as lng, ST_Y(location) as lat, status, created_at, assigned_ambulance_id
      FROM emergencies
      ORDER BY created_at DESC
    `);
    const items = rows.map((row) => attachRegion(row));
    const { region } = req.query;
    res.json(region ? items.filter((item) => item.region === region) : items);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

router.post('/', async (req, res) => {
  const { priority = 'HIGH', description = 'Simulated Emergency', lat, lng } = req.body;
  const latitude = Number(lat);
  const longitude = Number(lng);

  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
    return res.status(400).json({ error: 'Valid latitude and longitude are required' });
  }

  try {
    const { rows } = await db.query(`
      INSERT INTO emergencies (priority, description, location, status)
      VALUES ($1, $2, ST_SetSRID(ST_MakePoint($3, $4), 4326), 'PENDING')
      RETURNING id, priority, description, ST_X(location) as lng, ST_Y(location) as lat, status, created_at
    `, [priority, description, longitude, latitude]);
    res.status(201).json(attachRegion(rows[0]));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

router.post('/dispatch', async (req, res) => {
  const {
    ambulance_id,
    customer_phone,
    lat,
    lng,
    priority = 'HIGH',
    description = 'Manual Dispatch',
  } = req.body;

  const latitude = Number(lat);
  const longitude = Number(lng);
  const normalizedPhone = normalizeIndianPhone(customer_phone);

  if (!ambulance_id) {
    return res.status(400).json({ error: 'ambulance_id is required' });
  }

  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
    return res.status(400).json({ error: 'Valid destination coordinates are required' });
  }

  if (!normalizedPhone) {
    return res.status(400).json({ error: 'customer_phone must be in +91XXXXXXXXXX format' });
  }

  const client = await db.connect();

  try {
    await client.query('BEGIN');

    const { rows: ambRows } = await client.query(`
      SELECT id, license_plate, driver_name, driver_phone, status
      FROM ambulances
      WHERE id = $1
      FOR UPDATE
    `, [ambulance_id]);

    if (ambRows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Ambulance not found' });
    }

    const amb = ambRows[0];
    if (!['AVAILABLE', 'DISPATCHED'].includes(amb.status)) {
      await client.query('ROLLBACK');
      return res.status(409).json({ error: 'Ambulance is not available for dispatch' });
    }

    const { rows } = await client.query(`
      INSERT INTO emergencies (priority, description, location, status, customer_phone, assigned_ambulance_id, dispatch_time)
      VALUES ($1, $2, ST_SetSRID(ST_MakePoint($3, $4), 4326), 'DISPATCHED', $5, $6, CURRENT_TIMESTAMP)
      RETURNING id, priority, description, ST_X(location) as lng, ST_Y(location) as lat, status, created_at, dispatch_time
    `, [priority, description, longitude, latitude, normalizedPhone, ambulance_id]);

    const emergency = rows[0];
    const trackingToken = crypto.randomUUID().replace(/-/g, '');

    await client.query(`
      INSERT INTO tracking_sessions (
        token,
        emergency_id,
        ambulance_id,
        customer_phone,
        status,
        last_known_location,
        last_location_at
      )
      SELECT
        $1,
        $2,
        $3,
        $4,
        'ACTIVE',
        current_location,
        CURRENT_TIMESTAMP
      FROM ambulances
      WHERE id = $3
    `, [trackingToken, emergency.id, ambulance_id, normalizedPhone]);

    await client.query(`
      UPDATE ambulances
      SET status = 'DISPATCHED', current_emergency_id = $1, last_updated = CURRENT_TIMESTAMP
      WHERE id = $2
    `, [emergency.id, ambulance_id]);

    await client.query('COMMIT');

    const trackingUrl = `${process.env.FRONTEND_BASE_URL || 'http://localhost:5173'}/tracking/${trackingToken}`;
    const message = `Ambulance Assigned 🚑\nDriver: ${amb.driver_name}\nAmbulance: ${amb.license_plate}\nCall: ${amb.driver_phone}\nTrack: ${trackingUrl}`;
    await sendSMS(normalizedPhone, message);

    const io = req.app.get('io');
    if (io) {
      io.emit('dispatch:manual', {
        ambulance_id: Number(ambulance_id),
        emergency_id: emergency.id,
        lat: latitude,
        lng: longitude,
        tracking_token: trackingToken,
      });
      io.emit('dispatch:created', {
        ambulance_id: Number(ambulance_id),
        emergency_id: emergency.id,
        tracking_token: trackingToken,
      });
    }

    res.status(201).json({
      success: true,
      dispatch: attachRegion({ ...emergency, assigned_ambulance_id: Number(ambulance_id) }),
      ambulance_id: Number(ambulance_id),
      tracking: {
        token: trackingToken,
        url: trackingUrl,
        customer_phone: normalizedPhone,
      },
    });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  } finally {
    client.release();
  }
});

module.exports = router;
