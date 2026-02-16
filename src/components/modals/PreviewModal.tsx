import React from 'react'
import { distributeQuestionsDynamically } from '../../utils/questionDistribution'

interface AssessmentsSectionProps {
  state: any
  handlers: any
}

const AssessmentsSection: React.FC<AssessmentsSectionProps> = ({ state, handlers }) => {
  return (
    <section className="bg-white rounded-lg shadow-sm border order-2">
      <div className="border-b p-3 md:p-4 lg:p-8">
        <h2 className="text-base md:text-lg lg:text-xl font-semibold text-gray-900 flex items-center mb-2">
          <i className="fas fa-file-alt mr-2 md:mr-3 text-blue-600 text-sm md:text-base"></i>
          <span className="text-sm md:text-base lg:text-lg">CRIAR AVALIAÇÃO</span>
        </h2>
        <div className="w-full h-1 bg-orange-500 rounded-full"></div>
      </div>

      <div className="p-3 md:p-4 lg:p-8">
        <div className="flex border-b mb-4 md:mb-6 overflow-x-auto">
          <button
            onClick={() => handlers.handleTabChange("assessments", "search-assessments")}
            className={`px-2 md:px-3 lg:px-4 py-2 font-medium text-xs md:text-sm border-b-2 transition-colors whitespace-nowrap ${
              state.activeTab.assessments === "search-assessments"
                ? "border-blue-500 text-blue-600"
                : "border-transparent text-gray-500 hover:text-gray-700"
            }`}
          >
            <span className="hidden sm:inline">Pesquisar Avaliações</span>
            <span className="sm:hidden">Pesquisar</span>
          </button>
          <button
            onClick={() => handlers.handleTabChange("assessments", "create-assessment")}
            className={`px-2 md:px-3 lg:px-4 py-2 font-medium text-xs md:text-sm border-b-2 transition-colors whitespace-nowrap ${
              state.activeTab.assessments === "create-assessment"
                ? "border-blue-500 text-blue-600"
                : "border-transparent text-gray-500 hover:text-gray-700"
            }`}
          >
            <span className="hidden sm:inline">+ Nova Avaliação</span>
            <span className="sm:hidden">+ Nova</span>
          </button>
        </div>

        {state.activeTab.assessments === "search-assessments" && (
          <div className="space-y-3 md:space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Palavras-chave:</label>
              <input
                type="text"
                value={state.assessmentFilters.keywords}
                onChange={(e) => state.setAssessmentFilters((prev: any) => ({ ...prev, keywords: e.target.value }))}
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Digite palavras-chave para buscar..."
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Data de:</label>
                <input
                  type="date"
                  value={state.assessmentFilters.dateFrom}
                  onChange={(e) => state.setAssessmentFilters((prev: any) => ({ ...prev, dateFrom: e.target.value }))}
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Data até:</label>
                <input
                  type="date"
                  value={state.assessmentFilters.dateTo}
                  onChange={(e) => state.setAssessmentFilters((prev: any) => ({ ...prev, dateTo: e.target.value }))}
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Tipo de Avaliação:</label>
              <div className="space-y-2">
                {["Todas", "Prova", "Teste", "Estudo dirigido", "Simulado", "Exercício"].map((type) => (
                  <label key={type} className="flex items-center">
                    <input
                      type="checkbox"
                      checked={state.assessmentFilters.assessmentTypes.includes(type)}
                      onChange={() => handlers.handleAssessmentTypeToggle(type)}
                      className="mr-2 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    />
                    <span className="text-sm text-gray-700">{type}</span>
                  </label>
                ))}
              </div>
            </div>

            <button
              onClick={handlers.handleAssessmentSearch}
              className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 transition-colors text-sm"
            >
              Pesquisar
            </button>

            {/* Área de Resultados */}
            {state.hasSearched.assessments && (
              <div className="mt-4 md:mt-6 border-t pt-4 md:pt-6">
                <h3 className="text-base md:text-lg font-medium text-gray-900 mb-4">
                  Resultados da Pesquisa
                </h3>
                {state.searchResults.assessments.length === 0 ? (
                  <div className="text-center py-6 md:py-8">
                    <i className="fas fa-search text-3xl md:text-4xl text-gray-300 mb-4"></i>
                    <p className="text-gray-500 mb-2 text-sm md:text-base">Nenhum resultado para exibir</p>
                    <p className="text-xs md:text-sm text-gray-400">
                      Use os filtros acima e clique em Pesquisar para encontrar avaliações
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3 md:space-y-4">
                    {state.searchResults.assessments.map((assessment: any, index: number) => (
                      <div
                        key={index}
                        className="border rounded-lg p-3 md:p-4 hover:shadow-md transition-shadow"
                      >
                        <h4 className="font-medium text-gray-900 text-sm md:text-base">
                          {assessment.title}
                        </h4>
                        <p className="text-xs md:text-sm text-gray-600 mt-1">{assessment.description}</p>
                        <div className="flex items-center justify-between mt-2 md:mt-3">
                          <span className="text-xs text-gray-500">{assessment.date}</span>
                          <button className="text-blue-600 hover:text-blue-700 text-xs md:text-sm">
                            Ver detalhes
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {state.activeTab.assessments === "create-assessment" && (
          <div className="space-y-3 md:space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Instrumento Avaliativo *
              </label>
              <div className="space-y-2">
                {["Prova", "Teste", "Estudo dirigido", "Simulado", "Exercício"].map((type) => (
                  <label key={type} className="flex items-center">
                    <input
                      type="radio"
                      name="tipoAvaliacao"
                      value={type}
                      checked={state.assessmentData.tipoAvaliacao === type}
                      onChange={(e) => handlers.handleAssessmentDataChange("tipoAvaliacao", e.target.value)}
                      className="mr-2 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
                    />
                    <span className="text-sm text-gray-700">{type}</span>
                  </label>
                ))}
              </div>

              <div className="mt-3">
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={state.assessmentData.mostrarTipoAvaliacao}
                    onChange={(e) => handlers.handleAssessmentDataChange("mostrarTipoAvaliacao", e.target.checked)}
                    className="mr-2 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  <span className="text-sm text-gray-700">Mostrar tipo de avaliação no documento</span>
                </label>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Nome da Escola *</label>
              <input
                type="text"
                value={state.assessmentData.nomeEscola}
                onChange={(e) => handlers.handleAssessmentDataChange("nomeEscola", e.target.value)}
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Nome da instituição de ensino"
                required
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Professor:</label>
                <input
                  type="text"
                  value={state.assessmentData.professor}
                  onChange={(e) => handlers.handleAssessmentDataChange("professor", e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Nome do professor"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Turma:</label>
                <input
                  type="text"
                  value={state.assessmentData.turma}
                  onChange={(e) => handlers.handleAssessmentDataChange("turma", e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Ex: 9º A, 1º EM"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Componente Curricular:</label>
              <input
                type="text"
                value={state.assessmentData.componenteCurricular}
                onChange={(e) => handlers.handleAssessmentDataChange("componenteCurricular", e.target.value)}
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Ex: Matemática, Língua Portuguesa"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Data da Avaliação:</label>
              <input
                type="date"
                value={state.assessmentData.data}
                onChange={(e) => handlers.handleAssessmentDataChange("data", e.target.value)}
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Instruções:</label>
              <textarea
                value={state.assessmentData.instrucoes}
                onChange={handlers.handleInstructionsChange}
                rows={3}
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Digite as instruções para a avaliação..."
              />
            </div>

            <div className="space-y-3 md:space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <span className="text-sm font-medium text-gray-700">Imagem de Cabeçalho:</span>
                <button
                  onClick={handlers.handleAddHeaderImage}
                  className="bg-green-600 text-white px-3 md:px-4 py-2 rounded-md hover:bg-green-700 transition-colors text-sm"
                >
                  + Add imagem de cabeçalho
                </button>
              </div>

              {state.assessmentData.headerImage && (
                <div className="bg-gray-50 p-3 md:p-4 rounded-md space-y-3 md:space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600 truncate mr-2">
                      📎 {state.assessmentData.headerImage.name}
                    </span>
                    <button
                      onClick={() => handlers.handleAssessmentDataChange("headerImage", null)}
                      className="text-red-600 hover:text-red-700 text-sm flex-shrink-0"
                    >
                      Remover
                    </button>
                  </div>

                  <div className="space-y-3">
                    <div className="p-3 bg-blue-50 rounded-md">
                      <p className="text-xs text-blue-600 mt-1">
                        A imagem será usada para substituir o cabeçalho padrão com configurações independentes
                      </p>
                    </div>

                    <div className="grid grid-cols-2 gap-3 md:gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Largura (mm):
                        </label>
                        <input
                          type="number"
                          min="50"
                          max="200"
                          value={state.assessmentData.imageWidth}
                          onChange={(e) =>
                            handlers.handleAssessmentDataChange("imageWidth", Number.parseInt(e.target.value) || 190)
                          }
                          className="w-full px-2 py-1 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                        <p className="text-xs text-gray-500 mt-1">Ajusta horizontalmente</p>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Altura (mm):</label>
                        <input
                          type="number"
                          min="20"
                          max="100"
                          value={state.assessmentData.imageHeight}
                          onChange={(e) =>
                            handlers.handleAssessmentDataChange("imageHeight", Number.parseInt(e.target.value) || 40)
                          }
                          className="w-full px-2 py-1 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                        <p className="text-xs text-gray-500 mt-1">Ajusta verticalmente</p>
                      </div>
                    </div>

                    <div className="mt-3">
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Preview sincronizado:
                      </label>
                      <div
                        className="relative w-full overflow-hidden border border-gray-200 rounded-md"
                        style={{
                          height: "120px",
                          backgroundColor: "#f7fafc",
                        }}
                      >
                        {state.assessmentData.headerImage && (
                          <img
                            src={URL.createObjectURL(state.assessmentData.headerImage) || "/placeholder.svg"}
                            alt="Preview"
                            className="object-fill w-full h-full"
                            style={{
                              transform: `scaleX(${state.assessmentData.imageWidth / 190}) scaleY(${state.assessmentData.imageHeight / 50})`,
                              transformOrigin: "center center",
                            }}
                          />
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* NOVO: Seção de itens selecionados para a avaliação */}
            {state.selectedItemsForAssessment.length > 0 && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="text-sm font-medium text-blue-800">
                    <i className="fas fa-list-check mr-2"></i>
                    Itens Selecionados para a Avaliação ({state.selectedItemsForAssessment.length})
                  </h4>
                  <button
                    onClick={handlers.handleClearAllItemsFromAssessment}
                    className="text-red-600 hover:text-red-700 text-xs"
                  >
                    <i className="fas fa-trash mr-1"></i>
                    Limpar todos
                  </button>
                </div>
                
                <div className="space-y-2 max-h-40 overflow-y-auto">
                  {state.selectedItemsForAssessment.map((item: any, index: number) => (
                    <div key={item.id} className="bg-white p-2 rounded border border-blue-200 flex items-center justify-between">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center space-x-2 mb-1">
                          <span className="text-xs font-medium text-blue-800">#{index + 1}</span>
                          <span className="text-xs bg-blue-100 text-blue-700 px-1 py-0.5 rounded">
                            {item.tipoItem === "multipla_escolha" ? "M.E." : 
                             item.tipoItem === "verdadeiro_falso" ? "V/F" : "Disc."}
                          </span>
                        </div>
                        <p className="text-xs text-gray-700 truncate">
                          {item.descritor.length > 80 ? `${item.descritor.substring(0, 80)}...` : item.descritor}
                        </p>
                      </div>
                      <div className="flex items-center space-x-1 ml-2">
                        <button
                          onClick={() => handlers.handleViewItemDetails(item)}
                          className="text-blue-600 hover:text-blue-700 p-1"
                          title="Ver detalhes"
                        >
                          <i className="fas fa-eye text-xs"></i>
                        </button>
                        <button
                          onClick={() => handlers.handleRemoveItemFromAssessment(item.id)}
                          className="text-red-600 hover:text-red-700 p-1"
                          title="Remover da avaliação"
                        >
                          <i className="fas fa-times text-xs"></i>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
                
                <div className="mt-3 p-2 bg-blue-100 rounded text-xs text-blue-700">
                  <i className="fas fa-info-circle mr-1"></i>
                  Estes itens serão incluídos no PDF da avaliação quando você gerar o documento.
                </div>
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Layout das questões:</label>
              <div className="flex flex-col sm:flex-row sm:space-x-4 space-y-2 sm:space-y-0">
                <label className="flex items-center">
                  <input
                    type="radio"
                    name="colunas"
                    value="1"
                    checked={state.assessmentData.colunas === "1"}
                    onChange={(e) => handlers.handleAssessmentDataChange("colunas", e.target.value)}
                    className="mr-2 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
                  />
                  <span className="text-sm text-gray-700">1 Coluna</span>
                </label>
                <label className="flex items-center">
                  <input
                    type="radio"
                    name="colunas"
                    value="2"
                    checked={state.assessmentData.colunas === "2"}
                    onChange={(e) => handlers.handleAssessmentDataChange("colunas", e.target.value)}
                    className="mr-2 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
                  />
                  <span className="text-sm text-gray-700">2 Colunas</span>
                </label>
              </div>
            </div>

            <div>
              <div className="bg-blue-50 border border-blue-200 rounded-md p-3">
                <h4 className="text-sm font-medium text-blue-800 mb-2">
                  <i className="fas fa-info-circle mr-1"></i>
                  Número de questões na avaliação:
                </h4>
                <div className="text-lg font-bold text-blue-900">
                  {state.selectedItemsForAssessment.length} questão{state.selectedItemsForAssessment.length !== 1 ? 'ões' : ''}
                </div>
                <p className="text-xs text-blue-600 mt-1">
                  {state.selectedItemsForAssessment.length === 0 
                    ? "Adicione itens na seção de pesquisa para compor sua avaliação"
                    : "Baseado nos itens adicionados na pesquisa"
                  }
                </p>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-3 md:space-x-4">
              <button
                onClick={() => {
                  state.setPreviewColumns(state.assessmentData.colunas)
                  handlers.handlePreview()
                }}
                className="flex-1 bg-yellow-600 text-white py-2 px-4 rounded-md hover:bg-yellow-700 transition-colors text-sm"
              >
                Pré-visualização ({state.assessmentData.colunas} col{state.assessmentData.colunas === "2" ? "s" : ""})
              </button>
              <button
                onClick={handlers.handleGeneratePDF}
                className="flex-1 bg-green-600 text-white py-2 px-4 rounded-md hover:bg-green-700 transition-colors text-sm flex items-center justify-center"
              >
                <i className="fas fa-rocket mr-2"></i>
                Gerar PDF (Puppeteer)
              </button>
            </div>
          </div>
        )}
      </div>
    </section>
  )
}

export default AssessmentsSection