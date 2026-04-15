require('dotenv').config();
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const db = require('./db');
const { ensureSchema } = require('./bootstrap');
const { startScheduler } = require('./scheduler');

const app = express();
app.use(cors());
app.use(express.json());

app.use('/api/auth', require('./routes/auth'));
app.use('/api/emergencies', require('./routes/emergencies'));
app.use('/api/ambulances', require('./routes/ambulances'));
app.use('/api/analytics', require('./routes/analytics'));
app.use('/api/hospitals', require('./routes/hospitals'));
app.use('/api/signals', require('./routes/signals'));
app.use('/api/tracking', require('./routes/tracking'));
app.get('/api/health', (_req, res) => res.json({ ok: true }));

const server = http.createServer(app);
const io = new Server(server, { cors: { origin: '*' } });
app.set('io', io);

io.on('connection', (socket) => {
  console.log('Client connected:', socket.id);

  socket.on('ambulance:update', async (data) => {
    try {
      const latitude = Number(data.lat);
      const longitude = Number(data.lng);
      const speed = Number.isFinite(Number(data.speed)) ? Number(data.speed) : null;
      const status = data.status || 'EN_ROUTE';

      if (!data.id || !Number.isFinite(latitude) || !Number.isFinite(longitude)) {
        return;
      }

      await db.query(`
        UPDATE ambulances
        SET current_location = ST_SetSRID(ST_MakePoint($1, $2), 4326), status = $3, last_updated = CURRENT_TIMESTAMP
        WHERE id = $4
      `, [longitude, latitude, status, data.id]);

      await db.query(`
        INSERT INTO gps_logs (ambulance_id, location, speed, status)
        VALUES ($1, ST_SetSRID(ST_MakePoint($2, $3), 4326), $4, $5)
      `, [data.id, longitude, latitude, speed, status]);

      const { rows: trackingRows } = await db.query(`
        UPDATE tracking_sessions
        SET last_known_location = ST_SetSRID(ST_MakePoint($1, $2), 4326), last_location_at = CURRENT_TIMESTAMP
        WHERE ambulance_id = $3 AND status = 'ACTIVE'
        RETURNING token
      `, [longitude, latitude, data.id]);

      io.emit('ambulance:location', {
        ...data,
        lat: latitude,
        lng: longitude,
        status,
      });

      if (trackingRows.length > 0) {
        io.emit('tracking:update', {
          ambulance_id: data.id,
          lat: latitude,
          lng: longitude,
          status,
          tokens: trackingRows.map((row) => row.token),
          timestamp: new Date().toISOString(),
        });
      }
    } catch (e) {
      console.error('Update ambulance error:', e);
    }
  });

  socket.on('ambulance:route', async (data) => {
    try {
      if (!data.ambulance_id || !data.emergency_id || !Array.isArray(data.geometry)) {
        return;
      }

      await db.query(`
        INSERT INTO routes (emergency_id, ambulance_id, stage, geometry, distance_m, duration_s, updated_at)
        VALUES ($1, $2, 'TO_EMERGENCY', $3::jsonb, $4, $5, CURRENT_TIMESTAMP)
        ON CONFLICT (emergency_id, ambulance_id, stage)
        DO UPDATE SET
          geometry = EXCLUDED.geometry,
          distance_m = EXCLUDED.distance_m,
          duration_s = EXCLUDED.duration_s,
          updated_at = CURRENT_TIMESTAMP
      `, [
        data.emergency_id,
        data.ambulance_id,
        JSON.stringify(data.geometry),
        data.distance_m ?? null,
        data.duration_s ?? null,
      ]);

      await db.query(`
        UPDATE ambulances
        SET status = 'EN_ROUTE', last_updated = CURRENT_TIMESTAMP
        WHERE id = $1
      `, [data.ambulance_id]);

      io.emit('ambulance:route', data);
    } catch (e) {
      console.error('Route update error:', e);
    }
  });

  socket.on('dispatch:arrived', async (data) => {
    try {
      if (!data.ambulance_id || !data.emergency_id) {
        return;
      }

      await db.query(`
        UPDATE emergencies
        SET status = 'RESOLVED', resolved_at = CURRENT_TIMESTAMP
        WHERE id = $1
      `, [data.emergency_id]);

      await db.query(`
        UPDATE ambulances
        SET status = 'AVAILABLE', current_emergency_id = NULL, last_updated = CURRENT_TIMESTAMP
        WHERE id = $1
      `, [data.ambulance_id]);

      await db.query(`
        UPDATE tracking_sessions
        SET status = 'COMPLETED', completed_at = CURRENT_TIMESTAMP
        WHERE emergency_id = $1 AND ambulance_id = $2 AND status = 'ACTIVE'
      `, [data.emergency_id, data.ambulance_id]);

      io.emit('dispatch:status', {
        emergency_id: data.emergency_id,
        ambulance_id: data.ambulance_id,
        status: 'COMPLETED',
      });
    } catch (e) {
      console.error('Dispatch completion error:', e);
    }
  });

  socket.on('signal:update', async (data) => {
    try {
      await db.query(`
        UPDATE signals
        SET current_state = $1, last_updated = CURRENT_TIMESTAMP
        WHERE id = $2
      `, [data.state, data.id]);
      
      io.emit('signal:state', data);
    } catch (e) {
      console.error('Update signal error:', e);
    }
  });

  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
  });
});

const PORT = process.env.PORT || 3000;
const start = async () => {
  await ensureSchema();

  server.listen(PORT, () => {
    console.log(`Server listening on port ${PORT}`);
    startScheduler();
  });
};

start().catch((error) => {
  console.error('Failed to start backend:', error);
  process.exit(1);
});
