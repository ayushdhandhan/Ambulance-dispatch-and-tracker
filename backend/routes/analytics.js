const express = require('express');
const db = require('../db');

const router = express.Router();

router.get('/overview', async (_req, res) => {
  try {
    const [
      ambulanceCounts,
      emergencyCounts,
      activeTrackingCounts,
      avgResponse,
      regionFrequency,
    ] = await Promise.all([
      db.query(`
        SELECT
          COUNT(*) FILTER (WHERE status = 'AVAILABLE') as available,
          COUNT(*) FILTER (WHERE status IN ('DISPATCHED', 'EN_ROUTE')) as active,
          COUNT(*) as total
        FROM ambulances
      `),
      db.query(`
        SELECT
          COUNT(*) FILTER (WHERE status = 'PENDING') as pending,
          COUNT(*) FILTER (WHERE status = 'DISPATCHED') as dispatched,
          COUNT(*) FILTER (WHERE status = 'RESOLVED') as resolved,
          COUNT(*) as total
        FROM emergencies
      `),
      db.query(`
        SELECT COUNT(*) as active_tracking
        FROM tracking_sessions
        WHERE status = 'ACTIVE'
      `),
      db.query(`
        SELECT AVG(EXTRACT(EPOCH FROM (resolved_at - dispatch_time))) as avg_response_seconds
        FROM emergencies
        WHERE dispatch_time IS NOT NULL AND resolved_at IS NOT NULL
      `),
      db.query(`
        SELECT
          CASE
            WHEN ST_Y(location) < 18.98 THEN 'South Mumbai'
            WHEN ST_X(location) >= 72.88 THEN 'Navi Mumbai'
            WHEN ST_Y(location) <= 19.06 THEN 'Central Mumbai'
            ELSE 'Western Suburbs'
          END as region,
          COUNT(*) as total
        FROM emergencies
        GROUP BY 1
        ORDER BY total DESC, region
      `),
    ]);

    res.json({
      ambulances: ambulanceCounts.rows[0],
      emergencies: emergencyCounts.rows[0],
      tracking: activeTrackingCounts.rows[0],
      avg_response_seconds: Number(avgResponse.rows[0].avg_response_seconds || 0),
      emergency_frequency_by_region: regionFrequency.rows.map((row) => ({
        region: row.region,
        total: Number(row.total),
      })),
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
