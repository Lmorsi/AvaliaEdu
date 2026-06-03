import React, { useState, useMemo } from 'react'
import { X, CreditCard as Edit2, Check, AlertCircle, Loader } from 'lucide-react'
import { OMRResult } from '../../hooks/useOMR'

interface TokenData {
  token: string
  student_id: string
  student_name: string
  assessment_id: string
  assessment_name: string
  class_name: string
  class_id?: string
  user_id?: string
}

interface OMRResultModalProps {
  result: OMRResult
  tokenData: TokenData
  saving?: boolean
  onSave: (answers: Record<number, string>) => void
  onCancel: () => void
}

export const OMRResultModal: React.FC<OMRResultModalProps> = ({
  result,
  tokenData,
  saving = false,
  onSave,
  onCancel,
}) => {
  const [editingQuestion, setEditingQuestion] = useState<number | null>(null)
  const [answers, setAnswers] = useState<Record<number, string>>(() => {
    const ans: Record<number, string> = {}
    if (result.bubbles?.found && result.bubbles.grids) {
      result.bubbles.grids.forEach((grid) => {
        const marked = grid.bubbles.find((b) => b.marked)
        if (marked) {
          const columnMap: { [key: number]: string } = {
            0: 'A',
            1: 'B',
            2: 'C',
            3: 'D',
            4: 'E',
            5: 'V',
            6: 'F',
          }
          ans[grid.row] = columnMap[marked.col] || '?'
        }
      })
    }
    return ans
  })

  const allOptions = ['A', 'B', 'C', 'D', 'E', 'V', 'F']

  // Estatísticas
  const stats = useMemo(() => {
    const total = result.bubbles?.grids?.length || 0
    const answered = Object.keys(answers).length
    const unmarked = total - answered
    return { total, answered, unmarked }
  }, [answers, result.bubbles])

  // Atualizar resposta
  const updateAnswer = (questionIndex: number, answer: string) => {
    setAnswers((prev) => ({
      ...prev,
      [questionIndex]: answer,
    }))
    setEditingQuestion(null)
  }

  // Limpar resposta
  const clearAnswer = (questionIndex: number) => {
    setAnswers((prev) => {
      const newAnswers = { ...prev }
      delete newAnswers[questionIndex]
      return newAnswers
    })
  }

  // Salvar
  const handleSave = () => {
    onSave(answers)
  }

  return (
    <div className="fixed inset-0 bg-black/70 flex items-end z-50 animate-in fade-in duration-200">
      <div className="w-full bg-gray-900 rounded-t-2xl border-t border-gray-800 flex flex-col max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="px-4 py-4 border-b border-gray-800 flex items-center justify-between sticky top-0 bg-gray-900">
          <div>
            <h2 className="text-white font-bold text-lg">Respostas Detectadas</h2>
            <p className="text-gray-400 text-sm">{tokenData.student_name}</p>
          </div>
          <button
            onClick={onCancel}
            className="text-gray-400 hover:text-white transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Conteúdo scrollável */}
        <div className="overflow-y-auto flex-1 px-4 py-4">
          {/* Status do QR Code */}
          {result.qr?.found === false && (
            <div className="bg-yellow-900/30 border border-yellow-600 rounded-lg p-3 mb-4 flex gap-2">
              <AlertCircle className="w-5 h-5 text-yellow-500 flex-shrink-0" />
              <div>
                <p className="text-yellow-200 font-medium text-sm">QR Code não detectado</p>
                <p className="text-yellow-300/70 text-xs">
                  Verificar se os marcadores fiduciais estão visíveis
                </p>
              </div>
            </div>
          )}

          {/* Estatísticas */}
          <div className="grid grid-cols-3 gap-2 mb-6">
            <div className="bg-gray-800 rounded-lg p-3 text-center">
              <p className="text-gray-400 text-xs font-medium mb-1">Total</p>
              <p className="text-white text-xl font-bold">{stats.total}</p>
            </div>
            <div className="bg-green-900/30 rounded-lg p-3 text-center border border-green-700">
              <p className="text-green-400 text-xs font-medium mb-1">Marcadas</p>
              <p className="text-green-300 text-xl font-bold">{stats.answered}</p>
            </div>
            <div className="bg-gray-800 rounded-lg p-3 text-center">
              <p className="text-gray-400 text-xs font-medium mb-1">Em branco</p>
              <p className="text-gray-300 text-xl font-bold">{stats.unmarked}</p>
            </div>
          </div>

          {/* Lista de Questões */}
          <div className="space-y-2">
            {Array.from({ length: stats.total }).map((_, idx) => {
              const answer = answers[idx]
              const isEditing = editingQuestion === idx

              return (
                <div
                  key={idx}
                  className="bg-gray-800 rounded-lg p-3 border border-gray-700 hover:border-gray-600 transition"
                >
                  {!isEditing ? (
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3 flex-1">
                        <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-gray-700 text-gray-300 text-sm font-bold">
                          {idx + 1}
                        </div>
                        <div className="flex-1">
                          {answer ? (
                            <div className="flex items-center gap-2">
                              <span className="text-gray-400 text-sm">Resposta:</span>
                              <span className="text-white font-bold text-lg bg-blue-600 rounded px-3 py-1 min-w-12 text-center">
                                {answer}
                              </span>
                            </div>
                          ) : (
                            <span className="text-gray-500 text-sm italic">Não marcada</span>
                          )}
                        </div>
                      </div>
                      <button
                        onClick={() => setEditingQuestion(idx)}
                        className="text-gray-400 hover:text-white transition p-1"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <p className="text-gray-300 text-sm font-medium">Questão {idx + 1}</p>
                      <div className="grid grid-cols-4 gap-1">
                        {allOptions.map((opt) => (
                          <button
                            key={opt}
                            onClick={() => updateAnswer(idx, opt)}
                            className={`py-2 px-2 rounded transition font-bold text-sm ${
                              answer === opt
                                ? 'bg-blue-600 text-white'
                                : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                            }`}
                          >
                            {opt}
                          </button>
                        ))}
                      </div>
                      <div className="flex gap-2 mt-2">
                        <button
                          onClick={() => clearAnswer(idx)}
                          className="flex-1 bg-gray-700 hover:bg-gray-600 text-gray-300 py-2 px-3 rounded transition text-sm font-medium"
                        >
                          Limpar
                        </button>
                        <button
                          onClick={() => setEditingQuestion(null)}
                          className="flex-1 bg-green-600 hover:bg-green-700 text-white py-2 px-3 rounded transition text-sm font-medium flex items-center justify-center gap-1"
                        >
                          <Check className="w-4 h-4" />
                          OK
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>

        {/* Footer - Botões de ação */}
        <div className="border-t border-gray-800 px-4 py-4 bg-gray-900 flex gap-2 sticky bottom-0">
          <button
            onClick={onCancel}
            disabled={saving}
            className="flex-1 bg-gray-800 hover:bg-gray-700 disabled:opacity-50 text-gray-300 py-3 px-4 rounded-lg font-medium transition"
          >
            Cancelar
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex-1 bg-green-600 hover:bg-green-700 disabled:opacity-60 text-white py-3 px-4 rounded-lg font-bold transition flex items-center justify-center gap-2"
          >
            {saving ? (
              <>
                <Loader className="w-5 h-5 animate-spin" />
                Salvando...
              </>
            ) : (
              <>
                <Check className="w-5 h-5" />
                Salvar e Corrigir
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  )
}
