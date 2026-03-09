import React from 'react'
import CompiledReportsView from './CompiledReportsView'

interface ReportsSectionProps {
  dashboard: any
}

const ReportsSection: React.FC<ReportsSectionProps> = ({ dashboard }) => {
  const [activeTab, setActiveTab] = React.useState<'individual' | 'compiled'>('individual')
  const [showReportModal, setShowReportModal] = React.useState(false)
  const [showCompiledModal, setShowCompiledModal] = React.useState(false)

  const getItemGroupColor = (studentAnswers: string[], group: number[], correctAnswers: string[]) => {
    if (!studentAnswers) return 'bg-gray-100 text-gray-400 border-gray-300'

    const groupAnswers = group.map(idx => studentAnswers[idx] || '')
    const groupCorrect = group.map(idx => correctAnswers[idx])

    const correctCount = groupAnswers.filter((ans, i) => ans && ans.toUpperCase() === groupCorrect[i]?.toUpperCase()).length
    const answeredCount = groupAnswers.filter(ans => ans && ans.trim()).length

    if (answeredCount === 0) {
      return 'bg-gray-100 text-gray-400 border-gray-300'
    }

    if (correctCount === group.length) {
      return 'bg-green-500 text-black border-green-300'
    } else if (correctCount > 0) {
      return 'bg-orange-600 text-black border-yellow-300'
    } else {
      return 'bg-red-600 text-black border-red-300'
    }
  }

  const handleViewIndividualReport = (gradingId: string) => {
    dashboard.handleViewReport(gradingId)
    setShowReportModal(true)
  }

  const handleCloseReportModal = () => {
    setShowReportModal(false)
  }

  const handleViewCompiledReport = (assessmentName: string) => {
    dashboard.handleCompileReports(assessmentName)
    setShowCompiledModal(true)
  }

  const handleCloseCompiledModal = () => {
    setShowCompiledModal(false)
    dashboard.setViewMode('individual')
  }

  return (
    <section className="bg-white rounded-lg shadow-sm border">
      <div className="border-b p-3 md:p-8 lg:p-8">
        <h2 className="text-base md:text-lg lg:text-xl font-semibold text-gray-900 flex items-center mb-2">
          <i className="fas fa-chart-bar mr-2 md:mr-3 text-orange-600 text-sm md:text-base"></i>
          <span className="text-sm md:text-base lg:text-lg">RELATÓRIOS E ESTATÍSTICAS</span>
        </h2>
        <div className="w-full h-1 bg-orange-500 rounded-full"></div>
      </div>

      <div className="p-3 md:p-8 lg:p-8">
        <div className="flex border-b mb-4 md:mb-6 overflow-x-auto">
          <button
            onClick={() => {
              setActiveTab('individual')
              dashboard.setViewMode('individual')
              dashboard.setSelectedReport(null)
            }}
            className={`px-3 md:px-4 py-2 font-medium text-xs md:text-sm border-b-2 transition-colors whitespace-nowrap ${
              activeTab === 'individual'
                ? 'border-orange-500 text-orange-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            <i className="fas fa-user mr-2"></i>
            Dados por Turma
          </button>
          <button
            onClick={() => setActiveTab('compiled')}
            className={`px-3 md:px-4 py-2 font-medium text-xs md:text-sm border-b-2 transition-colors whitespace-nowrap ${
              activeTab === 'compiled'
                ? 'border-orange-500 text-orange-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            <i className="fas fa-layer-group mr-2"></i>
            Dados Compilados entre Turmas
          </button>
        </div>

        {activeTab === 'compiled' ? (
          <div className="space-y-4">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <p className="text-sm text-blue-800">
                <i className="fas fa-info-circle mr-2"></i>
                Selecione uma avaliação para visualizar dados consolidados de múltiplas turmas
              </p>
            </div>

            {(() => {
              const uniqueAssessments = (typeof dashboard.getUniqueAssessments === 'function' ? dashboard.getUniqueAssessments() : []) || []

              if (!Array.isArray(uniqueAssessments) || uniqueAssessments.length === 0) {
                return (
                  <div className="text-center py-12 text-gray-500">
                    <i className="fas fa-chart-line text-5xl mb-4 text-gray-300"></i>
                    <p className="text-base mb-2">Nenhuma avaliação com múltiplas turmas</p>
                    <p className="text-sm text-gray-400">
                      Para visualizar dados compilados, a mesma avaliação precisa ser aplicada em pelo menos 2 turmas
                    </p>
                  </div>
                )
              }

              // Associar cada avaliação compilada com sua pasta correspondente
              const assessmentsWithFolder = uniqueAssessments.map((assessment: any) => {
                // Buscar uma correção desta avaliação para obter o folder_id
                const relatedGrading = Array.isArray(dashboard.gradings)
                  ? dashboard.gradings.find((g: any) => g.assessment_name === assessment.assessment_name)
                  : null

                return {
                  ...assessment,
                  folder_id: relatedGrading?.folder_id || null
                }
              })

              const rootFolders = Array.isArray(dashboard.folders) ? dashboard.folders.filter((f: any) => !f.parent_folder_id) : []
              const ungroupedAssessments = assessmentsWithFolder.filter((a: any) => !a.folder_id)

              const renderAssessmentCard = (assessment: any, inFolder = false) => (
                <div key={assessment.assessment_name} className="relative group">
                  <button
                    onClick={() => handleViewCompiledReport(assessment.assessment_name)}
                    className="w-full text-left bg-white border-2 border-teal-200 rounded-lg p-4 hover:border-teal-400 hover:shadow-md transition-all"
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div className="w-10 h-10 rounded-full flex items-center justify-center bg-teal-100">
                        <i className="fas fa-layer-group text-teal-600"></i>
                      </div>
                    </div>
                    <h4 className="font-semibold text-gray-900 mb-2">{assessment.assessment_name}</h4>
                    <p className="text-xs text-gray-600">
                      {assessment.count} turma{assessment.count > 1 ? 's' : ''} corrigida{assessment.count > 1 ? 's' : ''}
                    </p>
                    <div className="mt-3 pt-3 border-t border-gray-200 flex items-center justify-between">
                      <span className="text-xs font-medium text-teal-600">
                        Ver compilação <i className="fas fa-arrow-right ml-1"></i>
                      </span>
                      <button
                        onClick={async (e) => {
                          e.stopPropagation()
                          if (!confirm(`Tem certeza que deseja excluir todas as correções da avaliação "${assessment.assessment_name}"? Esta ação não pode ser desfeita.`)) {
                            return
                          }

                          const gradingsToDelete = Array.isArray(dashboard.gradings)
                            ? dashboard.gradings.filter((g: any) => g.assessment_name === assessment.assessment_name)
                            : []

                          for (const grading of gradingsToDelete) {
                            await dashboard.handleDeleteGrading(grading.id)
                          }

                          dashboard.loadGradings()
                        }}
                        className="text-red-500 hover:text-red-700 transition-colors p-1"
                        title="Excluir todas as correções desta avaliação"
                      >
                        <i className="fas fa-trash text-sm"></i>
                      </button>
                    </div>
                  </button>
                  {inFolder && (
                    <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <select
                        value={assessment.folder_id || ''}
                        onChange={(e) => {
                          e.stopPropagation()
                          // Atualizar todas as correções desta avaliação
                          const gradingsToUpdate = Array.isArray(dashboard.gradings)
                            ? dashboard.gradings.filter((g: any) => g.assessment_name === assessment.assessment_name)
                            : []

                          gradingsToUpdate.forEach((grading: any) => {
                            dashboard.handleMoveGradingToFolder(grading.id, e.target.value || null)
                          })
                        }}
                        className="text-xs border border-gray-300 rounded px-2 py-1 bg-white shadow-sm"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <option value="">Sem pasta</option>
                        {dashboard.folders?.map((folder: any) => (
                          <option key={folder.id} value={folder.id}>
                            {folder.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}
                </div>
              )

              return (
                <div className="space-y-4">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-sm font-medium text-gray-700">
                      <i className="fas fa-layer-group mr-2"></i>
                      Avaliações com Múltiplas Turmas
                    </h3>
                    <button
                      onClick={() => dashboard.setShowFolderModal(true)}
                      className="text-sm bg-blue-600 text-white px-3 py-1.5 rounded-md hover:bg-blue-700 transition-colors"
                    >
                      <i className="fas fa-folder-plus mr-2"></i>
                      Gerenciar Pastas
                    </button>
                  </div>

                  {rootFolders.map((folder: any) => {
                    const subfolders = Array.isArray(dashboard.folders) ? dashboard.folders.filter((f: any) => f.parent_folder_id === folder.id) : []
                    const folderAssessments = assessmentsWithFolder.filter((a: any) => a.folder_id === folder.id)
                    const isExpanded = dashboard.expandedFolders?.has(folder.id)

                    return (
                      <div key={folder.id} className="border-2 rounded-lg overflow-hidden" style={{ borderColor: folder.color }}>
                        <div className="w-full p-4 flex items-center justify-between bg-gradient-to-r from-gray-50 to-white hover:from-gray-100 hover:to-gray-50 transition-all">
                          <button
                            onClick={() => dashboard.toggleFolderExpansion(folder.id)}
                            className="flex-1 flex items-center gap-3"
                          >
                            <div
                              className="w-8 h-8 rounded-lg flex items-center justify-center shadow-sm"
                              style={{ backgroundColor: folder.color }}
                            >
                              <i className={`fas ${isExpanded ? 'fa-folder-open' : 'fa-folder'} text-white`}></i>
                            </div>
                            <div className="text-left">
                              <h4 className="font-semibold text-gray-900">{folder.name}</h4>
                              <p className="text-xs text-gray-500">
                                {folderAssessments.length} avaliaç{folderAssessments.length === 1 ? 'ão' : 'ões'}
                                {subfolders.length > 0 && ` • ${subfolders.length} subpasta${subfolders.length === 1 ? '' : 's'}`}
                              </p>
                            </div>
                          </button>
                          <div className="flex items-center gap-2">
                            <button
                              onClick={(e) => {
                                e.stopPropagation()
                                if (confirm(`Tem certeza que deseja excluir a pasta "${folder.name}"? As avaliações dentro dela não serão excluídas.`)) {
                                  dashboard.handleDeleteFolder(folder.id)
                                }
                              }}
                              className="text-red-600 hover:text-red-700 p-2 hover:bg-red-50 rounded transition-colors"
                              title="Excluir pasta"
                            >
                              <i className="fas fa-trash text-sm"></i>
                            </button>
                            <button
                              onClick={() => dashboard.toggleFolderExpansion(folder.id)}
                              className="p-2"
                            >
                              <i className={`fas fa-chevron-${isExpanded ? 'up' : 'down'} text-gray-400`}></i>
                            </button>
                          </div>
                        </div>

                        {isExpanded && (
                          <div className="p-4 bg-gray-50 space-y-4">
                            {folderAssessments.length > 0 && (
                              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                {folderAssessments.map((assessment: any) => renderAssessmentCard(assessment, true))}
                              </div>
                            )}

                            {subfolders.map((subfolder: any) => {
                              const subfolderAssessments = assessmentsWithFolder.filter((a: any) => a.folder_id === subfolder.id)
                              const isSubExpanded = dashboard.expandedFolders?.has(subfolder.id)

                              return (
                                <div key={subfolder.id} className="border-2 rounded-lg overflow-hidden" style={{ borderColor: subfolder.color }}>
                                  <div className="w-full p-3 flex items-center justify-between bg-white hover:bg-gray-50 transition-all">
                                    <button
                                      onClick={() => dashboard.toggleFolderExpansion(subfolder.id)}
                                      className="flex-1 flex items-center gap-3"
                                    >
                                      <i className="fas fa-level-up-alt text-gray-400 transform rotate-90 ml-2"></i>
                                      <div
                                        className="w-6 h-6 rounded flex items-center justify-center shadow-sm"
                                        style={{ backgroundColor: subfolder.color }}
                                      >
                                        <i className={`fas ${isSubExpanded ? 'fa-folder-open' : 'fa-folder'} text-white text-xs`}></i>
                                      </div>
                                      <div className="text-left">
                                        <h5 className="font-medium text-gray-900 text-sm">{subfolder.name}</h5>
                                        <p className="text-xs text-gray-500">
                                          {subfolderAssessments.length} avaliaç{subfolderAssessments.length === 1 ? 'ão' : 'ões'}
                                        </p>
                                      </div>
                                    </button>
                                    <div className="flex items-center gap-2">
                                      <button
                                        onClick={(e) => {
                                          e.stopPropagation()
                                          if (confirm(`Tem certeza que deseja excluir a subpasta "${subfolder.name}"? As avaliações dentro dela não serão excluídas.`)) {
                                            dashboard.handleDeleteFolder(subfolder.id)
                                          }
                                        }}
                                        className="text-red-600 hover:text-red-700 p-2 hover:bg-red-50 rounded transition-colors"
                                        title="Excluir subpasta"
                                      >
                                        <i className="fas fa-trash text-xs"></i>
                                      </button>
                                      <button
                                        onClick={() => dashboard.toggleFolderExpansion(subfolder.id)}
                                        className="p-2"
                                      >
                                        <i className={`fas fa-chevron-${isSubExpanded ? 'up' : 'down'} text-gray-400`}></i>
                                      </button>
                                    </div>
                                  </div>

                                  {isSubExpanded && subfolderAssessments.length > 0 && (
                                    <div className="p-3 bg-white">
                                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                        {subfolderAssessments.map((assessment: any) => renderAssessmentCard(assessment, true))}
                                      </div>
                                    </div>
                                  )}
                                </div>
                              )
                            })}

                            {folderAssessments.length === 0 && subfolders.length === 0 && (
                              <div className="text-center py-6 text-gray-400">
                                <i className="fas fa-inbox text-2xl mb-2"></i>
                                <p className="text-xs">Pasta vazia</p>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    )
                  })}

                  {ungroupedAssessments.length > 0 && (
                    <div>
                      <h4 className="text-sm font-medium text-gray-600 mb-3 flex items-center gap-2">
                        <i className="fas fa-layer-group"></i>
                        Sem Pasta
                        <span className="text-xs text-gray-400 font-normal">
                          (passe o mouse sobre os cards para mover para pastas)
                        </span>
                      </h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {ungroupedAssessments.map((assessment: any) => (
                          <div key={assessment.assessment_name} className="relative group">
                            <button
                              onClick={() => handleViewCompiledReport(assessment.assessment_name)}
                              className="w-full text-left bg-white border-2 border-teal-200 rounded-lg p-4 hover:border-teal-400 hover:shadow-md transition-all"
                            >
                              <div className="flex items-start justify-between mb-2">
                                <div className="w-10 h-10 rounded-full flex items-center justify-center bg-teal-100">
                                  <i className="fas fa-layer-group text-teal-600"></i>
                                </div>
                              </div>
                              <h4 className="font-semibold text-gray-900 mb-2">{assessment.assessment_name}</h4>
                              <p className="text-xs text-gray-600">
                                {assessment.count} turma{assessment.count > 1 ? 's' : ''} corrigida{assessment.count > 1 ? 's' : ''}
                              </p>
                              <div className="mt-3 pt-3 border-t border-gray-200">
                                <span className="text-xs font-medium text-teal-600">
                                  Ver compilação <i className="fas fa-arrow-right ml-1"></i>
                                </span>
                              </div>
                            </button>
                            <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                              <select
                                value=""
                                onChange={(e) => {
                                  e.stopPropagation()
                                  if (e.target.value) {
                                    const gradingsToUpdate = Array.isArray(dashboard.gradings)
                                      ? dashboard.gradings.filter((g: any) => g.assessment_name === assessment.assessment_name)
                                      : []

                                    gradingsToUpdate.forEach((grading: any) => {
                                      dashboard.handleMoveGradingToFolder(grading.id, e.target.value)
                                    })
                                  }
                                }}
                                className="text-xs border border-gray-300 rounded px-2 py-1 bg-white shadow-sm"
                                onClick={(e) => e.stopPropagation()}
                              >
                                <option value="">Mover para...</option>
                                {dashboard.folders?.map((folder: any) => (
                                  <option key={folder.id} value={folder.id}>
                                    {folder.parent_folder_id ? '└ ' : ''}{folder.name}
                                  </option>
                                ))}
                              </select>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )
            })()}
          </div>
        ) : (
          <div className="space-y-4">
            {(!dashboard.gradings || dashboard.gradings.length === 0) ? (
            <div className="text-center py-12 text-gray-500">
              <i className="fas fa-chart-bar text-5xl mb-4 text-gray-300"></i>
              <p className="text-base mb-2">Nenhuma correção disponível</p>
              <p className="text-sm text-gray-400">
                Corrija uma avaliação para visualizar relatórios e estatísticas
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-medium text-gray-700">
                  <i className="fas fa-list mr-2"></i>
                  Correções Disponíveis
                </h3>
                <button
                  onClick={() => dashboard.setShowFolderModal(true)}
                  className="text-sm bg-blue-600 text-white px-3 py-1.5 rounded-md hover:bg-blue-700 transition-colors"
                >
                  <i className="fas fa-folder-plus mr-2"></i>
                  Gerenciar Pastas
                </button>
              </div>

              {(() => {
                const rootFolders = Array.isArray(dashboard.folders) ? dashboard.folders.filter((f: any) => !f.parent_folder_id) : []
                const ungroupedGradings = Array.isArray(dashboard.gradings) ? dashboard.gradings.filter((g: any) => !g.folder_id) : []

                const renderGradingCard = (grading: any, inFolder = false) => {
                  const isSelected = dashboard.selectedReport?.id === grading.id
                  return (
                    <div key={grading.id} className="relative group">
                      <button
                        onClick={() => handleViewIndividualReport(grading.id)}
                        className={`w-full text-left border-2 rounded-lg p-4 transition-all ${
                          isSelected
                            ? 'border-orange-500 bg-orange-50 shadow-lg ring-4 ring-orange-200'
                            : 'border-gray-200 hover:border-orange-300 hover:shadow-md bg-white'
                        }`}
                      >
                        <div className="flex items-start justify-between mb-3">
                          <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                            isSelected ? 'bg-orange-100' : 'bg-gray-100'
                          }`}>
                            <i className={`fas fa-file-alt ${
                              isSelected ? 'text-orange-600' : 'text-gray-400'
                            }`}></i>
                          </div>
                          {isSelected && (
                            <div className="bg-orange-500 text-white text-xs px-2 py-1 rounded-full flex items-center gap-1">
                              <i className="fas fa-check-circle"></i>
                              Selecionada
                            </div>
                          )}
                        </div>
                        <h4 className={`font-semibold mb-2 ${
                          isSelected ? 'text-orange-900' : 'text-gray-900'
                        }`}>
                          {grading.assessment_name}
                        </h4>
                        <div className="space-y-1">
                          {grading.classes?.name && (
                            <p className="text-xs text-gray-600 flex items-center">
                              <i className="fas fa-users mr-2 text-gray-400"></i>
                              {grading.classes.name}
                            </p>
                          )}
                          <p className="text-xs text-gray-600 flex items-center">
                            <i className="fas fa-calendar mr-2 text-gray-400"></i>
                            {new Date(grading.grading_date).toLocaleDateString('pt-BR', {
                              day: '2-digit',
                              month: 'long',
                              year: 'numeric'
                            })}
                          </p>
                          <p className="text-xs text-gray-600 flex items-center">
                            <i className="fas fa-list-ol mr-2 text-gray-400"></i>
                            {grading.total_questions} questões
                          </p>
                        </div>
                        <div className="mt-3 pt-3 border-t border-gray-200 flex items-center justify-between">
                          <span className={`text-xs font-medium ${
                            isSelected ? 'text-orange-600' : 'text-gray-500'
                          }`}>
                            Ver relatório <i className="fas fa-arrow-right ml-1"></i>
                          </span>
                          <button
                            onClick={async (e) => {
                              e.stopPropagation()
                              const success = await dashboard.handleDeleteGrading(grading.id)
                              if (success) {
                                dashboard.loadGradings()
                              }
                            }}
                            className="text-red-500 hover:text-red-700 transition-colors p-1"
                            title="Excluir correção"
                          >
                            <i className="fas fa-trash text-sm"></i>
                          </button>
                        </div>
                      </button>
                      {inFolder && (
                        <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                          <select
                            value={grading.folder_id || ''}
                            onChange={(e) => {
                              e.stopPropagation()
                              dashboard.handleMoveGradingToFolder(grading.id, e.target.value || null)
                            }}
                            className="text-xs border border-gray-300 rounded px-2 py-1 bg-white shadow-sm"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <option value="">Sem pasta</option>
                            {dashboard.folders?.map((folder: any) => (
                              <option key={folder.id} value={folder.id}>
                                {folder.name}
                              </option>
                            ))}
                          </select>
                        </div>
                      )}
                    </div>
                  )
                }

                return (
                  <div className="space-y-4">
                    {rootFolders.map((folder: any) => {
                      const subfolders = Array.isArray(dashboard.folders) ? dashboard.folders.filter((f: any) => f.parent_folder_id === folder.id) : []
                      const folderGradings = Array.isArray(dashboard.gradings) ? dashboard.gradings.filter((g: any) => g.folder_id === folder.id) : []
                      const isExpanded = dashboard.expandedFolders?.has(folder.id)

                      return (
                        <div key={folder.id} className="border-2 rounded-lg overflow-hidden" style={{ borderColor: folder.color }}>
                          <div className="w-full p-4 flex items-center justify-between bg-gradient-to-r from-gray-50 to-white hover:from-gray-100 hover:to-gray-50 transition-all">
                            <button
                              onClick={() => dashboard.toggleFolderExpansion(folder.id)}
                              className="flex-1 flex items-center gap-3"
                            >
                              <div
                                className="w-8 h-8 rounded-lg flex items-center justify-center shadow-sm"
                                style={{ backgroundColor: folder.color }}
                              >
                                <i className={`fas ${isExpanded ? 'fa-folder-open' : 'fa-folder'} text-white`}></i>
                              </div>
                              <div className="text-left">
                                <h4 className="font-semibold text-gray-900">{folder.name}</h4>
                                <p className="text-xs text-gray-500">
                                  {folderGradings.length} correç{folderGradings.length === 1 ? 'ão' : 'ões'}
                                  {subfolders.length > 0 && ` • ${subfolders.length} subpasta${subfolders.length === 1 ? '' : 's'}`}
                                </p>
                              </div>
                            </button>
                            <div className="flex items-center gap-2">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation()
                                  if (confirm(`Tem certeza que deseja excluir a pasta "${folder.name}"? As correções dentro dela não serão excluídas.`)) {
                                    dashboard.handleDeleteFolder(folder.id)
                                  }
                                }}
                                className="text-red-600 hover:text-red-700 p-2 hover:bg-red-50 rounded transition-colors"
                                title="Excluir pasta"
                              >
                                <i className="fas fa-trash text-sm"></i>
                              </button>
                              <button
                                onClick={() => dashboard.toggleFolderExpansion(folder.id)}
                                className="p-2"
                              >
                                <i className={`fas fa-chevron-${isExpanded ? 'up' : 'down'} text-gray-400`}></i>
                              </button>
                            </div>
                          </div>

                          {isExpanded && (
                            <div className="p-4 bg-gray-50 space-y-4">
                              {folderGradings.length > 0 && (
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                  {folderGradings.map((grading: any) => renderGradingCard(grading, true))}
                                </div>
                              )}

                              {subfolders.map((subfolder: any) => {
                                const subfolderGradings = Array.isArray(dashboard.gradings) ? dashboard.gradings.filter((g: any) => g.folder_id === subfolder.id) : []
                                const isSubExpanded = dashboard.expandedFolders?.has(subfolder.id)

                                return (
                                  <div key={subfolder.id} className="border-2 rounded-lg overflow-hidden" style={{ borderColor: subfolder.color }}>
                                    <div className="w-full p-3 flex items-center justify-between bg-white hover:bg-gray-50 transition-all">
                                      <button
                                        onClick={() => dashboard.toggleFolderExpansion(subfolder.id)}
                                        className="flex-1 flex items-center gap-3"
                                      >
                                        <i className="fas fa-level-up-alt text-gray-400 transform rotate-90 ml-2"></i>
                                        <div
                                          className="w-6 h-6 rounded flex items-center justify-center shadow-sm"
                                          style={{ backgroundColor: subfolder.color }}
                                        >
                                          <i className={`fas ${isSubExpanded ? 'fa-folder-open' : 'fa-folder'} text-white text-xs`}></i>
                                        </div>
                                        <div className="text-left">
                                          <h5 className="font-medium text-gray-900 text-sm">{subfolder.name}</h5>
                                          <p className="text-xs text-gray-500">
                                            {subfolderGradings.length} correç{subfolderGradings.length === 1 ? 'ão' : 'ões'}
                                          </p>
                                        </div>
                                      </button>
                                      <div className="flex items-center gap-2">
                                        <button
                                          onClick={(e) => {
                                            e.stopPropagation()
                                            if (confirm(`Tem certeza que deseja excluir a subpasta "${subfolder.name}"? As correções dentro dela não serão excluídas.`)) {
                                              dashboard.handleDeleteFolder(subfolder.id)
                                            }
                                          }}
                                          className="text-red-600 hover:text-red-700 p-2 hover:bg-red-50 rounded transition-colors"
                                          title="Excluir subpasta"
                                        >
                                          <i className="fas fa-trash text-xs"></i>
                                        </button>
                                        <button
                                          onClick={() => dashboard.toggleFolderExpansion(subfolder.id)}
                                          className="p-2"
                                        >
                                          <i className={`fas fa-chevron-${isSubExpanded ? 'up' : 'down'} text-gray-400`}></i>
                                        </button>
                                      </div>
                                    </div>

                                    {isSubExpanded && subfolderGradings.length > 0 && (
                                      <div className="p-3 bg-white">
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                          {subfolderGradings.map((grading: any) => renderGradingCard(grading, true))}
                                        </div>
                                      </div>
                                    )}
                                  </div>
                                )
                              })}

                              {folderGradings.length === 0 && subfolders.length === 0 && (
                                <div className="text-center py-6 text-gray-400">
                                  <i className="fas fa-inbox text-2xl mb-2"></i>
                                  <p className="text-xs">Pasta vazia</p>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      )
                    })}

                    {ungroupedGradings.length > 0 && (
                      <div>
                        <h4 className="text-sm font-medium text-gray-600 mb-3 flex items-center gap-2">
                          <i className="fas fa-file-alt"></i>
                          Sem Pasta
                          <span className="text-xs text-gray-400 font-normal">
                            (passe o mouse sobre os cards para mover para pastas)
                          </span>
                        </h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                          {ungroupedGradings.map((grading: any) => {
                            const isSelected = dashboard.selectedReport?.id === grading.id
                            return (
                              <div key={grading.id} className="relative group">
                                <button
                                  onClick={() => handleViewIndividualReport(grading.id)}
                                  className={`w-full text-left border-2 rounded-lg p-4 transition-all ${
                                    isSelected
                                      ? 'border-orange-500 bg-orange-50 shadow-lg ring-4 ring-orange-200'
                                      : 'border-gray-200 hover:border-orange-300 hover:shadow-md bg-white'
                                  }`}
                                >
                                  <div className="flex items-start justify-between mb-3">
                                    <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                                      isSelected ? 'bg-orange-100' : 'bg-gray-100'
                                    }`}>
                                      <i className={`fas fa-file-alt ${
                                        isSelected ? 'text-orange-600' : 'text-gray-400'
                                      }`}></i>
                                    </div>
                                    {isSelected && (
                                      <div className="bg-orange-500 text-white text-xs px-2 py-1 rounded-full flex items-center gap-1">
                                        <i className="fas fa-check-circle"></i>
                                        Selecionada
                                      </div>
                                    )}
                                  </div>
                                  <h4 className={`font-semibold mb-2 ${
                                    isSelected ? 'text-orange-900' : 'text-gray-900'
                                  }`}>
                                    {grading.assessment_name}
                                  </h4>
                                  <div className="space-y-1">
                                    {grading.classes?.name && (
                                      <p className="text-xs text-gray-600 flex items-center">
                                        <i className="fas fa-users mr-2 text-gray-400"></i>
                                        {grading.classes.name}
                                      </p>
                                    )}
                                    <p className="text-xs text-gray-600 flex items-center">
                                      <i className="fas fa-calendar mr-2 text-gray-400"></i>
                                      {new Date(grading.grading_date).toLocaleDateString('pt-BR', {
                                        day: '2-digit',
                                        month: 'long',
                                        year: 'numeric'
                                      })}
                                    </p>
                                    <p className="text-xs text-gray-600 flex items-center">
                                      <i className="fas fa-list-ol mr-2 text-gray-400"></i>
                                      {grading.total_questions} questões
                                    </p>
                                  </div>
                                  <div className="mt-3 pt-3 border-t border-gray-200 flex items-center justify-between">
                                    <span className={`text-xs font-medium ${
                                      isSelected ? 'text-orange-600' : 'text-gray-500'
                                    }`}>
                                      Ver relatório <i className="fas fa-arrow-right ml-1"></i>
                                    </span>
                                    <button
                                      onClick={async (e) => {
                                        e.stopPropagation()
                                        const success = await dashboard.handleDeleteGrading(grading.id)
                                        if (success) {
                                          dashboard.loadGradings()
                                        }
                                      }}
                                      className="text-red-500 hover:text-red-700 transition-colors p-1"
                                      title="Excluir correção"
                                    >
                                      <i className="fas fa-trash text-sm"></i>
                                    </button>
                                  </div>
                                </button>
                                <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                  <select
                                    value=""
                                    onChange={(e) => {
                                      e.stopPropagation()
                                      if (e.target.value) {
                                        dashboard.handleMoveGradingToFolder(grading.id, e.target.value)
                                      }
                                    }}
                                    className="text-xs border border-gray-300 rounded px-2 py-1 bg-white shadow-sm"
                                    onClick={(e) => e.stopPropagation()}
                                  >
                                    <option value="">Mover para...</option>
                                    {dashboard.folders?.map((folder: any) => (
                                      <option key={folder.id} value={folder.id}>
                                        {folder.parent_folder_id ? '└ ' : ''}{folder.name}
                                      </option>
                                    ))}
                                  </select>
                                </div>
                              </div>
                            )
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                )
              })()}
            </div>
          )}
          </div>
        )}
      </div>

      {/* MODAL DE RELATÓRIO INDIVIDUAL */}
      {showReportModal && dashboard.selectedReport && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-7xl w-full max-h-[90vh] overflow-hidden flex flex-col">
            <div className="border-b p-4 bg-gradient-to-r from-green-50 to-green-100 flex items-center justify-between sticky top-0 z-10">
              <div>
                <h3 className="text-lg font-semibold text-green-800">
                  <i className="fas fa-chart-bar mr-2"></i>
                  {dashboard.selectedReport.assessment_name}
                </h3>
                <p className="text-sm text-green-600 mt-1">
                  Turma: {dashboard.selectedReport.class_name} •
                  Data: {new Date(dashboard.selectedReport.grading_date).toLocaleDateString('pt-BR')}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => window.print()}
                  className="text-gray-600 hover:text-gray-900 transition-colors px-3 py-1 rounded border border-gray-300 hover:border-gray-400 flex items-center gap-2 print:hidden"
                  title="Imprimir relatório"
                >
                  <i className="fas fa-print"></i>
                  <span className="text-sm">Imprimir</span>
                </button>
                <button
                  onClick={handleCloseReportModal}
                  className="text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <i className="fas fa-times text-xl"></i>
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4">
              <div className="space-y-4">
                {/* Resumo Geral */}
                <div className="bg-white border rounded-lg p-4">
                  <h4 className="text-sm font-semibold text-gray-900 mb-3">
                    <i className="fas fa-chart-pie mr-2 text-blue-600"></i>
                    Resumo Geral
                  </h4>
                  <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                    <div className="text-center">
                      <div className="text-2xl font-bold text-blue-600">
                        {dashboard.selectedReport.total_students}
                      </div>
                      <div className="text-xs text-gray-600 mt-1">Estudantes</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-gray-500">
                        {dashboard.selectedReport.student_results?.filter((r: any) => r.absent === true).length || 0}
                      </div>
                      <div className="text-xs text-gray-600 mt-1">Faltosos</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-green-600">
                        {dashboard.selectedReport.average_score.toFixed(1)}%
                      </div>
                      <div className="text-xs text-gray-600 mt-1">Média da Turma</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-orange-600">
                        {dashboard.selectedReport.item_groups?.length || dashboard.selectedReport.total_questions}
                      </div>
                      <div className="text-xs text-gray-600 mt-1">Itens</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-red-600">
                        {dashboard.selectedReport.students_below_30}
                      </div>
                      <div className="text-xs text-gray-600 mt-1">Abaixo de 30%</div>
                    </div>
                  </div>
                </div>

                {/* Estudantes com menos de 30% */}
                {dashboard.selectedReport.students_below_30 > 0 && (
                  <div className="bg-red-50 border border-red-500 rounded-lg p-4">
                    <h4 className="text-sm font-semibold text-red-800 mb-3">
                      <i className="fas fa-exclamation-triangle mr-2"></i>
                      Estudantes com Menos de 30% de Acerto
                    </h4>
                    <div className="space-y-2">
                      {dashboard.selectedReport.low_performers.map((student: any) => (
                        <div key={student.id} className="bg-white p-3 rounded border border-red-300">
                          <div className="flex items-center justify-between">
                            <span className="text-sm text-gray-900">{student.name}</span>
                            <span className="text-sm font-semibold text-red-600">
                              {student.score.toFixed(1)}% ({student.correct_count}/{dashboard.selectedReport.total_questions})
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Resultados Individuais */}
                <div className="bg-white border rounded-lg p-4">
                  <h4 className="text-sm font-semibold text-gray-900 mb-3">
                    <i className="fas fa-users mr-2 text-blue-600"></i>
                    Resultados Individuais
                  </h4>
                  <div className="overflow-x-auto">
                    <div className="min-w-full inline-block align-middle">
                      <div className="overflow-visible">
                        <table className="w-full text-sm">
                          <thead>
                            <tr className="bg-gray-400">
                              <th className="text-center p-2 sticky left-0 z-10 bg-gray-400">Estudante</th>
                              <th className="text-center p-2">Respostas/Gabarito</th>
                              <th className="text-center p-2">Acertos</th>
                              <th className="text-center p-2">%</th>
                            </tr>
                          </thead>
                          <tbody>
                            <tr className="bg-yellow-100 border-b font-semibold relative">
                              <td className="p-2 text-gray-700 sticky left-0 z-10 bg-yellow-100"></td>
                              <td className="p-2">
                                <div className="flex flex-wrap gap-1 justify-center py-2">
                                  {dashboard.selectedReport.item_groups?.map((group: number[], itemIndex: number) => {
                                    const descriptor = dashboard.selectedReport.item_descriptors?.[group[0]] || ''

                                    if (group.length === 1) {
                                      const answer = dashboard.selectedReport.answer_key[group[0]]
                                      return (
                                        <span
                                          key={itemIndex}
                                          className="inline-flex items-center justify-center w-7 h-7 text-xs font-bold rounded bg-yellow-200 text-gray-800 border border-yellow-400 cursor-help relative group"
                                          title={descriptor || `Item ${itemIndex + 1}: ${answer}`}
                                        >
                                          {answer}
                                          {descriptor && (
                                            <span className="opacity-0 group-hover:opacity-100 absolute top-full left-1/2 transform -translate-x-1/2 mt-2 w-80 max-w-sm p-3 bg-gray-900 text-white text-xs leading-relaxed rounded-lg shadow-2xl z-[9999] pointer-events-none transition-opacity duration-200 whitespace-normal">
                                              <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-[-1px] w-0 h-0 border-l-4 border-r-4 border-b-4 border-transparent border-b-gray-900"></div>
                                              <div className="font-semibold mb-1 text-yellow-300">Item {itemIndex + 1} - Descritor:</div>
                                              {descriptor}
                                            </span>
                                          )}
                                        </span>
                                      )
                                    } else {
                                      const answers = group.map(idx => dashboard.selectedReport.answer_key[idx]).join(',')
                                      return (
                                        <span
                                          key={itemIndex}
                                          className="inline-flex items-center justify-center min-w-[28px] h-7 px-1 text-xs font-bold rounded bg-yellow-200 text-gray-800 border border-yellow-400 cursor-help relative group"
                                          title={descriptor || `Item ${itemIndex + 1} (V/F): ${answers}`}
                                        >
                                          {answers}
                                          {descriptor && (
                                            <span className="opacity-0 group-hover:opacity-100 absolute top-full left-1/2 transform -translate-x-1/2 mt-2 w-80 max-w-sm p-3 bg-gray-900 text-white text-xs leading-relaxed rounded-lg shadow-2xl z-[9999] pointer-events-none transition-opacity duration-200 whitespace-normal">
                                              <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-[-1px] w-0 h-0 border-l-4 border-r-4 border-b-4 border-transparent border-b-gray-900"></div>
                                              <div className="font-semibold mb-1 text-yellow-300">Item {itemIndex + 1} (V/F) - Descritor:</div>
                                              {descriptor}
                                            </span>
                                          )}
                                        </span>
                                      )
                                    }
                                  })}
                                </div>
                              </td>
                              <td className="text-center p-2 text-gray-400"></td>
                              <td className="text-center p-2 text-gray-400"></td>
                            </tr>
                            {dashboard.selectedReport.student_results
                              .sort((a: any, b: any) => b.score - a.score)
                              .map((result: any) => {
                                const getScoreColor = (score: number) => {
                                  if (score >= 90) return 'text-blue-600'
                                  if (score >= 70) return 'text-green-600'
                                  if (score >= 50) return 'text-yellow-600'
                                  return 'text-red-600'
                                }

                                const isAbsent = result.absent === true

                                return (
                                  <tr key={result.id} className={`border-b ${isAbsent ? 'bg-gray-100 opacity-60' : 'hover:bg-gray-200'}`}>
                                    <td className={`p-2 sticky left-0 z-10 ${isAbsent ? 'bg-gray-100' : 'bg-white'}`}>
                                      {result.student_name}
                                      {isAbsent && (
                                        <span className="ml-2 text-xs bg-gray-400 text-white px-2 py-0.5 rounded">
                                          FALTOSO
                                        </span>
                                      )}
                                    </td>
                                    <td className="p-2">
                                      <div className="flex flex-wrap gap-1 justify-center">
                                        {dashboard.selectedReport.item_groups?.map((group: number[], itemIndex: number) => {
                                          if (group.length === 1) {
                                            const idx = group[0]
                                            const answer = result.answers?.[idx] || ''
                                            const correctAnswer = dashboard.selectedReport.answer_key[idx]
                                            const isCorrect = answer && answer.toUpperCase() === correctAnswer?.toUpperCase()
                                            const isBlank = !answer || answer.trim() === ''

                                            return (
                                              <span
                                                key={itemIndex}
                                                className={`inline-flex items-center justify-center w-7 h-7 text-xs font-bold rounded border ${
                                                  isBlank
                                                    ? 'bg-gray-100 text-gray-400 border-gray-300'
                                                    : isCorrect
                                                    ? 'bg-green-500 text-black border-green-300'
                                                    : 'bg-red-600 text-black border-red-300'
                                                }`}
                                                title={`Item ${itemIndex + 1}: ${answer || 'Não respondida'} ${isCorrect ? '✓' : isBlank ? '' : '✗'}`}
                                              >
                                                {answer || '-'}
                                              </span>
                                            )
                                          } else {
                                            const answers = group.map(idx => result.answers?.[idx] || '')
                                            const displayText = answers.map(a => a || '-').join(',')
                                            const colorClass = getItemGroupColor(result.answers, group, dashboard.selectedReport.answer_key)

                                            return (
                                              <span
                                                key={itemIndex}
                                                className={`inline-flex items-center justify-center min-w-[28px] h-7 px-1 text-xs font-bold rounded border ${colorClass}`}
                                                title={`Item ${itemIndex + 1} (V/F): ${displayText}`}
                                              >
                                                {displayText}
                                              </span>
                                            )
                                          }
                                        })}
                                      </div>
                                    </td>
                                    <td className="text-center p-2 text-green-600 font-medium">
                                      {result.correct_count}
                                    </td>
                                    <td className="text-center p-2">
                                      <span className={`font-bold text-base ${getScoreColor(result.score)}`}>
                                        {result.score.toFixed(1)}%
                                      </span>
                                    </td>
                                  </tr>
                                )
                              })}

                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Resultados da Turma */}
                <div className="bg-white border rounded-lg p-4">
                  <h4 className="text-sm font-semibold text-gray-900 mb-3">
                    <i className="fas fa-chart-line mr-2 text-teal-600"></i>
                    Resultados da Turma
                  </h4>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="bg-gray-400">
                          <th className="text-center p-2">Turma</th>
                          <th className="text-center p-2">Vermelho (≤49%)</th>
                          <th className="text-center p-2">Amarelo (50%-69%)</th>
                          <th className="text-center p-2">Verde (70%-89%)</th>
                          <th className="text-center p-2">Azul (90%-100%)</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr className="border-b hover:bg-gray-200">
                          <td className="p-2 text-center font-medium text-gray-900">
                            {dashboard.selectedReport.class_name}
                          </td>
                          <td className="text-center p-2">
                            <div className="flex items-center justify-center gap-2">
                              <span className="inline-flex items-center justify-center w-4 h-4 rounded-full bg-red-600"></span>
                              <span className="font-semibold text-gray-700">
                                {dashboard.selectedReport.student_results.filter((r: any) => !r.absent && r.score <= 49).length}
                              </span>
                            </div>
                          </td>
                          <td className="text-center p-2">
                            <div className="flex items-center justify-center gap-2">
                              <span className="inline-flex items-center justify-center w-4 h-4 rounded-full bg-yellow-500"></span>
                              <span className="font-semibold text-gray-700">
                                {dashboard.selectedReport.student_results.filter((r: any) => !r.absent && r.score >= 50 && r.score <= 69).length}
                              </span>
                            </div>
                          </td>
                          <td className="text-center p-2">
                            <div className="flex items-center justify-center gap-2">
                              <span className="inline-flex items-center justify-center w-4 h-4 rounded-full bg-green-600"></span>
                              <span className="font-semibold text-gray-700">
                                {dashboard.selectedReport.student_results.filter((r: any) => !r.absent && r.score >= 70 && r.score <= 89).length}
                              </span>
                            </div>
                          </td>
                          <td className="text-center p-2">
                            <div className="flex items-center justify-center gap-2">
                              <span className="inline-flex items-center justify-center w-4 h-4 rounded-full bg-blue-600"></span>
                              <span className="font-semibold text-gray-700">
                                {dashboard.selectedReport.student_results.filter((r: any) => !r.absent && r.score >= 90).length}
                              </span>
                            </div>
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Análise por Questão */}
                <div className="bg-white border rounded-lg p-4">
                  <h4 className="text-sm font-semibold text-gray-900 mb-3">
                    <i className="fas fa-chart-bar mr-2 text-purple-600"></i>
                    Análise por Questão
                  </h4>
                  <div className="overflow-x-auto" style={{ overflowY: 'visible' }}>
                    <div className="min-w-full inline-block align-middle">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="bg-gray-400">
                            <th className="text-left p-2 sticky left-0 bg-gray-400 z-10">Critério</th>
                            {dashboard.selectedReport.item_groups?.map((group: number[], itemIndex: number) => {
                              const firstQuestionInGroup = group[0]
                              const descriptor = dashboard.selectedReport.item_descriptors?.[firstQuestionInGroup] || 'Sem descritor'
                              return (
                                <th key={itemIndex} className="text-center p-2 min-w-[80px]">
                                  <div className="relative inline-block group/tooltip">
                                    <span className="cursor-help font-medium">Item {itemIndex + 1}</span>
                                    <div className="absolute left-1/2 -translate-x-1/2 top-full mt-2 invisible group-hover/tooltip:visible opacity-0 group-hover/tooltip:opacity-100 transition-all duration-200 z-[9999]">
                                      <div className="bg-gray-800 text-white px-4 py-3 rounded-lg shadow-2xl border border-orange-400 min-w-[280px] max-w-[320px]">
                                        <div className="absolute left-1/2 -translate-x-1/2 bottom-full -mb-0.5">
                                          <div className="border-[6px] border-transparent border-b-purple-600"></div>
                                        </div>
                                        <div className="flex items-start gap-2">

                                          <div className="text-left">
                                            <div className="font-bold text-sm mb-1 text-purple-100">Descritor do Item</div>
                                            <div className="text-xs leading-relaxed">{descriptor}</div>
                                          </div>
                                        </div>
                                      </div>
                                    </div>
                                  </div>
                                </th>
                              )
                            })}
                          </tr>
                        </thead>
                          <tbody>
                            <tr className="bg-green-200 border-b">
                              <td className="p-2 sticky left-0 bg-green-200 z-10 text-xs font-semibold text-black">
                                Acertos (%)
                              </td>
                              {dashboard.selectedReport.item_groups?.map((group: number[], itemIndex: number) => {
                                const presentStudents = dashboard.selectedReport.student_results.filter((r: any) => !r.absent)
                                const totalStudents = presentStudents.length
                                let correctCount = 0

                                presentStudents.forEach((result: any) => {
                                  if (group.length === 1) {
                                    const idx = group[0]
                                    const answer = result.answers?.[idx] || ''
                                    const correctAnswer = dashboard.selectedReport.answer_key[idx]
                                    if (answer && answer.toUpperCase() === correctAnswer?.toUpperCase()) {
                                      correctCount++
                                    }
                                  } else {
                                    const allCorrect = group.every(idx => {
                                      const answer = result.answers?.[idx] || ''
                                      const correctAnswer = dashboard.selectedReport.answer_key[idx]
                                      return answer && answer.toUpperCase() === correctAnswer?.toUpperCase()
                                    })
                                    if (allCorrect) correctCount++
                                  }
                                })

                                const percentage = totalStudents > 0 ? ((correctCount / totalStudents) * 100).toFixed(1) : '0.0'

                                return (
                                  <td key={itemIndex} className="text-center p-2">
                                    <span className="inline-flex items-center justify-center min-w-[60px] px-2 py-1 text-xs font-bold rounded bg-green-500 text-black border border-green-300">
                                      {percentage}%
                                    </span>
                                  </td>
                                )
                              })}
                            </tr>

                            <tr className="bg-red-200 border-b">
                              <td className="p-2 sticky left-0 bg-red-200 z-10 text-xs font-semibold text-black">
                                Erros (%)
                              </td>
                              {dashboard.selectedReport.item_groups?.map((group: number[], itemIndex: number) => {
                                const presentStudents = dashboard.selectedReport.student_results.filter((r: any) => !r.absent)
                                const totalStudents = presentStudents.length
                                let incorrectCount = 0
                                let blankCount = 0

                                presentStudents.forEach((result: any) => {
                                  if (group.length === 1) {
                                    const idx = group[0]
                                    const answer = result.answers?.[idx] || ''
                                    const correctAnswer = dashboard.selectedReport.answer_key[idx]

                                    if (!answer || !answer.trim()) {
                                      blankCount++
                                    } else if (answer.toUpperCase() !== correctAnswer?.toUpperCase()) {
                                      incorrectCount++
                                    }
                                  } else {
                                    const hasAnswer = group.some(idx => {
                                      const answer = result.answers?.[idx] || ''
                                      return answer && answer.trim()
                                    })

                                    if (!hasAnswer) {
                                      blankCount++
                                    } else {
                                      const allCorrect = group.every(idx => {
                                        const answer = result.answers?.[idx] || ''
                                        const correctAnswer = dashboard.selectedReport.answer_key[idx]
                                        return answer && answer.toUpperCase() === correctAnswer?.toUpperCase()
                                      })
                                      if (!allCorrect) incorrectCount++
                                    }
                                  }
                                })

                                const totalErrors = incorrectCount + blankCount
                                const percentage = totalStudents > 0 ? ((totalErrors / totalStudents) * 100).toFixed(1) : '0.0'

                                return (
                                  <td key={itemIndex} className="text-center p-2">
                                    <span className="inline-flex items-center justify-center min-w-[60px] px-2 py-1 text-xs font-bold rounded bg-red-500 text-black border border-red-300">
                                      {percentage}%
                                    </span>
                                  </td>
                                )
                              })}
                            </tr>

                            {(() => {
                              const itemGroups = dashboard.selectedReport.item_groups || []
                              const itemAlternatives = dashboard.selectedReport.item_alternatives || []
                              if (itemGroups.length === 0) return null

                              const itemMaxOptions: number[] = []
                              itemGroups.forEach((group: number[], itemIndex: number) => {
                                if (group.length === 1) {
                                  const idx = group[0]
                                  const itemType = dashboard.selectedReport.item_types?.[idx]
                                  if (itemType === 'multipla_escolha') {
                                    const alternatives = itemAlternatives[idx] || []
                                    if (alternatives.length > 0) {
                                      const highestOption = alternatives.reduce((max: number, opt: string) => {
                                        if (opt.match(/^[A-J]$/i)) {
                                          const code = opt.toUpperCase().charCodeAt(0) - 64
                                          return Math.max(max, code)
                                        }
                                        return max
                                      }, 0)
                                      itemMaxOptions[itemIndex] = highestOption
                                    } else {
                                      itemMaxOptions[itemIndex] = 0
                                    }
                                  } else {
                                    itemMaxOptions[itemIndex] = 0
                                  }
                                } else {
                                  itemMaxOptions[itemIndex] = 0
                                }
                              })

                              const globalMaxOptions = Math.max(...itemMaxOptions, 0)
                              if (globalMaxOptions === 0) return null

                              const options = Array.from({ length: globalMaxOptions }, (_, i) => String.fromCharCode(65 + i))

                              return options.map((option) => (
                                <tr key={option} className="bg-white border-b hover:bg-gray-200">
                                  <td className="p-2 sticky left-0 bg-white z-10 text-xs font-semibold text-gray-700">
                                    Item {option} (%)
                                  </td>
                                  {itemGroups.map((group: number[], itemIndex: number) => {
                                    if (group.length === 1) {
                                      const idx = group[0]
                                      const itemType = dashboard.selectedReport.item_types?.[idx]
                                      const alternatives = itemAlternatives[idx] || []

                                      if (itemType === 'multipla_escolha') {
                                        const hasThisOption = alternatives.some((alt: string) => alt.toUpperCase() === option)

                                        if (hasThisOption) {
                                          const presentStudents = dashboard.selectedReport.student_results.filter((r: any) => !r.absent)
                                          const totalStudents = presentStudents.length
                                          let optionCount = 0

                                          presentStudents.forEach((result: any) => {
                                            const answer = result.answers?.[idx] || ''
                                            if (answer.toUpperCase() === option) {
                                              optionCount++
                                            }
                                          })

                                          const percentage = totalStudents > 0 ? ((optionCount / totalStudents) * 100).toFixed(1) : '0.0'

                                          return (
                                            <td key={itemIndex} className="text-center p-2">
                                              <span className="inline-flex items-center justify-center min-w-[60px] px-2 py-1 text-xs font-bold rounded bg-blue-100 text-blue-800 border border-blue-300">
                                                {percentage}%
                                              </span>
                                            </td>
                                          )
                                        } else {
                                          return (
                                            <td key={itemIndex} className="text-center p-2">
                                              <span className="inline-flex items-center justify-center min-w-[60px] px-2 py-1 text-xs font-bold rounded bg-gray-100 text-gray-400 border border-gray-300">
                                                --
                                              </span>
                                            </td>
                                          )
                                        }
                                      } else {
                                        return (
                                          <td key={itemIndex} className="text-center p-2">
                                            <span className="inline-flex items-center justify-center min-w-[60px] px-2 py-1 text-xs font-bold rounded bg-gray-100 text-gray-400 border border-gray-300">
                                              --
                                            </span>
                                          </td>
                                        )
                                      }
                                    } else {
                                      return (
                                        <td key={itemIndex} className="text-center p-2">
                                          <span className="inline-flex items-center justify-center min-w-[60px] px-2 py-1 text-xs font-bold rounded bg-gray-100 text-gray-400 border border-gray-300">
                                            --
                                          </span>
                                        </td>
                                      )
                                    }
                                  })}
                                </tr>
                              ))
                            })()}

                            <tr className="bg-gray-300 border-b">
                              <td className="p-2 sticky left-0 bg-gray-300 z-10 text-xs font-semibold text-black">
                                Em branco (%)
                              </td>
                              {dashboard.selectedReport.item_groups?.map((group: number[], itemIndex: number) => {
                                const presentStudents = dashboard.selectedReport.student_results.filter((r: any) => !r.absent)
                                const totalStudents = presentStudents.length
                                let blankCount = 0

                                presentStudents.forEach((result: any) => {
                                  if (group.length === 1) {
                                    const idx = group[0]
                                    const answer = result.answers?.[idx] || ''
                                    if (!answer || !answer.trim()) {
                                      blankCount++
                                    }
                                  } else {
                                    const hasAnswer = group.some(idx => {
                                      const answer = result.answers?.[idx] || ''
                                      return answer && answer.trim()
                                    })
                                    if (!hasAnswer) blankCount++
                                  }
                                })

                                const percentage = totalStudents > 0 ? ((blankCount / totalStudents) * 100).toFixed(1) : '0.0'

                                return (
                                  <td key={itemIndex} className="text-center p-2">
                                    <span className="inline-flex items-center justify-center min-w-[60px] px-2 py-1 text-xs font-bold rounded bg-gray-400 text-black border border-gray-500">
                                      {percentage}%
                                    </span>
                                  </td>
                                )
                              })}
                            </tr>
                          </tbody>
                        </table>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="border-t p-4 bg-gray-50 flex gap-3">
              <button
                onClick={dashboard.handleExportReport}
                className="flex-1 bg-orange-600 text-white py-2 px-4 rounded-md hover:bg-orange-700 transition-colors text-sm font-medium"
              >
                <i className="fas fa-download mr-2"></i>
                Exportar Relatório
              </button>
              <button
                onClick={handleCloseReportModal}
                className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 transition-colors text-sm"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL DE RELATÓRIO COMPILADO */}
      {showCompiledModal && dashboard.viewMode === 'compiled' && dashboard.compiledReports.length > 0 && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-7xl w-full max-h-[90vh] overflow-hidden flex flex-col">
            <div className="border-b p-4 bg-gradient-to-r from-teal-50 to-cyan-50 flex items-center justify-between sticky top-0 z-10">
              <div>
                <h3 className="text-lg font-semibold text-teal-900">
                  <i className="fas fa-layer-group mr-2"></i>
                  Compilação de Dados - {dashboard.selectedAssessmentName}
                </h3>
                <p className="text-sm text-teal-700 mt-1">
                  Dados consolidados de múltiplas turmas
                </p>
              </div>
              <button
                onClick={handleCloseCompiledModal}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <i className="fas fa-times text-xl"></i>
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4">
              <CompiledReportsView
                compiledReports={dashboard.compiledReports}
                assessmentName={dashboard.selectedAssessmentName}
                onBack={handleCloseCompiledModal}
              />
            </div>

            <div className="border-t p-4 bg-gray-50">
              <button
                onClick={handleCloseCompiledModal}
                className="w-full px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 transition-colors text-sm"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  )
}

export default ReportsSection
