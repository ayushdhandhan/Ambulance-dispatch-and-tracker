import { Navigate, Route, Routes } from 'react-router-dom';
import DashboardPage from './DashboardPage';
import TrackingPage from './TrackingPage';
import LandingPage from './LandingPage';

function App() {
  return (
    <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route path="/admin" element={<DashboardPage />} />
      <Route path="/tracking/:token" element={<TrackingPage />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default App;
