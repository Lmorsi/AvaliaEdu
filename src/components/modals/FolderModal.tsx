import React from 'react'

interface FolderModalProps {
  isOpen: boolean
  onClose: () => void
  dashboard: any
}

const FolderModal: React.FC<FolderModalProps> = ({ isOpen, onClose, dashboard }) => {
  if (!isOpen) return null

  const colorOptions = [
    { name: 'Azul', value: '#3B82F6' },
    { name: 'Verde', value: '#10B981' },
    { name: 'Laranja', value: '#F59E0B' },
    { name: 'Vermelho', value: '#EF4444' },
    { name: 'Roxo', value: '#8B5CF6' },
    { name: 'Rosa', value: '#EC4899' },
    { name: 'Ciano', value: '#06B6D4' },
    { name: 'Cinza', value: '#6B7280' }
  ]

  const rootFolders = dashboard.folders?.filter((f: any) => !f.parent_folder_id) || []

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b p-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900">
            <i className="fas fa-folder mr-2 text-blue-600"></i>
            Gerenciar Pastas
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <i className="fas fa-times text-xl"></i>
          </button>
        </div>

        <div className="p-4 space-y-4">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h3 className="text-sm font-medium text-blue-800 mb-3">
              <i className="fas fa-plus mr-2"></i>
              Nova Pasta
            </h3>
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Nome da Pasta *
                </label>
                <input
                  type="text"
                  value={dashboard.folderData.name}
                  onChange={(e) => dashboard.setFolderData({ ...dashboard.folderData, name: e.target.value })}
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Ex: Avaliações do 1º Bimestre"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Pasta Pai (opcional)
                </label>
                <select
                  value={dashboard.folderData.parentFolderId || ''}
                  onChange={(e) => dashboard.setFolderData({ ...dashboard.folderData, parentFolderId: e.target.value || null })}
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Nenhuma (pasta raiz)</option>
                  {rootFolders.map((folder: any) => (
                    <option key={folder.id} value={folder.id}>
                      {folder.name}
                    </option>
                  ))}
                </select>
                <p className="text-xs text-gray-500 mt-1">
                  Selecione uma pasta existente para criar uma subpasta
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Cor da Pasta
                </label>
                <div className="grid grid-cols-4 gap-2">
                  {colorOptions.map((color) => (
                    <button
                      key={color.value}
                      type="button"
                      onClick={() => dashboard.setFolderData({ ...dashboard.folderData, color: color.value })}
                      className={`flex items-center gap-2 px-3 py-2 rounded-md border-2 transition-all ${
                        dashboard.folderData.color === color.value
                          ? 'border-gray-900 shadow-md'
                          : 'border-gray-200 hover:border-gray-400'
                      }`}
                    >
                      <div
                        className="w-4 h-4 rounded-full"
                        style={{ backgroundColor: color.value }}
                      ></div>
                      <span className="text-xs">{color.name}</span>
                    </button>
                  ))}
                </div>
              </div>

              <button
                onClick={dashboard.handleCreateFolder}
                className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 transition-colors text-sm"
              >
                <i className="fas fa-plus mr-2"></i>
                Criar Pasta
              </button>
            </div>
          </div>

          <div>
            <h3 className="text-sm font-medium text-gray-700 mb-3">
              <i className="fas fa-list mr-2"></i>
              Pastas Existentes
            </h3>
            {dashboard.folders?.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <i className="fas fa-folder-open text-4xl mb-3 text-gray-300"></i>
                <p className="text-sm">Nenhuma pasta criada</p>
              </div>
            ) : (
              <div className="space-y-2">
                {rootFolders.map((folder: any) => {
                  const subfolders = dashboard.folders.filter((f: any) => f.parent_folder_id === folder.id)
                  return (
                    <div key={folder.id} className="space-y-2">
                      <div className="border rounded-lg p-3 hover:shadow-md transition-shadow">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <div
                              className="w-4 h-4 rounded-full"
                              style={{ backgroundColor: folder.color }}
                            ></div>
                            <h4 className="font-medium text-gray-900">{folder.name}</h4>
                          </div>
                          <button
                            onClick={() => dashboard.handleDeleteFolder(folder.id)}
                            className="text-red-600 hover:text-red-700 text-sm"
                          >
                            <i className="fas fa-trash"></i>
                          </button>
                        </div>
                      </div>
                      {subfolders.length > 0 && (
                        <div className="ml-6 space-y-2">
                          {subfolders.map((subfolder: any) => (
                            <div key={subfolder.id} className="border rounded-lg p-3 hover:shadow-md transition-shadow">
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                  <i className="fas fa-level-up-alt text-gray-400 transform rotate-90"></i>
                                  <div
                                    className="w-4 h-4 rounded-full"
                                    style={{ backgroundColor: subfolder.color }}
                                  ></div>
                                  <h4 className="font-medium text-gray-900">{subfolder.name}</h4>
                                </div>
                                <button
                                  onClick={() => dashboard.handleDeleteFolder(subfolder.id)}
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
                  )
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default FolderModal
