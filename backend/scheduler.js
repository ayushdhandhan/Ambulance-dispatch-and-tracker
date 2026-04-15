const db = require('./db');
const { isConfigured, sendSMS } = require('./services/twilio');

const SMS_INTERVAL_MS = 150000;

const startScheduler = () => {
  setInterval(async () => {
    try {
      if (!isConfigured()) {
        return;
      }

      const { rows } = await db.query(`
        SELECT
          ts.id,
          ts.customer_phone,
          a.driver_name,
          a.driver_phone,
          ST_X(COALESCE(ts.last_known_location, a.current_location)) as lng,
          ST_Y(COALESCE(ts.last_known_location, a.current_location)) as lat
        FROM tracking_sessions ts
        JOIN ambulances a ON a.id = ts.ambulance_id
        JOIN emergencies e ON e.id = ts.emergency_id
        WHERE ts.status = 'ACTIVE'
          AND e.status = 'DISPATCHED'
          AND a.status IN ('DISPATCHED', 'EN_ROUTE')
          AND COALESCE(ts.last_known_location, a.current_location) IS NOT NULL
          AND (
            ts.last_sms_sent_at IS NULL
            OR ts.last_sms_sent_at <= CURRENT_TIMESTAMP - INTERVAL '2 minutes'
          )
      `);

      for (const dispatch of rows) {
        const mapsLink = `https://www.google.com/maps?q=${dispatch.lat},${dispatch.lng}`;
        const message = `Ambulance Update 🚑\nDriver ${dispatch.driver_name} is on the way\nTrack: ${mapsLink}\nCall: ${dispatch.driver_phone}`;
        
        const sent = await sendSMS(dispatch.customer_phone, message);

        if (sent) {
          await db.query(`
            UPDATE tracking_sessions
            SET last_sms_sent_at = CURRENT_TIMESTAMP
            WHERE id = $1
          `, [dispatch.id]);
        }
      }
    } catch (err) {
      console.error('[Scheduler] Error running update loop:', err);
    }
  }, SMS_INTERVAL_MS);
};

module.exports = {
  SMS_INTERVAL_MS,
  startScheduler,
};
