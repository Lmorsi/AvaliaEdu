import React from 'react'
import SearchItemsTab from './SearchItemsTab'
import CreateItemTab from './CreateItemTab'

interface ItemsSectionProps {
  dashboard: any
}

const ItemsSection: React.FC<ItemsSectionProps> = ({ dashboard }) => {
  return (
    <section className="bg-white rounded-lg shadow-sm border order-1">
      <div className="border-b p-3 md:p-8 lg:p-8">
        <h2 className="text-base md:text-lg lg:text-xl font-semibold text-gray-900 flex items-center mb-2">
          <i className="fas fa-search mr-2 md:mr-3 text-blue-600 text-sm md:text-base"></i>
          <span className="text-sm md:text-base lg:text-lg">PESQUISE OU CADASTRE ITENS</span>
        </h2>
        <div className="w-full h-1 bg-orange-500 rounded-full"></div>
      </div>

      <div className="p-3 md:p-8 lg:p-8">
        <div className="flex border-b mb-4 md:mb-6 overflow-x-auto">
          <button
            onClick={() => dashboard.handleTabChange("items", "search-items")}
            className={`px-2 md:px-3 lg:px-4 py-2 font-medium text-xs md:text-sm border-b-2 transition-colors whitespace-nowrap ${
              dashboard.activeTab.items === "search-items"
                ? "border-blue-500 text-blue-600"
                : "border-transparent text-gray-500 hover:text-gray-700"
            }`}
          >
            <i className="fas fa-search mr-1 text-xs"></i>
            <span className="hidden sm:inline">Pesquisar Itens</span>
            <span className="sm:hidden">Pesquisar</span>
          </button>
          <button
            onClick={() => dashboard.handleTabChange("items", "create-item")}
            className={`px-2 md:px-3 lg:px-4 py-2 font-medium text-xs md:text-sm border-b-2 transition-colors whitespace-nowrap ${
              dashboard.activeTab.items === "create-item"
                ? "border-blue-500 text-blue-600"
                : "border-transparent text-gray-500 hover:text-gray-700"
            }`}
          >
            <i className="fas fa-plus mr-1 text-xs"></i>
            <span className="hidden sm:inline">Criar Novo Item</span>
            <span className="sm:hidden">Criar</span>
          </button>
        </div>

        {dashboard.activeTab.items === "search-items" && (
          <SearchItemsTab dashboard={dashboard} />
        )}

        {dashboard.activeTab.items === "create-item" && (
          <CreateItemTab dashboard={dashboard} />
        )}
      </div>
    </section>
  )
}

export default ItemsSection