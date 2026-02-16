import React from 'react'

interface SearchItemsTabProps {
  dashboard: any
}

// Função para obter cor da disciplina
const getDisciplineColor = (disciplina: string) => {
  const colors: { [key: string]: string } = {
    'matematica': 'bg-blue-100 text-blue-800',
    'lingua_portuguesa': 'bg-green-100 text-green-800',
    'arte': 'bg-purple-100 text-purple-800',
    'historia': 'bg-yellow-100 text-yellow-800',
    'geografia': 'bg-teal-100 text-teal-800',
    'ciencias': 'bg-indigo-100 text-indigo-800',
    'fisica': 'bg-red-100 text-red-800',
    'quimica': 'bg-orange-100 text-orange-800',
    'biologia': 'bg-emerald-100 text-emerald-800',
    'ingles': 'bg-pink-100 text-pink-800',
    'espanhol': 'bg-rose-100 text-rose-800',
    'filosofia': 'bg-violet-100 text-violet-800',
    'sociologia': 'bg-cyan-100 text-cyan-800',
    'educacao_fisica': 'bg-lime-100 text-lime-800'
  }
  return colors[disciplina] || 'bg-gray-100 text-gray-800'
}

// Função para obter cor da etapa de ensino
const getEducationStageColor = (etapa: string) => {
  const colors: { [key: string]: string } = {
    'ensino_infantil': 'bg-pink-100 text-pink-800',
    'ef_anos_iniciais': 'bg-blue-100 text-blue-800',
    'ef_anos_finais': 'bg-green-100 text-green-800',
    'ensino_medio': 'bg-purple-100 text-purple-800',
    'ensino_tecnico': 'bg-orange-100 text-orange-800'
  }
  return colors[etapa] || 'bg-gray-100 text-gray-800'
}

// Função para obter cor do tipo de item
const getItemTypeColor = (tipoItem: string) => {
  const colors: { [key: string]: string } = {
    'multipla_escolha': 'bg-emerald-100 text-emerald-800',
    'verdadeiro_falso': 'bg-amber-100 text-amber-800',
    'discursiva': 'bg-slate-100 text-slate-800'
  }
  return colors[tipoItem] || 'bg-gray-100 text-gray-800'
}

// Função para obter label do tipo de item
const getItemTypeLabel = (tipoItem: string) => {
  const labels: { [key: string]: string } = {
    'multipla_escolha': 'M.E.',
    'verdadeiro_falso': 'V/F',
    'discursiva': 'Disc.'
  }
  return labels[tipoItem] || tipoItem
}

// Função para formatar nome da disciplina
const formatDisciplineName = (disciplina: string) => {
  const names: { [key: string]: string } = {
    'matematica': 'Matemática',
    'lingua_portuguesa': 'Língua Portuguesa',
    'arte': 'Arte',
    'historia': 'História',
    'geografia': 'Geografia',
    'ciencias': 'Ciências',
    'fisica': 'Física',
    'quimica': 'Química',
    'biologia': 'Biologia',
    'ingles': 'Inglês',
    'espanhol': 'Espanhol',
    'filosofia': 'Filosofia',
    'sociologia': 'Sociologia',
    'educacao_fisica': 'Educação Física'
  }
  return names[disciplina] || disciplina
}

// Função para formatar nome da etapa de ensino
const formatEducationStageName = (etapa: string) => {
  const names: { [key: string]: string } = {
    'ensino_infantil': 'Ensino Infantil',
    'ef_anos_iniciais': 'E.F. Anos Iniciais',
    'ef_anos_finais': 'E.F. Anos Finais',
    'ensino_medio': 'Ensino Médio',
    'ensino_tecnico': 'Ensino Técnico'
  }
  return names[etapa] || etapa
}

