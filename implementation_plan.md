# Emergency Ambulance Routing & Smart Traffic Simulation System

This plan details the full-stack architecture to build the city-level emergency ambulance tracking and control dashboard.

## User Review Required

> [!IMPORTANT]
> The requirements specify "PostgreSQL + PostGIS" and an OSRM "local instance". For the easiest developer experience, I plan to use **Docker Compose** to spin up these services locally. 
> Please let me know:
> 1. Do you have **Docker** installed and running on your system? If not, we can adjust to a lighter SQL stack or use managed setups.
> 2. Are you okay with using public OSRM APIs initially (like `router.project-osrm.org`) for a simpler setup before switching to a local Dockerized OSRM instance? This speeds up initial development.

## Proposed Changes

### 1. Database & Infrastructure Configuration (Docker)
We will use Docker Compose to spin up a PostgreSQL instance with PostGIS extensions.

#### [NEW] docker-compose.yml
- PostgreSQL with PostGIS image (`postgis/postgis:15-3.3`).
- Initialization scripts for schemas (`users`, `ambulances`, `emergencies`, `signals`, etc.).

---

### 2. Backend (Node.js + Express + Socket.IO)
A REST API and WebSocket server built with Node.js to manage the state and live tracking.

#### [NEW] backend/package.json
- Express, Socket.IO, `pg` (Postgres client), JWT, cors, etc.

#### [NEW] backend/server.js
- Main Express + HTTP Server + Socket.IO setup.

#### [NEW] backend/db.js
- Database connection pool using `pg`.

#### [NEW] backend/routes/ (auth.js, emergencies.js, ambulances.js, signals.js, etc.)
- REST endpoints for the dashboard and simulation scripts.

#### [NEW] backend/controllers/ and backend/sockets.js
- Real-time event handling (e.g., `update-location`, `signal-override`, `dispatch`).

---

### 3. Frontend Dashboard (React + Vite + Leaflet)
A responsive, premium dashboard adhering strictly to the aesthetic requirement of "bright, cheerful, beige, olive, warm neutral colors".

#### [NEW] frontend/package.json
- React, Vite, React Router, Socket.IO Client, Tailwind CSS (`tailwindcss`), Leaflet (`react-leaflet`, `leaflet`), Framer Motion (for smooth micro-animations), Lucide React (for icons).

#### [NEW] frontend/tailwind.config.js & frontend/src/index.css
- Custom color palette: Beiges (`#F5F5DC`, `#FFF8DC`), Olives (`#556B2F`, `#808000`), Warm neutrals (`#FAF9F6`, `#EADDCA`).
- Modern typography (e.g., Inter or Outfit), subtle glassmorphism utilities, and soft shadow configurations.

#### [NEW] frontend/src/App.jsx & Routes
- Private routes for Operator/Admin.
- Map Dashboard View, Analytics View.

#### [NEW] frontend/src/components/
- `LiveMap.jsx`: Leaflet map displaying active ambulances, emergencies, and smart signals.
- `Sidebar.jsx`, `TopStats.jsx`: Dynamic regions filtering and summary KPIs.
- `EmergencyPanel.jsx`: Emergency creation, dispatch logs.
- `AmbulanceDetails.jsx`: Fly-out panel showing ambulance route, status.
- `SignalControls.jsx`: Traffic signal toggle cards.

---

### 4. Simulation Engine (Python)
An independent Python suite simulating IoT devices, live positioning, and dynamic environment components.

#### [NEW] simulation/requirements.txt
- `requests`, `python-socketio`, `polyline`, `numpy` (for math logic).

#### [NEW] simulation/engine.py
- Core loop managing fleets of simulated ambulances.
- Calls OSRM to generate route polylines.
- Steps vehicle along polyline to simulate speed (1-2s emit interval).
- Communicates updates via WebSocket to the Node.js backend.
- Manages traffic signal states automatically (switching nearby signals to GREEN).

#### [NEW] simulation/traffic_generator.py & simulation/emergency_generator.py
- Background generators plotting pseudo-random emergencies within defined Mumbai regions and modifying base street latencies to simulate peak congestion.

## Open Questions

> [!WARNING]
> Regarding map data (Mumbai regions): Generating fully accurate offline local routing for Mumbai requires downloading an OSM pbf extract for Maharashtra and feeding it to a local OSRM instance. This can be heavy. To start with, we can mock routes via public APIs or limit the local OSRM to a smaller bounding box (like South Mumbai). Does that sound acceptable?

## Verification Plan

### Automated Tests
- N/A initially. We will test endpoints using CURL or Postman equivalent directly against the Node.js backend to ensure Socket emissions and DB inserts work.

### Manual Verification
1. Boot the architecture (`docker-compose up -d`, `npm run dev` in backend and frontend, and `python engine.py`).
2. Log into the Dashboard as Admin.
3. Validate "warm, cheerful, olive/beige" aesthetic.
4. Watch ambulances step along real road geometries on the Leaflet map.
5. Create a new "HIGH Priority" emergency via the UI and dispatch an available ambulance. Observe the newly computed route polyline and routing transition.
6. Check that traffic signals in the ambulance's path toggle to GREEN as it approaches and reset after it passes.
