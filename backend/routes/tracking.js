const express = require('express');
const db = require('../db');
const { attachRegion } = require('../utils/regions');

const router = express.Router();

router.get('/active', async (req, res) => {
  try {
    const { rows } = await db.query(`
      SELECT
        ts.id,
        ts.token,
        ts.status,
        ts.customer_phone,
        ts.created_at,
        ts.last_location_at,
        ts.last_sms_sent_at,
        e.id as emergency_id,
        e.priority,
        e.description,
        ST_X(e.location) as emergency_lng,
        ST_Y(e.location) as emergency_lat,
        a.id as ambulance_id,
        a.license_plate,
        a.driver_name,
        a.driver_phone,
        a.status as ambulance_status,
        ST_X(a.current_location) as ambulance_lng,
        ST_Y(a.current_location) as ambulance_lat
      FROM tracking_sessions ts
      JOIN emergencies e ON e.id = ts.emergency_id
      JOIN ambulances a ON a.id = ts.ambulance_id
      WHERE ts.status = 'ACTIVE'
      ORDER BY ts.created_at DESC
    `);

    res.json(rows.map((row) => ({
      ...row,
      emergency_region: attachRegion({ lat: row.emergency_lat, lng: row.emergency_lng }).region,
      ambulance_region: attachRegion({ lat: row.ambulance_lat, lng: row.ambulance_lng }).region,
    })));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

router.get('/:token', async (req, res) => {
  try {
    const { rows } = await db.query(`
      SELECT
        ts.id,
        ts.token,
        ts.status,
        ts.customer_phone,
        ts.created_at,
        ts.completed_at,
        ts.last_location_at,
        ts.last_sms_sent_at,
        ST_X(ts.last_known_location) as tracking_lng,
        ST_Y(ts.last_known_location) as tracking_lat,
        e.id as emergency_id,
        e.priority,
        e.description,
        e.status as emergency_status,
        e.dispatch_time,
        e.resolved_at,
        ST_X(e.location) as emergency_lng,
        ST_Y(e.location) as emergency_lat,
        a.id as ambulance_id,
        a.license_plate,
        a.driver_name,
        a.driver_phone,
        a.status as ambulance_status,
        ST_X(a.current_location) as ambulance_lng,
        ST_Y(a.current_location) as ambulance_lat,
        r.geometry as route_geometry,
        r.distance_m,
        r.duration_s
      FROM tracking_sessions ts
      JOIN emergencies e ON e.id = ts.emergency_id
      JOIN ambulances a ON a.id = ts.ambulance_id
      LEFT JOIN routes r ON r.emergency_id = e.id AND r.ambulance_id = a.id
      WHERE ts.token = $1
      ORDER BY r.updated_at DESC NULLS LAST
      LIMIT 1
    `, [req.params.token]);

    if (rows.length === 0) {
      return res.status(404).json({ error: 'Tracking session not found' });
    }

    const row = rows[0];
    res.json({
      id: row.id,
      token: row.token,
      status: row.status,
      customer_phone: row.customer_phone,
      created_at: row.created_at,
      completed_at: row.completed_at,
      last_location_at: row.last_location_at,
      last_sms_sent_at: row.last_sms_sent_at,
      tracking_point: attachRegion({
        lat: row.tracking_lat ?? row.ambulance_lat,
        lng: row.tracking_lng ?? row.ambulance_lng,
      }),
      emergency: attachRegion({
        id: row.emergency_id,
        priority: row.priority,
        description: row.description,
        status: row.emergency_status,
        dispatch_time: row.dispatch_time,
        resolved_at: row.resolved_at,
        lat: row.emergency_lat,
        lng: row.emergency_lng,
      }),
      ambulance: attachRegion({
        id: row.ambulance_id,
        license_plate: row.license_plate,
        driver_name: row.driver_name,
        driver_phone: row.driver_phone,
        status: row.ambulance_status,
        lat: row.ambulance_lat,
        lng: row.ambulance_lng,
      }),
      route: Array.isArray(row.route_geometry) ? row.route_geometry : [],
      distance_m: row.distance_m,
      duration_s: row.duration_s,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
