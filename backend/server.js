require('dotenv').config();
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const db = require('./db');
const { startScheduler } = require('./scheduler');

const app = express();
app.use(cors());
app.use(express.json());

app.use('/api/auth', require('./routes/auth'));
app.use('/api/emergencies', require('./routes/emergencies'));
app.use('/api/ambulances', require('./routes/ambulances'));
app.use('/api/signals', require('./routes/signals'));

const server = http.createServer(app);
const io = new Server(server, { cors: { origin: '*' } });
app.set('io', io);

io.on('connection', (socket) => {
  console.log('Client connected:', socket.id);

  // Simulation pushes updates
  socket.on('ambulance:update', async (data) => {
    // data: { id, lat, lng, status }
    try {
      await db.query(`
        UPDATE ambulances
        SET current_location = ST_SetSRID(ST_MakePoint($1, $2), 4326), status = $3, last_updated = CURRENT_TIMESTAMP
        WHERE id = $4
      `, [data.lng, data.lat, data.status, data.id]);
      
      // Broadcast to frontend
      io.emit('ambulance:location', data);
    } catch (e) {
      console.error('Update ambulance error:', e);
    }
  });

  socket.on('signal:update', async (data) => {
    // data: { id, state }
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
server.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
  startScheduler();
});
