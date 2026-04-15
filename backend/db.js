const { Pool } = require('pg');

const pool = new Pool({
  user: process.env.DB_USER || 'emergency_user',
  host: process.env.DB_HOST || 'localhost',
  database: process.env.DB_NAME || 'emergency_db',
  password: process.env.DB_PASSWORD || 'password123',
  port: process.env.DB_PORT || 5432,
});

module.exports = {
  query: (text, params) => pool.query(text, params),
};
