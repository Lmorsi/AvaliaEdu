import React from 'react'
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { AuthProvider, useAuth } from './contexts/AuthContext'
import LandingPage from './pages/LandingPage'
import LoginPage from './pages/LoginPage'
import SignupPage from './pages/SignupPage'
import AboutPage from './pages/AboutPage'
import HowItWorksPage from './pages/HowItWorksPage'
import PrivacyPolicyPage from './pages/PrivacyPolicyPage'
import TermsPage from './pages/TermsPage'
import RecoverPasswordPage from './components/RecoverPasswordPage'
import ResetPasswordPage from './pages/ResetPasswordPage'
import DashboardPage from './components/DashboardPage'
import GradingPage from './components/GradingPage'
import ReportsPage from './components/ReportsPage'
import ClassesPage from './components/ClassesPage'
import AdminPage from './pages/AdminPage'
import TestEmailPage from './pages/TestEmailPage'
import ScanPage from './pages/ScanPage'
import MobileGradingPage from './pages/MobileGradingPage'
import QRLandingPage from './pages/QRLandingPage'
import CameraTestPage from './pages/CameraTestPage'
import DebugPage from './pages/DebugPage'

const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, loading } = useAuth()

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-600 border-t-transparent"></div>
      </div>
    )
  }

  if (!user) {
    return <Navigate to="/login" replace />
  }

  return <>{children}</>
}

const PublicRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, loading } = useAuth()

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-600 border-t-transparent"></div>
      </div>
    )
  }

  if (user) {
    return <Navigate to="/dashboard" replace />
  }

  return <>{children}</>
}

type AppView = 'main' | 'grading' | 'reports' | 'classes'

const DashboardRouter: React.FC = () => {
  const location = useLocation()
  const locationState = location.state as { view?: string; token?: string; detectedAnswers?: Record<number, string> } | null

  const initialView: AppView = locationState?.view === 'grading'
    ? 'grading'
    : locationState?.view === 'reports'
      ? 'reports'
      : locationState?.view === 'classes'
        ? 'classes'
        : 'main'

  const [currentView, setCurrentView] = React.useState<AppView>(initialView)

  const nav = {
    toMain: () => setCurrentView('main'),
    toGrading: () => setCurrentView('grading'),
    toReports: () => setCurrentView('reports'),
    toClasses: () => setCurrentView('classes'),
  }

  return (
    <>
      {currentView === 'main' && (
        <DashboardPage
          onNavigateToGrading={nav.toGrading}
          onNavigateToReports={nav.toReports}
          onNavigateToClasses={nav.toClasses}
        />
      )}
      {currentView === 'grading' && (
        <GradingPage
          onNavigateToMain={nav.toMain}
          onNavigateToReports={nav.toReports}
          onNavigateToClasses={nav.toClasses}
          initialToken={locationState?.token}
          detectedAnswers={locationState?.detectedAnswers}
        />
      )}
      {currentView === 'reports' && (
        <ReportsPage
          onNavigateToMain={nav.toMain}
          onNavigateToGrading={nav.toGrading}
          onNavigateToClasses={nav.toClasses}
        />
      )}
      {currentView === 'classes' && (
        <ClassesPage
          onNavigateToMain={nav.toMain}
          onNavigateToGrading={nav.toGrading}
          onNavigateToReports={nav.toReports}
          onNavigateToClasses={nav.toClasses}
        />
      )}
    </>
  )
}

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/sobre" element={<AboutPage />} />
          <Route path="/como-funciona" element={<HowItWorksPage />} />
          <Route path="/privacidade" element={<PrivacyPolicyPage />} />
          <Route path="/termos" element={<TermsPage />} />
          <Route path="/recuperar-senha" element={<RecoverPasswordPage />} />
          <Route path="/redefinir-senha" element={<ResetPasswordPage />} />
          <Route path="/test-email" element={<TestEmailPage />} />
          <Route
            path="/login"
            element={
              <PublicRoute>
                <LoginPage />
              </PublicRoute>
            }
          />
          <Route
            path="/cadastro"
            element={
              <PublicRoute>
                <SignupPage />
              </PublicRoute>
            }
          />
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <DashboardRouter />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin"
            element={
              <ProtectedRoute>
                <AdminPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/scan"
            element={
              <ProtectedRoute>
                <ScanPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/mobile-grade"
            element={
              <ProtectedRoute>
                <MobileGradingPage />
              </ProtectedRoute>
            }
          />
          <Route path="/s/:token" element={<QRLandingPage />} />
          <Route path="/camera-test" element={<CameraTestPage />} />
          <Route path="/debug" element={<DebugPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  )
}

export default App
