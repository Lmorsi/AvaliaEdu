import React from 'react'
import Sidebar from './Sidebar'
import MobileNavigation from './MobileNavigation'
import ReportsSection from './sections/ReportsSection'
import AllModals from './modals/AllModals'
import { useAuth } from '../contexts/AuthContext'
import { useDashboard } from '../hooks/useDashboard'
import { useGrading } from '../hooks/useGrading'

interface ReportsPageProps {
  onNavigateToMain: () => void
  onNavigateToGrading: () => void
}

const ReportsPage: React.FC<ReportsPageProps> = ({ onNavigateToMain, onNavigateToGrading }) => {
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
        onNavigateToGrading={onNavigateToGrading}
      />

      <main className="flex-1 overflow-y-auto md:ml-64 lg:ml-72">
        <div className="p-3 md:p-4 md:pl-10 lg:py-6 lg:pl-2 lg:pr-8">
          <div className="max-w-7xl mx-auto">
            <ReportsSection dashboard={{...dashboard, ...grading}} />
          </div>
        </div>
      </main>

      <MobileNavigation
        openModal={dashboard.openModal}
        onNavigateToMain={onNavigateToMain}
      />

      <AllModals
        dashboard={{...dashboard, ...grading}}
        onNavigateToGrading={onNavigateToGrading}
        onNavigateToMain={onNavigateToMain}
        updateUserName={updateUserName}
      />

      <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0/css/all.min.css" />
    </div>
  )
}

export default ReportsPage
