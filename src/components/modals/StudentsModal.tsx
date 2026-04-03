import React, { useState, useRef } from 'react'

interface StudentsModalProps {
  isOpen: boolean
  onClose: () => void
  dashboard: any
}

const StudentsModal: React.FC<StudentsModalProps> = ({ isOpen, onClose, dashboard }) => {
  const [showImportSection, setShowImportSection] = useState(false)
  const [importPreview, setImportPreview] = useState<{name: string, registration_number?: string}[]>([])
  const fileInputRef = useRef<HTMLInputElement>(null)

  if (!isOpen || !dashboard.selectedClass) return null

  const downloadTemplate = () => {
    const csvContent = 'Nome,Matrícula\nJoão Silva,12345\nMaria Santos,12346\nPedro Oliveira,12347'
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    link.href = URL.createObjectURL(blob)
    link.download = 'template_alunos.csv'
    link.click()
  }

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = (e) => {
      const text = e.target?.result as string
      const lines = text.split('\n').filter(line => line.trim())

      if (lines.length < 2) {
        alert('Arquivo vazio ou inválido')
        return
      }

      const students = lines.slice(1).map(line => {
        const [name, registration_number] = line.split(',').map(s => s.trim())
        return {
          name: name || '',
          registration_number: registration_number || ''
        }
      }).filter(s => s.name)

      setImportPreview(students)
    }
    reader.readAsText(file)
  }

  const handleBulkImport = async () => {
    if (importPreview.length === 0) return

    for (const student of importPreview) {
      await dashboard.handleAddStudentBulk(student)
    }

    setImportPreview([])
    setShowImportSection(false)
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const cancelImport = () => {
    setImportPreview([])
    setShowImportSection(false)
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        <div className="border-b p-4 bg-gray-50 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900">
            <i className="fas fa-user-graduate mr-2 text-blue-600"></i>
            Estudantes - {dashboard.selectedClass.name}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <i className="fas fa-times text-xl"></i>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-medium text-blue-800">
                <i className="fas fa-plus mr-2"></i>
                Adicionar Estudante
              </h3>
              <button
                onClick={() => setShowImportSection(!showImportSection)}
                className="text-xs bg-green-600 text-white px-3 py-1.5 rounded-md hover:bg-green-700 transition-colors flex items-center gap-2"
              >
                <i className="fas fa-file-import"></i>
                {showImportSection ? 'Voltar' : 'Importar em Massa'}
              </button>
            </div>

            {showImportSection ? (
              <div className="space-y-3">
                <div className="bg-white border border-blue-300 rounded-md p-3">
                  <h4 className="text-xs font-semibold text-gray-700 mb-2">
                    <i className="fas fa-info-circle mr-1 text-blue-500"></i>
                    Como importar alunos em massa:
                  </h4>
                  <ol className="text-xs text-gray-600 space-y-1 ml-4 list-decimal">
                    <li>Baixe o template CSV clicando no botão abaixo</li>
                    <li>Preencha com os dados dos alunos (Nome é obrigatório)</li>
                    <li>Faça upload do arquivo preenchido</li>
                    <li>Revise os dados e confirme a importação</li>
                  </ol>
                </div>

                <button
                  onClick={downloadTemplate}
                  className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 transition-colors text-sm flex items-center justify-center gap-2"
                >
                  <i className="fas fa-download"></i>
                  Baixar Template CSV
                </button>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    <i className="fas fa-upload mr-1"></i>
                    Selecionar Arquivo CSV
                  </label>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".csv"
                    onChange={handleFileUpload}
                    className="w-full text-sm border border-gray-300 rounded-md file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                  />
                </div>

                {importPreview.length > 0 && (
                  <div className="border border-gray-300 rounded-md p-3 bg-white">
                    <h4 className="text-sm font-semibold text-gray-700 mb-2">
                      <i className="fas fa-eye mr-1 text-green-500"></i>
                      Preview da Importação ({importPreview.length} alunos)
                    </h4>
                    <div className="max-h-48 overflow-y-auto space-y-1">
                      {importPreview.map((student, index) => (
                        <div key={index} className="text-xs p-2 bg-gray-50 rounded border border-gray-200">
                          <span className="font-medium">{index + 1}. {student.name}</span>
                          {student.registration_number && (
                            <span className="text-gray-500 ml-2">- Matrícula: {student.registration_number}</span>
                          )}
                        </div>
                      ))}
                    </div>
                    <div className="flex gap-2 mt-3">
                      <button
                        onClick={handleBulkImport}
                        className="flex-1 bg-green-600 text-white py-2 px-4 rounded-md hover:bg-green-700 transition-colors text-sm"
                      >
                        <i className="fas fa-check mr-2"></i>
                        Confirmar Importação
                      </button>
                      <button
                        onClick={cancelImport}
                        className="flex-1 bg-gray-500 text-white py-2 px-4 rounded-md hover:bg-gray-600 transition-colors text-sm"
                      >
                        <i className="fas fa-times mr-2"></i>
                        Cancelar
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Nome do Estudante *
                    </label>
                    <input
                      type="text"
                      value={dashboard.studentData.name}
                      onChange={(e) => dashboard.setStudentData({ ...dashboard.studentData, name: e.target.value })}
                      className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Nome completo"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Matrícula (opcional)
                    </label>
                    <input
                      type="text"
                      value={dashboard.studentData.registration_number}
                      onChange={(e) => dashboard.setStudentData({ ...dashboard.studentData, registration_number: e.target.value })}
                      className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Número de matrícula"
                    />
                  </div>
                </div>
                <button
                  onClick={dashboard.handleAddStudent}
                  className="w-full mt-3 bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 transition-colors text-sm"
                >
                  <i className="fas fa-plus mr-2"></i>
                  Adicionar Estudante
                </button>
              </div>
            )}
          </div>

          <div>
            <h3 className="text-sm font-medium text-gray-700 mb-3">
              <i className="fas fa-list mr-2"></i>
              Lista de Estudantes ({dashboard.students.length})
            </h3>
            {dashboard.students.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <i className="fas fa-user-graduate text-4xl mb-3 text-gray-300"></i>
                <p className="text-sm">Nenhum estudante cadastrado</p>
              </div>
            ) : (
              <div className="space-y-2">
                {dashboard.students.map((student: any, index: number) => (
                  <div
                    key={student.id}
                    className="border rounded-lg p-3 hover:shadow-md transition-shadow"
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="font-medium text-gray-900">
                          {index + 1}. {student.name}
                        </h4>
                        {student.registration_number && (
                          <p className="text-xs text-gray-500 mt-1">
                            Matrícula: {student.registration_number}
                          </p>
                        )}
                      </div>
                      <button
                        onClick={() => dashboard.handleDeleteStudent(student.id)}
                        className="text-red-600 hover:text-red-700 text-sm"
                      >
                        <i className="fas fa-trash"></i>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="border-t p-4 bg-gray-50">
          <button
            onClick={onClose}
            className="w-full bg-gray-600 text-white py-2 px-4 rounded-md hover:bg-gray-700 transition-colors"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  )
}

export default StudentsModal
