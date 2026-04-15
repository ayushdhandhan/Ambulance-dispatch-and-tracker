const db = require('./db');
const { sendSMS } = require('./services/twilio');

const startScheduler = () => {
  // Run every 2.5 minutes = 150000 ms
  setInterval(async () => {
    try {
      console.log('[Scheduler] Running periodic SMS location updates...');
      // Fetch active dispatches with known customer phones
      const { rows } = await db.query(`
        SELECT 
          e.id as emergency_id, e.customer_phone, 
          a.id as ambulance_id, a.license_plate, a.driver_name, a.driver_phone, 
          ST_X(a.current_location) as lng, ST_Y(a.current_location) as lat
        FROM emergencies e
        JOIN ambulances a ON e.assigned_ambulance_id = a.id
        WHERE e.status = 'DISPATCHED' AND e.customer_phone IS NOT NULL AND a.status = 'EN_ROUTE'
      `);

      for (const dispatch of rows) {
        if (!dispatch.customer_phone) continue;
        
        const mapsLink = `https://www.google.com/maps?q=${dispatch.lat},${dispatch.lng}`;
        const message = `Ambulance Update 🚑\nDriver ${dispatch.driver_name} is on the way\nTrack: ${mapsLink}\nCall: ${dispatch.driver_phone}`;
        
        await sendSMS(dispatch.customer_phone, message);
      }
    } catch (err) {
      console.error('[Scheduler] Error running update loop:', err);
    }
  }, 150000); // 2.5 minutes
};

module.exports = { startScheduler };