const SearchItemsTab: React.FC<SearchItemsTabProps> = ({ dashboard }) => {
  return (
    <div className="space-y-3 md:space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">Palavras-chave:</label>
        <input
          type="text"
          value={dashboard.itemFilters.keywords}
          onChange={(e) => dashboard.setItemFilters((prev: any) => ({ ...prev, keywords: e.target.value }))}
          className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="Digite palavras-chave para buscar..."
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">Disciplina:</label>
        <select
          value={dashboard.itemFilters.subject}
          onChange={(e) => dashboard.setItemFilters((prev: any) => ({ ...prev, subject: e.target.value }))}
          className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="">Todas as disciplinas</option>
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
        <label className="block text-sm font-medium text-gray-700 mb-2">Tipo de Questão:</label>
        <div className="space-y-2">
          {["Todas", "Múltipla Escolha", "Verdadeiro/Falso", "Discursiva"].map((type) => (
            <label key={type} className="flex items-center">
              <input
                type="checkbox"
                checked={dashboard.itemFilters.questionTypes.includes(type)}
                onChange={() => dashboard.handleQuestionTypeToggle(type)}
                className="mr-2 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
              <span className="text-sm text-gray-700">{type}</span>
            </label>
          ))}
        </div>
      </div>

      <button
        onClick={dashboard.handleItemSearch}
        className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 transition-colors text-sm"
      >
        Pesquisar
      </button>

      {/* Área de Resultados CORRIGIDA */}
      {dashboard.hasSearched.items && (
        <div className="mt-4 md:mt-6 border-t pt-4 md:pt-6">
          <h3 className="text-base md:text-lg font-medium text-gray-900 mb-4">
            {dashboard.searchResults.items.length === 1 ? 'Resultado da Pesquisa' : 'Resultados da Pesquisa'} ({dashboard.searchResults.items.length} {dashboard.searchResults.items.length === 1 ? 'item' : 'itens'})
          </h3>
          {dashboard.searchResults.items.length === 0 ? (
            <div className="text-center py-6 md:py-8">
              <i className="fas fa-search text-3xl md:text-4xl text-gray-300 mb-4"></i>
              <p className="text-gray-500 mb-2 text-sm md:text-base">Nenhum resultado para exibir</p>
              <p className="text-xs md:text-sm text-gray-400">
                Use os filtros acima e clique em Pesquisar para encontrar itens
              </p>
            </div>
          ) : (
            <>
              <div className="space-y-3 md:space-y-4">
                {dashboard.searchResults.items.slice(0, 5).map((item: any, index: number) => (
                  <div
                    key={item.id || index}
                    className="border rounded-lg p-3 md:p-4 hover:shadow-md transition-shadow"
                  >
                    <div className="flex justify-between items-start mb-2">
                      <h4 className="font-medium text-gray-900 text-sm md:text-base flex-1">
                        {item.descritor.length > 60 ? `${item.descritor.substring(0, 60)}...` : item.descritor}
                      </h4>
                    </div>
                    <p className="text-xs md:text-sm text-gray-600 mb-2">
                      {(() => {
                        // Remove HTML tags but preserve image indicators
                        const cleanText = (item.texto_item || '')
                          .replace(/<img[^>]*>/g, '[IMAGEM]')
                          .replace(/<[^>]*>/g, '')
                          .replace(/&nbsp;/g, ' ')
                          .trim();
                        return cleanText.length > 100 ? `${cleanText.substring(0, 100)}...` : cleanText;
                      })()}
                    </p>
                    <div className="flex items-center justify-between mt-3">
                      <div className="flex items-center space-x-2 flex-wrap gap-1">
                        <span className={`text-xs px-2 py-1 rounded-full font-medium ${getItemTypeColor(item.tipo_item)}`}>
                          {getItemTypeLabel(item.tipo_item)}
                        </span>
                        <span className={`text-xs px-2 py-1 rounded-full font-medium ${getDisciplineColor(item.disciplina)}`}>
                          {formatDisciplineName(item.disciplina) || "Não especificada"}
                        </span>
                        <span className={`text-xs px-2 py-1 rounded-full font-medium ${getEducationStageColor(item.etapa_ensino)}`}>
                          {formatEducationStageName(item.etapa_ensino) || "Não especificada"}
                        </span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => dashboard.handleViewItemDetails(item)}
                          className="text-blue-600 hover:text-blue-700 text-xs font-medium px-2 py-1 rounded hover:bg-blue-50 transition-colors"
                        >
                          <i className="fas fa-eye mr-1"></i>
                          Ver detalhes
                        </button>
                        {dashboard.addedItemIds.has(item.id) ? (
                          <button
                            disabled
                            className="bg-gray-400 text-white px-3 py-1 rounded text-xs cursor-not-allowed font-medium"
                            title="Item já adicionado"
                          >
                            <i className="fas fa-check mr-1"></i>
                            Adicionado
                          </button>
                        ) : (
                          <button
                            onClick={() => dashboard.handleAddItemToAssessment(item)}
                            className="bg-green-600 text-white px-3 py-1 rounded text-xs hover:bg-green-700 transition-colors font-medium"
                            title="Adicionar à avaliação"
                          >
                            <i className="fas fa-plus mr-1"></i>
                            Adicionar
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {dashboard.searchResults.items.length > 5 && (
                <div className="mt-4 text-center">
                  <button
                    onClick={() => dashboard.openModal('items-paginated-results-modal')}
                    className="bg-blue-600 text-white py-2 px-6 rounded-md hover:bg-blue-700 transition-colors text-sm font-medium inline-flex items-center"
                  >
                    <i className="fas fa-list mr-2"></i>
                    Ver todos os {dashboard.searchResults.items.length} resultados
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  )
}

export default SearchItemsTab