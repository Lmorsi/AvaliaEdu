import React from 'react'
import Sidebar from './Sidebar'
import MobileNavigation from './MobileNavigation'
import GradingSection from './sections/GradingSection'
import AllModals from './modals/AllModals'
import { useAuth } from '../contexts/AuthContext'
import { useDashboard } from '../hooks/useDashboard'
import { useGrading } from '../hooks/useGrading'

interface GradingPageProps {
  onNavigateToMain: () => void
  onNavigateToReports: () => void
}

const GradingPage: React.FC<GradingPageProps> = ({ onNavigateToMain, onNavigateToReports }) => {
  const { user, logout, updateUserName } = useAuth()
  const dashboard = useDashboard(user?.id)
  const grading = useGrading(user?.id, dashboard.savedAssessments)

  return (
    <div className="dashboard flex h-screen bg-gray-50 overflow-hidden">
      <Sidebar
        sidebarOpen={dashboard.sidebarOpen}
        setSidebarOpen={dashboard.setSidebarOpen}
        openModal={dashboard.openModal}
        user={user}
        handleLogout={logout}
        handleTabChange={dashboard.handleTabChange}
        onNavigateToMain={onNavigateToMain}
        onNavigateToReports={onNavigateToReports}
      />

      <main className="flex-1 overflow-y-auto md:ml-64 lg:ml-72">
        <div className="p-3 md:p-4 lg:p-6">
          <div className="max-w-7xl mx-auto">
            <GradingSection dashboard={{...dashboard, ...grading}} />
          </div>
        </div>
      </main>

      <MobileNavigation
        openModal={dashboard.openModal}
        onNavigateToMain={onNavigateToMain}
      />

      <AllModals
        dashboard={{...dashboard, ...grading}}
        onNavigateToGrading={() => {}}
        onNavigateToMain={onNavigateToMain}
        updateUserName={updateUserName}
      />

      <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0/css/all.min.css" />
    </div>
  )
}

export default GradingPage
