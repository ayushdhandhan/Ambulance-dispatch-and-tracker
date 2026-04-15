const express = require('express');
const db = require('../db');
const { attachRegion } = require('../utils/regions');

const router = express.Router();

router.get('/', async (req, res) => {
  try {
    const { rows } = await db.query(`
      SELECT
        a.id,
        a.license_plate,
        a.driver_name,
        a.driver_phone,
        a.status,
        ST_X(a.current_location) as lng,
        ST_Y(a.current_location) as lat,
        a.current_emergency_id,
        a.last_updated,
        ts.token as tracking_token,
        ts.status as tracking_status
      FROM ambulances a
      LEFT JOIN tracking_sessions ts
        ON ts.ambulance_id = a.id AND ts.status = 'ACTIVE'
      ORDER BY a.id
    `);
    const items = rows.map((row) => attachRegion(row));
    const { region } = req.query;
    res.json(region ? items.filter((item) => item.region === region) : items);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const { rows } = await db.query(`
      SELECT
        a.id,
        a.license_plate,
        a.driver_name,
        a.driver_phone,
        a.status,
        ST_X(a.current_location) as lng,
        ST_Y(a.current_location) as lat,
        a.current_emergency_id,
        a.last_updated,
        ts.token as tracking_token,
        ts.status as tracking_status
      FROM ambulances a
      LEFT JOIN tracking_sessions ts
        ON ts.ambulance_id = a.id AND ts.status = 'ACTIVE'
      WHERE a.id = $1
    `, [req.params.id]);

    if (rows.length === 0) {
      return res.status(404).json({ error: 'Ambulance not found' });
    }

    res.json(attachRegion(rows[0]));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

router.get('/:id/route', async (req, res) => {
  try {
    const { rows } = await db.query(`
      SELECT emergency_id, ambulance_id, stage, geometry, distance_m, duration_s, updated_at
      FROM routes
      WHERE ambulance_id = $1
      ORDER BY updated_at DESC
      LIMIT 1
    `, [req.params.id]);

    res.json({ route: rows[0] || null });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
