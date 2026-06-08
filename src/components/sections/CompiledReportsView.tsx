import React, { useState, useEffect } from 'react'

interface CompiledReportsViewProps {
  compiledReports: any[]
  assessmentName: string
  onBack: () => void
}

const CompiledReportsView: React.FC<CompiledReportsViewProps> = ({
  compiledReports,
  assessmentName,
  onBack
}) => {
  if (compiledReports.length === 0) return null

  const [selectedClasses, setSelectedClasses] = useState<Record<string, boolean>>({})

  useEffect(() => {
    const initial: Record<string, boolean> = {}
    compiledReports.forEach(report => {
      initial[report.id] = true
    })
    setSelectedClasses(initial)
  }, [compiledReports])

  const toggleClass = (reportId: string) => {
    setSelectedClasses(prev => ({
      ...prev,
      [reportId]: !prev[reportId]
    }))
  }

  const selectAll = () => {
    const newState: Record<string, boolean> = {}
    compiledReports.forEach(report => {
      newState[report.id] = true
    })
    setSelectedClasses(newState)
  }

  const deselectAll = () => {
    const newState: Record<string, boolean> = {}
    compiledReports.forEach(report => {
      newState[report.id] = false
    })
    setSelectedClasses(newState)
  }

  const filteredReports = compiledReports.filter(report => selectedClasses[report.id])

  const firstReport = compiledReports[0]
  const itemGroups = firstReport.item_groups || []
  const itemDescriptors = firstReport.item_descriptors || []
  const itemTypes = firstReport.item_types || []
  const itemAlternatives = firstReport.item_alternatives || []
  const answerKey = firstReport.answer_key || []

  const calculateClassStats = (classReport: any) => {
    const results = classReport.student_results || []
    const presentStudents = results.filter((r: any) => !r.absent)
    const totalStudents = results.length

    const red = presentStudents.filter((r: any) => r.score <= 49).length
    const yellow = presentStudents.filter((r: any) => r.score >= 50 && r.score <= 69).length
    const green = presentStudents.filter((r: any) => r.score >= 70 && r.score <= 89).length
    const blue = presentStudents.filter((r: any) => r.score >= 90).length

    return { red, yellow, green, blue, totalStudents }
  }

  const totalStats = filteredReports.reduce(
    (acc, report) => {
      const stats = calculateClassStats(report)
      return {
        red: acc.red + stats.red,
        yellow: acc.yellow + stats.yellow,
        green: acc.green + stats.green,
        blue: acc.blue + stats.blue,
        totalStudents: acc.totalStudents + stats.totalStudents
      }
    },
    { red: 0, yellow: 0, green: 0, blue: 0, totalStudents: 0 }
  )

  return (
    <div className="space-y-4">
      <div className="bg-gradient-to-r from-teal-50 to-cyan-50 border-2 border-teal-300 rounded-lg p-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-bold text-teal-900 mb-2">
              <i className="fas fa-layer-group mr-2"></i>
              Compilação de Dados - {assessmentName}
            </h3>
            <p className="text-sm text-teal-700">
              Dados consolidados de {filteredReports.length}/{compiledReports.length} turma{compiledReports.length > 1 ? 's' : ''} • Total de {totalStats.totalStudents} estudantes
            </p>
          </div>
          <button
            onClick={() => window.print()}
            className="text-teal-700 hover:text-teal-900 transition-colors px-3 py-2 rounded border border-teal-300 hover:border-teal-400 flex items-center gap-2 print:hidden bg-white"
            title="Imprimir relatório compilado"
          >
            <i className="fas fa-print"></i>
            <span className="text-sm font-medium">Imprimir</span>
          </button>
        </div>
      </div>

      <div className="bg-white border-2 border-blue-300 rounded-lg p-4">
        <div className="flex items-center justify-between mb-3">
          <h4 className="text-sm font-semibold text-gray-900">
            <i className="fas fa-filter mr-2 text-blue-600"></i>
            Selecionar Turmas para Análise
          </h4>
          <div className="flex gap-2">
            <button
              onClick={selectAll}
              className="text-xs bg-blue-100 text-blue-700 px-3 py-1 rounded hover:bg-blue-200 transition-colors"
            >
              <i className="fas fa-check-double mr-1"></i>
              Selecionar Todas
            </button>
            <button
              onClick={deselectAll}
              className="text-xs bg-gray-100 text-gray-700 px-3 py-1 rounded hover:bg-gray-200 transition-colors"
            >
              <i className="fas fa-times mr-1"></i>
              Desmarcar Todas
            </button>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {compiledReports.map((report) => (
            <button
              key={report.id}
              onClick={() => toggleClass(report.id)}
              className={`text-left border-2 rounded-lg p-3 transition-all ${
                selectedClasses[report.id]
                  ? 'border-blue-500 bg-blue-50 shadow-md'
                  : 'border-gray-200 bg-white hover:border-gray-300'
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className={`w-5 h-5 rounded border-2 flex items-center justify-center ${
                    selectedClasses[report.id]
                      ? 'bg-blue-500 border-blue-500'
                      : 'bg-white border-gray-300'
                  }`}>
                    {selectedClasses[report.id] && (
                      <i className="fas fa-check text-white text-xs"></i>
                    )}
                  </div>
                  <span className="font-semibold text-gray-900">{report.class_name}</span>
                </div>
                <span className="text-xs text-gray-500">
                  {report.total_students} estudantes
                </span>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Tabela planilha: um aluno por linha com respostas e % de acerto */}
      <div className="bg-white border rounded-lg p-4">
        <div className="flex items-center justify-between mb-3">
          <h4 className="text-sm font-semibold text-gray-900">
            <i className="fas fa-table mr-2 text-orange-600"></i>
            Planilha de Resultados — Respostas e Acertos por Estudante
          </h4>
        </div>
        <div className="overflow-x-auto">
          <div className="min-w-full inline-block align-middle">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="bg-gray-800 text-white">
                  <th className="text-left p-2 sticky left-0 bg-gray-800 z-10 whitespace-nowrap min-w-[160px]">Estudante</th>
                  <th className="text-center p-2 whitespace-nowrap min-w-[80px]">Turma</th>
                  {itemGroups.map((_: number[], itemIndex: number) => (
                    <th key={itemIndex} className="text-center p-2 min-w-[42px] font-medium">
                      {itemIndex + 1}
                    </th>
                  ))}
                  <th className="text-center p-2 whitespace-nowrap min-w-[70px]">Acertos</th>
                  <th className="text-center p-2 whitespace-nowrap min-w-[70px]">%</th>
                </tr>
                {/* linha do gabarito */}
                <tr className="bg-yellow-100 border-b-2 border-yellow-400">
                  <td className="p-2 sticky left-0 bg-yellow-100 z-10 text-xs font-bold text-gray-700 uppercase tracking-wide">Gabarito</td>
                  <td className="p-2"></td>
                  {itemGroups.map((group: number[], itemIndex: number) => {
                    if (group.length === 1) {
                      const answer = answerKey[group[0]] || ''
                      return (
                        <td key={itemIndex} className="text-center p-1">
                          <span className="inline-flex items-center justify-center w-7 h-7 text-xs font-bold rounded bg-yellow-300 text-gray-800 border border-yellow-500">
                            {answer}
                          </span>
                        </td>
                      )
                    }
                    const answers = group.map((idx: number) => answerKey[idx] || '').join(',')
                    return (
                      <td key={itemIndex} className="text-center p-1">
                        <span className="inline-flex items-center justify-center px-1 min-w-[28px] h-7 text-xs font-bold rounded bg-yellow-300 text-gray-800 border border-yellow-500">
                          {answers}
                        </span>
                      </td>
                    )
                  })}
                  <td className="p-2"></td>
                  <td className="p-2"></td>
                </tr>
              </thead>
              <tbody>
                {filteredReports.map((report) => {
                  const sortedStudents = [...(report.student_results || [])].sort((a: any, b: any) => {
                    if (a.absent && !b.absent) return 1
                    if (!a.absent && b.absent) return -1
                    return b.score - a.score
                  })

                  return (
                    <React.Fragment key={report.id}>
                      {filteredReports.length > 1 && (
                        <tr className="bg-teal-50 border-t-2 border-teal-300">
                          <td colSpan={itemGroups.length + 4} className="p-2 text-xs font-bold text-teal-800 uppercase tracking-wide">
                            <i className="fas fa-users mr-2"></i>
                            {report.class_name}
                          </td>
                        </tr>
                      )}
                      {sortedStudents.map((result: any, idx: number) => {
                        const isAbsent = result.absent === true
                        const rowBg = isAbsent
                          ? 'bg-gray-50 opacity-60'
                          : idx % 2 === 0 ? 'bg-white hover:bg-gray-50' : 'bg-gray-50 hover:bg-gray-100'

                        const getScoreColor = (score: number) => {
                          if (score >= 90) return 'text-blue-700 font-bold'
                          if (score >= 70) return 'text-green-700 font-bold'
                          if (score >= 50) return 'text-yellow-700 font-bold'
                          return 'text-red-700 font-bold'
                        }

                        const totalItems = itemGroups.length
                        const correctItems = isAbsent ? 0 : itemGroups.reduce((sum: number, group: number[]) => {
                          if (group.length === 1) {
                            const idx = group[0]
                            const ans = result.answers?.[idx] || ''
                            const correct = answerKey[idx] || ''
                            return sum + (ans && ans.toUpperCase() === correct.toUpperCase() ? 1 : 0)
                          }
                          const allCorrect = group.every((i: number) => {
                            const ans = result.answers?.[i] || ''
                            const correct = answerKey[i] || ''
                            return ans && ans.toUpperCase() === correct.toUpperCase()
                          })
                          return sum + (allCorrect ? 1 : 0)
                        }, 0)

                        return (
                          <tr key={result.id || idx} className={`border-b transition-colors ${rowBg}`}>
                            <td className={`p-2 sticky left-0 z-10 text-sm font-medium ${isAbsent ? 'bg-gray-50' : idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}`}>
                              <div className="flex items-center gap-2">
                                <span className="truncate max-w-[140px]" title={result.student_name}>{result.student_name}</span>
                                {isAbsent && (
                                  <span className="text-xs bg-gray-400 text-white px-1.5 py-0.5 rounded shrink-0">Faltoso</span>
                                )}
                              </div>
                            </td>
                            <td className="text-center p-2 text-xs text-gray-500 whitespace-nowrap">{report.class_name}</td>
                            {itemGroups.map((group: number[], itemIndex: number) => {
                              if (isAbsent) {
                                return (
                                  <td key={itemIndex} className="text-center p-1">
                                    <span className="inline-flex items-center justify-center w-7 h-7 text-xs font-bold rounded bg-gray-200 text-gray-400 border border-gray-300">—</span>
                                  </td>
                                )
                              }
                              if (group.length === 1) {
                                const i = group[0]
                                const ans = result.answers?.[i] || ''
                                const correct = answerKey[i] || ''
                                const isCorrect = ans && ans.toUpperCase() === correct.toUpperCase()
                                const isBlank = !ans || !ans.trim()
                                return (
                                  <td key={itemIndex} className="text-center p-1">
                                    <span className={`inline-flex items-center justify-center w-7 h-7 text-xs font-bold rounded border ${
                                      isBlank ? 'bg-gray-100 text-gray-400 border-gray-300'
                                      : isCorrect ? 'bg-green-500 text-white border-green-600'
                                      : 'bg-red-500 text-white border-red-600'
                                    }`}>
                                      {ans || '—'}
                                    </span>
                                  </td>
                                )
                              }
                              const answers = group.map((i: number) => result.answers?.[i] || '')
                              const allCorrect = group.every((i: number, gi: number) => {
                                const ans = answers[gi] || ''
                                const correct = answerKey[i] || ''
                                return ans && ans.toUpperCase() === correct.toUpperCase()
                              })
                              const anyBlank = answers.every((a: string) => !a || !a.trim())
                              const display = answers.map((a: string) => a || '—').join(',')
                              return (
                                <td key={itemIndex} className="text-center p-1">
                                  <span className={`inline-flex items-center justify-center px-1 min-w-[28px] h-7 text-xs font-bold rounded border ${
                                    anyBlank ? 'bg-gray-100 text-gray-400 border-gray-300'
                                    : allCorrect ? 'bg-green-500 text-white border-green-600'
                                    : 'bg-red-500 text-white border-red-600'
                                  }`}>
                                    {display}
                                  </span>
                                </td>
                              )
                            })}
                            <td className="text-center p-2 text-sm">
                              {isAbsent ? (
                                <span className="text-gray-400">—</span>
                              ) : (
                                <span className="font-semibold text-gray-700">{correctItems}/{totalItems}</span>
                              )}
                            </td>
                            <td className="text-center p-2">
                              {isAbsent ? (
                                <span className="text-gray-400 text-sm">—</span>
                              ) : (
                                <span className={`text-sm ${getScoreColor(result.score)}`}>
                                  {result.score.toFixed(1)}%
                                </span>
                              )}
                            </td>
                          </tr>
                        )
                      })}
                    </React.Fragment>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <div className="bg-white border rounded-lg p-4">
        <h4 className="text-sm font-semibold text-gray-900 mb-3">
          <i className="fas fa-chart-line mr-2 text-teal-600"></i>
          Resultados Consolidados por Turma
        </h4>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-400">
                <th className="text-center p-2">Turma</th>
                <th className="text-center p-2">Total</th>
                <th className="text-center p-2">Média</th>
                <th className="text-center p-2">🔴 Vermelho (≤49%)</th>
                <th className="text-center p-2">🟡 Amarelo (50%-69%)</th>
                <th className="text-center p-2">🟢 Verde (70%-89%)</th>
                <th className="text-center p-2">🔵 Azul (90%-100%)</th>
              </tr>
            </thead>
            <tbody>
              {filteredReports.map((report) => {
                const stats = calculateClassStats(report)
                return (
                  <tr key={report.id} className="border-b hover:bg-gray-200">
                    <td className="p-2 text-center font-medium text-gray-900">
                      {report.class_name}
                    </td>
                    <td className="text-center p-2 font-semibold text-blue-600">
                      {stats.totalStudents}
                    </td>
                    <td className="text-center p-2 font-semibold text-green-600">
                      {report.average_score.toFixed(1)}%
                    </td>
                    <td className="text-center p-2">
                      <div className="flex items-center justify-center gap-2">
                        <span className="inline-flex items-center justify-center w-4 h-4 rounded-full bg-red-600"></span>
                        <span className="font-semibold text-gray-700">{stats.red}</span>
                      </div>
                    </td>
                    <td className="text-center p-2">
                      <div className="flex items-center justify-center gap-2">
                        <span className="inline-flex items-center justify-center w-4 h-4 rounded-full bg-yellow-500"></span>
                        <span className="font-semibold text-gray-700">{stats.yellow}</span>
                      </div>
                    </td>
                    <td className="text-center p-2">
                      <div className="flex items-center justify-center gap-2">
                        <span className="inline-flex items-center justify-center w-4 h-4 rounded-full bg-green-600"></span>
                        <span className="font-semibold text-gray-700">{stats.green}</span>
                      </div>
                    </td>
                    <td className="text-center p-2">
                      <div className="flex items-center justify-center gap-2">
                        <span className="inline-flex items-center justify-center w-4 h-4 rounded-full bg-blue-600"></span>
                        <span className="font-semibold text-gray-700">{stats.blue}</span>
                      </div>
                    </td>
                  </tr>
                )
              })}
              {filteredReports.length > 0 && (
                <tr className="bg-teal-100 border-t-2 border-teal-400 font-bold">
                  <td className="p-2 text-center text-teal-900">TOTAL GERAL</td>
                  <td className="text-center p-2 text-blue-700">{totalStats.totalStudents}</td>
                  <td className="text-center p-2 text-green-700">
                    {totalStats.totalStudents > 0
                      ? (filteredReports.reduce((sum, r) => sum + r.average_score, 0) / filteredReports.length).toFixed(1)
                      : '0.0'}%
                  </td>
                  <td className="text-center p-2">
                    <div className="flex items-center justify-center gap-2">
                      <span className="inline-flex items-center justify-center w-4 h-4 rounded-full bg-red-600"></span>
                      <span className="text-gray-900">{totalStats.red}</span>
                    </div>
                  </td>
                  <td className="text-center p-2">
                    <div className="flex items-center justify-center gap-2">
                      <span className="inline-flex items-center justify-center w-4 h-4 rounded-full bg-yellow-500"></span>
                      <span className="text-gray-900">{totalStats.yellow}</span>
                    </div>
                  </td>
                  <td className="text-center p-2">
                    <div className="flex items-center justify-center gap-2">
                      <span className="inline-flex items-center justify-center w-4 h-4 rounded-full bg-green-600"></span>
                      <span className="text-gray-900">{totalStats.green}</span>
                    </div>
                  </td>
                  <td className="text-center p-2">
                    <div className="flex items-center justify-center gap-2">
                      <span className="inline-flex items-center justify-center w-4 h-4 rounded-full bg-blue-600"></span>
                      <span className="text-gray-900">{totalStats.blue}</span>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="bg-white border rounded-lg p-4">
        <h4 className="text-sm font-semibold text-gray-900 mb-3">
          <i className="fas fa-chart-bar mr-2 text-purple-600"></i>
          Análise Consolidada por Item
        </h4>
        <div className="overflow-x-auto" style={{ overflowY: 'visible' }}>
          <div className="min-w-full inline-block align-middle">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-400">
                  <th className="text-left p-2 sticky left-0 bg-gray-400 z-10">Critério / Turma</th>
                  {itemGroups.map((group: number[], itemIndex: number) => {
                    const firstQuestionInGroup = group[0]
                    const descriptor = itemDescriptors[firstQuestionInGroup] || 'Sem descritor'
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
                  {filteredReports.map((report, reportIndex) => (
                    <React.Fragment key={report.id}>
                      <tr className="bg-gray-100 border-t-2">
                        <td colSpan={itemGroups.length + 1} className="p-2 font-bold text-gray-900">
                          {report.class_name}
                        </td>
                      </tr>

                      <tr className="bg-green-200 border-b">
                        <td className="p-2 sticky left-0 bg-green-200 z-10 text-xs font-semibold text-black pl-4">
                          Acertos (%)
                        </td>
                        {itemGroups.map((group: number[], itemIndex: number) => {
                          const presentStudents = report.student_results.filter((r: any) => !r.absent)
                          const totalStudents = presentStudents.length
                          let correctCount = 0

                          presentStudents.forEach((result: any) => {
                            if (group.length === 1) {
                              const idx = group[0]
                              const answer = result.answers?.[idx] || ''
                              const correctAnswer = answerKey[idx]
                              if (answer && answer.toUpperCase() === correctAnswer?.toUpperCase()) {
                                correctCount++
                              }
                            } else {
                              const allCorrect = group.every(idx => {
                                const answer = result.answers?.[idx] || ''
                                const correctAnswer = answerKey[idx]
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
                        <td className="p-2 sticky left-0 bg-red-200 z-10 text-xs font-semibold text-black pl-4">
                          Erros (%)
                        </td>
                        {itemGroups.map((group: number[], itemIndex: number) => {
                          const presentStudents = report.student_results.filter((r: any) => !r.absent)
                          const totalStudents = presentStudents.length
                          let incorrectCount = 0

                          presentStudents.forEach((result: any) => {
                            if (group.length === 1) {
                              const idx = group[0]
                              const answer = result.answers?.[idx] || ''
                              const correctAnswer = answerKey[idx]
                              if (answer && answer.toUpperCase() !== correctAnswer?.toUpperCase()) {
                                incorrectCount++
                              }
                            } else {
                              const hasAnswer = group.some(idx => {
                                const answer = result.answers?.[idx] || ''
                                return answer && answer.trim()
                              })
                              const allCorrect = group.every(idx => {
                                const answer = result.answers?.[idx] || ''
                                const correctAnswer = answerKey[idx]
                                return answer && answer.toUpperCase() === correctAnswer?.toUpperCase()
                              })
                              if (hasAnswer && !allCorrect) incorrectCount++
                            }
                          })

                          const percentage = totalStudents > 0 ? ((incorrectCount / totalStudents) * 100).toFixed(1) : '0.0'

                          return (
                            <td key={itemIndex} className="text-center p-2">
                              <span className="inline-flex items-center justify-center min-w-[60px] px-2 py-1 text-xs font-bold rounded bg-red-500 text-black border border-red-300">
                                {percentage}%
                              </span>
                            </td>
                          )
                        })}
                      </tr>
                    </React.Fragment>
                  ))}
                </tbody>
              </table>
          </div>
        </div>
      </div>

      <div className="bg-white border rounded-lg p-4">
        <h4 className="text-sm font-semibold text-gray-900 mb-3">
          <i className="fas fa-percentage mr-2 text-indigo-600"></i>
          Percentual de Marcação por Alternativa (Consolidado)
        </h4>
        <div className="overflow-x-auto">
          <div className="min-w-full inline-block align-middle">
            <div className="overflow-visible">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-400">
                    <th className="text-left p-2 sticky left-0 bg-gray-400 z-10">Alternativa / Turma</th>
                    {itemGroups.map((group: number[], itemIndex: number) => (
                      <th key={itemIndex} className="text-center p-2 min-w-[80px]">
                        Item {itemIndex + 1}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {(() => {
                    const itemMaxOptions: number[] = []
                    itemGroups.forEach((group: number[], itemIndex: number) => {
                      if (group.length === 1) {
                        const idx = group[0]
                        const itemType = itemTypes?.[idx]
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

                    return filteredReports.map((report, reportIndex) => (
                      <React.Fragment key={report.id}>
                        <tr className="bg-gray-100 border-t-2">
                          <td colSpan={itemGroups.length + 1} className="p-2 font-bold text-gray-900">
                            {report.class_name}
                          </td>
                        </tr>
                        {options.map((option) => (
                          <tr key={`${report.id}-${option}`} className="border-b hover:bg-gray-200">
                            <td className="p-2 sticky left-0 z-10 text-xs font-semibold text-gray-700 pl-4">
                              Alternativa {option} (%)
                            </td>
                            {itemGroups.map((group: number[], itemIndex: number) => {
                              if (group.length === 1) {
                                const idx = group[0]
                                const itemType = itemTypes?.[idx]
                                const alternatives = itemAlternatives[idx] || []

                                if (itemType === 'multipla_escolha') {
                                  const hasThisOption = alternatives.some((alt: string) => alt.toUpperCase() === option)

                                  if (hasThisOption) {
                                    const presentStudents = report.student_results.filter((r: any) => !r.absent)
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
                        ))}
                        <tr className="border-b hover:bg-gray-200">
                          <td className="p-2 sticky left-0 z-10 text-xs font-semibold text-gray-700 pl-4">
                            Em branco (%)
                          </td>
                          {itemGroups.map((group: number[], itemIndex: number) => {
                            if (group.length === 1) {
                              const idx = group[0]
                              const itemType = itemTypes?.[idx]
                              const alternatives = itemAlternatives[idx] || []

                              if (itemType === 'multipla_escolha') {
                                const presentStudents = report.student_results.filter((r: any) => !r.absent)
                                const totalStudents = presentStudents.length
                                let totalMarked = 0

                                alternatives.forEach((option: string) => {
                                  presentStudents.forEach((result: any) => {
                                    const answer = result.answers?.[idx] || ''
                                    if (answer.toUpperCase() === option.toUpperCase()) {
                                      totalMarked++
                                    }
                                  })
                                })

                                const blankPercentage = totalStudents > 0 ?
                                  (100 - ((totalMarked / totalStudents) * 100)).toFixed(1) : '0.0'

                                return (
                                  <td key={itemIndex} className="text-center p-2">
                                    <span className="inline-flex items-center justify-center min-w-[60px] px-2 py-1 text-xs font-bold rounded bg-gray-200 text-gray-800 border border-gray-400">
                                      {blankPercentage}%
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
                          })}
                        </tr>
                      </React.Fragment>
                    ))
                  })()}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default CompiledReportsView
