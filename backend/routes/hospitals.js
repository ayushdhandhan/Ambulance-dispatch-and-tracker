const express = require('express');
const db = require('../db');
const { attachRegion } = require('../utils/regions');

const router = express.Router();

router.get('/', async (req, res) => {
  try {
    const { rows } = await db.query(`
      SELECT id, name, ST_X(location) as lng, ST_Y(location) as lat
      FROM hospitals
      ORDER BY name
    `);

    res.json(rows.map((row) => attachRegion(row)));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
