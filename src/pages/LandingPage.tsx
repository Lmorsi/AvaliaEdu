import React, { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'

const LandingPage: React.FC = () => {
  const navigate = useNavigate()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="bg-gray-700 shadow-sm">
        <div className="container mx-auto px-4 py-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
            </div>
            <nav className="hidden md:flex items-center space-x-6">
              <Link to="/sobre" className="text-white hover:text-blue-400 transition-colors mb-6">Sobre</Link>
              <Link to="/como-funciona" className="text-white hover:text-blue-400 transition-colors mb-6">Como Funciona</Link>
              <button
                onClick={() => navigate('/login')}
                className="hover:-translate-y-0.5 hover:text-blue-400 font-bold text-white px-10 py-2 rounded-lg hover:bg-gray-800 transition-all duration-500"
              >
                Login
              </button>
            </nav>
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden text-white hover:text-blue-400 transition-colors"
            >
              <i className={`fas ${mobileMenuOpen ? 'fa-times' : 'fa-bars'} text-xl`}></i>
            </button>
          </div>

          {/* Mobile Menu */}
          {mobileMenuOpen && (
            <div className="md:hidden mt-4 pb-4 space-y-3 border-t border-gray-600 pt-4">
              <Link
                to="/sobre"
                onClick={() => setMobileMenuOpen(false)}
                className="block text-white hover:text-blue-400 transition-colors py-2"
              >
                Sobre
              </Link>
              <Link
                to="/como-funciona"
                onClick={() => setMobileMenuOpen(false)}
                className="block text-white hover:text-blue-400 transition-colors py-2"
              >
                Como Funciona
              </Link>
              <button
                onClick={() => {
                  setMobileMenuOpen(false)
                  navigate('/login')
                }}
                className="w-full text-left text-white hover:text-blue-400 transition-colors py-2"
              >
                Login
              </button>
            </div>
          )}
        </div>
      </header>

      {/* Hero Section with Blue Background */}
      <section className="py-0 md:py-0">
        <div className="mx-4 md:mx-8 lg:mx-32 bg-blue-400 py-12 md:py-20">
          <div className="container mx-auto px-4">
            <div className="flex flex-col md:flex-row items-center gap-12">
              <div className="flex-1 flex justify-center md:order-1">
                <div className="logo-area p-2 md:p-0 flex-shrink-0 max-w-md">
                  <img
                    src="/origin.png"
                    alt="Logo Avalia.Edu - Correção com QR Code"
                    className="w-full"
                  />
                </div>
              </div>

              <div className="flex-1 text-center md:text-left md:order-2">
                <h1 className="text-4xl md:text-5xl lg:text-5xl font-bold text-white mb-6 leading-tight">
                  Criar, corrigir e gerar dados de aprendizagem, tudo em um só lugar.
                </h1>
                <p className="text-lg md:text-xl text-blue-50 mb-8 leading-relaxed">
                  Simplifique o processo de criação e correção de provas e obtenha, ainda, relatórios detalhados de aprendizagem em pouco tempo.
                </p>
                <button
                  onClick={() => navigate('/cadastro')}
                  className="bg-gray-700 text-white px-8 py-4 rounded-lg text-lg font-semibold hover:bg-gray-800 transition-all duration-500 shadow-lg hover:shadow-xl transform hover:-translate-y-1 duration-200"
                >
                  Cadastre-se Grátis
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <main className="container mx-auto px-4 py-12 md:py-2">
        <section id="funciona">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* Caixa 1 */}
            <div className="bg-white p-8 rounded-xl shadow-lg hover:shadow-2xl transition-shadow flex flex-col items-center">
              <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mb-6">
                <i className="fas fa-file-alt text-3xl text-blue-600"></i>
              </div>
              <h3 className="text-center text-2xl font-bold text-gray-900 mb-4">Crie avaliações</h3>
              <p className="text-center text-gray-600 leading-relaxed">
                Selecione itens compartilhados por outros usuários ou crie e monte sua avaliação.
              </p>
            </div>
      
            {/* Caixa 2 */}
            <div className="bg-white p-8 rounded-xl shadow-lg hover:shadow-2xl transition-shadow flex flex-col items-center">
              <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mb-6">
                <i className="fas fa-bolt text-3xl text-blue-600"></i>
              </div>
              <h3 className="text-center text-2xl font-bold text-gray-900 mb-4">Corrija rapidamente</h3>
              <p className="text-center text-gray-600 leading-relaxed">
                Leitura dos gabaritos através do aplicativo em seu celular.
              </p>
            </div>
      
            {/* Caixa 3 */}
            <div className="bg-white p-8 rounded-xl shadow-lg hover:shadow-2xl transition-shadow flex flex-col items-center">
              <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mb-6">
                <i className="fas fa-chart-bar text-3xl text-blue-600"></i>
              </div>
              <h3 className="text-center text-2xl font-bold text-gray-900 mb-4">Analise dados</h3>
              <p className="text-center text-gray-600 leading-relaxed">
                Obtenha estatísticas dos resultados por estudante e/ou por turma.
              </p>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="bg-gray-700 text-white mt-6 py-5">
        <div className="container mx-auto px-4">
          <div className="flex flex-col md:flex-row justify-between items-center">
            <p className="mb-4 md:mb-0">&copy; 2025 AvaliaEdu. Todos os direitos reservados.</p>
            <div className="flex space-x-6">
              <Link to="/termos" className="text-gray-300 hover:text-white transition-colors">Termos de uso</Link>
              <Link to="/privacidade" className="text-gray-300 hover:text-white transition-colors">Política de privacidade</Link>
            </div>
          </div>
        </div>
      </footer>

      <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0/css/all.min.css" />
    </div>
  )
}

export default LandingPage
