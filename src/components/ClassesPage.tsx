import React from 'react'
import Sidebar from './Sidebar'
import MobileNavigation from './MobileNavigation'
import AllModals from './modals/AllModals'
import { useAuth } from '../contexts/AuthContext'
import { useDashboard } from '../hooks/useDashboard'
import { useGrading } from '../hooks/useGrading'

interface ClassesPageProps {
  onNavigateToMain: () => void
  onNavigateToGrading: () => void
  onNavigateToReports: () => void
  onNavigateToClasses: () => void
}

const ClassesPage: React.FC<ClassesPageProps> = ({
  onNavigateToMain,
  onNavigateToGrading,
  onNavigateToReports,
  onNavigateToClasses,
}) => {
  const { user, logout, updateUserName } = useAuth()
  const dashboard = useDashboard(user?.id)
  const grading = useGrading(user?.id, dashboard.savedAssessments)

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="flex">
        <Sidebar
          sidebarOpen={dashboard.sidebarOpen}
          setSidebarOpen={dashboard.setSidebarOpen}
          openModal={dashboard.openModal}
          user={user}
          handleLogout={logout}
          handleTabChange={dashboard.handleTabChange}
          onNavigateToMain={onNavigateToMain}
          onNavigateToGrading={onNavigateToGrading}
          onNavigateToReports={onNavigateToReports}
          onNavigateToClasses={onNavigateToClasses}
        />

        <MobileNavigation
          openModal={dashboard.openModal}
          onNavigateToMain={onNavigateToMain}
          onNavigateToReports={onNavigateToReports}
          onNavigateToClasses={onNavigateToClasses}
        />

        <main className="flex-1 md:ml-72 pb-20 md:pb-6">
          <div className="p-3 md:p-6 pt-16 md:pt-6">
            <div className="max-w-2xl mx-auto">
              <section className="bg-white rounded-lg shadow-sm border">
                <div className="border-b p-4 md:p-6">
                  <h2 className="text-base md:text-lg font-semibold text-gray-900 flex items-center mb-2">
                    <i className="fas fa-users mr-2 md:mr-3 text-green-600 text-sm md:text-base"></i>
                    <span className="text-sm md:text-base lg:text-lg">GERENCIAR TURMAS</span>
                  </h2>
                  <div className="w-full h-1 bg-green-500 rounded-full"></div>
                </div>

                <div className="p-4 md:p-6 space-y-6">
                  {/* Nova Turma */}
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <h3 className="text-sm font-medium text-blue-800 mb-3">
                      <i className="fas fa-plus-circle mr-2"></i>
                      Nova Turma
                    </h3>
                    <div className="space-y-3">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Nome da Turma *
                        </label>
                        <input
                          type="text"
                          value={grading.classData.name}
                          onChange={(e) => grading.setClassData({ ...grading.classData, name: e.target.value })}
                          className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                          placeholder="Ex: 9º A, 1º EM"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Ano Letivo
                        </label>
                        <input
                          type="text"
                          value={grading.classData.school_year}
                          onChange={(e) => grading.setClassData({ ...grading.classData, school_year: e.target.value })}
                          className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                          placeholder="Ex: 2025"
                        />
                      </div>
                      <button
                        onClick={grading.handleCreateClass}
                        className="w-full bg-green-600 text-white py-2 px-4 rounded-md hover:bg-green-700 transition-colors text-sm font-medium"
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
                    {grading.classes.length === 0 ? (
                      <div className="text-center py-10 text-gray-500">
                        <i className="fas fa-users text-4xl mb-3 text-gray-300 block"></i>
                        <p className="text-sm">Nenhuma turma cadastrada</p>
                        <p className="text-xs mt-1 text-gray-400">Crie uma turma usando o formulário acima</p>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {grading.classes.map((classItem: any) => (
                          <div
                            key={classItem.id}
                            className="border rounded-lg p-4 hover:shadow-md transition-shadow bg-white"
                          >
                            <div className="flex items-center justify-between">
                              <div>
                                <h4 className="font-medium text-gray-900">{classItem.name}</h4>
                                {classItem.school_year && (
                                  <p className="text-xs text-gray-500 mt-1">Ano: {classItem.school_year}</p>
                                )}
                              </div>
                              <div className="flex items-center space-x-3">
                                <button
                                  onClick={() => grading.handleViewStudents(classItem.id)}
                                  className="text-blue-600 hover:text-blue-700 text-sm flex items-center gap-1"
                                >
                                  <i className="fas fa-user-graduate"></i>
                                  <span>Estudantes</span>
                                </button>
                                <button
                                  onClick={() => grading.handleDeleteClass(classItem.id)}
                                  className="text-red-500 hover:text-red-700 text-sm p-1"
                                  title="Excluir turma"
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
              </section>
            </div>
          </div>
        </main>
      </div>

      <AllModals
        dashboard={{ ...dashboard, ...grading }}
        onNavigateToGrading={onNavigateToGrading}
        onNavigateToMain={onNavigateToMain}
        updateUserName={updateUserName}
      />

      <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0/css/all.min.css" />
    </div>
  )
}

export default ClassesPage
