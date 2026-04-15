-- Enable PostGIS
CREATE EXTENSION IF NOT EXISTS postgis;

-- Users Table
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(20) NOT NULL CHECK (role IN ('admin', 'operator')),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Active Emergencies Table
CREATE TABLE IF NOT EXISTS emergencies (
    id SERIAL PRIMARY KEY,
    priority VARCHAR(20) NOT NULL CHECK (priority IN ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL')),
    description TEXT,
    location GEOMETRY(Point, 4326) NOT NULL,
    status VARCHAR(20) NOT NULL CHECK (status IN ('PENDING', 'DISPATCHED', 'RESOLVED', 'CANCELLED')),
    customer_phone VARCHAR(20),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    dispatch_time TIMESTAMP,
    resolved_at TIMESTAMP
);

-- Ambulances Table
CREATE TABLE IF NOT EXISTS ambulances (
    id SERIAL PRIMARY KEY,
    license_plate VARCHAR(20) UNIQUE NOT NULL,
    driver_name VARCHAR(100),
    driver_phone VARCHAR(20),
    status VARCHAR(20) NOT NULL CHECK (status IN ('AVAILABLE', 'DISPATCHED', 'EN_ROUTE', 'AT_HOSPITAL', 'OFF_DUTY')),
    current_location GEOMETRY(Point, 4326),
    current_emergency_id INTEGER REFERENCES emergencies(id),
    last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Traffic Signals Table
CREATE TABLE IF NOT EXISTS signals (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    location GEOMETRY(Point, 4326) NOT NULL,
    current_state VARCHAR(10) NOT NULL CHECK (current_state IN ('RED', 'GREEN', 'YELLOW')),
    override_active BOOLEAN DEFAULT FALSE,
    last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Add foreign key back to emergencies for assigned ambulance if needed, but the current_emergency_id on ambulance covers it well enough. Let's add assigned_ambulance_id to emergencies for dual-link simplicity in queries.
ALTER TABLE emergencies ADD COLUMN assigned_ambulance_id INTEGER REFERENCES ambulances(id);

-- Insert dummy data (Mumbai coordinates roughly)
INSERT INTO users (username, password_hash, role) VALUES 
('admin', '$2b$10$xyz', 'admin'); -- Note: use proper hashing later or simple for now

INSERT INTO signals (name, location, current_state) VALUES
('Worli Sea Face Signal', ST_SetSRID(ST_MakePoint(72.815, 19.015), 4326), 'RED'),
('Bandra Reclamation Signal', ST_SetSRID(ST_MakePoint(72.825, 19.045), 4326), 'RED'),
('Dadar TT Circle', ST_SetSRID(ST_MakePoint(72.845, 19.015), 4326), 'RED'),
('Mahim Causeway Signal', ST_SetSRID(ST_MakePoint(72.835, 19.040), 4326), 'RED'),
('Sion Circle', ST_SetSRID(ST_MakePoint(72.860, 19.038), 4326), 'RED'),
('BKC Junction 1', ST_SetSRID(ST_MakePoint(72.865, 19.060), 4326), 'RED'),
('BKC Junction 2', ST_SetSRID(ST_MakePoint(72.870, 19.062), 4326), 'RED'),
('Marine Drive Signal', ST_SetSRID(ST_MakePoint(72.823, 18.940), 4326), 'RED'),
('Churchgate Signal', ST_SetSRID(ST_MakePoint(72.827, 18.932), 4326), 'RED'),
('Colaba Causeway', ST_SetSRID(ST_MakePoint(72.830, 18.915), 4326), 'RED'),
('Peddar Road Signal 1', ST_SetSRID(ST_MakePoint(72.808, 18.968), 4326), 'RED'),
('Haji Ali Junction', ST_SetSRID(ST_MakePoint(72.810, 18.977), 4326), 'RED'),
('Prabhadevi Signal', ST_SetSRID(ST_MakePoint(72.828, 19.015), 4326), 'RED'),
('Andheri East Signal', ST_SetSRID(ST_MakePoint(72.850, 19.115), 4326), 'RED'),
('Juhu Circle', ST_SetSRID(ST_MakePoint(72.826, 19.108), 4326), 'RED'),
('Vile Parle Signal', ST_SetSRID(ST_MakePoint(72.840, 19.098), 4326), 'RED'),
('Santacruz Junction', ST_SetSRID(ST_MakePoint(72.836, 19.083), 4326), 'RED'),
('Lower Parel Signal', ST_SetSRID(ST_MakePoint(72.828, 18.995), 4326), 'RED');

INSERT INTO ambulances (license_plate, status, current_location, driver_name, driver_phone) VALUES
('MH-01-AB-1234', 'AVAILABLE', ST_SetSRID(ST_MakePoint(72.835, 19.025), 4326), 'Ravi Kumar', 'EMP-101'),
('MH-02-XY-9876', 'AVAILABLE', ST_SetSRID(ST_MakePoint(72.840, 19.050), 4326), 'Amit Singh', 'EMP-102'),
('MH-03-ZZ-5555', 'AVAILABLE', ST_SetSRID(ST_MakePoint(72.820, 19.010), 4326), 'Suresh Patil', 'EMP-103'),
('MH-01-PQ-1111', 'AVAILABLE', ST_SetSRID(ST_MakePoint(72.805, 18.980), 4326), 'Rahul Desai', 'EMP-104'),
('MH-01-PQ-2222', 'AVAILABLE', ST_SetSRID(ST_MakePoint(72.825, 18.940), 4326), 'Vikas Verma', 'EMP-105'),
('MH-02-KL-3333', 'AVAILABLE', ST_SetSRID(ST_MakePoint(72.855, 19.110), 4326), 'Manoj Joshi', 'EMP-106'),
('MH-02-KL-4444', 'AVAILABLE', ST_SetSRID(ST_MakePoint(72.830, 19.100), 4326), 'Sanjay Raut', 'EMP-107'),
('MH-01-EE-5555', 'AVAILABLE', ST_SetSRID(ST_MakePoint(72.865, 19.060), 4326), 'Rajesh Mehta', 'EMP-108'),
('MH-02-EE-6666', 'AVAILABLE', ST_SetSRID(ST_MakePoint(72.875, 19.065), 4326), 'Arjun Pawar', 'EMP-109'),
('MH-01-TR-7777', 'AVAILABLE', ST_SetSRID(ST_MakePoint(72.845, 19.030), 4326), 'Rakesh Shah', 'EMP-110'),
('MH-03-TR-8888', 'AVAILABLE', ST_SetSRID(ST_MakePoint(72.830, 18.920), 4326), 'Deepak Kadam', 'EMP-111'),
('MH-03-MM-9999', 'AVAILABLE', ST_SetSRID(ST_MakePoint(72.820, 18.960), 4326), 'Rohit Sharma', 'EMP-112'),
('MH-01-NN-0000', 'AVAILABLE', ST_SetSRID(ST_MakePoint(72.810, 19.015), 4326), 'Nitin Gadkari', 'EMP-113'),
('MH-02-AA-1010', 'AVAILABLE', ST_SetSRID(ST_MakePoint(72.840, 19.080), 4326), 'Vijay Mallya', 'EMP-114'),
('MH-02-BB-2020', 'AVAILABLE', ST_SetSRID(ST_MakePoint(72.855, 19.050), 4326), 'Mukesh Ambani', 'EMP-115'),
('MH-03-CC-3030', 'AVAILABLE', ST_SetSRID(ST_MakePoint(72.815, 18.950), 4326), 'Anil Kapoor', 'EMP-116');

