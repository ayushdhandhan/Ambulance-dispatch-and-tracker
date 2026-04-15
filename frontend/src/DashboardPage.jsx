import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { io } from 'socket.io-client';
import {
  AlertCircle,
  Ambulance,
  BarChart3,
  Filter,
  Map as MapIcon,
  Phone,
  Radio,
  Route as RouteIcon,
  Send,
  TrafficCone,
  X,
} from 'lucide-react';
import LiveMap from './components/LiveMap';
import { API_URL, REGIONS, SOCKET_URL, formatDateTime } from './lib/config';

const emptyDispatchForm = {
  ambulance_id: '',
  customer_phone: '+919876543210',
  lat: '19.049',
  lng: '72.825',
  priority: 'HIGH',
  description: 'Manual Dispatch',
};

const createEmptyData = () => ({
  ambulances: [],
  emergencies: [],
  hospitals: [],
  signals: [],
  tracking: [],
  analytics: null,
});

function DashboardPage() {
  const [currentView, setCurrentView] = useState('map');
  const [selectedRegion, setSelectedRegion] = useState('All Regions');
  const [isDispatchOpen, setIsDispatchOpen] = useState(false);
  const [dispatchForm, setDispatchForm] = useState(emptyDispatchForm);
  const [dispatchMessage, setDispatchMessage] = useState('');
  const [data, setData] = useState(createEmptyData());
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const loadDashboard = async () => {
    try {
      const [ambulances, emergencies, hospitals, signals, tracking, analytics] = await Promise.all([
        fetch(`${API_URL}/ambulances`).then((res) => res.json()),
        fetch(`${API_URL}/emergencies`).then((res) => res.json()),
        fetch(`${API_URL}/hospitals`).then((res) => res.json()),
        fetch(`${API_URL}/signals`).then((res) => res.json()),
        fetch(`${API_URL}/tracking/active`).then((res) => res.json()),
        fetch(`${API_URL}/analytics/overview`).then((res) => res.json()),
      ]);

      setData({ ambulances, emergencies, hospitals, signals, tracking, analytics });
    } catch (error) {
      console.error('Failed to load dashboard data', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDashboard();

    const socket = io(SOCKET_URL);

    socket.on('ambulance:location', (update) => {
      setData((current) => ({
        ...current,
        ambulances: current.ambulances.map((ambulance) => (
          ambulance.id === update.id ? { ...ambulance, ...update } : ambulance
        )),
      }));
    });

    socket.on('signal:state', (update) => {
      setData((current) => ({
        ...current,
        signals: current.signals.map((signal) => (
          signal.id === update.id ? { ...signal, current_state: update.state } : signal
        )),
      }));
    });

    socket.on('dispatch:created', loadDashboard);
    socket.on('dispatch:status', loadDashboard);

    return () => socket.disconnect();
  }, []);

  const availableAmbulances = data.ambulances.filter((ambulance) => ambulance.status !== 'OFF_DUTY');

  useEffect(() => {
    if (availableAmbulances.length > 0 && !dispatchForm.ambulance_id) {
      setDispatchForm((current) => ({ ...current, ambulance_id: availableAmbulances[0].id }));
    }
  }, [availableAmbulances, dispatchForm.ambulance_id]);

  const regionMatches = (item) => selectedRegion === 'All Regions' || item.region === selectedRegion;
  const filteredAmbulances = data.ambulances.filter(regionMatches);
  const filteredEmergencies = data.emergencies.filter(regionMatches);
  const filteredHospitals = data.hospitals.filter(regionMatches);
  const filteredTracking = data.tracking.filter(
    (item) => selectedRegion === 'All Regions'
      || item.ambulance_region === selectedRegion
      || item.emergency_region === selectedRegion
  );

  const stats = {
    activeEmergencies: filteredEmergencies.filter((item) => item.status === 'DISPATCHED').length,
    availableAmbulances: filteredAmbulances.filter((item) => item.status === 'AVAILABLE').length,
    activeTracking: filteredTracking.length,
    greenSignals: data.signals.filter((signal) => signal.current_state === 'GREEN').length,
  };

  const openDispatch = () => {
    setIsDispatchOpen(true);
    setDispatchMessage('');
  };

  const submitDispatch = async () => {
    setSubmitting(true);
    setDispatchMessage('');

    try {
      const response = await fetch(`${API_URL}/emergencies/dispatch`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(dispatchForm),
      });

      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload.error || 'Dispatch failed');
      }

      setDispatchMessage(`Dispatch created. Tracking token: ${payload.tracking.token}`);
      setIsDispatchOpen(false);
      setDispatchForm({
        ...emptyDispatchForm,
        ambulance_id: availableAmbulances[0]?.id || '',
      });
      await loadDashboard();
    } catch (error) {
      setDispatchMessage(error.message);
    } finally {
      setSubmitting(false);
    }
  };

  const analytics = data.analytics || {
    emergency_frequency_by_region: [],
    avg_response_seconds: 0,
    ambulances: { available: 0, active: 0, total: 0 },
    tracking: { active_tracking: 0 },
  };

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,#fff8dc,transparent_40%),linear-gradient(135deg,#faf9f6,#f0ead8)] text-slate-800">
      <div className="flex min-h-screen">
        <aside className="w-72 border-r border-white/60 bg-white/70 p-6 backdrop-blur-xl">
          <div className="rounded-3xl bg-olive-600 px-5 py-6 text-white shadow-xl">
            <div className="flex items-center gap-3">
              <div className="rounded-2xl bg-white/15 p-3">
                <Radio className="h-6 w-6" />
              </div>
              <div>
                <h1 className="text-2xl font-bold">AeroRescue</h1>
                <p className="text-sm text-white/80">Emergency control room</p>
              </div>
            </div>
          </div>

          <nav className="mt-8 space-y-2">
            {[
              { value: 'map', label: 'Live Map', icon: <MapIcon className="h-5 w-5" /> },
              { value: 'emergencies', label: 'Emergencies', icon: <AlertCircle className="h-5 w-5" /> },
              { value: 'tracking', label: 'Tracking', icon: <RouteIcon className="h-5 w-5" /> },
              { value: 'analytics', label: 'Analytics', icon: <BarChart3 className="h-5 w-5" /> },
            ].map(({ value, label, icon }) => (
              <button
                key={value}
                type="button"
                onClick={() => setCurrentView(value)}
                className={`flex w-full items-center gap-3 rounded-2xl px-4 py-3 text-left transition ${
                  currentView === value
                    ? 'bg-white text-olive-600 shadow-md ring-1 ring-olive-100'
                    : 'text-slate-600 hover:bg-white/70'
                }`}
              >
                {icon}
                <span className="font-medium">{label}</span>
              </button>
            ))}
          </nav>

          <div className="mt-8 rounded-3xl border border-white/70 bg-white/80 p-5 shadow-sm">
            <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-slate-600">
              <Filter className="h-4 w-4" />
              Region Filter
            </div>
            <select
              value={selectedRegion}
              onChange={(event) => setSelectedRegion(event.target.value)}
              className="w-full rounded-2xl border border-slate-200 bg-neutral-50 px-4 py-3 text-sm outline-none"
            >
              {REGIONS.map((region) => (
                <option key={region} value={region}>
                  {region}
                </option>
              ))}
            </select>
          </div>

          <div className="mt-8 rounded-3xl border border-white/70 bg-white/80 p-5 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">Dispatch Status</p>
            <div className="mt-3 flex items-center gap-2 text-sm font-medium text-emerald-600">
              <span className="h-2.5 w-2.5 rounded-full bg-emerald-500" />
              Backend + WebSocket online
            </div>
            <p className="mt-3 text-sm text-slate-500">
              SMS updates stay scheduler-based to avoid sending messages on every simulation tick.
            </p>
          </div>
        </aside>

        <main className="flex-1 p-6 md:p-8">
          <header className="rounded-[2rem] border border-white/70 bg-white/75 px-6 py-5 shadow-sm backdrop-blur-xl">
            <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.28em] text-slate-500">Mumbai Simulation Grid</p>
                <h2 className="mt-2 text-3xl font-bold text-slate-800">Real-time ambulance dispatch, routing, and smart signal control</h2>
              </div>
              <button
                type="button"
                onClick={openDispatch}
                className="rounded-full bg-olive-600 px-6 py-3 text-sm font-semibold text-white shadow-lg transition hover:bg-olive-500"
              >
                + New Dispatch
              </button>
            </div>

            {dispatchMessage ? (
              <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700">
                {dispatchMessage}
              </div>
            ) : null}

            <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              {[
                {
                  label: 'Active Emergencies',
                  value: stats.activeEmergencies,
                  icon: <AlertCircle className="h-5 w-5 text-rose-600" />,
                },
                {
                  label: 'Available Ambulances',
                  value: stats.availableAmbulances,
                  icon: <Ambulance className="h-5 w-5 text-olive-600" />,
                },
                {
                  label: 'Tracking Sessions',
                  value: stats.activeTracking,
                  icon: <RouteIcon className="h-5 w-5 text-sky-600" />,
                },
                {
                  label: 'Green Signals',
                  value: stats.greenSignals,
                  icon: <TrafficCone className="h-5 w-5 text-emerald-600" />,
                },
              ].map(({ label, value, icon }) => (
                <div key={label} className="rounded-3xl border border-white/70 bg-gradient-to-br from-white to-[#f6f2e7] p-5 shadow-sm">
                  <div className="flex items-center justify-between">
                    <p className="text-sm text-slate-500">{label}</p>
                    {icon}
                  </div>
                  <p className="mt-4 text-3xl font-bold text-slate-800">{value}</p>
                </div>
              ))}
            </div>
          </header>

          <section className="mt-6 grid gap-6 xl:grid-cols-[1.8fr_1fr] xl:h-[calc(100vh-280px)]">
            <div className="overflow-hidden rounded-[2rem] border border-white/70 bg-white/70 shadow-sm backdrop-blur-xl flex flex-col">
              <div className="border-b border-slate-100 px-5 py-4">
                <p className="text-sm font-semibold text-slate-700">
                  {currentView === 'map' && 'Live operational map'}
                  {currentView === 'emergencies' && 'Emergency queue'}
                  {currentView === 'tracking' && 'Dispatch-linked tracking'}
                  {currentView === 'analytics' && 'Operational analytics'}
                </p>
              </div>

              <div className="flex-1 overflow-y-auto">
                {currentView === 'map' ? (
                  <LiveMap
                    ambulances={filteredAmbulances}
                    emergencies={filteredEmergencies}
                    hospitals={filteredHospitals}
                    signals={data.signals}
                    trackingSessions={filteredTracking}
                  />
                ) : null}

                {currentView === 'emergencies' ? (
                  <div className="space-y-4 p-5">
                    {filteredEmergencies.map((emergency) => (
                      <div key={emergency.id} className="rounded-3xl border border-slate-100 bg-neutral-50 p-4">
                        <div className="flex items-start justify-between gap-4">
                          <div>
                            <p className="font-semibold text-slate-800">Emergency #{emergency.id}</p>
                            <p className="mt-1 text-sm text-slate-500">{emergency.description}</p>
                          </div>
                          <span className="rounded-full bg-rose-50 px-3 py-1 text-xs font-semibold text-rose-700">
                            {emergency.priority}
                          </span>
                        </div>
                        <div className="mt-4 flex flex-wrap gap-4 text-sm text-slate-500">
                          <span>Status: {emergency.status}</span>
                          <span>Region: {emergency.region}</span>
                          <span>Created: {formatDateTime(emergency.created_at)}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : null}

                {currentView === 'tracking' ? (
                  <div className="space-y-4 p-5">
                    {filteredTracking.length === 0 ? (
                      <div className="rounded-3xl border border-dashed border-slate-200 bg-neutral-50 p-8 text-center text-slate-500">
                        No active tracking sessions in the selected region.
                      </div>
                    ) : null}

                    {filteredTracking.map((session) => (
                      <div key={session.token} className="rounded-3xl border border-slate-100 bg-neutral-50 p-4">
                        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                          <div>
                            <p className="font-semibold text-slate-800">{session.license_plate} assigned to emergency #{session.emergency_id}</p>
                            <p className="mt-1 text-sm text-slate-500">{session.driver_name} is serving {session.emergency_region}</p>
                          </div>
                          <Link
                            to={`/tracking/${session.token}`}
                            className="inline-flex items-center gap-2 rounded-full bg-slate-900 px-4 py-2 text-sm font-semibold text-white"
                          >
                            <RouteIcon className="h-4 w-4" />
                            Open Tracking Page
                          </Link>
                        </div>
                        <div className="mt-4 grid gap-3 text-sm text-slate-500 md:grid-cols-2">
                          <span>Customer: {session.customer_phone}</span>
                          <span>Driver: {session.driver_phone}</span>
                          <span>Started: {formatDateTime(session.created_at)}</span>
                          <span>Last update: {formatDateTime(session.last_location_at)}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : null}

                {currentView === 'analytics' ? (
                  <div className="space-y-6 p-5">
                    <div className="grid gap-4 md:grid-cols-3">
                      <div className="rounded-3xl border border-slate-100 bg-neutral-50 p-5">
                        <p className="text-sm text-slate-500">Average response time</p>
                        <p className="mt-3 text-3xl font-bold text-slate-800">
                          {analytics.avg_response_seconds
                            ? `${Math.round(analytics.avg_response_seconds / 60)} min`
                            : 'N/A'}
                        </p>
                      </div>
                      <div className="rounded-3xl border border-slate-100 bg-neutral-50 p-5">
                        <p className="text-sm text-slate-500">Fleet utilization</p>
                        <p className="mt-3 text-3xl font-bold text-slate-800">
                          {analytics.ambulances.total
                            ? `${Math.round((Number(analytics.ambulances.active) / Number(analytics.ambulances.total)) * 100)}%`
                            : '0%'}
                        </p>
                      </div>
                      <div className="rounded-3xl border border-slate-100 bg-neutral-50 p-5">
                        <p className="text-sm text-slate-500">Active tracking sessions</p>
                        <p className="mt-3 text-3xl font-bold text-slate-800">{analytics.tracking.active_tracking}</p>
                      </div>
                    </div>

                    <div className="rounded-3xl border border-slate-100 bg-neutral-50 p-5">
                      <p className="text-sm font-semibold text-slate-700">Emergency frequency by region</p>
                      <div className="mt-5 space-y-4">
                        {analytics.emergency_frequency_by_region.map((entry) => (
                          <div key={entry.region}>
                            <div className="mb-2 flex items-center justify-between text-sm text-slate-500">
                              <span>{entry.region}</span>
                              <span>{entry.total}</span>
                            </div>
                            <div className="h-3 rounded-full bg-slate-100">
                              <div
                                className="h-3 rounded-full bg-gradient-to-r from-olive-600 to-emerald-400"
                                style={{ width: `${Math.max(12, entry.total * 14)}px` }}
                              />
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                ) : null}
              </div>
            </div>

            <div className="space-y-6 overflow-y-auto">
              <div className="rounded-[2rem] border border-white/70 bg-white/75 p-5 shadow-sm backdrop-blur-xl">
                <div className="flex items-center gap-2 text-sm font-semibold text-slate-700">
                  <Send className="h-4 w-4 text-olive-600" />
                  Dispatch-ready ambulances
                </div>
                <div className="mt-4 space-y-3">
                  {availableAmbulances.slice(0, 5).map((ambulance) => (
                    <div key={ambulance.id} className="rounded-2xl border border-slate-100 bg-neutral-50 p-4">
                      <p className="font-semibold text-slate-800">{ambulance.license_plate}</p>
                      <p className="mt-1 text-sm text-slate-500">{ambulance.driver_name}</p>
                      <p className="mt-2 text-xs font-semibold uppercase tracking-[0.2em] text-olive-600">{ambulance.region}</p>
                    </div>
                  ))}
                </div>
              </div>

              <div className="rounded-[2rem] border border-white/70 bg-white/75 p-5 shadow-sm backdrop-blur-xl">
                <div className="flex items-center gap-2 text-sm font-semibold text-slate-700">
                  <Phone className="h-4 w-4 text-sky-600" />
                  Customer notifications
                </div>
                <p className="mt-3 text-sm text-slate-500">
                  Initial dispatch SMS sends driver and ambulance details. Scheduler-based updates send the latest Google Maps link every 2-3 minutes.
                </p>
              </div>
            </div>
          </section>
        </main>
      </div>

      {isDispatchOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-4 backdrop-blur-sm">
          <div className="w-full max-w-xl overflow-hidden rounded-[2rem] border border-white/70 bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-100 px-6 py-5">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">Operator Dispatch</p>
                <h3 className="mt-1 text-xl font-bold text-slate-800">Create dispatch-linked tracking session</h3>
              </div>
              <button type="button" onClick={() => setIsDispatchOpen(false)} className="rounded-full p-2 text-slate-400 hover:bg-slate-100">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-4 px-6 py-5">
              <div className="grid gap-4 md:grid-cols-2">
                <label className="text-sm">
                  <span className="mb-2 block font-semibold text-slate-700">Customer phone</span>
                  <input
                    value={dispatchForm.customer_phone}
                    onChange={(event) => setDispatchForm((current) => ({ ...current, customer_phone: event.target.value }))}
                    className="w-full rounded-2xl border border-slate-200 px-4 py-3 outline-none"
                  />
                </label>

                <label className="text-sm">
                  <span className="mb-2 block font-semibold text-slate-700">Priority</span>
                  <select
                    value={dispatchForm.priority}
                    onChange={(event) => setDispatchForm((current) => ({ ...current, priority: event.target.value }))}
                    className="w-full rounded-2xl border border-slate-200 px-4 py-3 outline-none"
                  >
                    {['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'].map((priority) => (
                      <option key={priority} value={priority}>{priority}</option>
                    ))}
                  </select>
                </label>
              </div>

              <label className="text-sm">
                <span className="mb-2 block font-semibold text-slate-700">Description</span>
                <input
                  value={dispatchForm.description}
                  onChange={(event) => setDispatchForm((current) => ({ ...current, description: event.target.value }))}
                  className="w-full rounded-2xl border border-slate-200 px-4 py-3 outline-none"
                />
              </label>

              <div className="grid gap-4 md:grid-cols-2">
                <label className="text-sm">
                  <span className="mb-2 block font-semibold text-slate-700">Latitude</span>
                  <input
                    value={dispatchForm.lat}
                    onChange={(event) => setDispatchForm((current) => ({ ...current, lat: event.target.value }))}
                    className="w-full rounded-2xl border border-slate-200 px-4 py-3 outline-none"
                  />
                </label>
                <label className="text-sm">
                  <span className="mb-2 block font-semibold text-slate-700">Longitude</span>
                  <input
                    value={dispatchForm.lng}
                    onChange={(event) => setDispatchForm((current) => ({ ...current, lng: event.target.value }))}
                    className="w-full rounded-2xl border border-slate-200 px-4 py-3 outline-none"
                  />
                </label>
              </div>

              <label className="text-sm">
                <span className="mb-2 block font-semibold text-slate-700">Assign ambulance</span>
                <select
                  value={dispatchForm.ambulance_id}
                  onChange={(event) => setDispatchForm((current) => ({ ...current, ambulance_id: event.target.value }))}
                  className="w-full rounded-2xl border border-slate-200 px-4 py-3 outline-none"
                >
                  {availableAmbulances.map((ambulance) => (
                    <option key={ambulance.id} value={ambulance.id}>
                      {ambulance.license_plate} - {ambulance.driver_name}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            <div className="flex items-center justify-end gap-3 border-t border-slate-100 px-6 py-5">
              <button
                type="button"
                onClick={() => setIsDispatchOpen(false)}
                className="rounded-full px-5 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-100"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={submitDispatch}
                disabled={submitting || !availableAmbulances.length}
                className="rounded-full bg-olive-600 px-5 py-2.5 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60"
              >
                {submitting ? 'Dispatching...' : 'Dispatch & Notify'}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {loading ? (
        <div className="fixed bottom-6 right-6 rounded-full bg-slate-900 px-4 py-2 text-sm font-medium text-white shadow-lg">
          Loading control room...
        </div>
      ) : null}
    </div>
  );
}

export default DashboardPage;
