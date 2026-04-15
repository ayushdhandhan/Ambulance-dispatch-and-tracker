import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { io } from 'socket.io-client';
import { Ambulance, ArrowLeft, Clock3, MapPinned, Phone, Route as RouteIcon } from 'lucide-react';
import { MapContainer, Marker, Polyline, Popup, TileLayer } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { API_URL, SOCKET_URL, formatDateTime, getMapsLink } from './lib/config';

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

const ambulanceIcon = new L.divIcon({
  className: 'custom-div-icon',
  html: `<div style="background:#ffffff;border-radius:999px;padding:6px 8px;box-shadow:0 8px 20px rgba(0,0,0,0.18);font-size:10px;font-weight:700;color:#b91c1c">AMB</div>`,
  iconSize: [36, 36],
  iconAnchor: [18, 18],
});

const emergencyIcon = new L.divIcon({
  className: 'custom-div-icon',
  html: `<div style="background:#ef4444;border-radius:999px;width:18px;height:18px;border:3px solid white;box-shadow:0 0 12px rgba(239,68,68,0.45);"></div>`,
  iconSize: [18, 18],
  iconAnchor: [9, 9],
});

function TrackingPage() {
  const { token } = useParams();
  const [session, setSession] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    const loadSession = async () => {
      try {
        const response = await fetch(`${API_URL}/tracking/${token}`);
        const payload = await response.json();

        if (!response.ok) {
          throw new Error(payload.error || 'Tracking session not found');
        }

        setSession(payload);
        setError('');
      } catch (loadError) {
        setError(loadError.message);
      }
    };

    loadSession();

    const socket = io(SOCKET_URL);

    socket.on('tracking:update', (update) => {
      if (!update.tokens?.includes(token)) {
        return;
      }

      setSession((current) => (
        current
          ? {
              ...current,
              last_location_at: update.timestamp,
              tracking_point: {
                ...current.tracking_point,
                lat: update.lat,
                lng: update.lng,
              },
              ambulance: {
                ...current.ambulance,
                lat: update.lat,
                lng: update.lng,
                status: update.status,
              },
            }
          : current
      ));
    });

    socket.on('dispatch:status', (update) => {
      setSession((current) => {
        if (!current || update.emergency_id !== current.emergency.id) {
          return current;
        }

        return {
          ...current,
          status: update.status,
          ambulance: {
            ...current.ambulance,
            status: update.status === 'COMPLETED' ? 'AVAILABLE' : current.ambulance.status,
          },
        };
      });
    });

    socket.on('ambulance:route', (update) => {
      setSession((current) => (
        current && update.emergency_id === current.emergency.id
          ? { ...current, route: update.geometry || [] }
          : current
      ));
    });

    return () => socket.disconnect();
  }, [token]);

  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[linear-gradient(135deg,#faf9f6,#f4eedf)] p-6">
        <div className="max-w-lg rounded-[2rem] border border-white/70 bg-white/80 p-8 text-center shadow-xl">
          <p className="text-sm font-semibold uppercase tracking-[0.25em] text-slate-500">Tracking unavailable</p>
          <h1 className="mt-3 text-3xl font-bold text-slate-800">{error}</h1>
          <Link to="/" className="mt-6 inline-flex rounded-full bg-slate-900 px-5 py-3 text-sm font-semibold text-white">
            Back to dashboard
          </Link>
        </div>
      </div>
    );
  }

  if (!session) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[linear-gradient(135deg,#faf9f6,#f4eedf)] text-slate-600">
        Loading tracking session...
      </div>
    );
  }

  const route = session.route.map((point) => [point.lat, point.lng]);
  const ambulancePosition = [session.ambulance.lat, session.ambulance.lng];
  const emergencyPosition = [session.emergency.lat, session.emergency.lng];

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,#fff8dc,transparent_42%),linear-gradient(135deg,#faf9f6,#f3ecda)] text-slate-800">
      <div className="mx-auto max-w-7xl px-4 py-6 md:px-6">
        <div className="mb-6 flex items-center justify-between gap-4">
          <Link to="/" className="inline-flex items-center gap-2 rounded-full bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm">
            <ArrowLeft className="h-4 w-4" />
            Control room
          </Link>
          <span className={`rounded-full px-4 py-2 text-sm font-semibold ${
            session.status === 'ACTIVE' ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-700'
          }`}>
            Tracking {session.status.toLowerCase()}
          </span>
        </div>

        <div className="grid gap-6 xl:grid-cols-[1.7fr_1fr]">
          <div className="overflow-hidden rounded-[2rem] border border-white/70 bg-white/80 shadow-xl">
            <div className="border-b border-slate-100 px-6 py-4">
              <p className="text-sm font-semibold text-slate-700">Live ambulance location</p>
            </div>
            <div className="h-[68vh] min-h-[520px]">
              <MapContainer center={ambulancePosition} zoom={13} style={{ height: '100%', width: '100%' }}>
                <TileLayer
                  attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a>'
                  url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
                />
                {route.length > 1 ? <Polyline positions={route} pathOptions={{ color: '#556B2F', weight: 5 }} /> : null}
                <Marker position={ambulancePosition} icon={ambulanceIcon}>
                  <Popup>Assigned ambulance</Popup>
                </Marker>
                <Marker position={emergencyPosition} icon={emergencyIcon}>
                  <Popup>Emergency destination</Popup>
                </Marker>
              </MapContainer>
            </div>
          </div>

          <div className="space-y-6">
            <div className="rounded-[2rem] border border-white/70 bg-white/80 p-6 shadow-sm">
              <div className="flex items-center gap-3">
                <div className="rounded-2xl bg-rose-50 p-3 text-rose-600">
                  <Ambulance className="h-6 w-6" />
                </div>
                <div>
                  <p className="text-sm text-slate-500">Assigned ambulance</p>
                  <h1 className="text-2xl font-bold text-slate-800">{session.ambulance.license_plate}</h1>
                </div>
              </div>
              <div className="mt-5 space-y-3 text-sm text-slate-600">
                <p><strong>Driver:</strong> {session.ambulance.driver_name}</p>
                <p><strong>Phone:</strong> {session.ambulance.driver_phone}</p>
                <p><strong>Region:</strong> {session.ambulance.region}</p>
                <p><strong>Status:</strong> {session.ambulance.status}</p>
              </div>
              <div className="mt-5 flex flex-wrap gap-3">
                <a href={`tel:${session.ambulance.driver_phone}`} className="inline-flex items-center gap-2 rounded-full bg-slate-900 px-4 py-2 text-sm font-semibold text-white">
                  <Phone className="h-4 w-4" />
                  Call driver
                </a>
                <a href={getMapsLink(session.ambulance.lat, session.ambulance.lng)} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 rounded-full bg-olive-600 px-4 py-2 text-sm font-semibold text-white">
                  <MapPinned className="h-4 w-4" />
                  Open in Maps
                </a>
              </div>
            </div>

            <div className="rounded-[2rem] border border-white/70 bg-white/80 p-6 shadow-sm">
              <div className="flex items-center gap-3">
                <div className="rounded-2xl bg-sky-50 p-3 text-sky-600">
                  <RouteIcon className="h-6 w-6" />
                </div>
                <div>
                  <p className="text-sm text-slate-500">Journey details</p>
                  <h2 className="text-xl font-bold text-slate-800">Emergency #{session.emergency.id}</h2>
                </div>
              </div>
              <div className="mt-5 space-y-3 text-sm text-slate-600">
                <p><strong>Description:</strong> {session.emergency.description}</p>
                <p><strong>Priority:</strong> {session.emergency.priority}</p>
                <p><strong>Dispatch time:</strong> {formatDateTime(session.emergency.dispatch_time)}</p>
                <p><strong>Last location:</strong> {formatDateTime(session.last_location_at)}</p>
                <p><strong>Distance:</strong> {session.distance_m ? `${(session.distance_m / 1000).toFixed(1)} km` : 'Calculating...'}</p>
                <p><strong>ETA estimate:</strong> {session.duration_s ? `${Math.round(session.duration_s / 60)} min` : 'Calculating...'}</p>
              </div>
            </div>

            <div className="rounded-[2rem] border border-white/70 bg-white/80 p-6 shadow-sm">
              <div className="flex items-center gap-3">
                <div className="rounded-2xl bg-amber-50 p-3 text-amber-600">
                  <Clock3 className="h-6 w-6" />
                </div>
                <div>
                  <p className="text-sm text-slate-500">SMS tracking session</p>
                  <h2 className="text-xl font-bold text-slate-800">{session.customer_phone}</h2>
                </div>
              </div>
              <div className="mt-5 space-y-3 text-sm text-slate-600">
                <p><strong>Started:</strong> {formatDateTime(session.created_at)}</p>
                <p><strong>Last SMS sent:</strong> {formatDateTime(session.last_sms_sent_at)}</p>
                <p><strong>Tracking token:</strong> {session.token}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default TrackingPage;
