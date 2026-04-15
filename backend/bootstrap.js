const db = require('./db');
const { hashPassword } = require('./utils/auth');

const DEFAULT_ADMIN_USERNAME = process.env.DEFAULT_ADMIN_USERNAME || 'admin';
const DEFAULT_ADMIN_PASSWORD = process.env.DEFAULT_ADMIN_PASSWORD || 'admin123';

const hospitals = [
  ['Lilavati Hospital', 72.8296, 19.0515],
  ['KEM Hospital', 72.8418, 19.0011],
  ['Jaslok Hospital', 72.8094, 18.9729],
  ['Fortis Mulund', 72.9472, 19.1728],
];

const signals = [
  ['Worli Sea Face Signal', 72.815, 19.015],
  ['Bandra Reclamation Signal', 72.825, 19.045],
  ['Dadar TT Circle', 72.845, 19.015],
  ['Mahim Causeway Signal', 72.835, 19.04],
  ['Sion Circle', 72.86, 19.038],
  ['BKC Junction 1', 72.865, 19.06],
  ['BKC Junction 2', 72.87, 19.062],
  ['Marine Drive Signal', 72.823, 18.94],
  ['Churchgate Signal', 72.827, 18.932],
  ['Colaba Causeway', 72.83, 18.915],
  ['Peddar Road Signal 1', 72.808, 18.968],
  ['Haji Ali Junction', 72.81, 18.977],
  ['Prabhadevi Signal', 72.828, 19.015],
  ['Andheri East Signal', 72.85, 19.115],
  ['Juhu Circle', 72.826, 19.108],
  ['Vile Parle Signal', 72.84, 19.098],
  ['Santacruz Junction', 72.836, 19.083],
  ['Lower Parel Signal', 72.828, 18.995],
];

const ambulances = [
  ['MH-01-AB-1234', 'Ravi Kumar', '+919820000101', 72.835, 19.025],
  ['MH-02-XY-9876', 'Amit Singh', '+919820000102', 72.84, 19.05],
  ['MH-03-ZZ-5555', 'Suresh Patil', '+919820000103', 72.82, 19.01],
  ['MH-01-PQ-1111', 'Rahul Desai', '+919820000104', 72.805, 18.98],
  ['MH-01-PQ-2222', 'Vikas Verma', '+919820000105', 72.825, 18.94],
  ['MH-02-KL-3333', 'Manoj Joshi', '+919820000106', 72.855, 19.11],
  ['MH-02-KL-4444', 'Sanjay Raut', '+919820000107', 72.83, 19.1],
  ['MH-01-EE-5555', 'Rajesh Mehta', '+919820000108', 72.865, 19.06],
  ['MH-02-EE-6666', 'Arjun Pawar', '+919820000109', 72.875, 19.065],
  ['MH-01-TR-7777', 'Rakesh Shah', '+919820000110', 72.845, 19.03],
  ['MH-03-TR-8888', 'Deepak Kadam', '+919820000111', 72.83, 18.92],
  ['MH-03-MM-9999', 'Rohit Sharma', '+919820000112', 72.82, 18.96],
];

