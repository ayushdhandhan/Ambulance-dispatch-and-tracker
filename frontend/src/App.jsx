import React, { useState } from 'react';
import LiveMap from './components/LiveMap';
import { Activity, Map as MapIcon, AlertCircle, Radio, X } from 'lucide-react';

function App() {
  const [currentView, setCurrentView] = useState('map');
  const [isDispatchOpen, setIsDispatchOpen] = useState(false);
  const [ambulances, setAmbulances] = useState([]);
  const [formData, setFormData] = useState({ ambulance_id: '', customer_phone: '+916370445169', lat: '19.049', lng: '72.825' });
  
  const handleDispatch = async () => {
    setIsDispatchOpen(true);
    try {
      const res = await fetch('http://localhost:3000/api/ambulances');
      const data = await res.json();
      const available = data.filter(a => a.status === 'AVAILABLE');
      setAmbulances(available);
      if (available.length > 0) setFormData(prev => ({...prev, ambulance_id: available[0].id}));
    } catch (err) {
      console.error(err);
    }
  };

  const submitDispatch = async () => {
    try {
      await fetch('http://localhost:3000/api/emergencies/dispatch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });
      setIsDispatchOpen(false);
      // Simulate toast
      alert('Ambulance Dispatched! Twilio Initial SMS Triggered.');
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="h-screen w-screen flex bg-neutral-100 overflow-hidden font-sans">
      {/* Sidebar */}
      <aside className="w-64 bg-beige-100 border-r border-beige-200 flex flex-col z-10 shadow-sm">
        <div className="p-6 border-b border-beige-200">
          <h1 className="text-2xl font-bold text-olive-600 flex items-center gap-2">
            <Radio className="text-red-500" />
            AeroRescue
          </h1>
          <p className="text-xs text-gray-500 mt-1 uppercase tracking-wider font-semibold">City Dispatch</p>
        </div>
        <nav className="flex-1 p-4 space-y-2">
          <button 
            onClick={() => setCurrentView('map')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition font-medium ${currentView === 'map' ? 'bg-white text-olive-600 shadow-sm border border-beige-200 active:scale-95' : 'text-gray-600 hover:bg-beige-200'}`}
          >
            <MapIcon size={20} />
            Live Map
          </button>
          <button 
            onClick={() => setCurrentView('emergencies')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition font-medium ${currentView === 'emergencies' ? 'bg-white text-olive-600 shadow-sm border border-beige-200 active:scale-95' : 'text-gray-600 hover:bg-beige-200'}`}
          >
            <AlertCircle size={20} />
            Emergencies
          </button>
          <button 
            onClick={() => setCurrentView('analytics')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition font-medium ${currentView === 'analytics' ? 'bg-white text-olive-600 shadow-sm border border-beige-200 active:scale-95' : 'text-gray-600 hover:bg-beige-200'}`}
          >
            <Activity size={20} />
            Analytics
          </button>
        </nav>
        <div className="p-4 border-t border-beige-200">
          <div className="bg-white rounded-xl p-4 shadow-sm border border-beige-200">
            <p className="text-xs text-gray-500 uppercase font-bold mb-1">System Status</p>
            <div className="flex items-center gap-2 text-sm text-green-600 font-medium">
              <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
              All Systems Operational
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col relative">
        {/* Top Header / Stats */}
        <header className="h-20 bg-white/80 backdrop-blur-md border-b border-gray-200/50 flex items-center justify-between px-8 z-10 shrink-0">
          <div className="flex gap-8">
            <div>
              <p className="text-xs text-gray-500 font-semibold uppercase tracking-wider">Active Emergencies</p>
              <p className="text-2xl font-bold text-gray-800">4</p>
            </div>
            <div>
              <p className="text-xs text-gray-500 font-semibold uppercase tracking-wider">Ambulances Available</p>
              <p className="text-2xl font-bold text-olive-600">12</p>
            </div>
          </div>
          <div>
            <button onClick={handleDispatch} className="bg-olive-600 hover:bg-olive-500 text-white px-6 py-2.5 rounded-full font-medium shadow-md transition transform hover:-translate-y-0.5 active:scale-95 cursor-pointer">
              + New Dispatch
            </button>
          </div>
        </header>

        {/* Map Area */}
        <div className="flex-1 relative flex flex-col items-center justify-center">
          {currentView === 'map' && <LiveMap />}
          {currentView === 'emergencies' && (
            <div className="text-center">
              <h2 className="text-3xl font-bold text-gray-800 mb-2">Emergencies Log</h2>
              <p className="text-gray-500">Historical records and ongoing event tracking.</p>
            </div>
          )}
          {currentView === 'analytics' && (
            <div className="text-center">
              <h2 className="text-3xl font-bold text-gray-800 mb-2">City Analytics</h2>
              <p className="text-gray-500">Response times and traffic flow matrices.</p>
            </div>
          )}
        </div>
      </main>

      {/* Dispatch Modal Overlay */}
      {isDispatchOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg overflow-hidden">
            <div className="flex justify-between items-center p-6 border-b border-gray-100 bg-neutral-50/50">
              <h3 className="text-xl font-bold text-gray-800">Dispatch Order</h3>
              <button onClick={() => setIsDispatchOpen(false)} className="text-gray-400 hover:text-gray-600 transition">
                <X size={24} />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Customer Phone (Formatted)</label>
                <input type="text" className="w-full border border-gray-300 rounded-lg px-4 py-2 text-sm outline-none focus:border-olive-500" value={formData.customer_phone} onChange={e => setFormData({...formData, customer_phone: e.target.value})} />
                <p className="text-xs text-gray-400 mt-1">Must be +91 formatted verified number.</p>
              </div>
              <div className="flex gap-4">
                <div className="flex-1">
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Dest. Latitude</label>
                  <input type="text" className="w-full border border-gray-300 rounded-lg px-4 py-2 text-sm outline-none focus:border-olive-500" value={formData.lat} onChange={e => setFormData({...formData, lat: e.target.value})} />
                </div>
                <div className="flex-1">
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Dest. Longitude</label>
                  <input type="text" className="w-full border border-gray-300 rounded-lg px-4 py-2 text-sm outline-none focus:border-olive-500" value={formData.lng} onChange={e => setFormData({...formData, lng: e.target.value})} />
                </div>
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Assign Ambulance</label>
                <select className="w-full border border-gray-300 rounded-lg px-4 py-2 text-sm outline-none focus:border-olive-500 bg-white" value={formData.ambulance_id} onChange={e => setFormData({...formData, ambulance_id: e.target.value})}>
                  {ambulances.map(a => (
                    <option key={a.id} value={a.id}>
                      {a.license_plate} - {a.driver_name || 'Driver'} ({a.driver_phone || 'No Info'})
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div className="p-6 border-t border-gray-100 flex justify-end gap-3 bg-neutral-50/50">
              <button onClick={() => setIsDispatchOpen(false)} className="px-5 py-2 rounded-lg font-medium text-gray-600 hover:bg-gray-200 transition">Cancel</button>
              <button onClick={submitDispatch} className="px-5 py-2 rounded-lg font-medium text-white bg-olive-600 hover:bg-olive-500 shadow-md transition active:scale-95 text-sm flex items-center gap-2">
                <Radio size={16} /> Init Dispatch & SMS
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
