const express = require('express');
const db = require('../db');
const { sendSMS } = require('../services/twilio');

const router = express.Router();

router.get('/', async (req, res) => {
  try {
    const { rows } = await db.query(`
      SELECT id, priority, description, ST_X(location) as lng, ST_Y(location) as lat, status, created_at, assigned_ambulance_id
      FROM emergencies
      ORDER BY created_at DESC
    `);
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

router.post('/', async (req, res) => {
  const { priority, description, lat, lng } = req.body;
  try {
    const { rows } = await db.query(`
      INSERT INTO emergencies (priority, description, location, status)
      VALUES ($1, $2, ST_SetSRID(ST_MakePoint($3, $4), 4326), 'PENDING')
      RETURNING id, priority, description, ST_X(location) as lng, ST_Y(location) as lat, status, created_at
    `, [priority, description, lng, lat]);
    res.json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

router.post('/dispatch', async (req, res) => {
  const { ambulance_id, customer_phone, lat, lng } = req.body;
  try {
    // Get ambulance details for the SMS
    const { rows: ambRows } = await db.query('SELECT license_plate, driver_name FROM ambulances WHERE id = $1', [ambulance_id]);
    if (ambRows.length === 0) return res.status(404).json({ error: 'Ambulance not found' });
    const amb = ambRows[0];

    // Create an emergency record for this manual dispatch
    const { rows } = await db.query(`
      INSERT INTO emergencies (priority, description, location, status, customer_phone, assigned_ambulance_id, dispatch_time)
      VALUES ('HIGH', 'Manual Dispatch', ST_SetSRID(ST_MakePoint($1, $2), 4326), 'DISPATCHED', $3, $4, CURRENT_TIMESTAMP)
      RETURNING id, ST_X(location) as lng, ST_Y(location) as lat
    `, [lng, lat, customer_phone, ambulance_id]);
    
    // Attempt Initial SMS
    const msg = \`Ambulance Assigned 🚑\\nDriver: \${amb.driver_name}\\nAmbulance: \${amb.license_plate}\\nCall: \${customer_phone}\`;
    await sendSMS(customer_phone, msg);

    // Emit event to simulation engine
    const io = req.app.get('io');
    if (io) {
      io.emit('dispatch:manual', {
        ambulance_id,
        lat: parseFloat(lat),
        lng: parseFloat(lng)
      });
    }

    res.json({ success: true, dispatch: rows[0], ambulance_id });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
