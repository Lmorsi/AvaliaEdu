import React from 'react'
import { useAuth } from "../contexts/AuthContext"
import { useDashboard } from '../hooks/useDashboard'
import Sidebar from './Sidebar'
import MobileNavigation from './MobileNavigation'
import ItemsSection from './sections/ItemsSection'
import AssessmentsSection from './sections/AssessmentsSection'
import AllModals from './modals/AllModals'

interface DashboardPageProps {
  onNavigateToGrading: () => void
  onNavigateToReports: () => void
}

function DashboardPage({ onNavigateToGrading, onNavigateToReports }: DashboardPageProps) {
  const { user, logout, updateUserName } = useAuth()
  const dashboard = useDashboard(user?.id)

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
          onNavigateToGrading={onNavigateToGrading}
          onNavigateToReports={onNavigateToReports}
          onNavigateToMain={() => {}}
        />

        <MobileNavigation
          openModal={dashboard.openModal}
          onNavigateToMain={() => {}}
          onNavigateToReports={onNavigateToReports}
        />

        {/* Main Content */}
        <main className="flex-1 md:ml-72 pb-20 md:pb-6">
          <div className="p-3 md:p-4 pt-16 md:pt-4">
            <div className="max-w-7xl mx-auto space-y-6 md:space-y-8">
              {/* Main Grid - Stack on mobile, side by side on large screens */}
              <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 md:gap-6 lg:gap-8">
                <ItemsSection
                  dashboard={dashboard}
                />

                <AssessmentsSection
                  dashboard={dashboard}
                />
              </div>

            </div>
          </div>
        </main>
      </div>

      <AllModals
        dashboard={dashboard}
        onNavigateToGrading={onNavigateToGrading}
        onNavigateToMain={() => {}}
        updateUserName={updateUserName}
        userId={user?.id}
        userName={user?.name || user?.email}
        userEmail={user?.email}
      />

      {/* Font Awesome */}
      <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0/css/all.min.css" />

      {/* Scripts globais para o editor editável */}
      <script dangerouslySetInnerHTML={{
        __html: `
          // Função global para remover imagem do editor
          window.removeImageFromEditor = function(imageId) {
            const event = new CustomEvent('removeImageFromEditor', { detail: { imageId } });
            document.dispatchEvent(event);
          };
          
          // Função global para iniciar redimensionamento
          window.startResize = function(imageId, direction, event) {
            const customEvent = new CustomEvent('startImageResize', { 
              detail: { imageId, direction, event } 
            });
            document.dispatchEvent(customEvent);
          };
          
          // Listener para eventos customizados
          document.addEventListener('removeImageFromEditor', function(e) {
            // Trigger React state update
            console.log('Remove image:', e.detail.imageId);
          });
          
          document.addEventListener('startImageResize', function(e) {
            // Trigger React resize handler
            console.log('Start resize:', e.detail);
          });
        `
      }} />
    </div>
  )
}

export default DashboardPage