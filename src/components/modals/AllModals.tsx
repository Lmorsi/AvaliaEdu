import React, { useState } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import PaginatedResultsModal from './PaginatedResultsModal'
import StudentsModal from './StudentsModal'
import GradingModal from './GradingModal'
import FolderModal from './FolderModal'
import FeedbackModal from './FeedbackModal'

interface AssessmentItemProps {
  assessment: any
  dashboard: any
}

const AssessmentItem: React.FC<AssessmentItemProps> = ({ assessment, dashboard }) => {
  const [isLoadingView, setIsLoadingView] = useState(false)
  const [isLoadingDownload, setIsLoadingDownload] = useState(false)

  const createdDate = assessment.created_at || assessment.data
  const formattedDate = createdDate
    ? new Date(createdDate).toLocaleDateString('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      })
    : 'Data não disponível'

  const handleView = async () => {
    setIsLoadingView(true)
    try {
      const pdfBlob = await dashboard.generateAssessmentPDF(assessment)
      const url = URL.createObjectURL(pdfBlob)
      window.open(url, '_blank')
    } catch (error: any) {
      console.error('Erro ao visualizar PDF:', error)
      const errorMsg = error?.message || 'Erro desconhecido'
      if (errorMsg.includes('servidor')) {
        alert('❌ Erro ao visualizar PDF\n\n' +
          '🔧 O servidor de PDF não está disponível.\n\n' +
          'Soluções:\n' +
          '1. Inicie o servidor localmente:\n' +
          '   • Abra um terminal na pasta "server"\n' +
          '   • Execute: npm install\n' +
          '   • Execute: npm start\n\n' +
          '2. Ou faça deploy gratuito em:\n' +
          '   • Railway.app (recomendado)\n' +
          '   • Heroku\n' +
          '   • Render.com\n\n' +
          'Veja instruções completas no arquivo server/README.md')
      } else {
        alert('Erro ao visualizar PDF: ' + errorMsg)
      }
    } finally {
      setIsLoadingView(false)
    }
  }

  const handleDownload = async () => {
    setIsLoadingDownload(true)
    try {
      const pdfBlob = await dashboard.generateAssessmentPDF(assessment)
      const url = URL.createObjectURL(pdfBlob)
      const link = document.createElement('a')
      link.href = url
      const fileName = `${assessment.nomeAvaliacao || assessment.nome_avaliacao || 'avaliacao'}_${assessment.turma}.pdf`.replace(/\s+/g, '_')
      link.download = fileName
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(url)
    } catch (error: any) {
      console.error('Erro ao baixar PDF:', error)
      const errorMsg = error?.message || 'Erro desconhecido'
      if (errorMsg.includes('servidor')) {
        alert('❌ Erro ao baixar PDF\n\n' +
          '🔧 O servidor de PDF não está disponível.\n\n' +
          'Soluções:\n' +
          '1. Inicie o servidor localmente:\n' +
          '   • Abra um terminal na pasta "server"\n' +
          '   • Execute: npm install\n' +
          '   • Execute: npm start\n\n' +
          '2. Ou faça deploy gratuito em:\n' +
          '   • Railway.app (recomendado)\n' +
          '   • Heroku\n' +
          '   • Render.com\n\n' +
          'Veja instruções completas no arquivo server/README.md')
      } else {
        alert('Erro ao baixar PDF: ' + errorMsg)
      }
    } finally {
      setIsLoadingDownload(false)
    }
  }

  return (
    <div className="border rounded-lg p-4 hover:shadow-md transition-shadow bg-white">
      <div className="flex justify-between items-start">
        <div className="flex-1">
          <h4 className="font-semibold text-gray-900 mb-2 text-lg">
            {assessment.nomeAvaliacao || assessment.nome_avaliacao || assessment.tipoAvaliacao || 'Avaliação'}
          </h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm text-gray-600 mb-3">
            <div>
              <i className="fas fa-user text-blue-500 mr-2"></i>
              <span className="font-medium">Professor:</span> {assessment.professor}
            </div>
            <div>
              <i className="fas fa-users text-green-500 mr-2"></i>
              <span className="font-medium">Turma:</span> {assessment.turma}
            </div>
            <div>
              <i className="fas fa-calendar text-purple-500 mr-2"></i>
              <span className="font-medium">Data:</span> {assessment.data}
            </div>
            <div>
              <i className="fas fa-list-ol text-orange-500 mr-2"></i>
              <span className="font-medium">Questões:</span>{' '}
              {assessment.selectedItems?.length || assessment.selected_items?.length || 0}
            </div>
          </div>
          <div className="flex items-center text-xs text-gray-500">
            <i className="fas fa-clock mr-1"></i>
            Criada em: {formattedDate}
          </div>
        </div>
        <div className="flex flex-col space-y-2 ml-4">
          <button
            onClick={handleView}
            disabled={isLoadingView || isLoadingDownload}
            className={`px-4 py-2 rounded-md transition-all text-sm whitespace-nowrap flex items-center justify-center min-w-[130px] ${
              isLoadingView || isLoadingDownload
                ? 'bg-gray-300 cursor-not-allowed text-gray-600'
                : 'bg-blue-600 hover:bg-blue-700 text-white'
            }`}
          >
            {isLoadingView ? (
              <>
                <svg className="animate-spin h-5 w-5 mr-2" viewBox="0 0 24 24">
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                    fill="none"
                  ></circle>
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  ></path>
                </svg>
                Carregando...
              </>
            ) : (
              <>
                <i className={`fas fa-eye mr-2 ${isLoadingDownload ? 'opacity-50' : ''}`}></i>
                Visualizar
              </>
            )}
          </button>
          <button
            onClick={handleDownload}
            disabled={isLoadingView || isLoadingDownload}
            className={`px-4 py-2 rounded-md transition-all text-sm whitespace-nowrap flex items-center justify-center min-w-[130px] ${
              isLoadingView || isLoadingDownload
                ? 'bg-gray-300 cursor-not-allowed text-gray-600'
                : 'bg-green-600 hover:bg-green-700 text-white'
            }`}
          >
            {isLoadingDownload ? (
              <>
                <svg className="animate-spin h-5 w-5 mr-2" viewBox="0 0 24 24">
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                    fill="none"
                  ></circle>
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  ></path>
                </svg>
                Baixando...
              </>
            ) : (
              <>
                <i className={`fas fa-download mr-2 ${isLoadingView ? 'opacity-50' : ''}`}></i>
                Baixar PDF
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  )
}

interface AllModalsProps {
  dashboard: any
  onNavigateToGrading?: () => void
  onNavigateToMain?: () => void
  updateUserName?: (name: string) => void
  userId?: string
  userName?: string
  userEmail?: string
}

const AllModals: React.FC<AllModalsProps> = ({ dashboard, onNavigateToGrading, onNavigateToMain, updateUserName, userId, userName, userEmail }) => {
  const { isAdmin } = useAuth()
  const [previewPdfUrl, setPreviewPdfUrl] = React.useState<string | null>(null)
  const [isLoadingPreview, setIsLoadingPreview] = React.useState(false)
  const [previewError, setPreviewError] = React.useState<string | null>(null)

  // Função para carregar a pré-visualização
  const loadPreview = async () => {
    setIsLoadingPreview(true)
    setPreviewError(null)
    
    try {
      const pdfUrl = await dashboard.generatePDFPreview(dashboard.previewColumns)
      setPreviewPdfUrl(pdfUrl)
    } catch (error) {
      console.error('Erro ao carregar pré-visualização:', error)
      setPreviewError(error.message || 'Erro ao carregar pré-visualização')
    } finally {
      setIsLoadingPreview(false)
    }
  }

  // Carregar preview quando o modal abrir ou quando as colunas mudarem
  React.useEffect(() => {
    if (dashboard.activeModal === "preview-modal") {
      loadPreview()
    }
  }, [dashboard.activeModal, dashboard.previewColumns])

  // Limpar URL do blob quando o modal fechar
  React.useEffect(() => {
    if (dashboard.activeModal !== "preview-modal" && previewPdfUrl) {
      URL.revokeObjectURL(previewPdfUrl)
      setPreviewPdfUrl(null)
    }
  }, [dashboard.activeModal])

  return (
    <>
      {/* Modal de Feedback */}
      <FeedbackModal
        isOpen={dashboard.activeModal === "feedback-modal"}
        onClose={dashboard.closeModal}
        userId={userId}
        userName={userName || ''}
        userEmail={userEmail || ''}
      />

      {/* Modal de Estudantes */}
      <StudentsModal
        isOpen={dashboard.showStudentsModal}
        onClose={() => dashboard.setShowStudentsModal(false)}
        dashboard={dashboard}
      />

      {/* Modal de Correção */}
      <GradingModal
        isOpen={dashboard.showGradingModal}
        onClose={() => dashboard.setShowGradingModal(false)}
        dashboard={dashboard}
      />

      {/* Modal de Pastas */}
      <FolderModal
        isOpen={dashboard.showFolderModal}
        onClose={() => dashboard.setShowFolderModal(false)}
        dashboard={dashboard}
      />

      {/* Modal de confirmação de cancelamento */}
      {dashboard.showCancelConfirmation && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg p-6 max-w-md w-full">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Confirmar cancelamento</h3>
            <p className="text-sm text-gray-600 mb-6">
              Você tem dados não salvos. Tem certeza que deseja cancelar?
            </p>
            <div className="flex space-x-3">
              <button
                onClick={() => dashboard.setShowCancelConfirmation(false)}
                className="flex-1 bg-gray-200 text-gray-800 py-2 px-4 rounded-md hover:bg-gray-300 transition-colors"
              >
                Continuar editando
              </button>
              <button
                onClick={dashboard.confirmCancel}
                className="flex-1 bg-red-600 text-white py-2 px-4 rounded-md hover:bg-red-700 transition-colors"
              >
                Sim, cancelar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de sucesso ao salvar */}
      {dashboard.showSaveSuccess && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg p-6 max-w-md w-full text-center">
            <div className="text-green-600 text-4xl mb-4">
              <i className="fas fa-check-circle"></i>
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">Item salvo com sucesso!</h3>
            <p className="text-sm text-gray-600">
              O item foi adicionado à sua biblioteca e está disponível para pesquisa.
            </p>
          </div>
        </div>
      )}

      {/* Modal de detalhes do item */}
      {dashboard.activeModal === "item-details-modal" && dashboard.selectedItem && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-medium text-gray-900">Detalhes do Item</h3>
                <button
                  onClick={dashboard.closeModal}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <i className="fas fa-times text-xl"></i>
                </button>
              </div>

              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Autor:</label>
                    <p className="text-sm text-gray-900">{dashboard.selectedItem.autor || "Não informado"}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Etapa de Ensino:</label>
                    <p className="text-sm text-gray-900">{dashboard.selectedItem.etapa_ensino || dashboard.selectedItem.etapaEnsino || "Não informada"}</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Disciplina:</label>
                    <p className="text-sm text-gray-900">{dashboard.selectedItem.disciplina || "Não informada"}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Tipo do Item:</label>
                    <p className="text-sm text-gray-900">
                      {(() => {
                        const tipoItem = dashboard.selectedItem.tipo_item || dashboard.selectedItem.tipoItem;
                        return tipoItem === "multipla_escolha" ? "Múltipla Escolha" :
                               tipoItem === "verdadeiro_falso" ? "Verdadeiro/Falso" :
                               tipoItem === "discursiva" ? "Discursiva" : "Não especificado";
                      })()}
                    </p>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Descritor:</label>
                  <p className="text-sm text-gray-900">{dashboard.selectedItem.descritor}</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Texto do Item:</label>
                  <div className="text-sm text-gray-900 border rounded-md p-3 bg-gray-50">
                    <div dangerouslySetInnerHTML={{ __html: dashboard.selectedItem.texto_item || dashboard.selectedItem.textoItem || '' }} />
                  </div>
                </div>

                {(() => {
                  const tipoItem = dashboard.selectedItem.tipo_item || dashboard.selectedItem.tipoItem;
                  return tipoItem === "multipla_escolha";
                })() && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Alternativas:</label>
                    <div className="space-y-2">
                      {(dashboard.selectedItem.alternativas || []).map((alt: string, index: number) => (
                        alt && alt.trim() && (
                          <div key={index} className="flex items-center space-x-2">
                            <span className="text-sm font-medium text-gray-700">
                              {String.fromCharCode(65 + index)}:
                            </span>
                            <span className="text-sm text-gray-900">{alt}</span>
                            {(dashboard.selectedItem.resposta_correta || dashboard.selectedItem.respostaCorreta) === String.fromCharCode(65 + index) && (
                              <span className="text-green-600 text-xs">✓ Correta</span>
                            )}
                          </div>
                        )
                      ))}
                    </div>
                  </div>
                )}

                {(() => {
                  const tipoItem = dashboard.selectedItem.tipo_item || dashboard.selectedItem.tipoItem;
                  return tipoItem === "verdadeiro_falso";
                })() && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Afirmativas:</label>
                    <div className="space-y-3">
                      {(() => {
                        const afirmativas = [
                          ...(dashboard.selectedItem.afirmativas || []),
                          ...(dashboard.selectedItem.afirmativas_extras || dashboard.selectedItem.afirmativasExtras || [])
                        ].filter((afirm: string) => afirm && afirm.trim())
                        const gabaritos = [
                          ...(dashboard.selectedItem.gabarito_afirmativas || dashboard.selectedItem.gabaritoAfirmativas || []),
                          ...(dashboard.selectedItem.gabarito_afirmativas_extras || dashboard.selectedItem.gabaritoAfirmativasExtras || [])
                        ]

                        return afirmativas.map((afirm: string, index: number) => (
                          <div key={index} className="bg-gray-50 p-3 rounded border border-gray-200">
                            <div className="flex items-start space-x-2 mb-1">
                              <span className="text-sm font-medium text-gray-700 min-w-[24px]">{index + 1}:</span>
                              <span className="text-sm text-gray-900 flex-1">{afirm}</span>
                            </div>
                            <div className="ml-6">
                              <span className="text-xs font-medium text-gray-600">Gabarito: </span>
                              <span className={`text-xs font-bold ${gabaritos[index] === 'V' ? 'text-green-700' : 'text-red-700'}`}>
                                {gabaritos[index] === 'V' ? 'Verdadeiro' : 'Falso'}
                              </span>
                            </div>
                          </div>
                        ))
                      })()}
                    </div>
                  </div>
                )}

                {(() => {
                  const tipoItem = dashboard.selectedItem.tipo_item || dashboard.selectedItem.tipoItem;
                  return tipoItem === "discursiva";
                })() && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Linhas para resposta:</label>
                    <p className="text-sm text-gray-900">{dashboard.selectedItem.quantidade_linhas || dashboard.selectedItem.quantidadeLinhas || 5} linhas</p>
                  </div>
                )}

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Justificativas:</label>
                  <p className="text-sm text-gray-900">{dashboard.selectedItem.justificativas}</p>
                </div>
              </div>

              <div className="flex justify-end space-x-3 mt-6 pt-4 border-t">
                <button
                  onClick={dashboard.closeModal}
                  className="bg-gray-200 text-gray-800 py-2 px-4 rounded-md hover:bg-gray-300 transition-colors"
                >
                  Fechar
                </button>
                <button
                  onClick={() => dashboard.handleAddItemToAssessment(dashboard.selectedItem)}
                  className="bg-green-600 text-white py-2 px-4 rounded-md hover:bg-green-700 transition-colors"
                >
                  <i className="fas fa-plus mr-2"></i>
                  Adicionar à Avaliação
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal de preview */}
      {dashboard.activeModal === "preview-modal" && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-2">
          <div className="bg-white rounded-lg max-w-7xl w-full max-h-[95vh] overflow-hidden flex flex-col">
            <div className="p-6">
              {/* Header do modal */}
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h3 className="text-lg font-medium text-gray-900">
                    Pré-visualização da Avaliação
                  </h3>
                  <p className="text-sm text-gray-500 mt-1">
                    {dashboard.previewColumns} coluna{dashboard.previewColumns === "2" ? "s" : ""} • 
                    {dashboard.selectedItemsForAssessment.length} quest{dashboard.selectedItemsForAssessment.length !== 1 ? 'ões' : ''} • 
                  </p>
                </div>
                <button
                  onClick={dashboard.closeModal}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <i className="fas fa-times text-xl"></i>
                </button>
              </div>

              {/* Controles de layout */}
              <div className="mb-4 p-4 bg-gray-50 rounded-lg">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <span className="text-sm font-medium text-gray-700">Layout:</span>
                    <label className="flex items-center">
                      <input
                        type="radio"
                        name="previewColumns"
                        value="1"
                        checked={dashboard.previewColumns === "1"}
                        onChange={(e) => dashboard.setPreviewColumns(e.target.value)}
                        className="mr-2"
                        disabled={isLoadingPreview}
                      />
                      <span className="text-sm">1 Coluna</span>
                    </label>
                    <label className="flex items-center">
                      <input
                        type="radio"
                        name="previewColumns"
                        value="2"
                        checked={dashboard.previewColumns === "2"}
                        onChange={(e) => dashboard.setPreviewColumns(e.target.value)}
                        className="mr-2"
                        disabled={isLoadingPreview}
                      />
                      <span className="text-sm">2 Colunas</span>
                    </label>
                  </div>
                  <div className="flex items-center space-x-2">
                    {isLoadingPreview && (
                      <div className="text-xs text-blue-600 flex items-center">
                        <i className="fas fa-spinner fa-spin mr-1"></i>
                        Gerando PDF...
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Iframe com o PDF real do Puppeteer */}
            <div className="flex-1 bg-gray-100 p-4 overflow-auto">
              <div className="h-full flex flex-col">
                
                <div className="flex-1 bg-white rounded-lg shadow-lg overflow-hidden">
                  {isLoadingPreview ? (
                    <div className="h-full flex items-center justify-center">
                      <div className="text-center">
                        <div className="relative">
                          <div className="animate-spin rounded-full h-16 w-16 border-4 border-blue-200 border-t-blue-600 mx-auto mb-4"></div>
                          <div className="absolute inset-0 flex items-center justify-center">
                            <i className="fas fa-file-pdf text-blue-600 text-xl"></i>
                          </div>
                        </div>
                        <p className="text-gray-600">Gerando PDF...</p>
                        <p className="text-sm text-gray-500 mt-1">Isso pode levar alguns segundos</p>
                        <div className="mt-3 flex justify-center">
                          <div className="flex space-x-1">
                            <div className="w-2 h-2 bg-blue-600 rounded-full animate-bounce"></div>
                            <div className="w-2 h-2 bg-blue-600 rounded-full animate-bounce" style={{animationDelay: '0.1s'}}></div>
                            <div className="w-2 h-2 bg-blue-600 rounded-full animate-bounce" style={{animationDelay: '0.2s'}}></div>
                          </div>
                        </div>
                      </div>
                    </div>
                  ) : previewError ? (
                    <div className="h-full flex items-center justify-center">
                      <div className="text-center p-6">
                        <i className="fas fa-exclamation-triangle text-4xl text-red-500 mb-4"></i>
                        <h4 className="text-lg font-medium text-gray-900 mb-2">Erro na Pré-visualização</h4>
                        <p className="text-sm text-gray-600 mb-4">{previewError}</p>
                        <button
                          onClick={loadPreview}
                          className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors"
                        >
                          <i className="fas fa-redo mr-2"></i>
                          Tentar Novamente
                        </button>
                      </div>
                    </div>
                  ) : previewPdfUrl ? (
                    <iframe
                      src={previewPdfUrl}
                      className="w-full h-full border-0"
                      style={{
                        minHeight: '800px',
                        backgroundColor: 'white'
                      }}
                      title="Pré-visualização da Avaliação - PDF Real"
                    />
                  ) : (
                    <div className="h-full flex items-center justify-center">
                      <div className="text-center">
                        <i className="fas fa-file-pdf text-4xl text-gray-300 mb-4"></i>
                        <p className="text-gray-500">Carregando pré-visualização...</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Botões de ação */}
            <div className="p-6 border-t">
              <div className="flex justify-end space-x-3">
                <button
                  onClick={loadPreview}
                  disabled={isLoadingPreview}
                  className="bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <i className={`fas ${isLoadingPreview ? 'fa-spinner fa-spin' : 'fa-redo'} mr-2`}></i>
                  {isLoadingPreview ? 'Carregando...' : 'Recarregar Preview'}
                </button>
                <button
                  onClick={dashboard.closeModal}
                  className="bg-gray-200 text-gray-800 py-2 px-4 rounded-md hover:bg-gray-300 transition-colors"
                >
                  Fechar
                </button>
                <button
                  onClick={() => dashboard.generatePDF(dashboard.previewColumns)}
                  disabled={isLoadingPreview}
                  className="bg-red-600 text-white py-2 px-4 rounded-md hover:bg-red-700 transition-colors flex items-center disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <i className="fas fa-file-pdf mr-2"></i>
                  Baixar PDF ({dashboard.previewColumns} coluna{dashboard.previewColumns === "2" ? "s" : ""})
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal de seleção de colunas para PDF */}
      {dashboard.activeModal === "pdf-columns-modal" && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-md w-full">
            <div className="p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Escolha o layout do PDF</h3>
              
              <div className="space-y-3 mb-6">
                <label className="flex items-center p-3 border rounded-lg cursor-pointer hover:bg-gray-50">
                  <input
                    type="radio"
                    name="pdfColumns"
                    value="1"
                    checked={dashboard.previewColumns === "1"}
                    onChange={(e) => dashboard.setPreviewColumns(e.target.value)}
                    className="mr-3"
                  />
                  <div>
                    <div className="font-medium">1 Coluna</div>
                    <div className="text-sm text-gray-500">
                      Layout tradicional, mais espaçoso • 
                      {dashboard.assessmentData.layoutPaginas === "pagina3" ? "Questões a partir da página 3" : "Questões na página 1"}
                    </div>
                  </div>
                </label>
                
                <label className="flex items-center p-3 border rounded-lg cursor-pointer hover:bg-gray-50">
                  <input
                    type="radio"
                    name="pdfColumns"
                    value="2"
                    checked={dashboard.previewColumns === "2"}
                    onChange={(e) => dashboard.setPreviewColumns(e.target.value)}
                    className="mr-3"
                  />
                  <div>
                    <div className="font-medium">2 Colunas</div>
                    <div className="text-sm text-gray-500">
                      Layout compacto, mais questões por página • 
                      {dashboard.assessmentData.layoutPaginas === "pagina3" ? "Questões a partir da página 3" : "Questões na página 1"}
                    </div>
                  </div>
                </label>
              </div>

              <div className="flex space-x-3">
                <button
                  onClick={dashboard.closeModal}
                  className="flex-1 bg-gray-200 text-gray-800 py-2 px-4 rounded-md hover:bg-gray-300 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  onClick={() => dashboard.generatePDF(dashboard.previewColumns)}
                  className="flex-1 bg-green-600 text-white py-2 px-4 rounded-md hover:bg-green-700 transition-colors"
                >
                  <i className="fas fa-rocket mr-2"></i>
                  Gerar PDF da Avaliação
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modais de submenu */}
      {dashboard.activeModal === "meus-itens-submenu-modal" && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-md w-full">
            <div className="p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Meus Itens</h3>
              <div className="space-y-2">
                <button
                  onClick={() => {
                    dashboard.closeModal()
                    if (onNavigateToMain) {
                      onNavigateToMain()
                      setTimeout(() => {
                        dashboard.handleTabChange('items', 'search-items')
                      }, 0)
                    } else {
                      dashboard.handleTabChange('items', 'search-items')
                    }
                  }}
                  className="w-full text-left p-3 hover:bg-gray-100 rounded-md"
                >
                  <i className="fas fa-search mr-2"></i>
                  Pesquisar Itens
                </button>
                <button
                  onClick={() => {
                    dashboard.closeModal()
                    if (onNavigateToMain) {
                      onNavigateToMain()
                      setTimeout(() => {
                        dashboard.handleTabChange('items', 'create-item')
                      }, 0)
                    } else {
                      dashboard.handleTabChange('items', 'create-item')
                    }
                  }}
                  className="w-full text-left p-3 hover:bg-gray-100 rounded-md"
                >
                  <i className="fas fa-plus mr-2"></i>
                  Criar Novo Item
                </button>
                <button
                  onClick={() => {
                    dashboard.closeModal()
                    dashboard.openModal('gerenciar-itens-modal')
                  }}
                  className="w-full text-left p-3 hover:bg-gray-100 rounded-md"
                >
                  <i className="fas fa-folder mr-2"></i>
                  Gerenciar Meus Itens
                </button>
              </div>
              <div className="flex justify-end mt-6">
                <button
                  onClick={dashboard.closeModal}
                  className="bg-gray-200 text-gray-800 py-2 px-4 rounded-md hover:bg-gray-300 transition-colors"
                >
                  Fechar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {dashboard.activeModal === "avaliacoes-submenu-modal" && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-md w-full">
            <div className="p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Avaliações</h3>
              <div className="space-y-2">
                <button
                  onClick={() => {
                    dashboard.closeModal()
                    if (onNavigateToMain) {
                      onNavigateToMain()
                      setTimeout(() => {
                        dashboard.handleTabChange('assessments', 'search-assessments')
                      }, 0)
                    } else {
                      dashboard.handleTabChange('assessments', 'search-assessments')
                    }
                  }}
                  className="w-full text-left p-3 hover:bg-gray-100 rounded-md"
                >
                  <i className="fas fa-search mr-2"></i>
                  Pesquisar Avaliações
                </button>
                <button
                  onClick={() => {
                    dashboard.closeModal()
                    if (onNavigateToMain) {
                      onNavigateToMain()
                      setTimeout(() => {
                        dashboard.handleTabChange('assessments', 'create-assessment')
                      }, 0)
                    } else {
                      dashboard.handleTabChange('assessments', 'create-assessment')
                    }
                  }}
                  className="w-full text-left p-3 hover:bg-gray-100 rounded-md"
                >
                  <i className="fas fa-plus mr-2"></i>
                  Nova Avaliação
                </button>
                <button
                  onClick={() => {
                    dashboard.closeModal()
                    if (onNavigateToGrading) {
                      onNavigateToGrading()
                    }
                  }}
                  className="w-full text-left p-3 hover:bg-gray-100 rounded-md"
                >
                  <i className="fas fa-check-circle mr-2"></i>
                  Corrigir Avaliação
                </button>
                <button
                  onClick={() => {
                    dashboard.closeModal()
                    dashboard.openModal('minhas-avaliacoes-modal')
                  }}
                  className="w-full text-left p-3 hover:bg-gray-100 rounded-md"
                >
                  <i className="fas fa-file-pdf mr-2"></i>
                  Minhas Avaliações
                </button>
              </div>
              <div className="flex justify-end mt-6">
                <button
                  onClick={dashboard.closeModal}
                  className="bg-gray-200 text-gray-800 py-2 px-4 rounded-md hover:bg-gray-300 transition-colors"
                >
                  Fechar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}


      {dashboard.activeModal === "configuracoes-submenu-modal" && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-md w-full">
            <div className="p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Configurações</h3>
              <div className="space-y-2">
                <button
                  onClick={() => {
                    dashboard.closeModal()
                    dashboard.openModal('perfil-usuario-modal')
                  }}
                  className="w-full text-left p-3 hover:bg-gray-100 rounded-md"
                >
                  <i className="fas fa-user mr-2"></i>
                  Perfil do Usuário
                </button>
                <button
                  onClick={() => {
                    dashboard.closeModal()
                    dashboard.openModal('termos-uso-modal')
                  }}
                  className="w-full text-left p-3 hover:bg-gray-100 rounded-md"
                >
                  <i className="fas fa-shield-alt mr-2"></i>
                  Segurança
                </button>
                {isAdmin && (
                  <button
                    onClick={() => {
                      dashboard.closeModal()
                      window.location.href = '/admin'
                    }}
                    className="w-full text-left p-3 hover:bg-yellow-50 rounded-md border-t border-gray-200 text-yellow-700 font-medium"
                  >
                    <i className="fas fa-shield-alt mr-2 text-yellow-600"></i>
                    Painel Administrativo
                  </button>
                )}
              </div>
              <div className="flex justify-end mt-6">
                <button
                  onClick={dashboard.closeModal}
                  className="bg-gray-200 text-gray-800 py-2 px-4 rounded-md hover:bg-gray-300 transition-colors"
                >
                  Fechar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Gerenciar Itens */}
      {dashboard.activeModal === "gerenciar-itens-modal" && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-6xl max-h-[90vh] overflow-hidden flex flex-col">
            <div className="sticky top-0 bg-white border-b p-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900">
                <i className="fas fa-folder-open mr-2 text-blue-600"></i>
                Gerenciar Meus Itens
              </h2>
              <button
                onClick={dashboard.closeModal}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <i className="fas fa-times text-xl"></i>
              </button>
            </div>

            <div className="p-4 border-b bg-gray-50">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Pesquisar
                  </label>
                  <input
                    type="text"
                    value={dashboard.myItemsFilters.searchTerm}
                    placeholder="Buscar por descritor ou texto..."
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    onChange={(e) => dashboard.setMyItemsFilters?.((prev: any) => ({ ...prev, searchTerm: e.target.value }))}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Disciplina
                  </label>
                  <select
                    value={dashboard.myItemsFilters.discipline}
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    onChange={(e) => dashboard.setMyItemsFilters?.((prev: any) => ({ ...prev, discipline: e.target.value }))}
                  >
                    <option value="">Todas</option>
                    <option value="matematica">Matemática</option>
                    <option value="lingua_portuguesa">Língua Portuguesa</option>
                    <option value="arte">Arte</option>
                    <option value="historia">História</option>
                    <option value="geografia">Geografia</option>
                    <option value="ciencias">Ciências</option>
                    <option value="fisica">Física</option>
                    <option value="quimica">Química</option>
                    <option value="biologia">Biologia</option>
                    <option value="ingles">Inglês</option>
                    <option value="espanhol">Espanhol</option>
                    <option value="filosofia">Filosofia</option>
                    <option value="sociologia">Sociologia</option>
                    <option value="educacao_fisica">Educação Física</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Tipo de Item
                  </label>
                  <select
                    value={dashboard.myItemsFilters.type}
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    onChange={(e) => dashboard.setMyItemsFilters?.((prev: any) => ({ ...prev, type: e.target.value }))}
                  >
                    <option value="">Todos</option>
                    <option value="multipla_escolha">Múltipla Escolha</option>
                    <option value="verdadeiro_falso">Verdadeiro/Falso</option>
                    <option value="discursiva">Discursiva</option>
                  </select>
                </div>
              </div>
              <div className="flex justify-end">
                <button
                  onClick={() => dashboard.handleSearchMyItems?.()}
                  className="bg-blue-600 text-white px-6 py-2 rounded-md hover:bg-blue-700 transition-colors text-sm font-medium flex items-center"
                >
                  <i className="fas fa-search mr-2"></i>
                  Pesquisar Meus Itens
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4">
              {dashboard.filteredSavedItems.length === 0 ? (
                <div className="text-center py-12">
                  <i className="fas fa-folder-open text-5xl text-gray-300 mb-4"></i>
                  <p className="text-gray-500 mb-2">
                    {dashboard.savedItems.filter((item: any) => item.user_id === userId).length === 0 ? 'Nenhum item criado ainda' : 'Nenhum item encontrado com os filtros aplicados'}
                  </p>
                  <p className="text-sm text-gray-400">
                    {dashboard.savedItems.filter((item: any) => item.user_id === userId).length === 0 ? 'Crie seu primeiro item para começar' : 'Tente ajustar os filtros de pesquisa'}
                  </p>
                </div>
              ) : (
                <>
                  <div className="space-y-3">
                    {(() => {
                      const startIndex = (dashboard.myItemsCurrentPage - 1) * dashboard.myItemsPerPage
                      const endIndex = startIndex + dashboard.myItemsPerPage
                      const paginatedItems = dashboard.filteredSavedItems.slice(startIndex, endIndex)

                      return paginatedItems.map((item: any) => (
                    <div key={item.id} className="border rounded-lg p-4 hover:shadow-md transition-shadow">
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex-1">
                          <h4 className="font-medium text-gray-900 mb-1">
                            {item.descritor}
                          </h4>
                          <div className="flex items-center space-x-2 mb-2">
                            <span className="text-xs px-2 py-1 rounded-full font-medium bg-emerald-100 text-emerald-800">
                              {(item.tipo_item || item.tipoItem) === 'multipla_escolha' ? 'Múltipla Escolha' :
                               (item.tipo_item || item.tipoItem) === 'verdadeiro_falso' ? 'Verdadeiro/Falso' : 'Discursiva'}
                            </span>
                            <span className="text-xs px-2 py-1 rounded-full font-medium bg-blue-100 text-blue-800">
                              {item.disciplina}
                            </span>
                          </div>
                          <p className="text-sm text-gray-600 line-clamp-2">
                            {(item.texto_item || item.textoItem)?.replace(/<[^>]*>/g, '').substring(0, 150)}...
                          </p>
                        </div>
                        <div className="flex items-center space-x-2 ml-4">
                          <button
                            onClick={() => dashboard.handleViewItemDetails(item)}
                            className="text-blue-600 hover:text-blue-700 px-3 py-1 rounded text-sm border border-blue-200 hover:bg-blue-50 transition-colors"
                          >
                            <i className="fas fa-eye mr-1"></i>
                            Ver
                          </button>
                          {item.user_id === userId && (
                            <button
                              onClick={() => dashboard.handleDeleteItem(item.id)}
                              className="text-red-600 hover:text-red-700 px-3 py-1 rounded text-sm border border-red-200 hover:bg-red-50 transition-colors"
                            >
                              <i className="fas fa-trash mr-1"></i>
                              Excluir
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                      ))
                    })()}
                  </div>

                  {/* Controles de Paginação */}
                  {dashboard.filteredSavedItems.length > dashboard.myItemsPerPage && (
                    <div className="mt-6 flex items-center justify-between border-t pt-4">
                      <div className="text-sm text-gray-600">
                        Mostrando {((dashboard.myItemsCurrentPage - 1) * dashboard.myItemsPerPage) + 1} a{' '}
                        {Math.min(dashboard.myItemsCurrentPage * dashboard.myItemsPerPage, dashboard.filteredSavedItems.length)} de{' '}
                        {dashboard.filteredSavedItems.length} itens
                      </div>
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => dashboard.setMyItemsCurrentPage(dashboard.myItemsCurrentPage - 1)}
                          disabled={dashboard.myItemsCurrentPage === 1}
                          className="px-3 py-1 rounded border border-gray-300 text-sm hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        >
                          <i className="fas fa-chevron-left mr-1"></i>
                          Anterior
                        </button>
                        <div className="flex items-center space-x-1">
                          {(() => {
                            const totalPages = Math.ceil(dashboard.filteredSavedItems.length / dashboard.myItemsPerPage)
                            const pages = []

                            for (let i = 1; i <= totalPages; i++) {
                              if (
                                i === 1 ||
                                i === totalPages ||
                                (i >= dashboard.myItemsCurrentPage - 1 && i <= dashboard.myItemsCurrentPage + 1)
                              ) {
                                pages.push(
                                  <button
                                    key={i}
                                    onClick={() => dashboard.setMyItemsCurrentPage(i)}
                                    className={`w-8 h-8 rounded text-sm ${
                                      i === dashboard.myItemsCurrentPage
                                        ? 'bg-blue-600 text-white'
                                        : 'border border-gray-300 hover:bg-gray-50'
                                    }`}
                                  >
                                    {i}
                                  </button>
                                )
                              } else if (
                                i === dashboard.myItemsCurrentPage - 2 ||
                                i === dashboard.myItemsCurrentPage + 2
                              ) {
                                pages.push(
                                  <span key={i} className="px-2 text-gray-400">
                                    ...
                                  </span>
                                )
                              }
                            }

                            return pages
                          })()}
                        </div>
                        <button
                          onClick={() => dashboard.setMyItemsCurrentPage(dashboard.myItemsCurrentPage + 1)}
                          disabled={dashboard.myItemsCurrentPage === Math.ceil(dashboard.filteredSavedItems.length / dashboard.myItemsPerPage)}
                          className="px-3 py-1 rounded border border-gray-300 text-sm hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        >
                          Próxima
                          <i className="fas fa-chevron-right ml-1"></i>
                        </button>
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>

            <div className="flex justify-end p-4 border-t bg-gray-50">
              <button
                onClick={dashboard.closeModal}
                className="bg-gray-600 text-white py-2 px-4 rounded-md hover:bg-gray-700 transition-colors"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Seleção de Avaliação para Correção */}
      {dashboard.showAssessmentSelectionModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[80vh] flex flex-col">
            <div className="flex items-center justify-between p-4 border-b">
              <h3 className="text-lg font-semibold text-gray-900">
                <i className="fas fa-file-alt mr-2 text-green-600"></i>
                Selecionar Avaliação
              </h3>
              <button
                onClick={() => dashboard.setShowAssessmentSelectionModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <i className="fas fa-times text-xl"></i>
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4">
              <div className="space-y-3">
                {dashboard.savedAssessments
                  .sort((a: any, b: any) => {
                    const dateA = new Date(a.created_at || a.data_criacao).getTime()
                    const dateB = new Date(b.created_at || b.data_criacao).getTime()
                    return dateB - dateA // Mais recente primeiro
                  })
                  .map((assessment: any) => {
                    const selectedItems = assessment.selectedItems || assessment.selected_items || []
                    const nomeAvaliacao = assessment.nomeAvaliacao || assessment.nome_avaliacao ||
                                          assessment.tipoAvaliacao || assessment.tipo_avaliacao || 'Avaliação sem nome'
                    const tipoAvaliacao = assessment.tipoAvaliacao || assessment.tipo_avaliacao || 'Sem tipo'
                    const dataCreated = new Date(assessment.created_at || assessment.data_criacao)
                    const isSelected = dashboard.selectedAssessmentForGrading?.id === assessment.id

                    return (
                      <button
                        key={assessment.id}
                        onClick={() => {
                          dashboard.handleSelectAssessmentForGrading(assessment.id.toString())
                          dashboard.setShowAssessmentSelectionModal(false)
                        }}
                        className={`w-full text-left p-4 border-2 rounded-lg transition-all hover:shadow-md ${
                          isSelected
                            ? 'border-green-500 bg-green-50'
                            : 'border-gray-200 hover:border-green-300'
                        }`}
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <h4 className="font-medium text-gray-900 mb-1">
                              {nomeAvaliacao}
                            </h4>
                            <div className="flex items-center space-x-3 text-sm text-gray-600">
                              <span className="flex items-center">
                                <i className="fas fa-tag mr-1 text-blue-500"></i>
                                {tipoAvaliacao}
                              </span>
                              <span className="flex items-center">
                                <i className="fas fa-question-circle mr-1 text-purple-500"></i>
                                {selectedItems.length} questões
                              </span>
                              <span className="flex items-center">
                                <i className="fas fa-calendar mr-1 text-gray-400"></i>
                                {dataCreated.toLocaleDateString('pt-BR')}
                              </span>
                            </div>
                            {assessment.turma && (
                              <p className="text-xs text-gray-500 mt-1">
                                <i className="fas fa-users mr-1"></i>
                                Turma: {assessment.turma}
                              </p>
                            )}
                          </div>
                          {isSelected && (
                            <div className="ml-4">
                              <i className="fas fa-check-circle text-2xl text-green-600"></i>
                            </div>
                          )}
                        </div>
                      </button>
                    )
                  })}
              </div>
            </div>

            <div className="flex justify-end p-4 border-t bg-gray-50">
              <button
                onClick={() => dashboard.setShowAssessmentSelectionModal(false)}
                className="bg-gray-600 text-white py-2 px-4 rounded-md hover:bg-gray-700 transition-colors"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Seleção de Avaliação para Imprimir Folhas */}
      {dashboard.showSheetsAssessmentModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[80vh] flex flex-col">
            <div className="flex items-center justify-between p-4 border-b">
              <h3 className="text-lg font-semibold text-gray-900">
                <i className="fas fa-print mr-2 text-blue-600"></i>
                Selecionar Avaliação para Imprimir Folhas
              </h3>
              <button
                onClick={() => dashboard.setShowSheetsAssessmentModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <i className="fas fa-times text-xl"></i>
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4">
              <div className="space-y-3">
                {dashboard.savedAssessments
                  .sort((a: any, b: any) => {
                    const dateA = new Date(a.created_at || a.data_criacao).getTime()
                    const dateB = new Date(b.created_at || b.data_criacao).getTime()
                    return dateB - dateA
                  })
                  .map((assessment: any) => {
                    const selectedItems = assessment.selectedItems || assessment.selected_items || []
                    const nomeAvaliacao = assessment.nomeAvaliacao || assessment.nome_avaliacao ||
                                          assessment.tipoAvaliacao || assessment.tipo_avaliacao || 'Avaliação sem nome'
                    const tipoAvaliacao = assessment.tipoAvaliacao || assessment.tipo_avaliacao || 'Sem tipo'
                    const dataCreated = new Date(assessment.created_at || assessment.data_criacao)
                    const isSelected = dashboard.selectedAssessmentForSheets?.id === assessment.id

                    return (
                      <button
                        key={assessment.id}
                        onClick={() => {
                          dashboard.setSelectedAssessmentForSheets(assessment)
                          dashboard.setShowSheetsAssessmentModal(false)
                        }}
                        className={`w-full text-left p-4 border-2 rounded-lg transition-all hover:shadow-md ${
                          isSelected
                            ? 'border-blue-500 bg-blue-50'
                            : 'border-gray-200 hover:border-blue-300'
                        }`}
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <h4 className="font-medium text-gray-900 mb-1">{nomeAvaliacao}</h4>
                            <div className="flex items-center space-x-3 text-sm text-gray-600">
                              <span className="flex items-center">
                                <i className="fas fa-tag mr-1 text-blue-500"></i>
                                {tipoAvaliacao}
                              </span>
                              <span className="flex items-center">
                                <i className="fas fa-question-circle mr-1 text-gray-400"></i>
                                {selectedItems.length} questões
                              </span>
                              <span className="flex items-center">
                                <i className="fas fa-calendar mr-1 text-gray-400"></i>
                                {dataCreated.toLocaleDateString('pt-BR')}
                              </span>
                            </div>
                            {assessment.turma && (
                              <p className="text-xs text-gray-500 mt-1">
                                <i className="fas fa-users mr-1"></i>
                                Turma: {assessment.turma}
                              </p>
                            )}
                          </div>
                          {isSelected && (
                            <div className="ml-4">
                              <i className="fas fa-check-circle text-2xl text-blue-600"></i>
                            </div>
                          )}
                        </div>
                      </button>
                    )
                  })}
              </div>
            </div>

            <div className="flex justify-end p-4 border-t bg-gray-50">
              <button
                onClick={() => dashboard.setShowSheetsAssessmentModal(false)}
                className="bg-gray-600 text-white py-2 px-4 rounded-md hover:bg-gray-700 transition-colors"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Gerenciar Avaliações */}
      {dashboard.activeModal === "gerenciar-avaliacoes-modal" && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-5xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-medium text-gray-900">Gerenciar Minhas Avaliações</h3>
                <button
                  onClick={dashboard.closeModal}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <i className="fas fa-times text-xl"></i>
                </button>
              </div>

              {dashboard.savedAssessments && dashboard.savedAssessments.length === 0 ? (
                <div className="text-center py-12">
                  <i className="fas fa-file-alt text-5xl text-gray-300 mb-4"></i>
                  <p className="text-gray-500 mb-2">Nenhuma avaliação criada ainda</p>
                  <p className="text-sm text-gray-400">Gere um PDF de avaliação para começar</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {(dashboard.savedAssessments || []).map((assessment: any) => (
                    <div key={assessment.id} className="border rounded-lg p-4 hover:shadow-md transition-shadow">
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <h4 className="font-medium text-gray-900 mb-2">
                            {assessment.nomeAvaliacao || assessment.tipoAvaliacao || 'Avaliação'}
                          </h4>
                          <div className="grid grid-cols-2 gap-2 text-sm text-gray-600 mb-2">
                            <div><span className="font-medium">Professor:</span> {assessment.professor}</div>
                            <div><span className="font-medium">Turma:</span> {assessment.turma}</div>
                            <div><span className="font-medium">Data:</span> {assessment.data}</div>
                            <div><span className="font-medium">Questões:</span> {assessment.selectedItems?.length || 0}</div>
                          </div>
                        </div>
                        <div className="flex items-center space-x-2 ml-4">
                          <button
                            onClick={() => {
                              dashboard.openModal('preview-assessment-modal')
                              dashboard.setSelectedAssessment(assessment)
                            }}
                            className="text-blue-600 hover:text-blue-700 px-3 py-1 rounded hover:bg-blue-50"
                          >
                            <i className="fas fa-eye mr-1"></i>
                            Ver
                          </button>
                          <button
                            onClick={() => {
                              if (confirm('Deseja realmente excluir esta avaliação?')) {
                                dashboard.setSavedAssessments((prev: any[]) =>
                                  prev.filter((a: any) => a.id !== assessment.id)
                                )
                              }
                            }}
                            className="text-red-600 hover:text-red-700 px-3 py-1 rounded hover:bg-red-50"
                          >
                            <i className="fas fa-trash mr-1"></i>
                            Excluir
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              <div className="flex justify-end mt-6 pt-4 border-t">
                <button
                  onClick={dashboard.closeModal}
                  className="bg-gray-200 text-gray-800 py-2 px-4 rounded-md hover:bg-gray-300 transition-colors"
                >
                  Fechar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Perfil do Usuário */}
      {dashboard.activeModal === "perfil-usuario-modal" && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-2xl w-full">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-medium text-gray-900">Perfil do Usuário</h3>
                <button
                  onClick={dashboard.closeModal}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <i className="fas fa-times text-xl"></i>
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Email de Login
                  </label>
                  <input
                    type="email"
                    value={dashboard.userProfile?.email || ''}
                    disabled
                    className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50 text-gray-500 cursor-not-allowed"
                  />
                  <p className="text-xs text-gray-500 mt-1">Este campo não pode ser editado</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Nome de Usuário
                  </label>
                  <input
                    type="text"
                    value={dashboard.userProfile?.name || ''}
                    onChange={(e) => dashboard.setUserProfile((prev: any) => ({ ...prev, name: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Nome da Instituição
                  </label>
                  <input
                    type="text"
                    value={dashboard.userProfile?.institution || ''}
                    onChange={(e) => dashboard.setUserProfile((prev: any) => ({ ...prev, institution: e.target.value }))}
                    placeholder="Digite o nome da sua instituição (opcional)"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div className="pt-4 border-t">
                  <button
                    onClick={() => {
                      dashboard.closeModal()
                      dashboard.openModal('alterar-senha-modal')
                    }}
                    className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 transition-colors"
                  >
                    <i className="fas fa-key mr-2"></i>
                    Alterar Senha de Acesso
                  </button>
                </div>
              </div>

              <div className="flex justify-end space-x-3 mt-6 pt-4 border-t">
                <button
                  onClick={dashboard.closeModal}
                  className="bg-gray-200 text-gray-800 py-2 px-4 rounded-md hover:bg-gray-300 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  onClick={() => {
                    if (updateUserName && dashboard.userProfile?.name) {
                      updateUserName(dashboard.userProfile.name)
                    }
                    alert('Perfil atualizado com sucesso!')
                    dashboard.closeModal()
                  }}
                  className="bg-green-600 text-white py-2 px-4 rounded-md hover:bg-green-700 transition-colors"
                >
                  <i className="fas fa-save mr-2"></i>
                  Salvar Alterações
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Alterar Senha */}
      {dashboard.activeModal === "alterar-senha-modal" && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-md w-full">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-medium text-gray-900">Alterar Senha</h3>
                <button
                  onClick={() => {
                    dashboard.closeModal()
                    dashboard.openModal('perfil-usuario-modal')
                  }}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <i className="fas fa-times text-xl"></i>
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Senha Atual
                  </label>
                  <input
                    type="password"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Nova Senha
                  </label>
                  <input
                    type="password"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Confirmar Nova Senha
                  </label>
                  <input
                    type="password"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div className="flex justify-end space-x-3 mt-6">
                <button
                  onClick={() => {
                    dashboard.closeModal()
                    dashboard.openModal('perfil-usuario-modal')
                  }}
                  className="bg-gray-200 text-gray-800 py-2 px-4 rounded-md hover:bg-gray-300 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  onClick={() => {
                    alert('Senha alterada com sucesso!')
                    dashboard.closeModal()
                    dashboard.openModal('perfil-usuario-modal')
                  }}
                  className="bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 transition-colors"
                >
                  <i className="fas fa-check mr-2"></i>
                  Confirmar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Termos de Uso */}
      {dashboard.activeModal === "termos-uso-modal" && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-medium text-gray-900">Termos de Uso</h3>
                <button
                  onClick={dashboard.closeModal}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <i className="fas fa-times text-xl"></i>
                </button>
              </div>

              <div className="prose prose-sm max-w-none">
                <h4 className="font-semibold mb-2">1. Aceitação dos Termos</h4>
                <p className="text-gray-600 mb-4">
                  Ao utilizar o Avalia.Edu, você concorda com estes termos de uso e com nossa política de privacidade.
                </p>

                <h4 className="font-semibold mb-2">2. Uso da Plataforma</h4>
                <p className="text-gray-600 mb-4">
                  A plataforma Avalia.Edu destina-se exclusivamente para fins educacionais. Você se compromete a usar a plataforma de forma responsável e ética.
                </p>

                <h4 className="font-semibold mb-2">3. Propriedade Intelectual</h4>
                <p className="text-gray-600 mb-4">
                  Os conteúdos criados pelos usuários permanecem de sua propriedade. O Avalia.Edu apenas fornece as ferramentas para criação e gerenciamento.
                </p>

                <h4 className="font-semibold mb-2">4. Privacidade e Dados</h4>
                <p className="text-gray-600 mb-4">
                  Seus dados pessoais são tratados com confidencialidade e não são compartilhados com terceiros sem seu consentimento. Para mais informações sobre como tratamos seus dados, consulte nossa{' '}
                  <a
                    href="/privacidade"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:text-blue-700 underline font-medium"
                  >
                    Política de Privacidade
                  </a>.
                </p>

                <h4 className="font-semibold mb-2">5. Limitação de Responsabilidade</h4>
                <p className="text-gray-600 mb-4">
                  O Avalia.Edu não se responsabiliza por perdas de dados ou problemas técnicos. Recomendamos manter cópias de segurança de seus conteúdos.
                </p>

                <h4 className="font-semibold mb-2">6. Alterações nos Termos</h4>
                <p className="text-gray-600 mb-4">
                  Estes termos podem ser atualizados periodicamente. Mudanças significativas serão comunicadas aos usuários.
                </p>
              </div>

              <div className="flex justify-end mt-6 pt-4 border-t">
                <button
                  onClick={dashboard.closeModal}
                  className="bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 transition-colors"
                >
                  Fechar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Corrigir Avaliação */}
      {dashboard.activeModal === "corrigir-avaliacao-modal" && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-6xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-medium text-gray-900">Corrigir Avaliação</h3>
                <button
                  onClick={dashboard.closeModal}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <i className="fas fa-times text-xl"></i>
                </button>
              </div>

              {!dashboard.correctionData.selectedAssessmentId ? (
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Selecionar Avaliação para Corrigir
                    </label>
                    <select
                      value={dashboard.correctionData.selectedAssessmentId || ''}
                      onChange={(e) => dashboard.handleSelectAssessmentForCorrection(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">Selecione uma avaliação gerada</option>
                      {(dashboard.savedAssessments || []).map((assessment: any) => (
                        <option key={assessment.id} value={assessment.id}>
                          {assessment.nomeAvaliacao || assessment.tipoAvaliacao || 'Avaliação'} - {assessment.turma} ({assessment.selectedItems?.length || 0} questões)
                        </option>
                      ))}
                    </select>
                  </div>

                  {dashboard.savedAssessments.length === 0 && (
                    <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                      <div className="flex items-start">
                        <i className="fas fa-exclamation-triangle text-yellow-600 mt-1 mr-3"></i>
                        <div>
                          <p className="text-sm text-yellow-900 font-medium mb-1">Nenhuma avaliação disponível</p>
                          <p className="text-xs text-yellow-800">
                            Você precisa gerar um PDF de avaliação antes de poder corrigir.
                          </p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="space-y-6">
                  {/* Cabeçalho com dados da avaliação */}
                  <div className="border-b pb-4">
                    <div className="grid grid-cols-2 gap-4 mb-4">
                      <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">Escola:</label>
                        <input
                          type="text"
                          value={dashboard.correctionData.headerData.escola}
                          onChange={(e) => dashboard.handleCorrectionHeaderChange('escola', e.target.value)}
                          className="w-full px-2 py-1 text-sm border-b border-gray-300 focus:outline-none focus:border-blue-500"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">Turma:</label>
                        <input
                          type="text"
                          value={dashboard.correctionData.headerData.turma}
                          onChange={(e) => dashboard.handleCorrectionHeaderChange('turma', e.target.value)}
                          className="w-full px-2 py-1 text-sm border-b border-gray-300 focus:outline-none focus:border-blue-500"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">Aluno:</label>
                        <input
                          type="text"
                          value={dashboard.correctionData.headerData.aluno}
                          onChange={(e) => dashboard.handleCorrectionHeaderChange('aluno', e.target.value)}
                          className="w-full px-2 py-1 text-sm border-b border-gray-300 focus:outline-none focus:border-blue-500"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">Instrumento:</label>
                        <input
                          type="text"
                          value={dashboard.correctionData.headerData.instrumento}
                          onChange={(e) => dashboard.handleCorrectionHeaderChange('instrumento', e.target.value)}
                          className="w-full px-2 py-1 text-sm border-b border-gray-300 focus:outline-none focus:border-blue-500"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Legenda */}
                  <div className="flex items-center justify-between border-b pb-4">
                    <div className="flex items-center space-x-6">
                      <div className="flex items-center space-x-2">
                        <div className="w-5 h-5 bg-gray-800 border border-gray-300 flex items-center justify-center">
                          <i className="fas fa-check text-white text-xs"></i>
                        </div>
                        <span className="text-sm">Marcados</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <div className="w-5 h-5 bg-white border-2 border-gray-400"></div>
                        <span className="text-sm">Não Marcados</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <div className="w-5 h-5 bg-pink-300 border border-gray-300"></div>
                        <span className="text-sm">Duplicadas</span>
                      </div>
                    </div>
                    <button
                      onClick={dashboard.handleClearAllAnswers}
                      className="text-sm text-red-600 hover:text-red-700"
                    >
                      <i className="fas fa-eraser mr-1"></i>
                      Limpar Tudo
                    </button>
                  </div>

                  {/* Grid de correção */}
                  <div className="space-y-2">
                    {dashboard.correctionData.questions.map((question: any, index: number) => (
                      <div key={question.id} className="flex items-center space-x-3 p-2 border rounded hover:bg-gray-50">
                        {/* Número da questão com indicador de estado */}
                        <div
                          className={`w-12 h-12 flex items-center justify-center text-sm font-bold border-2 rounded ${
                            (() => {
                              if (question.type === 'verdadeiro_falso') {
                                // Para V/F, verificar se há duplicação em qualquer afirmativa
                                const numAfirmativas = question.afirmativas?.length || 0
                                let hasDuplicate = false
                                let hasAnyMarked = false

                                for (let i = 0; i < numAfirmativas; i++) {
                                  const vIndex = i * 2
                                  const fIndex = i * 2 + 1
                                  if (question.answers[vIndex] && question.answers[fIndex]) {
                                    hasDuplicate = true
                                  }
                                  if (question.answers[vIndex] || question.answers[fIndex]) {
                                    hasAnyMarked = true
                                  }
                                }

                                if (hasDuplicate) {
                                  return 'bg-pink-300 border-pink-400 text-pink-900'
                                } else if (hasAnyMarked) {
                                  return 'bg-gray-800 border-gray-900 text-white'
                                } else {
                                  return 'bg-white border-gray-300 text-gray-700'
                                }
                              } else {
                                // Para múltipla escolha, manter lógica original
                                const markedCount = question.answers.filter((a: boolean) => a).length
                                if (markedCount > 1) {
                                  return 'bg-pink-300 border-pink-400 text-pink-900'
                                } else if (markedCount > 0) {
                                  return 'bg-gray-800 border-gray-900 text-white'
                                } else {
                                  return 'bg-white border-gray-300 text-gray-700'
                                }
                              }
                            })()
                          }`}
                        >
                          {String(index + 1).padStart(2, '0')}
                        </div>

                        {/* Botões de alternativas */}
                        <div className="flex items-center space-x-2 flex-1">
                          {question.type === 'multipla_escolha' ? (
                            question.alternatives.map((alt: string, altIndex: number) => {
                              const isMarked = question.answers[altIndex]
                              const hasMultipleMarks = question.answers.filter((a: boolean) => a).length > 1

                              return (
                                <button
                                  key={altIndex}
                                  onClick={() => dashboard.handleToggleAnswer(index, altIndex)}
                                  className={`w-10 h-10 rounded-full border-2 flex items-center justify-center font-bold text-sm transition-all ${
                                    hasMultipleMarks && isMarked
                                      ? 'bg-pink-300 border-pink-400 text-pink-900'
                                      : isMarked
                                      ? 'bg-gray-800 border-gray-900 text-white'
                                      : 'bg-white border-gray-400 text-gray-700 hover:border-gray-600'
                                  }`}
                                >
                                  {alt}
                                </button>
                              )
                            })
                          ) : question.type === 'verdadeiro_falso' ? (
                            <div className="flex flex-col space-y-2 flex-1">
                              {question.afirmativas && question.afirmativas.map((afirmativa: string, afirmIndex: number) => {
                                const vIndex = afirmIndex * 2
                                const fIndex = afirmIndex * 2 + 1
                                const hasDuplicate = question.answers[vIndex] && question.answers[fIndex]

                                return (
                                  <div key={afirmIndex} className="flex items-center space-x-2">
                                    <span className="text-sm font-medium text-gray-700 min-w-[24px]">
                                      {afirmIndex + 1}.
                                    </span>
                                    <div className="flex items-center space-x-2">
                                      <button
                                        onClick={() => dashboard.handleToggleAnswer(index, vIndex)}
                                        className={`w-10 h-10 rounded border-2 font-bold text-sm transition-all ${
                                          hasDuplicate
                                            ? 'bg-pink-300 border-pink-400 text-pink-900'
                                            : question.answers[vIndex]
                                            ? 'bg-gray-800 border-gray-900 text-white'
                                            : 'bg-white border-gray-400 text-gray-700 hover:border-gray-600'
                                        }`}
                                      >
                                        V
                                      </button>
                                      <button
                                        onClick={() => dashboard.handleToggleAnswer(index, fIndex)}
                                        className={`w-10 h-10 rounded border-2 font-bold text-sm transition-all ${
                                          hasDuplicate
                                            ? 'bg-pink-300 border-pink-400 text-pink-900'
                                            : question.answers[fIndex]
                                            ? 'bg-gray-800 border-gray-900 text-white'
                                            : 'bg-white border-gray-400 text-gray-700 hover:border-gray-600'
                                        }`}
                                      >
                                        F
                                      </button>
                                    </div>
                                  </div>
                                )
                              })}
                            </div>
                          ) : (
                            <span className="text-sm text-gray-600 italic">Questão discursiva - correção manual</span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Botões de ação */}
                  <div className="flex justify-between items-center pt-4 border-t">
                    <button
                      onClick={() => dashboard.handleSelectAssessmentForCorrection('')}
                      className="text-blue-600 hover:text-blue-700"
                    >
                      <i className="fas fa-arrow-left mr-2"></i>
                      Voltar para seleção
                    </button>
                    <div className="flex space-x-3">
                      <button
                        onClick={dashboard.closeModal}
                        className="bg-gray-200 text-gray-800 py-2 px-4 rounded-md hover:bg-gray-300 transition-colors"
                      >
                        Cancelar
                      </button>
                      <button
                        onClick={dashboard.handleSaveCorrection}
                        className="bg-green-600 text-white py-2 px-4 rounded-md hover:bg-green-700 transition-colors"
                      >
                        <i className="fas fa-save mr-2"></i>
                        Salvar Correção
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Modal de Resultados Paginados para Itens */}
      <PaginatedResultsModal
        isOpen={dashboard.activeModal === 'items-paginated-results-modal'}
        onClose={dashboard.closeModal}
        type="items"
        results={dashboard.searchResults.items}
        onViewDetails={dashboard.handleViewItemDetails}
        onAddItem={dashboard.handleAddItemToAssessment}
        addedItemIds={dashboard.addedItemIds}
      />

      {/* Modal de Resultados Paginados para Avaliações */}
      <PaginatedResultsModal
        isOpen={dashboard.activeModal === 'assessments-paginated-results-modal'}
        onClose={dashboard.closeModal}
        type="assessments"
        results={dashboard.searchResults.assessments}
        onViewDetails={(assessment) => {
          console.log('Ver detalhes da avaliação:', assessment)
        }}
      />

      {/* Modal Minhas Avaliações */}
      {dashboard.activeModal === "minhas-avaliacoes-modal" && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-5xl w-full max-h-[90vh] overflow-hidden flex flex-col">
            <div className="p-6 border-b">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-medium text-gray-900">
                  <i className="fas fa-file-pdf mr-2 text-red-600"></i>
                  Minhas Avaliações
                </h3>
                <button
                  onClick={dashboard.closeModal}
                  className="text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <i className="fas fa-times text-xl"></i>
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-6">
              {!dashboard.savedAssessments || dashboard.savedAssessments.length === 0 ? (
                <div className="text-center py-12">
                  <i className="fas fa-file-pdf text-6xl text-gray-300 mb-4"></i>
                  <p className="text-gray-500 mb-2 text-lg">Nenhuma avaliação criada ainda</p>
                  <p className="text-sm text-gray-400">Crie sua primeira avaliação para visualizar aqui</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {dashboard.savedAssessments
                    .sort((a: any, b: any) => {
                      const dateA = new Date(a.created_at || a.data || 0).getTime()
                      const dateB = new Date(b.created_at || b.data || 0).getTime()
                      return dateB - dateA
                    })
                    .map((assessment: any) => (
                      <AssessmentItem
                        key={assessment.id}
                        assessment={assessment}
                        dashboard={dashboard}
                      />
                    ))}
                </div>
              )}
            </div>

            <div className="border-t p-4 bg-gray-50">
              <button
                onClick={dashboard.closeModal}
                className="w-full bg-gray-600 text-white py-2 px-4 rounded-md hover:bg-gray-700 transition-colors"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

export default AllModals