import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'

const RecoverPasswordPage: React.FC = () => {
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/redefinir-senha`
      })

      if (error) throw error

      setSuccess(true)
    } catch (err: any) {
      setError(err.message || 'Erro ao enviar e-mail de recuperação')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <button
        onClick={() => navigate('/login')}
        className="fixed top-4 left-4 flex items-center space-x-2 text-gray-600 hover:text-blue-600 transition-colors bg-white px-4 py-2 rounded-lg shadow-md hover:shadow-lg z-10"
      >
        <i className="fas fa-chevron-left"></i>
        <span>Voltar</span>
      </button>

      <div className="w-full max-w-5xl bg-white rounded-2xl shadow-2xl overflow-hidden flex flex-col md:flex-row">
        <div className="hidden md:flex md:w-2/5 bg-gradient-to-br from-blue-600 to-indigo-700 p-12 flex-col justify-center items-center text-white">
          <div className="relative mb-8">
            <div className="w-32 h-32 bg-white bg-opacity-20 rounded-full flex items-center justify-center backdrop-blur-sm">
              <i className="fas fa-key text-6xl"></i>
            </div>
            <div className="absolute -top-2 -right-2 w-12 h-12 bg-yellow-400 rounded-full flex items-center justify-center">
              <i className="fas fa-lock-open text-white text-xl"></i>
            </div>
          </div>
          <h2 className="text-3xl font-bold mb-4 text-center">Recuperação de Senha</h2>
          <p className="text-blue-100 text-center text-lg leading-relaxed">
            Não se preocupe! Enviaremos instruções para você redefinir sua senha com segurança.
          </p>
          <div className="mt-8 space-y-3">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-white bg-opacity-20 rounded-full flex items-center justify-center">
                <i className="fas fa-envelope text-sm"></i>
              </div>
              <span className="text-sm text-blue-100">Verificação por e-mail</span>
            </div>
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-white bg-opacity-20 rounded-full flex items-center justify-center">
                <i className="fas fa-shield-alt text-sm"></i>
              </div>
              <span className="text-sm text-blue-100">100% seguro e protegido</span>
            </div>
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-white bg-opacity-20 rounded-full flex items-center justify-center">
                <i className="fas fa-clock text-sm"></i>
              </div>
              <span className="text-sm text-blue-100">Link válido por 1 hora</span>
            </div>
          </div>
        </div>

        <div className="flex-1 p-8 md:p-12">
          <div className="max-w-md mx-auto">
            {success ? (
              <div className="text-center animate-fade-in">
                <div className="inline-flex items-center justify-center w-24 h-24 bg-green-100 rounded-full mb-6">
                  <i className="fas fa-check text-5xl text-green-600"></i>
                </div>
                <h2 className="text-3xl font-bold text-gray-900 mb-4">E-mail Enviado!</h2>
                <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
                  <p className="text-green-800 text-sm leading-relaxed">
                    Enviamos instruções detalhadas para <strong>{email}</strong>
                  </p>
                </div>
                <div className="bg-blue-50 border-l-4 border-blue-600 p-4 mb-6 text-left">
                  <h3 className="font-semibold text-blue-900 mb-2 flex items-center">
                    <i className="fas fa-info-circle mr-2"></i>
                    Próximos passos:
                  </h3>
                  <ol className="text-sm text-blue-800 space-y-2 ml-6 list-decimal">
                    <li>Verifique sua caixa de entrada</li>
                    <li>Clique no link de recuperação</li>
                    <li>Defina sua nova senha</li>
                    <li>Faça login com a nova senha</li>
                  </ol>
                </div>
                <p className="text-sm text-gray-500 mb-6">
                  Não recebeu o e-mail? Verifique sua pasta de spam ou{' '}
                  <button
                    onClick={() => {
                      setSuccess(false)
                      setEmail('')
                    }}
                    className="text-blue-600 hover:text-blue-700 font-medium underline"
                  >
                    tente novamente
                  </button>
                </p>
                <button
                  onClick={() => navigate('/login')}
                  className="w-full bg-blue-600 text-white py-3 rounded-lg font-semibold hover:bg-blue-700 transition-colors flex items-center justify-center space-x-2"
                >
                  <i className="fas fa-arrow-left"></i>
                  <span>Voltar para o Login</span>
                </button>
              </div>
            ) : (
              <div className="animate-fade-in">
                <div className="text-center mb-8">
                  <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-100 rounded-full mb-4">
                    <i className="fas fa-key text-3xl text-blue-600"></i>
                  </div>
                  <h1 className="text-3xl font-bold text-gray-900 mb-2">Recuperar Senha</h1>
                  <p className="text-gray-600">Digite seu e-mail cadastrado para continuar</p>
                </div>

                {error && (
                  <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg animate-shake">
                    <p className="text-red-600 text-sm flex items-center">
                      <i className="fas fa-exclamation-circle mr-2"></i>
                      {error}
                    </p>
                  </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-6">
                  <div>
                    <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                      E-mail cadastrado
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <i className="fas fa-envelope text-gray-400"></i>
                      </div>
                      <input
                        type="email"
                        id="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="block w-full pl-10 pr-3 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                        placeholder="seu@email.com"
                        required
                      />
                    </div>
                    <p className="mt-2 text-xs text-gray-500">
                      <i className="fas fa-info-circle mr-1"></i>
                      Enviaremos um link seguro para este endereço
                    </p>
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full bg-blue-600 text-white py-3 rounded-lg font-semibold hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
                  >
                    {loading ? (
                      <>
                        <i className="fas fa-spinner fa-spin"></i>
                        <span>Enviando...</span>
                      </>
                    ) : (
                      <>
                        <i className="fas fa-paper-plane"></i>
                        <span>Enviar Instruções</span>
                      </>
                    )}
                  </button>
                </form>

                <div className="mt-8 pt-6 border-t border-gray-200">
                  <p className="text-center text-gray-600 text-sm mb-4">
                    Lembrou sua senha?
                  </p>
                  <button
                    onClick={() => navigate('/login')}
                    className="w-full border border-gray-300 text-gray-700 py-3 rounded-lg font-semibold hover:bg-gray-50 transition-colors flex items-center justify-center space-x-2"
                  >
                    <i className="fas fa-sign-in-alt"></i>
                    <span>Fazer Login</span>
                  </button>
                </div>

                <div className="mt-6 text-center">
                  <p className="text-xs text-gray-500">
                    Não tem uma conta?{' '}
                    <button
                      onClick={() => navigate('/cadastro')}
                      className="text-blue-600 hover:text-blue-700 font-medium"
                    >
                      Cadastre-se agora
                    </button>
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0/css/all.min.css" />
    </div>
  )
}

export default RecoverPasswordPage
