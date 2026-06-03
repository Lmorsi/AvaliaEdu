import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { QRLandingPage } from './pages/QRLandingPage';
import { MobileGradingPage } from './pages/MobileGradingPage';
import { Dashboard } from './pages/Dashboard';
import './App.css';

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Navigate to="/dashboard" />} />
        <Route path="/s/:token" element={<QRLandingPage />} />
        <Route path="/mobile-grade" element={<MobileGradingPage />} />
        <Route path="/dashboard" element={<Dashboard />} />
      </Routes>
    </Router>
  );
}

export default App;
