import React from 'react'

interface AssessmentsSectionProps {
  dashboard: any
}

const AssessmentsSection: React.FC<AssessmentsSectionProps> = ({ dashboard }) => {
  return (
    <section className="bg-white rounded-lg shadow-sm border order-2">
      <div className="border-b p-3 md:p-8 lg:p-8">
        <h2 className="text-base md:text-lg lg:text-xl font-semibold text-gray-900 flex items-center mb-2">
          <i className="fas fa-file-alt mr-2 md:mr-3 text-blue-600 text-sm md:text-base"></i>
          <span className="text-sm md:text-base lg:text-lg">CRIAR AVALIAÇÃO</span>
        </h2>
        <div className="w-full h-1 bg-orange-500 rounded-full"></div>
      </div>

      <div className="p-3 md:p-8 lg:p-8">
        <div className="flex border-b mb-4 md:mb-6 overflow-x-auto">
          <button
            onClick={() => dashboard.handleTabChange("assessments", "search-assessments")}
            className={`px-2 md:px-3 lg:px-4 py-2 font-medium text-xs md:text-sm border-b-2 transition-colors whitespace-nowrap ${
              dashboard.activeTab.assessments === "search-assessments"
                ? "border-blue-500 text-blue-600"
                : "border-transparent text-gray-500 hover:text-gray-700"
            }`}
          >
            <span className="hidden sm:inline">Pesquisar Avaliações</span>
            <span className="sm:hidden">Pesquisar</span>
          </button>
          <button
            onClick={() => dashboard.handleTabChange("assessments", "create-assessment")}
            className={`px-2 md:px-3 lg:px-4 py-2 font-medium text-xs md:text-sm border-b-2 transition-colors whitespace-nowrap ${
              dashboard.activeTab.assessments === "create-assessment"
                ? "border-blue-500 text-blue-600"
                : "border-transparent text-gray-500 hover:text-gray-700"
            }`}
          >
            <span className="hidden sm:inline">+ Nova Avaliação</span>
            <span className="sm:hidden">+ Nova</span>
          </button>
        </div>

        {dashboard.activeTab.assessments === "search-assessments" && (
          <div className="space-y-3 md:space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Palavras-chave:</label>
              <input
                type="text"
                value={dashboard.assessmentFilters.keywords}
                onChange={(e) => dashboard.setAssessmentFilters((prev: any) => ({ ...prev, keywords: e.target.value }))}
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Digite palavras-chave para buscar..."
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Data de:</label>
                <input
                  type="date"
                  value={dashboard.assessmentFilters.dateFrom}
                  onChange={(e) => dashboard.setAssessmentFilters((prev: any) => ({ ...prev, dateFrom: e.target.value }))}
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Data até:</label>
                <input
                  type="date"
                  value={dashboard.assessmentFilters.dateTo}
                  onChange={(e) => dashboard.setAssessmentFilters((prev: any) => ({ ...prev, dateTo: e.target.value }))}
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
                     checked={dashboard.assessmentFilters.assessmentTypes.includes(type)}
                     onChange={() => dashboard.handleAssessmentTypeToggle(type)}
                      className="mr-2 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    />
                    <span className="text-sm text-gray-700">{type}</span>
                  </label>
                ))}
              </div>
            </div>

            <button
              onClick={dashboard.handleAssessmentSearch}
              className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 transition-colors text-sm"
            >
              Pesquisar
            </button>

            {/* Área de Resultados */}
            {dashboard.hasSearched.assessments && (
              <div className="mt-4 md:mt-6 border-t pt-4 md:pt-6">
                <h3 className="text-base md:text-lg font-medium text-gray-900 mb-4">
                  Resultados da Pesquisa
                </h3>
                {dashboard.searchResults.assessments.length === 0 ? (
                  <div className="text-center py-6 md:py-8">
                    <i className="fas fa-search text-3xl md:text-4xl text-gray-300 mb-4"></i>
                    <p className="text-gray-500 mb-2 text-sm md:text-base">Nenhum resultado para exibir</p>
                    <p className="text-xs md:text-sm text-gray-400">
                      Use os filtros acima e clique em Pesquisar para encontrar avaliações
                    </p>
                  </div>
                ) : (
                  <>
                    <div className="space-y-3 md:space-y-4">
                      {dashboard.searchResults.assessments.slice(0, 5).map((assessment: any, index: number) => (
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

                    {dashboard.searchResults.assessments.length > 5 && (
                      <div className="mt-4 text-center">
                        <button
                          onClick={() => dashboard.openModal('assessments-paginated-results-modal')}
                          className="bg-blue-600 text-white py-2 px-6 rounded-md hover:bg-blue-700 transition-colors text-sm font-medium inline-flex items-center"
                        >
                          <i className="fas fa-list mr-2"></i>
                          Ver todas as {dashboard.searchResults.assessments.length} avaliações
                        </button>
                      </div>
                    )}
                  </>
                )}
              </div>
            )}
          </div>
        )}

        {dashboard.activeTab.assessments === "create-assessment" && (
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
                      checked={dashboard.assessmentData.tipoAvaliacao === type}
                      onChange={(e) => dashboard.handleAssessmentDataChange("tipoAvaliacao", e.target.value)}
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
                    checked={dashboard.assessmentData.mostrarTipoAvaliacao}
                    onChange={(e) => dashboard.handleAssessmentDataChange("mostrarTipoAvaliacao", e.target.checked)}
                    className="mr-2 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  <span className="text-sm text-gray-700">Mostrar tipo de avaliação no documento</span>
                </label>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Nome da Avaliação *
                <span className="text-xs text-gray-500 ml-2">(aparecerá no topo das páginas com questões)</span>
              </label>
              <input
                type="text"
                value={dashboard.assessmentData.nomeAvaliacao}
                onChange={(e) => dashboard.handleAssessmentDataChange("nomeAvaliacao", e.target.value)}
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Ex: Avaliação de Matemática - 1º Bimestre"
                maxLength={100}
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Nome da Escola *</label>
              <input
                type="text"
                value={dashboard.assessmentData.nomeEscola}
                onChange={(e) => dashboard.handleAssessmentDataChange("nomeEscola", e.target.value)}
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
                  value={dashboard.assessmentData.professor}
                  onChange={(e) => dashboard.handleAssessmentDataChange("professor", e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Nome do professor"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Turma:</label>
                <input
                  type="text"
                  value={dashboard.assessmentData.turma}
                  onChange={(e) => dashboard.handleAssessmentDataChange("turma", e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Ex: 9º A, 1º EM"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Componente Curricular:</label>
              <input
                type="text"
                value={dashboard.assessmentData.componenteCurricular}
                onChange={(e) => dashboard.handleAssessmentDataChange("componenteCurricular", e.target.value)}
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Ex: Matemática, Língua Portuguesa"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Data da Avaliação:</label>
              <input
                type="date"
                value={dashboard.assessmentData.data}
                onChange={(e) => dashboard.handleAssessmentDataChange("data", e.target.value)}
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Instruções:</label>
              <textarea
                value={dashboard.assessmentData.instrucoes}
                onChange={dashboard.handleInstructionsChange}
                rows={3}
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Digite as instruções para a avaliação..."
              />
            </div>

            <div className="space-y-3 md:space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <span className="text-sm font-medium text-gray-700">Imagem de Cabeçalho:</span>
                <button
                  onClick={dashboard.handleAddHeaderImage}
                  className="bg-green-600 text-white px-3 md:px-4 py-2 rounded-md hover:bg-green-700 transition-colors text-sm"
                >
                  + Add imagem de cabeçalho
                </button>
              </div>

              {dashboard.assessmentData.headerImage && (
                <div className="bg-gray-50 p-3 md:p-4 rounded-md space-y-3 md:space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600 truncate mr-2">
                      📎 {dashboard.assessmentData.headerImage.name}
                    </span>
                    <button
                      onClick={() => dashboard.handleAssessmentDataChange("headerImage", null)}
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
                          value={dashboard.assessmentData.imageWidth}
                          onChange={(e) =>
                            dashboard.handleAssessmentDataChange("imageWidth", Number.parseInt(e.target.value) || 190)
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
                          value={dashboard.assessmentData.imageHeight}
                          onChange={(e) =>
                            dashboard.handleAssessmentDataChange("imageHeight", Number.parseInt(e.target.value) || 40)
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
                        {dashboard.assessmentData.headerImage && (
                          <img
                            src={URL.createObjectURL(dashboard.assessmentData.headerImage) || "/placeholder.svg"}
                            alt="Preview"
                            className="object-fill w-full h-full"
                            style={{
                              transform: `scaleX(${dashboard.assessmentData.imageWidth / 190}) scaleY(${dashboard.assessmentData.imageHeight / 50})`,
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
            {dashboard.selectedItemsForAssessment.length > 0 && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="text-sm font-medium text-blue-800">
                    <i className="fas fa-list-check mr-2"></i>
                    Itens Selecionados para a Avaliação ({dashboard.selectedItemsForAssessment.length})
                    {dashboard.questionsShuffled && (
                      <span className="ml-2 text-xs bg-orange-100 text-orange-700 px-2 py-1 rounded-full">
                        <i className="fas fa-random mr-1"></i>
                        Embaralhadas
                      </span>
                    )}
                  </h4>
                  <div className="flex items-center space-x-2">
                    {dashboard.selectedItemsForAssessment.length > 1 && (
                      <>
                        {!dashboard.questionsShuffled ? (
                          <button
                            onClick={dashboard.handleShuffleQuestions}
                            className="text-orange-600 hover:text-orange-700 text-xs bg-orange-50 px-2 py-1 rounded border border-orange-200 hover:bg-orange-100 transition-colors"
                            title="Embaralhar ordem das questões"
                          >
                            <i className="fas fa-random mr-1"></i>
                            Embaralhar
                          </button>
                        ) : (
                          <button
                            onClick={dashboard.handleRestoreOriginalOrder}
                            className="text-blue-600 hover:text-blue-700 text-xs bg-blue-50 px-2 py-1 rounded border border-blue-200 hover:bg-blue-100 transition-colors"
                            title="Restaurar ordem original"
                          >
                            <i className="fas fa-undo mr-1"></i>
                            Ordem original
                          </button>
                        )}
                      </>
                    )}
                    <button
                      onClick={dashboard.handleClearAllItemsFromAssessment}
                      className="text-red-600 hover:text-red-700 text-xs"
                    >
                      <i className="fas fa-trash mr-1"></i>
                      Limpar todos
                    </button>
                  </div>
                </div>
                
                <div className="space-y-2 max-h-40 overflow-y-auto" id="sortable-items-container">
                  {dashboard.selectedItemsForAssessment.map((item: any, index: number) => (
                    <div 
                      key={item.id} 
                      draggable
                      onDragStart={(e) => dashboard.handleDragStart(e, item, index)}
                      onDragEnd={dashboard.handleDragEnd}
                      onDragOver={(e) => dashboard.handleDragOver(e, index)}
                      onDragLeave={dashboard.handleDragLeave}
                      onDrop={(e) => dashboard.handleDrop(e, index)}
                      className={`bg-white p-2 rounded border border-blue-200 flex items-center justify-between cursor-move transition-all duration-200 hover:shadow-md hover:border-blue-300 ${
                        dashboard.dragOverIndex === index ? 'border-green-400 bg-green-50 transform scale-102 shadow-lg' : ''
                      } ${dashboard.draggedItem?.index === index ? 'opacity-50 transform rotate-2' : ''}`}
                      title="Arraste para reordenar as questões"
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center space-x-2 mb-1">
                          <div className="flex items-center space-x-1">
                            <i className="fas fa-grip-vertical text-gray-400 text-xs cursor-move hover:text-blue-500 transition-colors" title="Arraste para reordenar"></i>
                            <span className="text-xs font-medium text-blue-800">#{index + 1}</span>
                          </div>
                          {dashboard.questionsShuffled && (
                            <span className="text-xs bg-orange-100 text-orange-600 px-1 py-0.5 rounded" title="Posição após embaralhamento">
                              <i className="fas fa-random mr-1"></i>
                              Nova ordem
                            </span>
                          )}
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
                          onClick={() => dashboard.handleViewItemDetails(item)}
                          className="text-blue-600 hover:text-blue-700 p-1"
                          title="Ver detalhes"
                        >
                          <i className="fas fa-eye text-xs"></i>
                        </button>
                        <button
                          onClick={() => dashboard.handleRemoveItemFromAssessment(item.id)}
                          className="text-red-600 hover:text-red-700 p-1"
                          title="Remover da avaliação"
                        >
                          <i className="fas fa-times text-xs"></i>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
                
                <div className="mt-3 p-2 bg-blue-100 rounded text-xs text-blue-700 space-y-1">
                  <i className="fas fa-info-circle mr-1"></i>
                  Estes itens serão incluídos no PDF da avaliação. 
                  <div className="mt-1 flex items-center space-x-4 text-xs">
                    <span className="flex items-center">
                      <i className="fas fa-grip-vertical mr-1 text-blue-500"></i>
                      <strong>Arraste</strong> para reordenar
                    </span>
                    <span className="flex items-center">
                      <i className="fas fa-random mr-1 text-orange-500"></i>
                      <strong>Embaralhar</strong> para ordem aleatória
                    </span>
                  </div>
                  {dashboard.questionsShuffled && (
                    <div className="text-orange-700 bg-orange-100 p-1 rounded mt-1">
                      <i className="fas fa-random mr-1"></i>
                      <strong>Questões embaralhadas:</strong> A ordem atual será mantida no PDF final.
                    </div>
                  )}
                </div>
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <i className="fas fa-file-alt text-xs text-gray-500 mr-1"></i>
                Layout das páginas:
              </label>
              <div className="space-y-3">
                <label className="flex items-start p-3 border rounded-lg cursor-pointer hover:bg-gray-50">
                  <input
                    type="radio"
                    name="layoutPaginas"
                    value="pagina2"
                    checked={dashboard.assessmentData.layoutPaginas === "pagina2" || !dashboard.assessmentData.layoutPaginas}
                    onChange={(e) => dashboard.handleAssessmentDataChange("layoutPaginas", e.target.value)}
                    className="mr-3 mt-1 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
                  />
                  <div>
                    <div className="font-medium text-sm">Questões na Página 2 (Padrão)</div>
                    <div className="text-xs text-gray-500 mt-1">
                      Página 1: Cabeçalho, instruções e gabarito • Página 2+: Questões
                    </div>
                  </div>
                </label>
                
                <label className="flex items-start p-3 border rounded-lg cursor-pointer hover:bg-gray-50">
                  <input
                    type="radio"
                    name="layoutPaginas"
                    value="pagina3"
                    checked={dashboard.assessmentData.layoutPaginas === "pagina3"}
                    onChange={(e) => dashboard.handleAssessmentDataChange("layoutPaginas", e.target.value)}
                    className="mr-3 mt-1 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
                  />
                  <div>
                    <div className="font-medium text-sm">Questões a partir da Página 3</div>
                    <div className="text-xs text-gray-500 mt-1">
                      Página 1: Cabeçalho, instruções e gabarito • Página 2: Em branco • Página 3+: Questões
                    </div>
                  </div>
                </label>
              </div>
              
              {dashboard.assessmentData.layoutPaginas === "pagina3" && (
                <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded-md">
                  <div className="flex items-start space-x-2">
                    <i className="fas fa-info-circle text-blue-600 mt-0.5"></i>
                    <div className="text-xs text-blue-700">
                      <div className="font-medium mb-1">Layout de 3 páginas:</div>
                      <ul className="space-y-1">
                        <li><strong>Página 1:</strong> Cabeçalho, tipo de avaliação, instruções e gabarito</li>
                        <li><strong>Página 2:</strong> Página em branco para anotações</li>
                        <li><strong>Página 3+:</strong> Questões da avaliação com numeração sequencial</li>
                      </ul>
                    </div>
                  </div>
                </div>
              )}
              
              {(!dashboard.assessmentData.layoutPaginas || dashboard.assessmentData.layoutPaginas === "pagina2") && (
                <div className="mt-3 p-3 bg-green-50 border border-green-200 rounded-md">
                  <div className="flex items-start space-x-2">
                    <i className="fas fa-info-circle text-green-600 mt-0.5"></i>
                    <div className="text-xs text-green-700">
                      <div className="font-medium mb-1">Layout padrão de 2 páginas:</div>
                      <ul className="space-y-1">
                        <li><strong>Página 1:</strong> Cabeçalho, tipo de avaliação, instruções e gabarito</li>
                        <li><strong>Página 2+:</strong> Questões da avaliação com numeração sequencial</li>
                      </ul>
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Layout das questões:</label>
              <div className="flex flex-col sm:flex-row sm:space-x-4 space-y-2 sm:space-y-0">
                <label className="flex items-center">
                  <input
                    type="radio"
                    name="colunas"
                    value="1"
                    checked={dashboard.assessmentData.colunas === "1"}
                    onChange={(e) => dashboard.handleAssessmentDataChange("colunas", e.target.value)}
                    className="mr-2 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
                  />
                  <span className="text-sm text-gray-700">1 Coluna</span>
                </label>
                <label className="flex items-center">
                  <input
                    type="radio"
                    name="colunas"
                    value="2"
                    checked={dashboard.assessmentData.colunas === "2"}
                    onChange={(e) => dashboard.handleAssessmentDataChange("colunas", e.target.value)}
                    className="mr-2 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
                  />
                  <span className="text-sm text-gray-700">2 Colunas</span>
                </label>
              </div>
            </div>

            {/* Contador automático de questões baseado nos itens selecionados */}
            {dashboard.selectedItemsForAssessment.length > 0 && (
              <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded-md">
                <h4 className="text-sm font-medium text-blue-800 mb-2">
                  <i className="fas fa-server mr-1"></i>
                  Sistema de Layout no Back-end ({dashboard.assessmentData.colunas} coluna{dashboard.assessmentData.colunas === "2" ? "s" : ""}):
                </h4>
                <div className="bg-emerald-50 border border-emerald-200 rounded p-3 mb-3">
                  <div className="flex items-center text-sm text-green-800">
                    <i className="fas fa-server mr-2 text-green-600"></i>
                    <strong>DISTRIBUIÇÃO SEQUENCIAL MICROSOFT WORD:</strong>
                  </div>
                  <div className="mt-2 space-y-1 text-xs text-green-700">
                    <div className="flex items-center">
                      <i className="fas fa-microchip mr-2 w-4"></i>
                      <span><strong>Sequencial:</strong> Questões 1,2,3,4... como no Microsoft Word</span>
                    </div>
                    <div className="flex items-center">
                      <i className="fas fa-file-word mr-2 w-4"></i>
                      <span><strong>Coluna Esquerda Primeiro:</strong> Preenche esquerda, depois direita</span>
                    </div>
                    <div className="flex items-center">
                      <i className="fas fa-percentage mr-2 w-4"></i>
                      <span><strong>Otimizado:</strong> Máximo aproveitamento do espaço</span>
                    </div>
                    <div className="flex items-center">
                      <i className="fas fa-shield-alt mr-2 w-4"></i>
                      <span><strong>Processado no Servidor:</strong> Layout calculado no back-end</span>
                    </div>
                  </div>
                </div>
                
                <div className="bg-blue-100 border border-blue-200 rounded p-3">
                  <div className="text-sm font-medium text-blue-800 mb-2">
                    <i className="fas fa-info-circle mr-1"></i>
                    Resumo da Avaliação:
                  </div>
                  <div className="grid grid-cols-2 gap-4 text-xs">
                    <div>
                      <span className="font-medium text-blue-700">Total de Questões:</span>
                      <div className="text-lg font-bold text-blue-900">{dashboard.selectedItemsForAssessment.length}</div>
                    </div>
                    <div>
                      <span className="font-medium text-blue-700">Layout:</span>
                      <div className="text-lg font-bold text-blue-900">
                        {dashboard.assessmentData.colunas} coluna{dashboard.assessmentData.colunas === "2" ? "s" : ""}
                      </div>
                    </div>
                  </div>
                  {dashboard.assessmentData.colunas === "2" && (
                    <div className="mt-2 pt-2 border-t border-blue-200">
                      <div className="text-xs text-blue-600 space-y-1">
                        <div className="flex items-center">
                          <i className="fas fa-server mr-1 text-emerald-600"></i>
                          <span><strong>Processado no Servidor:</strong> Layout otimizado automaticamente</span>
                        </div>
                        <div className="flex items-center">
                          <i className="fas fa-rocket mr-1 text-purple-600"></i>
                          <span><strong>Performance:</strong> Cálculos rápidos no back-end</span>
                        </div>
                      </div>
                    </div>
                  )}
                  <div className="mt-2 pt-2 border-t border-blue-200 text-xs text-blue-600">
                    <i className="fas fa-info-circle mr-1"></i>
                    <strong>Distribuição Sequencial:</strong> As questões são distribuídas em ordem (1,2,3,4...) 
                    preenchendo primeiro a coluna esquerda, depois a direita, exatamente como no Microsoft Word.
                  </div>
                </div>
              </div>
            )}

            <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-3 md:space-x-4">
              <button
                onClick={() => {
                  dashboard.setPreviewColumns(dashboard.assessmentData.colunas)
                  dashboard.handlePreview()
                }}
                className="flex-1 bg-yellow-600 text-white py-2 px-4 rounded-md hover:bg-yellow-700 transition-colors text-sm"
              >
                Pré-visualização ({dashboard.assessmentData.colunas} col{dashboard.assessmentData.colunas === "2" ? "s" : ""})
              </button>
              <button
                onClick={dashboard.handleGeneratePDF}
                className="flex-1 bg-red-600 text-white py-2 px-4 rounded-md hover:bg-red-700 transition-colors text-sm flex items-center justify-center"
              >
                <i className="fas fa-file-pdf mr-2"></i>
                Gerar PDF da Avaliação
              </button>
            </div>

            {/* Folhas individuais com QR code */}
            <div className="border border-blue-200 rounded-lg bg-blue-50 p-4 space-y-3">
              <div className="flex items-start gap-2">
                <i className="fas fa-id-card text-blue-500 mt-0.5 text-sm flex-shrink-0"></i>
                <div>
                  <p className="text-sm font-medium text-blue-800">Imprimir Folhas Individuais</p>
                  <p className="text-xs text-blue-600 mt-0.5">
                    Gera uma folha de resposta com QR code único para cada aluno. Selecione a avaliação e a turma.
                  </p>
                </div>
              </div>

              {/* Seletor de avaliação */}
              <button
                onClick={() => dashboard.setShowSheetsAssessmentModal(true)}
                className="w-full px-3 py-2.5 text-left text-sm border border-blue-300 rounded-md hover:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-400 bg-white transition-colors"
              >
                {dashboard.selectedAssessmentForSheets ? (
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium text-gray-900">
                        {dashboard.selectedAssessmentForSheets.nome_avaliacao ||
                         dashboard.selectedAssessmentForSheets.nomeAvaliacao ||
                         dashboard.selectedAssessmentForSheets.tipo_avaliacao ||
                         dashboard.selectedAssessmentForSheets.tipoAvaliacao || 'Avaliação sem nome'}
                      </p>
                      <p className="text-xs text-gray-500 mt-0.5">
                        {(dashboard.selectedAssessmentForSheets.selected_items || dashboard.selectedAssessmentForSheets.selectedItems || []).length} questões
                        {dashboard.selectedAssessmentForSheets.turma ? ` · Turma: ${dashboard.selectedAssessmentForSheets.turma}` : ''}
                      </p>
                    </div>
                    <i className="fas fa-chevron-down text-gray-400 flex-shrink-0"></i>
                  </div>
                ) : (
                  <div className="flex items-center justify-between text-gray-500">
                    <span>Selecionar Avaliação *</span>
                    <i className="fas fa-chevron-down text-gray-400 flex-shrink-0"></i>
                  </div>
                )}
              </button>

              {/* Seletor de turma + botão imprimir */}
              <div className="flex flex-col sm:flex-row gap-2">
                <select
                  value={dashboard.selectedClassForSheets?.id || ''}
                  onChange={e => {
                    const cls = dashboard.classes?.find((c: any) => c.id.toString() === e.target.value)
                    dashboard.setSelectedClassForSheets(cls || null)
                  }}
                  className="flex-1 border border-blue-300 rounded-md px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-400"
                >
                  <option value="">Selecione a turma...</option>
                  {(dashboard.classes || []).map((cls: any) => (
                    <option key={cls.id} value={cls.id}>{cls.name}</option>
                  ))}
                </select>
                <button
                  onClick={() => dashboard.handleGenerateSheetsFromSelectedAssessment(dashboard.selectedClassForSheets)}
                  disabled={!dashboard.selectedClassForSheets || !dashboard.selectedAssessmentForSheets}
                  className="flex-1 sm:flex-none bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 transition-colors text-sm font-medium disabled:bg-gray-300 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  <i className="fas fa-print text-sm"></i>
                  Imprimir cartões-resposta
                </button>
              </div>

              {dashboard.classes?.length === 0 && (
                <p className="text-xs text-gray-500">
                  Nenhuma turma encontrada. Crie turmas em "Corrigir Avaliação &gt; Gerenciar Turmas".
                </p>
              )}
            </div>
          </div>
        )}
      </div>
    </section>
  )
}

export default AssessmentsSection