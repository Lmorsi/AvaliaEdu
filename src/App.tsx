import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { QRLandingPage } from './pages/QRLandingPage';
import { MobileGradingPage } from './pages/MobileGradingPage';
import { Dashboard } from './pages/Dashboard';
import { AnswerSheetPrintPage } from './pages/AnswerSheetPrintPage';
import './App.css';

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Navigate to="/dashboard" />} />
        {/* Rota do QR code — experiência Point and Click para o aluno */}
        <Route path="/s/:token" element={<QRLandingPage />} />
        {/* Rota legada de correção mobile */}
        <Route path="/mobile-grade" element={<MobileGradingPage />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/print-answer-sheets" element={<AnswerSheetPrintPage />} />
      </Routes>
    </Router>
  );
}

export default App;
