import React from 'react'
import { useNavigate } from 'react-router-dom'

interface GradingSectionProps {
  dashboard: any
  onNavigateToClasses?: () => void
}

const GradingSection: React.FC<GradingSectionProps> = ({ dashboard, onNavigateToClasses }) => {
  const navigate = useNavigate()
  return (
    <section className="bg-white rounded-lg shadow-sm border">
      <div className="border-b p-3 md:p-8 lg:p-8">
        <h2 className="text-base md:text-lg lg:text-xl font-semibold text-gray-900 flex items-center mb-2">
          <i className="fas fa-check-circle mr-2 md:mr-3 text-green-600 text-sm md:text-base"></i>
          <span className="text-sm md:text-base lg:text-lg">CORREÇÃO DE AVALIAÇÕES</span>
        </h2>
        <div className="w-full h-1 bg-green-500 rounded-full"></div>
      </div>

      <div className="p-3 md:p-8 lg:p-8 space-y-4">
        {/* Link para Gerenciar Turmas */}
        {onNavigateToClasses && (
          <div className="flex items-center justify-between p-3 bg-gray-50 border border-gray-200 rounded-lg">
            <span className="text-sm text-gray-600">
              <i className="fas fa-users mr-2 text-green-600"></i>
              Precisa gerenciar turmas ou estudantes?
            </span>
            <button
              onClick={onNavigateToClasses}
              className="text-sm text-green-600 hover:text-green-800 font-medium flex items-center gap-1 whitespace-nowrap ml-3"
            >
              Gerenciar Turmas
              <i className="fas fa-arrow-right text-xs"></i>
            </button>
          </div>
        )}

        {/* Passo 1: Selecionar Turma */}
        {!dashboard.selectedClassForGrading ? (
          <div className="space-y-4">
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <p className="text-sm text-yellow-800">
                <i className="fas fa-info-circle mr-2"></i>
                Passo 1: Selecione uma turma para iniciar a correção
              </p>
            </div>

            <div>
              <h3 className="text-sm font-medium text-gray-700 mb-3">
                Selecionar Turma
              </h3>
              {dashboard.classes.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <i className="fas fa-users text-4xl mb-3 text-gray-300 block"></i>
                  <p className="text-sm">Nenhuma turma disponível</p>
                  <p className="text-xs mt-2">
                    Cadastre uma turma em{' '}
                    {onNavigateToClasses ? (
                      <button onClick={onNavigateToClasses} className="text-green-600 underline hover:text-green-800">
                        Gerenciar Turmas
                      </button>
                    ) : (
                      <span className="font-medium">Gerenciar Turmas</span>
                    )}
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  {dashboard.classes.map((classItem: any) => (
                    <button
                      key={classItem.id}
                      onClick={() => dashboard.handleSelectClassForGrading(classItem)}
                      className="w-full text-left border rounded-lg p-4 hover:border-green-500 hover:shadow-md transition-all"
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <h4 className="font-medium text-gray-900">{classItem.name}</h4>
                          {classItem.school_year && (
                            <p className="text-xs text-gray-500 mt-1">Ano: {classItem.school_year}</p>
                          )}
                        </div>
                        <i className="fas fa-chevron-right text-gray-400"></i>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center justify-between bg-green-50 border border-green-200 rounded-lg p-4">
              <div className="flex-1">
                <h3 className="text-sm font-medium text-green-800">
                  <i className="fas fa-check-circle mr-2"></i>
                  Passo 1 Completo: {dashboard.selectedClassForGrading.name}
                </h3>
                {dashboard.selectedClassForGrading.school_year && (
                  <p className="text-xs text-green-600 mt-1">
                    Ano: {dashboard.selectedClassForGrading.school_year}
                  </p>
                )}
                {dashboard.students.length > 0 && (
                  <p className="text-xs text-green-600 mt-1">
                    <i className="fas fa-user-graduate mr-1"></i>
                    {dashboard.students.length} estudante{dashboard.students.length !== 1 ? 's' : ''} cadastrado{dashboard.students.length !== 1 ? 's' : ''}
                  </p>
                )}
              </div>
              <button
                onClick={dashboard.handleClearClassSelection}
                className="text-red-600 hover:text-red-700 text-sm"
              >
                <i className="fas fa-times mr-1"></i>
                Trocar
              </button>
            </div>

            {dashboard.students.length === 0 && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <p className="text-sm text-red-800">
                  <i className="fas fa-exclamation-triangle mr-2"></i>
                  Esta turma não possui estudantes cadastrados. Adicione estudantes em{' '}
                  {onNavigateToClasses ? (
                    <button onClick={onNavigateToClasses} className="underline font-medium hover:text-red-900">
                      Gerenciar Turmas
                    </button>
                  ) : (
                    <span className="font-medium">Gerenciar Turmas</span>
                  )}{' '}
                  antes de continuar.
                </p>
              </div>
            )}

            {dashboard.students.length > 0 && (
              <>
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <p className="text-sm text-blue-800">
                    <i className="fas fa-info-circle mr-2"></i>
                    Passo 2: Selecione a avaliação criada
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Selecionar Avaliação *
                  </label>
                  {dashboard.isLoadingAssessments ? (
                    <div className="text-center py-6 bg-gray-50 rounded-lg border border-gray-200">
                      <div className="animate-spin rounded-full h-6 w-6 border-2 border-green-500 border-t-transparent mx-auto mb-2"></div>
                      <p className="text-sm text-gray-500">Carregando avaliações...</p>
                    </div>
                  ) : dashboard.savedAssessments.length === 0 ? (
                    <div className="text-center py-6 bg-gray-50 rounded-lg border border-gray-200">
                      <i className="fas fa-file-alt text-3xl mb-3 text-gray-300 block"></i>
                      <p className="text-sm text-gray-500">Nenhuma avaliação criada</p>
                      <p className="text-xs text-gray-400 mt-2">Crie uma avaliação em "+ Nova Avaliação" primeiro</p>
                    </div>
                  ) : (
                    <button
                      onClick={() => dashboard.setShowAssessmentSelectionModal(true)}
                      className="w-full px-3 py-3 text-left text-sm border border-gray-300 rounded-md hover:border-green-500 focus:outline-none focus:ring-2 focus:ring-green-500 bg-white transition-colors"
                    >
                      {dashboard.selectedAssessmentForGrading ? (
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="font-medium text-gray-900">
                              {dashboard.selectedAssessmentForGrading.nomeAvaliacao || dashboard.selectedAssessmentForGrading.nome_avaliacao ||
                               dashboard.selectedAssessmentForGrading.tipoAvaliacao || dashboard.selectedAssessmentForGrading.tipo_avaliacao || 'Avaliação sem nome'}
                            </p>
                            <p className="text-xs text-gray-500 mt-1">
                              {dashboard.selectedAssessmentForGrading.tipoAvaliacao || dashboard.selectedAssessmentForGrading.tipo_avaliacao || 'Sem tipo'} -{' '}
                              {(dashboard.selectedAssessmentForGrading.selectedItems || dashboard.selectedAssessmentForGrading.selected_items || []).length} questões
                            </p>
                          </div>
                          <i className="fas fa-chevron-down text-gray-400"></i>
                        </div>
                      ) : (
                        <div className="flex items-center justify-between text-gray-500">
                          <span>-- Selecione uma avaliação --</span>
                          <i className="fas fa-chevron-down text-gray-400"></i>
                        </div>
                      )}
                    </button>
                  )}
                </div>

                {dashboard.selectedAssessmentForGrading && (
                  <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                    <h4 className="text-sm font-medium text-green-800 mb-2">
                      <i className="fas fa-check-circle mr-2"></i>
                      Avaliação Selecionada
                    </h4>
                    <div className="space-y-1 text-xs text-green-700">
                      <p><strong>Nome:</strong> {dashboard.selectedAssessmentForGrading.nomeAvaliacao || dashboard.selectedAssessmentForGrading.nome_avaliacao || dashboard.selectedAssessmentForGrading.tipoAvaliacao || dashboard.selectedAssessmentForGrading.tipo_avaliacao}</p>
                      <p><strong>Tipo:</strong> {dashboard.selectedAssessmentForGrading.tipoAvaliacao || dashboard.selectedAssessmentForGrading.tipo_avaliacao}</p>
                      <p><strong>Questões:</strong> {dashboard.gradingData.totalQuestions}</p>
                      <p><strong>Gabarito:</strong> {dashboard.gradingData.answerKey.join(', ')}</p>
                    </div>
                  </div>
                )}
              </>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Nome da Correção (opcional)
              </label>
              <input
                type="text"
                value={dashboard.gradingData.assessmentName}
                onChange={(e) => dashboard.setGradingData({ ...dashboard.gradingData, assessmentName: e.target.value })}
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                placeholder="Ex: Correção - Turma A - 1º Bimestre"
                disabled={!dashboard.selectedAssessmentForGrading}
              />
              <p className="text-xs text-gray-500 mt-1">
                Deixe em branco para usar o nome da avaliação
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Organizar em Pasta (opcional)
              </label>
              <select
                value={dashboard.gradingData.folderId || ''}
                onChange={(e) => dashboard.setGradingData({ ...dashboard.gradingData, folderId: e.target.value || null })}
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                disabled={!dashboard.selectedAssessmentForGrading}
              >
                <option value="">Sem pasta</option>
                {dashboard.folders?.map((folder: any) => (
                  <option key={folder.id} value={folder.id}>
                    {folder.parent_folder_id ? '└ ' : ''}{folder.name}
                  </option>
                ))}
              </select>
              <p className="text-xs text-gray-500 mt-1">
                Selecione uma pasta para organizar esta correção
              </p>
            </div>

            {dashboard.selectedAssessmentForGrading && dashboard.gradingData.totalQuestions > 0 && (
              <div className="flex flex-col gap-3">
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 flex items-start gap-2">
                  <i className="fas fa-info-circle text-blue-500 mt-0.5 text-sm flex-shrink-0"></i>
                  <p className="text-xs text-blue-700">
                    Use "Escanear Cartão" para identificar o aluno automaticamente pelo QR code impresso na folha individual. Gere as folhas individuais em "+ Nova Avaliação".
                  </p>
                </div>

                <button
                  onClick={() => navigate('/scan')}
                  className="w-full bg-gray-700 text-white py-2.5 px-4 rounded-md hover:bg-gray-800 transition-colors text-sm font-medium flex items-center justify-center gap-2"
                >
                  <i className="fas fa-qrcode text-sm"></i>
                  Escanear Cartão
                </button>

                <button
                  onClick={dashboard.handleStartGrading}
                  disabled={!dashboard.selectedAssessmentForGrading || dashboard.students.length === 0}
                  className="w-full bg-green-600 text-white py-3 px-4 rounded-md hover:bg-green-700 transition-colors text-sm font-medium disabled:bg-gray-300 disabled:cursor-not-allowed"
                >
                  <i className="fas fa-play mr-2"></i>
                  Iniciar Correção Manual
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </section>
  )
}

export default GradingSection
