const express = require('express');
const db = require('../db');

const router = express.Router();
const VALID_STATES = new Set(['RED', 'GREEN', 'YELLOW']);

router.get('/', async (req, res) => {
  try {
    const { rows } = await db.query(`
      SELECT id, name, current_state, override_active, ST_X(location) as lng, ST_Y(location) as lat
      FROM signals
      ORDER BY id
    `);
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

router.post('/override', async (req, res) => {
  const { id, state, override_active = true } = req.body;

  if (!id || !VALID_STATES.has(state)) {
    return res.status(400).json({ error: 'Valid signal id and state are required' });
  }

  try {
    const { rows } = await db.query(`
      UPDATE signals
      SET current_state = $1, override_active = $2, last_updated = CURRENT_TIMESTAMP
      WHERE id = $3
      RETURNING id, name, current_state, override_active, ST_X(location) as lng, ST_Y(location) as lat
    `, [state, Boolean(override_active), id]);

    if (rows.length === 0) {
      return res.status(404).json({ error: 'Signal not found' });
    }

    const io = req.app.get('io');
    if (io) {
      io.emit('signal:state', { id: rows[0].id, state: rows[0].current_state });
    }

    res.json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
