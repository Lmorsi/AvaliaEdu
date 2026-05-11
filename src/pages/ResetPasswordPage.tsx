import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'

const ResetPasswordPage: React.FC = () => {
  const navigate = useNavigate()
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [passwordStrength, setPasswordStrength] = useState(0)
  const [isValidToken, setIsValidToken] = useState(true)

  useEffect(() => {
    const checkSession = async () => {
      const { data } = await supabase.auth.getSession()
      if (!data.session) {
        setIsValidToken(false)
      }
    }
    checkSession()
  }, [])

  useEffect(() => {
    if (password.length === 0) {
      setPasswordStrength(0)
      return
    }

    let strength = 0
    if (password.length >= 8) strength++
    if (password.length >= 12) strength++
    if (/[a-z]/.test(password) && /[A-Z]/.test(password)) strength++
    if (/\d/.test(password)) strength++
    if (/[^a-zA-Z0-9]/.test(password)) strength++

    setPasswordStrength(strength)
  }, [password])

  const getStrengthColor = () => {
    if (passwordStrength <= 2) return 'bg-red-500'
    if (passwordStrength === 3) return 'bg-yellow-500'
    if (passwordStrength === 4) return 'bg-blue-500'
    return 'bg-green-500'
  }

  const getStrengthText = () => {
    if (passwordStrength === 0) return ''
    if (passwordStrength <= 2) return 'Fraca'
    if (passwordStrength === 3) return 'Média'
    if (passwordStrength === 4) return 'Forte'
    return 'Muito Forte'
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (password !== confirmPassword) {
      setError('As senhas não coincidem')
      return
    }

    if (password.length < 8) {
      setError('A senha deve ter pelo menos 8 caracteres')
      return
    }

    if (passwordStrength < 3) {
      setError('Por favor, escolha uma senha mais forte')
      return
    }

    setLoading(true)

    try {
      const { error } = await supabase.auth.updateUser({
        password: password
      })

      if (error) throw error

      setSuccess(true)

      setTimeout(() => {
        navigate('/login')
      }, 3000)
    } catch (err: any) {
      setError(err.message || 'Erro ao redefinir senha')
      setLoading(false)
    }
  }

  if (!isValidToken) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
        <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl p-8">
          <div className="text-center">
            <div className="inline-flex items-center justify-center w-20 h-20 bg-red-100 rounded-full mb-6">
              <i className="fas fa-exclamation-triangle text-4xl text-red-600"></i>
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Link Inválido ou Expirado</h2>
            <p className="text-gray-600 mb-6">
              O link de recuperação de senha expirou ou é inválido. Por favor, solicite um novo link.
            </p>
            <button
              onClick={() => navigate('/recuperar-senha')}
              className="w-full bg-blue-600 text-white py-3 rounded-lg font-semibold hover:bg-blue-700 transition-colors"
            >
              Solicitar Novo Link
            </button>
          </div>
        </div>
        <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0/css/all.min.css" />
      </div>
    )
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
        <div className="hidden md:flex md:w-2/5 bg-gradient-to-br from-green-600 to-emerald-700 p-12 flex-col justify-center items-center text-white">
          <div className="relative mb-8">
            <div className="w-32 h-32 bg-white bg-opacity-20 rounded-full flex items-center justify-center backdrop-blur-sm">
              <i className="fas fa-shield-alt text-6xl"></i>
            </div>
            <div className="absolute -bottom-2 -right-2 w-12 h-12 bg-yellow-400 rounded-full flex items-center justify-center">
              <i className="fas fa-check text-white text-xl"></i>
            </div>
          </div>
          <h2 className="text-3xl font-bold mb-4 text-center">Nova Senha Segura</h2>
          <p className="text-green-100 text-center text-lg leading-relaxed mb-8">
            Crie uma senha forte para proteger sua conta e seus dados.
          </p>
          <div className="w-full space-y-4 bg-white bg-opacity-10 rounded-lg p-4 backdrop-blur-sm">
            <h3 className="font-semibold text-sm mb-3">Sua senha deve conter:</h3>
            <div className="space-y-2 text-sm">
              <div className="flex items-center space-x-2">
                <i className={`fas fa-check-circle ${password.length >= 8 ? 'text-yellow-300' : 'text-white text-opacity-40'}`}></i>
                <span className={password.length >= 8 ? 'text-white' : 'text-white text-opacity-60'}>
                  Pelo menos 8 caracteres
                </span>
              </div>
              <div className="flex items-center space-x-2">
                <i className={`fas fa-check-circle ${/[A-Z]/.test(password) && /[a-z]/.test(password) ? 'text-yellow-300' : 'text-white text-opacity-40'}`}></i>
                <span className={/[A-Z]/.test(password) && /[a-z]/.test(password) ? 'text-white' : 'text-white text-opacity-60'}>
                  Letras maiúsculas e minúsculas
                </span>
              </div>
              <div className="flex items-center space-x-2">
                <i className={`fas fa-check-circle ${/\d/.test(password) ? 'text-yellow-300' : 'text-white text-opacity-40'}`}></i>
                <span className={/\d/.test(password) ? 'text-white' : 'text-white text-opacity-60'}>
                  Pelo menos um número
                </span>
              </div>
              <div className="flex items-center space-x-2">
                <i className={`fas fa-check-circle ${/[^a-zA-Z0-9]/.test(password) ? 'text-yellow-300' : 'text-white text-opacity-40'}`}></i>
                <span className={/[^a-zA-Z0-9]/.test(password) ? 'text-white' : 'text-white text-opacity-60'}>
                  Caractere especial (!@#$%...)
                </span>
              </div>
            </div>
          </div>
        </div>

        <div className="flex-1 p-8 md:p-12">
          <div className="max-w-md mx-auto">
            {success ? (
              <div className="text-center animate-fade-in">
                <div className="inline-flex items-center justify-center w-24 h-24 bg-green-100 rounded-full mb-6">
                  <i className="fas fa-check-double text-5xl text-green-600"></i>
                </div>
                <h2 className="text-3xl font-bold text-gray-900 mb-4">Senha Redefinida!</h2>
                <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
                  <p className="text-green-800 text-sm leading-relaxed">
                    Sua senha foi atualizada com sucesso. Você será redirecionado para a página de login em instantes.
                  </p>
                </div>
                <div className="flex items-center justify-center space-x-2 text-gray-500">
                  <i className="fas fa-spinner fa-spin"></i>
                  <span className="text-sm">Redirecionando...</span>
                </div>
              </div>
            ) : (
              <div className="animate-fade-in">
                <div className="text-center mb-8">
                  <div className="inline-flex items-center justify-center w-16 h-16 bg-green-100 rounded-full mb-4">
                    <i className="fas fa-lock text-3xl text-green-600"></i>
                  </div>
                  <h1 className="text-3xl font-bold text-gray-900 mb-2">Redefinir Senha</h1>
                  <p className="text-gray-600">Digite sua nova senha abaixo</p>
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
                    <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
                      Nova Senha
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <i className="fas fa-lock text-gray-400"></i>
                      </div>
                      <input
                        type={showPassword ? 'text' : 'password'}
                        id="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="block w-full pl-10 pr-12 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all"
                        placeholder="••••••••"
                        required
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600"
                      >
                        <i className={`fas ${showPassword ? 'fa-eye-slash' : 'fa-eye'}`}></i>
                      </button>
                    </div>
                    {password && (
                      <div className="mt-2">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-xs text-gray-600">Força da senha:</span>
                          <span className={`text-xs font-medium ${
                            passwordStrength <= 2 ? 'text-red-600' :
                            passwordStrength === 3 ? 'text-yellow-600' :
                            passwordStrength === 4 ? 'text-blue-600' :
                            'text-green-600'
                          }`}>
                            {getStrengthText()}
                          </span>
                        </div>
                        <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
                          <div
                            className={`h-full ${getStrengthColor()} transition-all duration-300`}
                            style={{ width: `${(passwordStrength / 5) * 100}%` }}
                          ></div>
                        </div>
                      </div>
                    )}
                  </div>

                  <div>
                    <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 mb-2">
                      Confirmar Nova Senha
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <i className="fas fa-lock text-gray-400"></i>
                      </div>
                      <input
                        type={showConfirmPassword ? 'text' : 'password'}
                        id="confirmPassword"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        className="block w-full pl-10 pr-12 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all"
                        placeholder="••••••••"
                        required
                      />
                      <button
                        type="button"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600"
                      >
                        <i className={`fas ${showConfirmPassword ? 'fa-eye-slash' : 'fa-eye'}`}></i>
                      </button>
                    </div>
                    {confirmPassword && password !== confirmPassword && (
                      <p className="mt-2 text-xs text-red-600 flex items-center">
                        <i className="fas fa-times-circle mr-1"></i>
                        As senhas não coincidem
                      </p>
                    )}
                    {confirmPassword && password === confirmPassword && (
                      <p className="mt-2 text-xs text-green-600 flex items-center">
                        <i className="fas fa-check-circle mr-1"></i>
                        As senhas coincidem
                      </p>
                    )}
                  </div>

                  <button
                    type="submit"
                    disabled={loading || password !== confirmPassword || passwordStrength < 3}
                    className="w-full bg-green-600 text-white py-3 rounded-lg font-semibold hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
                  >
                    {loading ? (
                      <>
                        <i className="fas fa-spinner fa-spin"></i>
                        <span>Redefinindo...</span>
                      </>
                    ) : (
                      <>
                        <i className="fas fa-check"></i>
                        <span>Redefinir Senha</span>
                      </>
                    )}
                  </button>
                </form>

                <div className="mt-6 bg-blue-50 border-l-4 border-blue-600 p-4 rounded">
                  <div className="flex">
                    <div className="flex-shrink-0">
                      <i className="fas fa-info-circle text-blue-600"></i>
                    </div>
                    <div className="ml-3">
                      <p className="text-xs text-blue-800">
                        Após redefinir sua senha, você será redirecionado para a página de login.
                      </p>
                    </div>
                  </div>
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

export default ResetPasswordPage
