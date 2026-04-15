import { Navigate, Route, Routes } from 'react-router-dom';
import DashboardPage from './DashboardPage';
import TrackingPage from './TrackingPage';

function App() {
  return (
    <Routes>
      <Route path="/" element={<DashboardPage />} />
      <Route path="/tracking/:token" element={<TrackingPage />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default App;
