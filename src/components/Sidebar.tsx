import React from 'react'
import { useAuth } from '../contexts/AuthContext'

interface SidebarProps {
  sidebarOpen: boolean
  setSidebarOpen: (open: boolean) => void
  openModal: (modalId: string) => void
  user: any
  handleLogout: () => void
  handleTabChange: (section: string, tab: string) => void
  onNavigateToGrading?: () => void
  onNavigateToReports?: () => void
  onNavigateToMain?: () => void
}

const Sidebar: React.FC<SidebarProps> = ({
  sidebarOpen,
  setSidebarOpen,
  openModal,
  user,
  handleLogout,
  handleTabChange,
  onNavigateToGrading,
  onNavigateToReports,
  onNavigateToMain
}) => {
  const { isAdmin } = useAuth()

  return (
    <>
      {/* Sidebar */}
      <aside
        className={`sidebar fixed inset-y-0 left-0 z-40 w-64 md:w-72 shadow-lg transform transition-transform duration-300 ease-in-out ${sidebarOpen ? "translate-x-0" : "-translate-x-full"} md:translate-x-0`}
        style={{ backgroundColor: "#2c3e50" }}
      >
        <div className="h-full flex flex-col">
          <div className="logo-area p-0 md:p-0 flex-shrink-0" style={{ borderBottom: "1px solid #34495e" }}>
            <div className="logo flex items-center justify-center">
              <div className="rounded-lg p-2">
                <img
                  src="/origin.png"
                  alt="Avalia.Edu Logo"
                  className="h-20 w-20 md:h-40 md:w-40 lg:h-48 lg:w-48 rounded-lg"
                />
              </div>
            </div>
          </div>

          <nav className="menu p-3 md:p-4 flex-1 overflow-y-auto">
            <ul className="space-y-2">
              <li className="nav-item">
                <button
                  onClick={() => {
                    if (onNavigateToMain) {
                      onNavigateToMain()
                    }
                    handleTabChange('items', 'search-items')
                    handleTabChange('assessments', 'search-assessments')
                    setSidebarOpen(false)
                  }}
                  className="w-full flex items-center space-x-3 p-2 md:p-3 rounded-lg text-gray-200 transition-colors"
                  style={{ backgroundColor: "rgba(52, 73, 94, 0.3)" }}
                >
                  <i className="fas fa-home text-white text-sm md:text-base"></i>
                  <span className="text-gray-200 text-sm md:text-base">Início</span>
                </button>
              </li>
              <li className="nav-item">
                <button
                  onClick={() => openModal("meus-itens-submenu-modal")}
                  className="w-full flex items-center space-x-3 p-2 md:p-3 rounded-lg text-gray-200 transition-colors hover:bg-opacity-30"
                  onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "rgba(52, 73, 94, 0.3)")}
                  onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "transparent")}
                >
                  <i className="fas fa-folder text-white text-sm md:text-base"></i>
                  <span className="text-gray-200 text-sm md:text-base">Meus Itens</span>
                </button>
              </li>
              <li className="nav-item">
                <button
                  onClick={() => openModal("avaliacoes-submenu-modal")}
                  className="w-full flex items-center space-x-3 p-2 md:p-3 rounded-lg text-gray-200 transition-colors"
                  onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "rgba(52, 73, 94, 0.3)")}
                  onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "transparent")}
                >
                  <i className="fas fa-file-alt text-white text-sm md:text-base"></i>
                  <span className="text-gray-200 text-sm md:text-base">Avaliações</span>
                </button>
              </li>
              <li className="nav-item">
                <button
                  onClick={() => {
                    if (onNavigateToReports) {
                      onNavigateToReports()
                    }
                    setSidebarOpen(false)
                  }}
                  className="w-full flex items-center space-x-3 p-2 md:p-3 rounded-lg text-gray-200 transition-colors"
                  onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "rgba(52, 73, 94, 0.3)")}
                  onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "transparent")}
                >
                  <i className="fas fa-chart-bar text-white text-sm md:text-base"></i>
                  <span className="text-gray-200 text-sm md:text-base">Relatórios e Estatísticas</span>
                </button>
              </li>
              <li className="nav-item">
                <button
                  onClick={() => openModal("configuracoes-submenu-modal")}
                  className="w-full flex items-center space-x-3 p-2 md:p-3 rounded-lg text-gray-200 transition-colors"
                  onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "rgba(52, 73, 94, 0.3)")}
                  onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "transparent")}
                >
                  <i className="fas fa-cog text-white text-sm md:text-base"></i>
                  <span className="text-gray-200 text-sm md:text-base">Configurações</span>
                </button>
              </li>
              <li className="nav-item">
                <button
                  onClick={() => openModal("feedback-modal")}
                  className="w-full flex items-center space-x-3 p-2 md:p-3 rounded-lg text-gray-200 transition-colors"
                  onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "rgba(52, 73, 94, 0.3)")}
                  onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "transparent")}
                >
                  <i className="fas fa-comment-dots text-white text-sm md:text-base"></i>
                  <span className="text-gray-200 text-sm md:text-base">Contate-nos</span>
                </button>
              </li>
              {isAdmin && (
                <li className="nav-item">
                  <button
                    onClick={() => {
                      window.location.href = '/admin'
                    }}
                    className="w-full flex items-center space-x-3 p-2 md:p-3 rounded-lg text-yellow-200 transition-colors"
                    onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "rgba(234, 179, 8, 0.2)")}
                    onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "transparent")}
                    style={{ borderTop: "1px solid #34495e", marginTop: "0.5rem", paddingTop: "0.75rem" }}
                  >
                    <i className="fas fa-shield-alt text-yellow-400 text-sm md:text-base"></i>
                    <span className="text-yellow-200 text-sm md:text-base font-medium">Painel Admin</span>
                  </button>
                </li>
              )}
            </ul>
          </nav>

          <div
            className="user-area p-3 md:p-4 flex-shrink-0"
            style={{ borderTop: "1px solid #34495e", backgroundColor: "rgba(52, 73, 94, 0.3)" }}
          >
            <div className="flex items-center space-x-3">
              <div className="user-avatar">
                <i className="fas fa-user-circle text-xl md:text-2xl lg:text-3xl text-gray-200"></i>
              </div>
              <div className="user-info flex-1 min-w-0">
                <span className="block font-medium text-gray-200 text-sm md:text-base truncate">{user?.name}</span>
                <button
                  onClick={handleLogout}
                  className="text-xs md:text-sm text-gray-300 hover:text-white transition-colors"
                >
                  <i className="fas fa-sign-out-alt"></i> Sair
                </button>
              </div>
            </div>
          </div>
        </div>
      </aside>

      {/* Sidebar Overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-30 md:hidden"
          onClick={() => setSidebarOpen(false)}
        ></div>
      )}
    </>
  )
}

export default Sidebar