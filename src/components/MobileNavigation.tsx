import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'

interface MobileNavigationProps {
  openModal: (modalId: string) => void
  onNavigateToMain: () => void
  onNavigateToReports?: () => void
  onNavigateToClasses?: () => void
}

const MobileNavigation: React.FC<MobileNavigationProps> = ({
  openModal,
  onNavigateToMain,
  onNavigateToReports,
  onNavigateToClasses,
}) => {
  const { isAdmin } = useAuth()
  const navigate = useNavigate()
  const [moreOpen, setMoreOpen] = useState(false)

  return (
    <>
      {moreOpen && (
        <>
          <div
            className="fixed inset-0 z-30 md:hidden"
            onClick={() => setMoreOpen(false)}
          />
          <div className="fixed bottom-16 left-0 right-0 z-40 md:hidden bg-white border-t border-gray-200 shadow-2xl rounded-t-2xl px-4 py-3">
            <div className="w-10 h-1 bg-gray-300 rounded-full mx-auto mb-4" />
            <div className="grid grid-cols-3 gap-3 pb-2">
              <button
                onClick={() => { navigate('/scan'); setMoreOpen(false) }}
                className="flex flex-col items-center p-3 rounded-xl bg-gray-50 hover:bg-blue-50 hover:text-blue-600 text-gray-600 transition-colors"
              >
                <i className="fas fa-qrcode text-xl mb-1"></i>
                <span className="text-xs font-medium">Escanear</span>
              </button>
              <button
                onClick={() => { openModal('feedback-modal'); setMoreOpen(false) }}
                className="flex flex-col items-center p-3 rounded-xl bg-gray-50 hover:bg-blue-50 hover:text-blue-600 text-gray-600 transition-colors"
              >
                <i className="fas fa-comment-dots text-xl mb-1"></i>
                <span className="text-xs font-medium">Contate-nos</span>
              </button>
              <button
                onClick={() => { openModal('configuracoes-submenu-modal'); setMoreOpen(false) }}
                className="flex flex-col items-center p-3 rounded-xl bg-gray-50 hover:bg-blue-50 hover:text-blue-600 text-gray-600 transition-colors"
              >
                <i className="fas fa-cog text-xl mb-1"></i>
                <span className="text-xs font-medium">Configurações</span>
              </button>
              {isAdmin && (
                <button
                  onClick={() => { window.location.href = '/admin'; setMoreOpen(false) }}
                  className="flex flex-col items-center p-3 rounded-xl bg-yellow-50 hover:bg-yellow-100 text-yellow-600 transition-colors"
                >
                  <i className="fas fa-shield-alt text-xl mb-1"></i>
                  <span className="text-xs font-medium">Admin</span>
                </button>
              )}
            </div>
          </div>
        </>
      )}

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
            onClick={() => openModal('meus-itens-submenu-modal')}
            className="flex flex-col items-center p-2 text-gray-600 hover:text-blue-600 transition-colors"
          >
            <i className="fas fa-folder text-xl"></i>
            <span className="text-xs mt-1 font-medium">Itens</span>
          </button>
          <button
            onClick={() => onNavigateToClasses && onNavigateToClasses()}
            className="flex flex-col items-center p-2 text-gray-600 hover:text-blue-600 transition-colors"
          >
            <i className="fas fa-users text-xl"></i>
            <span className="text-xs mt-1 font-medium">Turmas</span>
          </button>
          <button
            onClick={() => openModal('avaliacoes-submenu-modal')}
            className="flex flex-col items-center p-2 text-gray-600 hover:text-blue-600 transition-colors"
          >
            <i className="fas fa-file-alt text-xl"></i>
            <span className="text-xs mt-1 font-medium">Avaliações</span>
          </button>
          <button
            onClick={() => onNavigateToReports ? onNavigateToReports() : openModal('relatorios-submenu-modal')}
            className="flex flex-col items-center p-2 text-gray-600 hover:text-blue-600 transition-colors"
          >
            <i className="fas fa-chart-bar text-xl"></i>
            <span className="text-xs mt-1 font-medium">Relatórios</span>
          </button>
          <button
            onClick={() => setMoreOpen(prev => !prev)}
            className={`flex flex-col items-center p-2 transition-colors ${moreOpen ? 'text-blue-600' : 'text-gray-600 hover:text-blue-600'}`}
          >
            <i className="fas fa-ellipsis-h text-xl"></i>
            <span className="text-xs mt-1 font-medium">Mais</span>
          </button>
        </div>
      </nav>
    </>
  )
}

export default MobileNavigation
