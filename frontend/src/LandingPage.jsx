import React from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Activity, 
  Ambulance, 
  MapPin, 
  ShieldCheck, 
  Zap, 
  Clock,
  LayoutDashboard
} from 'lucide-react';

const LandingPage = () => {
  const navigate = useNavigate();

  return (
    <div className="relative min-h-screen w-full overflow-hidden bg-[#0a0a0a] text-white font-sans selection:bg-rose-500/30">
      {/* Dynamic Background Elements */}
      <div className="absolute inset-0 z-0">
        {/* Subtle Grid Pattern */}
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:40px_40px]"></div>
        
        {/* Radial Glows */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-rose-600/10 blur-[120px] rounded-full"></div>
        <div className="absolute top-0 right-0 w-[400px] h-[400px] bg-emerald-600/5 blur-[100px] rounded-full"></div>
      </div>

      {/* Top Left Navigation Buttons */}
      <div className="absolute top-8 left-8 z-20 flex gap-4">
        {[
          { label: 'STATUS', icon: <Activity className="w-4 h-4" /> },
          { label: 'FLEET', icon: <Ambulance className="w-4 h-4" /> },
          { label: 'PROTOCOLS', icon: <ShieldCheck className="w-4 h-4" /> }
        ].map((btn) => (
          <button
            key={btn.label}
            className="group flex items-center gap-2 px-4 py-2 bg-white/5 border border-white/10 rounded-full hover:bg-white/10 transition-all duration-300"
          >
            <span className="text-white/60 group-hover:text-rose-500 transition-colors">
              {btn.icon}
            </span>
            <span className="text-xs font-bold tracking-widest text-white/80">
              {btn.label}
            </span>
          </button>
        ))}
      </div>

      {/* Main Content */}
      <div className="relative z-10 flex flex-col items-center justify-center min-h-screen px-4 text-center">
        {/* Decorative Badge */}
        <div className="mb-6 flex items-center gap-2 px-4 py-1.5 bg-rose-500/10 border border-rose-500/20 rounded-full animate-pulse">
          <Zap className="w-3.5 h-3.5 text-rose-500 fill-rose-500" />
          <span className="text-[10px] font-black tracking-[0.2em] text-rose-500 uppercase">
            Emergency Response System Active
          </span>
        </div>

        {/* Hero Title */}
        <div className="relative group cursor-default">
          <h1 className="text-7xl md:text-9xl font-black tracking-tighter leading-none italic uppercase">
            <span className="text-white drop-shadow-[0_5px_15px_rgba(255,255,255,0.1)]">Aero</span>
            <br />
            <span className="bg-gradient-to-r from-rose-500 via-rose-600 to-rose-400 bg-clip-text text-transparent">Rescue</span>
          </h1>
          {/* Subtle line under title */}
          <div className="mt-4 h-1 w-24 bg-rose-600 mx-auto rounded-full group-hover:w-48 transition-all duration-500"></div>
        </div>

        <p className="mt-8 max-w-lg text-white/40 text-sm md:text-base font-medium tracking-wide leading-relaxed">
          Optimizing emergency medical response. Precision dispatching and real-time tracking across urban environments.
        </p>

        {/* Bottom Navigation Buttons */}
        <div className="mt-16 flex flex-col sm:flex-row gap-6">
          <button
            onClick={() => navigate('/admin')}
            className="group relative flex items-center gap-3 px-8 py-4 bg-white text-black font-bold uppercase tracking-widest text-sm rounded-full overlow-hidden hover:scale-105 transition-all duration-300 active:scale-95"
          >
            <LayoutDashboard className="w-5 h-5" />
            Launch Control Room
            <div className="absolute inset-0 bg-rose-500/10 opacity-0 group-hover:opacity-100 transition-opacity"></div>
          </button>

          <button
             onClick={() => navigate('/admin')}
            className="group relative flex items-center gap-3 px-8 py-4 bg-white text-black font-bold uppercase tracking-widest text-sm rounded-full overlow-hidden hover:scale-105 transition-all duration-300 active:scale-95"
          >
            <MapPin className="w-5 h-5 text-rose-500" />
            Track Live Sessions
          </button>
        </div>
      </div>

      {/* Bottom Footer Stats (Optional Detail) */}
      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 z-20 hidden md:flex gap-12">
        <div className="flex flex-col">
          <span className="text-[10px] font-bold text-white/20 tracking-[0.3em] uppercase mb-1">Response Time</span>
          <span className="flex items-center gap-2 font-mono text-xl font-bold">
            <Clock className="w-4 h-4 text-emerald-500" />
            &lt; 8m 42s
          </span>
        </div>
        <div className="w-[1px] h-10 bg-white/10 self-center"></div>
        <div className="flex flex-col">
          <span className="text-[10px] font-bold text-white/20 tracking-[0.3em] uppercase mb-1">Active Units</span>
          <span className="flex items-center gap-2 font-mono text-xl font-bold">
            <Activity className="w-4 h-4 text-sky-500" />
            24 / 24
          </span>
        </div>
      </div>
    </div>
  );
};

export default LandingPage;
