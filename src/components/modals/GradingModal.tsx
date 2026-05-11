import React, { useState } from 'react'

interface GradingModalProps {
  isOpen: boolean
  onClose: () => void
  dashboard: any
}

const GradingModal: React.FC<GradingModalProps> = ({ isOpen, onClose, dashboard }) => {
  const [showCancelConfirmation, setShowCancelConfirmation] = useState(false)
  const [showSaveConfirmation, setShowSaveConfirmation] = useState(false)

  if (!isOpen) return null

  const handleCancel = () => {
    setShowCancelConfirmation(true)
  }

  const confirmCancel = () => {
    setShowCancelConfirmation(false)
    onClose()
  }

  const handleSave = () => {
    setShowSaveConfirmation(true)
  }

  const confirmSave = () => {
    setShowSaveConfirmation(false)
    dashboard.handleSaveGrading()
  }

  const itemsPerColumn = 15

  return (
    <>
      <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg shadow-xl max-w-7xl w-full max-h-[90vh] overflow-hidden flex flex-col">
          <div className="border-b p-4 bg-gray-50 flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-gray-900">
                <i className="fas fa-check-circle mr-2 text-green-600"></i>
                Correção: {dashboard.gradingData.assessmentName}
              </h2>
              <p className="text-sm text-gray-600 mt-1">
                Turma: {dashboard.selectedClassForGrading?.name} • {dashboard.gradingData.itemGroups?.length || dashboard.gradingData.totalQuestions} itens
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
            <div className="space-y-4">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h3 className="text-sm font-medium text-blue-800 mb-2">
                  <i className="fas fa-key mr-2"></i>
                  Gabarito Oficial
                </h3>
                <div className="flex flex-wrap gap-2">
                  {dashboard.gradingData.itemGroups?.map((group: number[], itemIndex: number) => {
                    if (group.length === 1) {
                      const answerIndex = group[0]
                      return (
                        <span
                          key={itemIndex}
                          className="bg-blue-100 text-blue-800 px-3 py-1 rounded text-xs font-medium"
                        >
                          Item {itemIndex + 1}: {dashboard.gradingData.answerKey[answerIndex]}
                        </span>
                      )
                    } else {
                      const answers = group.map(idx => dashboard.gradingData.answerKey[idx]).join(', ')
                      return (
                        <span
                          key={itemIndex}
                          className="bg-purple-100 text-purple-800 px-3 py-1 rounded text-xs font-medium"
                        >
                          Item {itemIndex + 1} (V/F): {answers}
                        </span>
                      )
                    }
                  })}
                </div>
              </div>

              {dashboard.students.map((student: any, studentIndex: number) => (
                <div key={student.id} className="border rounded-lg p-4 bg-white">
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="font-medium text-gray-900">
                      {studentIndex + 1}. {student.name}
                      {student.registration_number && (
                        <span className="text-xs text-gray-500 ml-2">
                          ({student.registration_number})
                        </span>
                      )}
                    </h4>
                    {dashboard.studentAnswers[student.id] && (
                      <div className="text-sm">
                        <span className="text-gray-600">
                          Progresso: {dashboard.studentAnswers[student.id].filter((a: string) => a).length}/{dashboard.gradingData.totalQuestions}
                        </span>
                      </div>
                    )}
                  </div>

                  <div className="grid gap-6" style={{
                    gridTemplateColumns: `repeat(${Math.ceil(dashboard.gradingData.itemGroups.length / itemsPerColumn)}, 1fr)`
                  }}>
                    {Array.from({ length: Math.ceil(dashboard.gradingData.itemGroups.length / itemsPerColumn) }).map((_, colIndex) => (
                      <div key={colIndex} className="space-y-3">
                        {dashboard.gradingData.itemGroups?.slice(
                          colIndex * itemsPerColumn,
                          (colIndex + 1) * itemsPerColumn
                        ).map((group: number[], relativeIndex: number) => {
                          const itemIndex = colIndex * itemsPerColumn + relativeIndex

                          if (group.length === 1) {
                            const answerIndex = group[0]
                            const studentAnswer = dashboard.studentAnswers[student.id]?.[answerIndex] || ''
                            const questionAlternatives = dashboard.gradingData.itemAlternatives[answerIndex] || ['A', 'B', 'C', 'D', 'E']

                            return (
                              <div key={itemIndex} className="relative">
                                <label className="block text-xs font-medium text-gray-600 mb-2">
                                  Item {itemIndex + 1}
                                </label>
                                <div className="flex flex-wrap gap-2">
                                  {questionAlternatives.map((alt: string) => {
                                    const isSelected = studentAnswer === alt
                                    return (
                                      <button
                                        key={alt}
                                        onClick={() => dashboard.handleStudentAnswerChange(student.id, answerIndex, isSelected ? '' : alt)}
                                        className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold transition-all border-2 ${
                                          isSelected
                                            ? 'bg-gray-900 text-white border-gray-900'
                                            : 'bg-white text-gray-600 border-gray-300 hover:border-gray-500'
                                        }`}
                                      >
                                        {alt}
                                      </button>
                                    )
                                  })}
                                </div>
                              </div>
                            )
                          } else {
                            const studentAnswers = group.map(idx => dashboard.studentAnswers[student.id]?.[idx] || '')
                            const correctAnswers = group.map(idx => dashboard.gradingData.answerKey[idx])
                            const correctCount = studentAnswers.filter((ans, i) => ans && ans === correctAnswers[i]).length
                            const answeredCount = studentAnswers.filter(ans => ans).length

                            let bgColor = 'bg-gray-50 border-gray-300'
                            if (answeredCount > 0) {
                              if (correctCount === group.length) {
                                bgColor = 'bg-green-50 border-green-300'
                              } else if (correctCount > 0) {
                                bgColor = 'bg-yellow-50 border-yellow-300'
                              } else {
                                bgColor = 'bg-red-50 border-red-300'
                              }
                            }

                            return (
                              <div key={itemIndex} className={`border rounded p-2 ${bgColor}`}>
                                <label className="block text-xs font-medium text-gray-700 mb-2">
                                  Item {itemIndex + 1} - V/F ({correctCount}/{group.length})
                                </label>
                                <div className="space-y-1">
                                  {group.map((answerIndex, subIndex) => {
                                    const studentAnswer = dashboard.studentAnswers[student.id]?.[answerIndex] || ''

                                    return (
                                      <div key={answerIndex} className="flex items-center gap-2">
                                        <span className="text-xs text-gray-500 w-4">{subIndex + 1}.</span>
                                        <div className="flex gap-2">
                                          {['V', 'F'].map((option) => {
                                            const isSelected = studentAnswer === option
                                            return (
                                              <button
                                                key={option}
                                                onClick={() => dashboard.handleStudentAnswerChange(student.id, answerIndex, isSelected ? '' : option)}
                                                className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-semibold transition-all border-2 ${
                                                  isSelected
                                                    ? 'bg-gray-900 text-white border-gray-900'
                                                    : 'bg-white text-gray-600 border-gray-300 hover:border-gray-500'
                                                }`}
                                              >
                                                {option}
                                              </button>
                                            )
                                          })}
                                        </div>
                                      </div>
                                    )
                                  })}
                                </div>
                              </div>
                            )
                          }
                        })}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="border-t p-4 bg-gray-50 flex gap-2">
            <button
              onClick={handleCancel}
              className="px-4 py-1.5 text-sm bg-gray-600 text-white rounded-md hover:bg-gray-700 transition-colors"
            >
              Cancelar
            </button>
            <button
              onClick={handleSave}
              className="flex-1 px-4 py-1.5 text-sm bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors"
            >
              <i className="fas fa-save mr-2"></i>
              Salvar Correção
            </button>
          </div>
        </div>
      </div>

      {showCancelConfirmation && (
        <div className="fixed inset-0 bg-black bg-opacity-70 z-[60] flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-2xl max-w-md w-full p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-3">
              <i className="fas fa-exclamation-triangle mr-2 text-yellow-600"></i>
              Confirmar Cancelamento
            </h3>
            <p className="text-sm text-gray-600 mb-6">
              Tem certeza que deseja cancelar? Todas as respostas preenchidas serão perdidas.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowCancelConfirmation(false)}
                className="flex-1 px-4 py-2 text-sm bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300 transition-colors"
              >
                Voltar
              </button>
              <button
                onClick={confirmCancel}
                className="flex-1 px-4 py-2 text-sm bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors"
              >
                Sim, Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

      {showSaveConfirmation && (
        <div className="fixed inset-0 bg-black bg-opacity-70 z-[60] flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-2xl max-w-md w-full p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-3">
              <i className="fas fa-check-circle mr-2 text-green-600"></i>
              Confirmar Salvamento
            </h3>
            <p className="text-sm text-gray-600 mb-6">
              Deseja salvar esta correção? As respostas de todos os estudantes serão registradas.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowSaveConfirmation(false)}
                className="flex-1 px-4 py-2 text-sm bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={confirmSave}
                className="flex-1 px-4 py-2 text-sm bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors"
              >
                <i className="fas fa-save mr-2"></i>
                Confirmar
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

export default GradingModal
