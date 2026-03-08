import React, { useState, useEffect } from 'react'

interface PaginatedResultsModalProps {
  isOpen: boolean
  onClose: () => void
  type: 'items' | 'assessments'
  results: any[]
  onViewDetails: (item: any) => void
  onAddItem?: (item: any) => void
  addedItemIds?: Set<string>
}

const PaginatedResultsModal: React.FC<PaginatedResultsModalProps> = ({
  isOpen,
  onClose,
  type,
  results,
  onViewDetails,
  onAddItem,
  addedItemIds
}) => {
  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 10

  useEffect(() => {
    if (isOpen) {
      setCurrentPage(1)
    }
  }, [isOpen])

  if (!isOpen) return null

  const totalPages = Math.ceil(results.length / itemsPerPage)
  const startIndex = (currentPage - 1) * itemsPerPage
  const endIndex = startIndex + itemsPerPage
  const currentResults = results.slice(startIndex, endIndex)

  const goToPage = (page: number) => {
    setCurrentPage(Math.max(1, Math.min(page, totalPages)))
  }

  const renderPaginationButtons = () => {
    const buttons = []
    const maxButtons = 5

    let startPage = Math.max(1, currentPage - Math.floor(maxButtons / 2))
    let endPage = Math.min(totalPages, startPage + maxButtons - 1)

    if (endPage - startPage < maxButtons - 1) {
      startPage = Math.max(1, endPage - maxButtons + 1)
    }

    if (startPage > 1) {
      buttons.push(
        <button
          key="first"
          onClick={() => goToPage(1)}
          className="px-3 py-1 text-sm border border-gray-300 rounded hover:bg-gray-100 transition-colors"
        >
          1
        </button>
      )
      if (startPage > 2) {
        buttons.push(
          <span key="ellipsis1" className="px-2 text-gray-500">...</span>
        )
      }
    }

    for (let i = startPage; i <= endPage; i++) {
      buttons.push(
        <button
          key={i}
          onClick={() => goToPage(i)}
          className={`px-3 py-1 text-sm border rounded transition-colors ${
            currentPage === i
              ? 'bg-blue-600 text-white border-blue-600'
              : 'border-gray-300 hover:bg-gray-100'
          }`}
        >
          {i}
        </button>
      )
    }

    if (endPage < totalPages) {
      if (endPage < totalPages - 1) {
        buttons.push(
          <span key="ellipsis2" className="px-2 text-gray-500">...</span>
        )
      }
      buttons.push(
        <button
          key="last"
          onClick={() => goToPage(totalPages)}
          className="px-3 py-1 text-sm border border-gray-300 rounded hover:bg-gray-100 transition-colors"
        >
          {totalPages}
        </button>
      )
    }

    return buttons
  }

  const getDisciplineColor = (disciplina: string) => {
    const colors: { [key: string]: string } = {
      'matematica': 'bg-blue-100 text-blue-800',
      'lingua_portuguesa': 'bg-green-100 text-green-800',
      'arte': 'bg-amber-100 text-amber-800',
      'historia': 'bg-yellow-100 text-yellow-800',
      'geografia': 'bg-teal-100 text-teal-800',
      'ciencias': 'bg-cyan-100 text-cyan-800',
      'fisica': 'bg-red-100 text-red-800',
      'quimica': 'bg-orange-100 text-orange-800',
      'biologia': 'bg-emerald-100 text-emerald-800',
      'ingles': 'bg-pink-100 text-pink-800',
      'espanhol': 'bg-rose-100 text-rose-800',
      'filosofia': 'bg-slate-100 text-slate-800',
      'sociologia': 'bg-cyan-100 text-cyan-800',
      'educacao_fisica': 'bg-lime-100 text-lime-800'
    }
    return colors[disciplina] || 'bg-gray-100 text-gray-800'
  }

  const getEducationStageColor = (etapa: string) => {
    const colors: { [key: string]: string } = {
      'ensino_infantil': 'bg-pink-100 text-pink-800',
      'ef_anos_iniciais': 'bg-blue-100 text-blue-800',
      'ef_anos_finais': 'bg-green-100 text-green-800',
      'ensino_medio': 'bg-amber-100 text-amber-800',
      'ensino_tecnico': 'bg-orange-100 text-orange-800'
    }
    return colors[etapa] || 'bg-gray-100 text-gray-800'
  }

  const getItemTypeColor = (tipoItem: string) => {
    const colors: { [key: string]: string } = {
      'multipla_escolha': 'bg-emerald-100 text-emerald-800',
      'verdadeiro_falso': 'bg-amber-100 text-amber-800',
      'discursiva': 'bg-slate-100 text-slate-800'
    }
    return colors[tipoItem] || 'bg-gray-100 text-gray-800'
  }

  const getItemTypeLabel = (tipoItem: string) => {
    const labels: { [key: string]: string } = {
      'multipla_escolha': 'M.E.',
      'verdadeiro_falso': 'V/F',
      'discursiva': 'Disc.'
    }
    return labels[tipoItem] || tipoItem
  }

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

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        <div className="sticky top-0 bg-white border-b p-4 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">
              <i className={`fas ${type === 'items' ? 'fa-folder' : 'fa-file-alt'} mr-2 text-blue-600`}></i>
              Todos os Resultados - {type === 'items' ? 'Itens' : 'Avaliações'}
            </h2>
            <p className="text-sm text-gray-600 mt-1">
              Mostrando {startIndex + 1}-{Math.min(endIndex, results.length)} de {results.length} resultado{results.length !== 1 ? 's' : ''}
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <i className="fas fa-times text-xl"></i>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4">
          {type === 'items' ? (
            <div className="space-y-3">
              {currentResults.map((item: any, index: number) => (
                <div
                  key={item.id || index}
                  className="border rounded-lg p-4 hover:shadow-md transition-shadow"
                >
                  <div className="flex justify-between items-start mb-2">
                    <h4 className="font-medium text-gray-900 text-sm flex-1">
                      {item.descritor.length > 80 ? `${item.descritor.substring(0, 80)}...` : item.descritor}
                    </h4>
                  </div>
                  <p className="text-xs text-gray-600 mb-2">
                    {(() => {
                      const cleanText = (item.texto_item || '')
                        .replace(/<img[^>]*>/g, '[IMAGEM]')
                        .replace(/<[^>]*>/g, '')
                        .replace(/&nbsp;/g, ' ')
                        .trim()
                      return cleanText.length > 150 ? `${cleanText.substring(0, 150)}...` : cleanText
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
                        onClick={() => onViewDetails(item)}
                        className="text-blue-600 hover:text-blue-700 text-xs font-medium px-2 py-1 rounded hover:bg-blue-50 transition-colors"
                      >
                        <i className="fas fa-eye mr-1"></i>
                        Ver detalhes
                      </button>
                      {onAddItem && (
                        addedItemIds?.has(item.id) ? (
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
                            onClick={() => onAddItem(item)}
                            className="bg-green-600 text-white px-3 py-1 rounded text-xs hover:bg-green-700 transition-colors font-medium"
                            title="Adicionar à avaliação"
                          >
                            <i className="fas fa-plus mr-1"></i>
                            Adicionar
                          </button>
                        )
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="space-y-3">
              {currentResults.map((assessment: any, index: number) => (
                <div
                  key={assessment.id || index}
                  className="border rounded-lg p-4 hover:shadow-md transition-shadow"
                >
                  <h4 className="font-medium text-gray-900 text-sm">
                    {assessment.title}
                  </h4>
                  <p className="text-xs text-gray-600 mt-1">{assessment.description}</p>
                  <div className="flex items-center justify-between mt-3">
                    <span className="text-xs text-gray-500">{assessment.date}</span>
                    <button
                      onClick={() => onViewDetails(assessment)}
                      className="text-blue-600 hover:text-blue-700 text-xs font-medium"
                    >
                      Ver detalhes
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {totalPages > 1 && (
          <div className="sticky bottom-0 bg-white border-t p-4">
            <div className="flex items-center justify-between">
              <button
                onClick={() => goToPage(currentPage - 1)}
                disabled={currentPage === 1}
                className="px-4 py-2 text-sm border border-gray-300 rounded hover:bg-gray-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <i className="fas fa-chevron-left mr-2"></i>
                Anterior
              </button>

              <div className="flex items-center space-x-2">
                {renderPaginationButtons()}
              </div>

              <button
                onClick={() => goToPage(currentPage + 1)}
                disabled={currentPage === totalPages}
                className="px-4 py-2 text-sm border border-gray-300 rounded hover:bg-gray-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Próxima
                <i className="fas fa-chevron-right ml-2"></i>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default PaginatedResultsModal
