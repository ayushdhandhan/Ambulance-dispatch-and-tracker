import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

const ambulanceIcon = new L.divIcon({
  className: 'custom-div-icon',
  html: `<div style="background:#ffffff;border-radius:999px;padding:6px 8px;box-shadow:0 10px 24px rgba(0,0,0,0.16);font-size:10px;font-weight:700;color:#b91c1c">AMB</div>`,
  iconSize: [34, 34],
  iconAnchor: [17, 17],
});

const emergencyIcon = new L.divIcon({
  className: 'custom-div-icon',
  html: `<div style="background:#ef4444;border-radius:999px;width:18px;height:18px;border:3px solid white;box-shadow:0 0 12px rgba(239,68,68,0.45)"></div>`,
  iconSize: [18, 18],
  iconAnchor: [9, 9],
});

const hospitalIcon = new L.divIcon({
  className: 'custom-div-icon',
  html: `<div style="background:#0f766e;border-radius:16px;padding:4px 8px;color:white;font-size:11px;font-weight:700;box-shadow:0 8px 18px rgba(15,118,110,0.24)">H</div>`,
  iconSize: [26, 24],
  iconAnchor: [13, 12],
});

const getSignalIcon = (state) => new L.divIcon({
  className: 'custom-div-icon',
  html: `<div style="background:${state === 'GREEN' ? '#22c55e' : state === 'YELLOW' ? '#eab308' : '#ef4444'};border-radius:999px;width:14px;height:14px;border:3px solid white;box-shadow:0 0 10px rgba(0,0,0,0.25)"></div>`,
  iconSize: [14, 14],
  iconAnchor: [7, 7],
});
function LiveMap({ ambulances = [], emergencies = [], hospitals = [], signals = [], trackingSessions = [] }) {
  return (
    <MapContainer center={[19.03, 72.83]} zoom={12} style={{ height: '100%', width: '100%' }}>
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a>'
        url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
      />

      {emergencies.map((emergency) => (
        <Marker key={`emergency-${emergency.id}`} position={[emergency.lat, emergency.lng]} icon={emergencyIcon}>
          <Popup>
            <div className="font-sans">
              <strong className="block text-red-600">Emergency #{emergency.id}</strong>
              <p className="m-0 text-sm text-slate-700">{emergency.description}</p>
              <p className="m-0 mt-1 text-xs font-semibold uppercase tracking-wide text-slate-500">
                {emergency.priority} | {emergency.status}
              </p>
            </div>
          </Popup>
        </Marker>
      ))}

      {hospitals.map((hospital) => (
        <Marker key={`hospital-${hospital.id}`} position={[hospital.lat, hospital.lng]} icon={hospitalIcon}>
          <Popup>
            <div className="font-sans">
              <strong className="block text-teal-700">{hospital.name}</strong>
              <p className="m-0 text-xs uppercase tracking-wide text-slate-500">{hospital.region}</p>
            </div>
          </Popup>
        </Marker>
      ))}

      {signals.map((signal) => (
        <Marker key={`signal-${signal.id}`} position={[signal.lat, signal.lng]} icon={getSignalIcon(signal.current_state)}>
          <Popup>
            <div className="font-sans">
              <strong className="block text-slate-800">{signal.name}</strong>
              <p className="m-0 text-sm text-slate-600">Signal: {signal.current_state}</p>
            </div>
          </Popup>
        </Marker>
      ))}

      {ambulances.map((ambulance) => (
        <Marker key={`ambulance-${ambulance.id}`} position={[ambulance.lat, ambulance.lng]} icon={ambulanceIcon}>
          <Popup>
            <div className="font-sans">
              <strong className="block text-olive-600">{ambulance.license_plate}</strong>
              <p className="m-0 text-sm text-slate-600">{ambulance.driver_name}</p>
              <p className="m-0 mt-1 text-xs uppercase tracking-wide text-slate-500">{ambulance.status}</p>
            </div>
          </Popup>
        </Marker>
      ))}

      {trackingSessions.map((session) => (
        <Marker
          key={`tracking-${session.token}`}
          position={[session.ambulance_lat, session.ambulance_lng]}
          icon={ambulanceIcon}
        >
          <Popup>
            <div className="font-sans">
              <strong className="block text-slate-800">Tracking session</strong>
              <p className="m-0 text-sm text-slate-600">{session.license_plate} - {session.driver_name}</p>
              <p className="m-0 mt-1 text-xs uppercase tracking-wide text-slate-500">{session.customer_phone}</p>
            </div>
          </Popup>
        </Marker>
      ))}
    </MapContainer>
  );
}

export default LiveMap;
