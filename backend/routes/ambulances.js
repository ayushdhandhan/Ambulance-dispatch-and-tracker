const express = require('express');
const db = require('../db');

const router = express.Router();

router.get('/', async (req, res) => {
  try {
    const { rows } = await db.query(`
      SELECT id, license_plate, driver_name, driver_phone, status, ST_X(current_location) as lng, ST_Y(current_location) as lat, current_emergency_id
      FROM ambulances
    `);
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
