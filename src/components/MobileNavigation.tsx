import React from 'react'

interface MobileNavigationProps {
  openModal: (modalId: string) => void
  onNavigateToMain: () => void
  onNavigateToReports?: () => void
}

const MobileNavigation: React.FC<MobileNavigationProps> = ({ openModal, onNavigateToMain, onNavigateToReports }) => {
  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white border-t-2 border-gray-200 shadow-xl z-30 md:hidden">
      <div className="flex justify-around py-2">
        <button
          onClick={onNavigateToMain}
          className="flex flex-col items-center p-2 text-blue-600"
        >
          <i className="fas fa-home text-xl"></i>
          <span className="text-xs mt-1 font-medium">Início</span>
        </button>
        <button
          onClick={() => openModal("meus-itens-submenu-modal")}
          className="flex flex-col items-center p-2 text-gray-600 hover:text-blue-600 transition-colors"
        >
          <i className="fas fa-folder text-xl"></i>
          <span className="text-xs mt-1 font-medium">Itens</span>
        </button>
        <button
          onClick={() => openModal("avaliacoes-submenu-modal")}
          className="flex flex-col items-center p-2 text-gray-600 hover:text-blue-600 transition-colors"
        >
          <i className="fas fa-file-alt text-xl"></i>
          <span className="text-xs mt-1 font-medium">Avaliações</span>
        </button>
        <button
          onClick={() => onNavigateToReports ? onNavigateToReports() : openModal("relatorios-submenu-modal")}
          className="flex flex-col items-center p-2 text-gray-600 hover:text-blue-600 transition-colors"
        >
          <i className="fas fa-chart-bar text-xl"></i>
          <span className="text-xs mt-1 font-medium">Relatórios</span>
        </button>
        <button
          onClick={() => openModal("configuracoes-submenu-modal")}
          className="flex flex-col items-center p-2 text-gray-600 hover:text-blue-600 transition-colors"
        >
          <i className="fas fa-cog text-xl"></i>
          <span className="text-xs mt-1 font-medium">Config</span>
        </button>
      </div>
    </nav>
  )
}

export default MobileNavigation