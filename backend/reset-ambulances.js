const db = require('./db');

(async () => {
  try {
    const res = await db.query('UPDATE ambulances SET status = $1, current_emergency_id = NULL;', ['AVAILABLE']);
    console.log('✓ Updated', res.rowCount, 'ambulances to AVAILABLE status');
    process.exit(0);
  } catch (e) {
    console.error('Error:', e.message);
    process.exit(1);
  }
})();
