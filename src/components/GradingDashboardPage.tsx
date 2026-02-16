import React from 'react'
import { useAuth } from "../contexts/AuthContext"
import { useDashboard } from '../hooks/useDashboard'
import { useGrading } from '../hooks/useGrading'
import Sidebar from './Sidebar'
import MobileNavigation from './MobileNavigation'
import GradingSection from './sections/GradingSection'
import ReportsSection from './sections/ReportsSection'
import StudentsModal from './modals/StudentsModal'
import GradingModal from './modals/GradingModal'
import AllModals from './modals/AllModals'

interface GradingDashboardPageProps {
  onNavigateToMain: () => void
}

function GradingDashboardPage({ onNavigateToMain }: GradingDashboardPageProps) {
  const { user, logout, updateUserName } = useAuth()
  const dashboard = useDashboard(user?.id)
  const grading = useGrading(user?.id, dashboard.savedAssessments)

  const handleLogout = () => {
    logout()
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="flex">
        <Sidebar
          sidebarOpen={dashboard.sidebarOpen}
          setSidebarOpen={dashboard.setSidebarOpen}
          openModal={dashboard.openModal}
          user={user}
          handleLogout={handleLogout}
          handleTabChange={dashboard.handleTabChange}
          onNavigateToGrading={() => {}}
          onNavigateToMain={onNavigateToMain}
        />

        <MobileNavigation openModal={dashboard.openModal} />

        <main className="flex-1 md:ml-72 pb-20 md:pb-6">
          <div className="p-3 md:p-4 pt-16 md:pt-4">
            <div className="max-w-7xl mx-auto">
              <div className="mb-6">
                <button
                  onClick={onNavigateToMain}
                  className="flex items-center text-gray-600 hover:text-gray-900 transition-colors"
                >
                  <i className="fas fa-arrow-left mr-2"></i>
                  <span className="text-sm">Voltar para Dashboard</span>
                </button>
              </div>

              <div className="flex border-b mb-6">
                <button
                  onClick={() => dashboard.handleTabChange("gradingDashboard", "grading")}
                  className={`px-4 py-3 font-medium text-sm border-b-2 transition-colors ${
                    dashboard.activeTab.gradingDashboard === "grading"
                      ? "border-green-500 text-green-600"
                      : "border-transparent text-gray-500 hover:text-gray-700"
                  }`}
                >
                  <i className="fas fa-check-circle mr-2"></i>
                  CORREÇÃO DE AVALIAÇÕES
                </button>
                <button
                  onClick={() => dashboard.handleTabChange("gradingDashboard", "reports")}
                  className={`px-4 py-3 font-medium text-sm border-b-2 transition-colors ${
                    dashboard.activeTab.gradingDashboard === "reports"
                      ? "border-orange-500 text-orange-600"
                      : "border-transparent text-gray-500 hover:text-gray-700"
                  }`}
                >
                  <i className="fas fa-chart-bar mr-2"></i>
                  RELATÓRIOS E ESTATÍSTICAS
                </button>
              </div>

              {dashboard.activeTab.gradingDashboard === "grading" && (
                <GradingSection
                  dashboard={{ ...dashboard, ...grading, activeTab: { ...dashboard.activeTab, grading: dashboard.activeTab.grading || 'manage-classes' } }}
                />
              )}

              {dashboard.activeTab.gradingDashboard === "reports" && (
                <ReportsSection
                  dashboard={{ ...dashboard, ...grading }}
                />
              )}
            </div>
          </div>
        </main>
      </div>

      <StudentsModal
        isOpen={grading.showStudentsModal}
        onClose={() => grading.setShowStudentsModal(false)}
        dashboard={grading}
      />

      <GradingModal
        isOpen={grading.showGradingModal}
        onClose={() => grading.setShowGradingModal(false)}
        dashboard={grading}
      />

      <AllModals
        dashboard={dashboard}
        onNavigateToGrading={() => {}}
        onNavigateToMain={onNavigateToMain}
        updateUserName={updateUserName}
      />

      <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0/css/all.min.css" />
    </div>
  )
}

export default GradingDashboardPage
