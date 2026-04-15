import React, { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import { io } from 'socket.io-client';
import L from 'leaflet';

// Fix for default marker icons in React Leaflet
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

const ambulanceIcon = new L.divIcon({
  className: 'custom-div-icon',
  html: `<div style="background-color: white; border-radius: 50%; padding: 4px; box-shadow: 0 2px 4px rgba(0,0,0,0.3);"><img src="https://cdn-icons-png.flaticon.com/512/808/808298.png" style="width: 24px; height: 24px;" /></div>`,
  iconSize: [32, 32],
  iconAnchor: [16, 16]
});

const emergencyIcon = new L.divIcon({
  className: 'custom-div-icon',
  html: `<div style="background-color: #ef4444; border-radius: 50%; width: 16px; height: 16px; border: 2px solid white; box-shadow: 0 0 10px rgba(239, 68, 68, 0.8);"></div>`,
  iconSize: [16, 16],
  iconAnchor: [8, 8]
});

const getSignalIcon = (state) => new L.divIcon({
  className: 'custom-div-icon',
  html: `<div style="background-color: ${state === 'GREEN' ? '#22c55e' : state === 'YELLOW' ? '#eab308' : '#ef4444'}; border-radius: 50%; width: 12px; height: 12px; border: 2px solid white; box-shadow: 0 0 8px rgba(0,0,0,0.5);"></div>`,
  iconSize: [12, 12],
  iconAnchor: [6, 6]
});

const SOCKET_URL = 'http://localhost:3000';
const API_URL = 'http://localhost:3000/api';

export default function LiveMap() {
  const [ambulances, setAmbulances] = useState({});
  const [emergencies, setEmergencies] = useState([]);
  const [signals, setSignals] = useState({});

  useEffect(() => {
    // Fetch initial data
    const fetchData = async () => {
      try {
        const [ambRes, emergRes, sigRes] = await Promise.all([
          fetch(`${API_URL}/ambulances`).then(r => r.json()),
          fetch(`${API_URL}/emergencies`).then(r => r.json()),
          fetch(`${API_URL}/signals`).then(r => r.json())
        ]);
        
        const ambMap = {};
        ambRes.forEach(a => ambMap[a.id] = a);
        setAmbulances(ambMap);
        
        setEmergencies(emergRes);
        
        const sigMap = {};
        sigRes.forEach(s => sigMap[s.id] = s);
        setSignals(sigMap);
      } catch (err) {
        console.error('Failed to fetch initial data', err);
      }
    };
    
    fetchData();

    // Socket connections
    const socket = io(SOCKET_URL);
    
    socket.on('ambulance:location', (data) => {
      setAmbulances(prev => ({
        ...prev,
        [data.id]: { ...(prev[data.id] || {}), ...data }
      }));
    });

    socket.on('signal:state', (data) => {
      setSignals(prev => ({
        ...prev,
        [data.id]: { ...(prev[data.id] || {}), current_state: data.state }
      }));
    });

    return () => socket.disconnect();
  }, []);

  return (
    <MapContainer center={[19.03, 72.83]} zoom={13} style={{ height: '100%', width: '100%' }}>
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a>'
        url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
      />
      
      {/* Render Emergencies */}
      {emergencies.map(e => (
        <Marker key={`e-${e.id}`} position={[e.lat, e.lng]} icon={emergencyIcon}>
          <Popup>
            <div className="font-sans">
              <strong className="text-red-600 block">Emergency #{e.id}</strong>
              <p className="text-sm text-gray-700 m-0">{e.description}</p>
              <span className="text-xs font-semibold text-gray-500 uppercase">{e.priority} - {e.status}</span>
            </div>
          </Popup>
        </Marker>
      ))}

      {/* Render Signals */}
      {Object.values(signals).map(s => (
        <Marker key={`s-${s.id}`} position={[s.lat, s.lng]} icon={getSignalIcon(s.current_state)}>
          <Popup>
            <div className="font-sans">
              <strong>{s.name}</strong>
              <p className="m-0 text-sm">Status: {s.current_state}</p>
            </div>
          </Popup>
        </Marker>
      ))}

      {/* Render Ambulances */}
      {Object.values(ambulances).map(a => (
        <Marker key={`a-${a.id}`} position={[a.lat, a.lng]} icon={ambulanceIcon}>
          <Popup>
            <div className="font-sans">
              <strong className="text-olive-600">{a.license_plate}</strong>
              <p className="m-0 text-sm text-gray-600">Status: {a.status}</p>
            </div>
          </Popup>
        </Marker>
      ))}
    </MapContainer>
  );
}
