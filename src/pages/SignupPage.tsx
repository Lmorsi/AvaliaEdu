import React, { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'

const SignupPage: React.FC = () => {
  const navigate = useNavigate()
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    userType: 'teacher',
    state: '',
    curriculumComponent: '',
    password: '',
    confirmPassword: ''
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [passwordStrength, setPasswordStrength] = useState(0)

  const calculatePasswordStrength = (password: string) => {
    let strength = 0
    if (password.length >= 8) strength += 25
    if (password.match(/[a-z]/) && password.match(/[A-Z]/)) strength += 25
    if (password.match(/[0-9]/)) strength += 25
    if (password.match(/[^a-zA-Z0-9]/)) strength += 25
    return strength
  }

  const handlePasswordChange = (password: string) => {
    setFormData({ ...formData, password })
    setPasswordStrength(calculatePasswordStrength(password))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (formData.password !== formData.confirmPassword) {
      setError('As senhas não coincidem')
      return
    }

    if (formData.password.length < 6) {
      setError('A senha deve ter pelo menos 6 caracteres')
      return
    }

    setLoading(true)

    try {
      const { data, error: signUpError } = await supabase.auth.signUp({
        email: formData.email,
        password: formData.password,
        options: {
          data: {
            full_name: formData.fullName,
            user_type: formData.userType,
            state: formData.state,
            curriculum_component: formData.curriculumComponent
          }
        }
      })

      if (signUpError) throw signUpError

      if (data.user) {
        alert('Cadastro realizado com sucesso! Verifique seu e-mail para confirmar a conta.')
        navigate('/login')
      }
    } catch (err: any) {
      setError(err.message || 'Erro ao criar conta')
    } finally {
      setLoading(false)
    }
  }

  const handleGoogleSignup = async () => {
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/dashboard`
        }
      })
      if (error) throw error
    } catch (err: any) {
      setError(err.message || 'Erro ao cadastrar com Google')
    }
  }

  const getStrengthColor = () => {
    if (passwordStrength <= 25) return 'bg-red-500'
    if (passwordStrength <= 50) return 'bg-orange-500'
    if (passwordStrength <= 75) return 'bg-yellow-500'
    return 'bg-green-500'
  }

  const getStrengthText = () => {
    if (passwordStrength <= 25) return 'Fraca'
    if (passwordStrength <= 50) return 'Regular'
    if (passwordStrength <= 75) return 'Boa'
    return 'Forte'
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <button
        onClick={() => navigate('/')}
        className="fixed top-4 left-4 flex items-center space-x-2 text-gray-600 hover:text-blue-600 transition-colors bg-white px-4 py-2 rounded-lg shadow-md"
      >
        <i className="fas fa-chevron-left"></i>
        <span>Voltar</span>
      </button>

      <div className="w-full max-w-5xl bg-white rounded-2xl shadow-2xl overflow-hidden flex flex-col md:flex-row">
        {/* Banner Lateral */}
        <div className="hidden md:flex md:w-2/5 bg-gradient-to-br from-green-600 to-teal-700 p-12 flex-col justify-center items-center text-white">
          <i className="fas fa-user-plus text-8xl mb-6 opacity-90"></i>
          <h2 className="text-3xl font-bold mb-4 text-center">Junte-se a nós!</h2>
          <p className="text-green-100 text-center text-lg">
            Crie sua conta e comece a transformar a educação
          </p>
        </div>

        {/* Formulário de Cadastro */}
        <div className="flex-1 p-8 md:p-12 max-h-screen overflow-y-auto">
          <div className="max-w-md mx-auto">
            <div className="text-center mb-8">
              <div className="inline-flex items-center space-x-2 mb-4">
                <i className="fas fa-graduation-cap text-4xl text-blue-600"></i>
                <span className="text-3xl font-bold text-gray-800">Avalia.Edu</span>
              </div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">Crie sua conta</h1>
              <p className="text-gray-600">Preencha os dados para começar</p>
            </div>

            {error && (
              <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-red-600 text-sm flex items-center">
                  <i className="fas fa-exclamation-circle mr-2"></i>
                  {error}
                </p>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label htmlFor="fullName" className="block text-sm font-medium text-gray-700 mb-2">
                  Nome completo
                </label>
                <input
                  type="text"
                  id="fullName"
                  value={formData.fullName}
                  onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                  className="block w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                  placeholder="Digite seu nome completo"
                  required
                />
              </div>

              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                  E-mail
                </label>
                <input
                  type="email"
                  id="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="block w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                  placeholder="Ex: @gmail, @outlook, @yahoo, etc."
                  required
                />
              </div>

              <div>
                <label htmlFor="userType" className="block text-sm font-medium text-gray-700 mb-2">
                  Sou:
                </label>
                <select
                  id="userType"
                  value={formData.userType}
                  onChange={(e) => setFormData({ ...formData, userType: e.target.value })}
                  className="block w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                  required
                >
                  <option value="teacher">Professor</option>
                  <option value="coordinator">Coordenador Escolar</option>
                  <option value="manager">Gestor Escolar</option>
                  <option value="other">Outros</option>
                </select>
              </div>

              <div>
                <label htmlFor="state" className="block text-sm font-medium text-gray-700 mb-2">
                  Estado
                </label>
                <select
                  id="state"
                  value={formData.state}
                  onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                  className="block w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                  required
                >
                  <option value="">Selecione seu estado</option>
                  <option value="AC">Acre</option>
                  <option value="AL">Alagoas</option>
                  <option value="AP">Amapá</option>
                  <option value="AM">Amazonas</option>
                  <option value="BA">Bahia</option>
                  <option value="CE">Ceará</option>
                  <option value="DF">Distrito Federal</option>
                  <option value="ES">Espírito Santo</option>
                  <option value="GO">Goiás</option>
                  <option value="MA">Maranhão</option>
                  <option value="MT">Mato Grosso</option>
                  <option value="MS">Mato Grosso do Sul</option>
                  <option value="MG">Minas Gerais</option>
                  <option value="PA">Pará</option>
                  <option value="PB">Paraíba</option>
                  <option value="PR">Paraná</option>
                  <option value="PE">Pernambuco</option>
                  <option value="PI">Piauí</option>
                  <option value="RJ">Rio de Janeiro</option>
                  <option value="RN">Rio Grande do Norte</option>
                  <option value="RS">Rio Grande do Sul</option>
                  <option value="RO">Rondônia</option>
                  <option value="RR">Roraima</option>
                  <option value="SC">Santa Catarina</option>
                  <option value="SP">São Paulo</option>
                  <option value="SE">Sergipe</option>
                  <option value="TO">Tocantins</option>
                </select>
              </div>

              <div>
                <label htmlFor="curriculumComponent" className="block text-sm font-medium text-gray-700 mb-2">
                  Componente Curricular
                </label>
                <select
                  id="curriculumComponent"
                  value={formData.curriculumComponent}
                  onChange={(e) => setFormData({ ...formData, curriculumComponent: e.target.value })}
                  className="block w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                  required
                >
                  <option value="">Selecione um componente curricular</option>
                  <option value="Artes">Artes</option>
                  <option value="Biologia">Biologia</option>
                  <option value="Ciências Naturais">Ciências Naturais</option>
                  <option value="Educação Física">Educação Física</option>
                  <option value="Filosofia">Filosofia</option>
                  <option value="Física">Física</option>
                  <option value="Geografia">Geografia</option>
                  <option value="História">História</option>
                  <option value="Língua Inglesa">Língua Inglesa</option>
                  <option value="Língua Espanhola">Língua Espanhola</option>
                  <option value="Língua Portuguesa">Língua Portuguesa</option>
                  <option value="Matemática">Matemática</option>
                  <option value="Pedagogia">Pedagogia</option>
                  <option value="Química">Química</option>
                  <option value="Sociologia">Sociologia</option>
                  <option value="Outro">Outro</option>
                </select>
              </div>

              <div>
                <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
                  Senha
                </label>
                <input
                  type="password"
                  id="password"
                  value={formData.password}
                  onChange={(e) => handlePasswordChange(e.target.value)}
                  className="block w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                  placeholder="Crie uma senha forte"
                  required
                />
                {formData.password && (
                  <div className="mt-2">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs text-gray-600">Força da senha:</span>
                      <span className={`text-xs font-semibold ${
                        passwordStrength <= 25 ? 'text-red-500' :
                        passwordStrength <= 50 ? 'text-orange-500' :
                        passwordStrength <= 75 ? 'text-yellow-500' :
                        'text-green-500'
                      }`}>
                        {getStrengthText()}
                      </span>
                    </div>
                    <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                      <div
                        className={`h-full transition-all duration-300 ${getStrengthColor()}`}
                        style={{ width: `${passwordStrength}%` }}
                      ></div>
                    </div>
                  </div>
                )}
              </div>

              <div>
                <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 mb-2">
                  Confirme sua senha
                </label>
                <input
                  type="password"
                  id="confirmPassword"
                  value={formData.confirmPassword}
                  onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                  className="block w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                  placeholder="Repita sua senha"
                  required
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-green-600 text-white py-3 rounded-lg font-semibold hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Criando conta...' : 'Criar conta'}
              </button>
            </form>

            <div className="mt-8">
              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-gray-300"></div>
                </div>
                <div className="relative flex justify-center text-sm">
                  <span className="px-4 bg-white text-gray-500">ou</span>
                </div>
              </div>

              <div className="mt-6 flex justify-center space-x-4">
                <button
                  type="button"
                  onClick={handleGoogleSignup}
                  className="flex items-center justify-center w-12 h-12 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                  title="Cadastrar com Google"
                >
                  <i className="fab fa-google text-red-500 text-xl"></i>
                </button>
                <button
                  type="button"
                  className="flex items-center justify-center w-12 h-12 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                  title="Cadastrar com Facebook"
                >
                  <i className="fab fa-facebook-f text-blue-600 text-xl"></i>
                </button>
              </div>
            </div>

            <div className="mt-8 text-center">
              <p className="text-gray-600">
                Já tem uma conta?{' '}
                <button
                  onClick={() => navigate('/login')}
                  className="text-blue-600 font-semibold hover:text-blue-700 transition-colors"
                >
                  Faça login
                </button>
              </p>
            </div>

            <div className="mt-6 pt-6 border-t border-gray-200 text-center">
              <p className="text-sm text-gray-500">
                Ao criar uma conta, você concorda com nossos{' '}
                <Link to="/termos" className="text-blue-600 hover:text-blue-700 underline">
                  Termos de Uso
                </Link>
                {' '}e{' '}
                <Link to="/privacidade" className="text-blue-600 hover:text-blue-700 underline">
                  Política de Privacidade
                </Link>
              </p>
            </div>
          </div>
        </div>
      </div>

      <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0/css/all.min.css" />
    </div>
  )
}

export default SignupPage