const ensureSchema = async () => {
  await db.query('CREATE EXTENSION IF NOT EXISTS postgis');

  await db.query(`
    CREATE TABLE IF NOT EXISTS users (
      id SERIAL PRIMARY KEY,
      username VARCHAR(50) UNIQUE NOT NULL,
      password_hash VARCHAR(255) NOT NULL,
      role VARCHAR(20) NOT NULL CHECK (role IN ('admin', 'operator')),
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await db.query(`
    CREATE TABLE IF NOT EXISTS emergencies (
      id SERIAL PRIMARY KEY,
      priority VARCHAR(20) NOT NULL CHECK (priority IN ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL')),
      description TEXT,
      location GEOMETRY(Point, 4326) NOT NULL,
      status VARCHAR(20) NOT NULL CHECK (status IN ('PENDING', 'DISPATCHED', 'RESOLVED', 'CANCELLED')),
      customer_phone VARCHAR(20),
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      dispatch_time TIMESTAMP,
      resolved_at TIMESTAMP,
      assigned_ambulance_id INTEGER
    )
  `);

  await db.query(`
    CREATE TABLE IF NOT EXISTS ambulances (
      id SERIAL PRIMARY KEY,
      license_plate VARCHAR(20) UNIQUE NOT NULL,
      driver_name VARCHAR(100),
      driver_phone VARCHAR(20),
      status VARCHAR(20) NOT NULL CHECK (status IN ('AVAILABLE', 'DISPATCHED', 'EN_ROUTE', 'AT_HOSPITAL', 'OFF_DUTY')),
      current_location GEOMETRY(Point, 4326),
      current_emergency_id INTEGER,
      last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await db.query(`
    CREATE TABLE IF NOT EXISTS hospitals (
      id SERIAL PRIMARY KEY,
      name VARCHAR(100) UNIQUE NOT NULL,
      location GEOMETRY(Point, 4326) NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await db.query(`
    CREATE TABLE IF NOT EXISTS signals (
      id SERIAL PRIMARY KEY,
      name VARCHAR(100) UNIQUE NOT NULL,
      location GEOMETRY(Point, 4326) NOT NULL,
      current_state VARCHAR(10) NOT NULL CHECK (current_state IN ('RED', 'GREEN', 'YELLOW')),
      override_active BOOLEAN DEFAULT FALSE,
      last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await db.query(`
    CREATE TABLE IF NOT EXISTS gps_logs (
      id BIGSERIAL PRIMARY KEY,
      ambulance_id INTEGER NOT NULL REFERENCES ambulances(id) ON DELETE CASCADE,
      location GEOMETRY(Point, 4326) NOT NULL,
      speed NUMERIC,
      status VARCHAR(20),
      logged_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await db.query(`
    CREATE TABLE IF NOT EXISTS routes (
      id SERIAL PRIMARY KEY,
      emergency_id INTEGER REFERENCES emergencies(id) ON DELETE CASCADE,
      ambulance_id INTEGER REFERENCES ambulances(id) ON DELETE CASCADE,
      stage VARCHAR(20) NOT NULL DEFAULT 'TO_EMERGENCY',
      geometry JSONB NOT NULL DEFAULT '[]'::jsonb,
      distance_m NUMERIC,
      duration_s NUMERIC,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      UNIQUE (emergency_id, ambulance_id, stage)
    )
  `);

  await db.query(`
    CREATE TABLE IF NOT EXISTS tracking_sessions (
      id SERIAL PRIMARY KEY,
      token VARCHAR(64) UNIQUE NOT NULL,
      emergency_id INTEGER UNIQUE REFERENCES emergencies(id) ON DELETE CASCADE,
      ambulance_id INTEGER NOT NULL REFERENCES ambulances(id) ON DELETE CASCADE,
      customer_phone VARCHAR(20) NOT NULL,
      status VARCHAR(20) NOT NULL CHECK (status IN ('ACTIVE', 'COMPLETED', 'CANCELLED')),
      last_known_location GEOMETRY(Point, 4326),
      last_location_at TIMESTAMP,
      last_sms_sent_at TIMESTAMP,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      completed_at TIMESTAMP
    )
  `);

  await db.query('ALTER TABLE emergencies ADD COLUMN IF NOT EXISTS assigned_ambulance_id INTEGER');
  await db.query('ALTER TABLE emergencies ADD COLUMN IF NOT EXISTS customer_phone VARCHAR(20)');
  await db.query('ALTER TABLE emergencies ADD COLUMN IF NOT EXISTS dispatch_time TIMESTAMP');
  await db.query('ALTER TABLE emergencies ADD COLUMN IF NOT EXISTS resolved_at TIMESTAMP');
  await db.query('ALTER TABLE ambulances ADD COLUMN IF NOT EXISTS current_emergency_id INTEGER');
  await db.query('ALTER TABLE ambulances ADD COLUMN IF NOT EXISTS driver_phone VARCHAR(20)');
  await db.query('ALTER TABLE ambulances ADD COLUMN IF NOT EXISTS driver_name VARCHAR(100)');
  await db.query('ALTER TABLE ambulances ADD COLUMN IF NOT EXISTS last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP');
  await db.query('ALTER TABLE signals ADD COLUMN IF NOT EXISTS override_active BOOLEAN DEFAULT FALSE');
  await db.query('CREATE UNIQUE INDEX IF NOT EXISTS signals_name_key ON signals(name)');

  await db.query(`
    DO $$
    BEGIN
      IF NOT EXISTS (
        SELECT 1
        FROM information_schema.table_constraints
        WHERE constraint_name = 'emergencies_assigned_ambulance_fk'
      ) THEN
        ALTER TABLE emergencies
        ADD CONSTRAINT emergencies_assigned_ambulance_fk
        FOREIGN KEY (assigned_ambulance_id) REFERENCES ambulances(id);
      END IF;
    END $$;
  `);

  await db.query(`
    DO $$
    BEGIN
      IF NOT EXISTS (
        SELECT 1
        FROM information_schema.table_constraints
        WHERE constraint_name = 'ambulances_current_emergency_fk'
      ) THEN
        ALTER TABLE ambulances
        ADD CONSTRAINT ambulances_current_emergency_fk
        FOREIGN KEY (current_emergency_id) REFERENCES emergencies(id);
      END IF;
    END $$;
  `);

  await db.query(`
    INSERT INTO users (username, password_hash, role)
    VALUES ($1, $2, 'admin')
    ON CONFLICT (username)
    DO UPDATE SET password_hash = EXCLUDED.password_hash, role = EXCLUDED.role
  `, [DEFAULT_ADMIN_USERNAME, hashPassword(DEFAULT_ADMIN_PASSWORD)]);

  for (const [name, lng, lat] of hospitals) {
    await db.query(`
      INSERT INTO hospitals (name, location)
      VALUES ($1, ST_SetSRID(ST_MakePoint($2, $3), 4326))
      ON CONFLICT (name) DO NOTHING
    `, [name, lng, lat]);
  }

  for (const [name, lng, lat] of signals) {
    await db.query(`
      INSERT INTO signals (name, location, current_state)
      VALUES ($1, ST_SetSRID(ST_MakePoint($2, $3), 4326), 'RED')
      ON CONFLICT DO NOTHING
    `, [name, lng, lat]);
  }

  for (const [licensePlate, driverName, driverPhone, lng, lat] of ambulances) {
    await db.query(`
      INSERT INTO ambulances (license_plate, driver_name, driver_phone, status, current_location)
      VALUES ($1, $2, $3, 'AVAILABLE', ST_SetSRID(ST_MakePoint($4, $5), 4326))
      ON CONFLICT (license_plate)
      DO UPDATE SET
        driver_name = EXCLUDED.driver_name,
        driver_phone = EXCLUDED.driver_phone
    `, [licensePlate, driverName, driverPhone, lng, lat]);
  }
};

module.exports = {
  ensureSchema,
};
