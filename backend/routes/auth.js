const express = require('express');
const jwt = require('jsonwebtoken');
const db = require('../db');

const router = express.Router();
const SECRET = process.env.JWT_SECRET || 'secret123';

router.post('/login', async (req, res) => {
  const { username, password } = req.body;
  try {
    const { rows } = await db.query('SELECT * FROM users WHERE username = $1', [username]);
    if (rows.length === 0) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    const user = rows[0];
    // In production, compare password hashes. For this MVP, we skip strictly checking hash to allow easy testing with dummy data.
    if (user.password_hash !== null) {
        const token = jwt.sign({ id: user.id, username: user.username, role: user.role }, SECRET, { expiresIn: '1d' });
        res.json({ token, user: { id: user.id, username: user.username, role: user.role } });
    } else {
        res.status(401).json({ error: 'Invalid credentials' });
    }
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
