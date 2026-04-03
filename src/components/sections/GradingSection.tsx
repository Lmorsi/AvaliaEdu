import React from 'react'

interface GradingSectionProps {
  dashboard: any
}

const GradingSection: React.FC<GradingSectionProps> = ({ dashboard }) => {
  return (
    <section className="bg-white rounded-lg shadow-sm border">
      <div className="border-b p-3 md:p-8 lg:p-8">
        <h2 className="text-base md:text-lg lg:text-xl font-semibold text-gray-900 flex items-center mb-2">
          <i className="fas fa-check-circle mr-2 md:mr-3 text-green-600 text-sm md:text-base"></i>
          <span className="text-sm md:text-base lg:text-lg">CORREÇÃO DE AVALIAÇÕES</span>
        </h2>
        <div className="w-full h-1 bg-green-500 rounded-full"></div>
      </div>

      <div className="p-3 md:p-8 lg:p-8">
        <div className="flex border-b mb-4 md:mb-6 overflow-x-auto">
          <button
            onClick={() => dashboard.handleTabChange("grading", "manage-classes")}
            className={`px-2 md:px-3 lg:px-4 py-2 font-medium text-xs md:text-sm border-b-2 transition-colors whitespace-nowrap ${
              dashboard.activeTab.grading === "manage-classes"
                ? "border-green-500 text-green-600"
                : "border-transparent text-gray-500 hover:text-gray-700"
            }`}
          >
            Gerenciar Turmas
          </button>
          <button
            onClick={() => dashboard.handleTabChange("grading", "grade-assessment")}
            className={`px-2 md:px-3 lg:px-4 py-2 font-medium text-xs md:text-sm border-b-2 transition-colors whitespace-nowrap ${
              dashboard.activeTab.grading === "grade-assessment"
                ? "border-green-500 text-green-600"
                : "border-transparent text-gray-500 hover:text-gray-700"
            }`}
          >
            Corrigir Avaliação
          </button>
        </div>

        {/* Gerenciar Turmas */}
        {dashboard.activeTab.grading === "manage-classes" && (
          <div className="space-y-4">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h3 className="text-sm font-medium text-blue-800 mb-3">
                <i className="fas fa-users mr-2"></i>
                Nova Turma
              </h3>
              <div className="space-y-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Nome da Turma *
                  </label>
                  <input
                    type="text"
                    value={dashboard.classData.name}
                    onChange={(e) => dashboard.setClassData({ ...dashboard.classData, name: e.target.value })}
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                    placeholder="Ex: 9º A, 1º EM"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Ano Letivo
                  </label>
                  <input
                    type="text"
                    value={dashboard.classData.school_year}
                    onChange={(e) => dashboard.setClassData({ ...dashboard.classData, school_year: e.target.value })}
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                    placeholder="Ex: 2025"
                  />
                </div>
                <button
                  onClick={dashboard.handleCreateClass}
                  className="w-full bg-green-600 text-white py-2 px-4 rounded-md hover:bg-green-700 transition-colors text-sm"
                >
                  <i className="fas fa-plus mr-2"></i>
                  Criar Turma
                </button>
              </div>
            </div>

            {/* Lista de Turmas */}
            <div>
              <h3 className="text-sm font-medium text-gray-700 mb-3">
                <i className="fas fa-list mr-2"></i>
                Turmas Cadastradas
              </h3>
              {dashboard.classes.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <i className="fas fa-users text-4xl mb-3 text-gray-300"></i>
                  <p className="text-sm">Nenhuma turma cadastrada</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {dashboard.classes.map((classItem: any) => (
                    <div
                      key={classItem.id}
                      className="border rounded-lg p-4 hover:shadow-md transition-shadow"
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <h4 className="font-medium text-gray-900">{classItem.name}</h4>
                          {classItem.school_year && (
                            <p className="text-xs text-gray-500 mt-1">Ano: {classItem.school_year}</p>
                          )}
                        </div>
                        <div className="flex space-x-2">
                          <button
                            onClick={() => dashboard.handleViewStudents(classItem.id)}
                            className="text-blue-600 hover:text-blue-700 text-sm"
                          >
                            <i className="fas fa-user-graduate mr-1"></i>
                            Estudantes
                          </button>
                          <button
                            onClick={() => dashboard.handleDeleteClass(classItem.id)}
                            className="text-red-600 hover:text-red-700 text-sm"
                          >
                            <i className="fas fa-trash"></i>
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Corrigir Avaliação */}
        {dashboard.activeTab.grading === "grade-assessment" && (
          <div className="space-y-4">
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
                      <i className="fas fa-users text-4xl mb-3 text-gray-300"></i>
                      <p className="text-sm">Nenhuma turma disponível</p>
                      <p className="text-xs mt-2">Cadastre uma turma primeiro na aba "Gerenciar Turmas"</p>
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
                      Esta turma não possui estudantes cadastrados. Adicione estudantes em "Gerenciar Turmas" antes de continuar.
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
                      {dashboard.savedAssessments.length === 0 ? (
                        <div className="text-center py-6 bg-gray-50 rounded-lg border border-gray-200">
                          <i className="fas fa-file-alt text-3xl mb-3 text-gray-300"></i>
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
                                  {dashboard.selectedAssessmentForGrading.tipoAvaliacao || dashboard.selectedAssessmentForGrading.tipo_avaliacao || 'Sem tipo'} -
                                  {' '}{(dashboard.selectedAssessmentForGrading.selectedItems || dashboard.selectedAssessmentForGrading.selected_items || []).length} questões
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
                  <button
                    onClick={dashboard.handleStartGrading}
                    disabled={!dashboard.selectedAssessmentForGrading || dashboard.students.length === 0}
                    className="w-full bg-green-600 text-white py-3 px-4 rounded-md hover:bg-green-700 transition-colors text-sm font-medium disabled:bg-gray-300 disabled:cursor-not-allowed"
                  >
                    <i className="fas fa-play mr-2"></i>
                    Iniciar Correção
                  </button>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </section>
  )
}

export default GradingSection
