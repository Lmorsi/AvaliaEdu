import React, { useState } from 'react'
import { supabase } from '../lib/supabase'

const TestEmailPage: React.FC = () => {
  const [email, setEmail] = useState('lucasmoreira.silva@se.df.gov.br')
  const [result, setResult] = useState<any>(null)
  const [loading, setLoading] = useState(false)

  const testResetPassword = async () => {
    setLoading(true)
    setResult(null)

    try {
      const startTime = Date.now()

      const response = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/redefinir-senha`
      })

      const endTime = Date.now()
      const duration = endTime - startTime

      setResult({
        success: !response.error,
        error: response.error,
        data: response.data,
        duration: `${duration}ms`,
        timestamp: new Date().toISOString(),
        config: {
          email,
          redirectTo: `${window.location.origin}/redefinir-senha`,
          supabaseUrl: import.meta.env.VITE_SUPABASE_URL
        }
      })
    } catch (err: any) {
      setResult({
        success: false,
        error: err,
        caught: true,
        message: err.message,
        stack: err.stack
      })
    } finally {
      setLoading(false)
    }
  }

  const testAuthConnection = async () => {
    setLoading(true)
    try {
      const { data, error } = await supabase.auth.getSession()
      setResult({
        type: 'connection_test',
        success: !error,
        data,
        error
      })
    } catch (err: any) {
      setResult({
        type: 'connection_test',
        success: false,
        error: err.message
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-100 p-8">
      <div className="max-w-4xl mx-auto">
        <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
          <h1 className="text-2xl font-bold mb-4 text-gray-900">
            Diagnóstico de Recuperação de Senha
          </h1>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                E-mail para Teste
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="email@exemplo.com"
              />
            </div>

            <div className="flex gap-4">
              <button
                onClick={testResetPassword}
                disabled={loading}
                className="flex-1 bg-blue-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {loading ? 'Testando...' : 'Testar Reset Password'}
              </button>

              <button
                onClick={testAuthConnection}
                disabled={loading}
                className="flex-1 bg-green-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {loading ? 'Testando...' : 'Testar Conexão Auth'}
              </button>
            </div>
          </div>
        </div>

        {result && (
          <div className="bg-white rounded-lg shadow-lg p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-gray-900">Resultado</h2>
              <span className={`px-3 py-1 rounded-full text-sm font-semibold ${
                result.success
                  ? 'bg-green-100 text-green-800'
                  : 'bg-red-100 text-red-800'
              }`}>
                {result.success ? 'SUCESSO' : 'ERRO'}
              </span>
            </div>

            <div className="space-y-4">
              {result.error && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                  <h3 className="font-semibold text-red-900 mb-2">Erro Detectado:</h3>
                  <div className="space-y-2 text-sm">
                    <div>
                      <span className="font-medium text-red-800">Mensagem:</span>
                      <p className="text-red-700 mt-1 font-mono">
                        {result.error.message || JSON.stringify(result.error)}
                      </p>
                    </div>
                    {result.error.status && (
                      <div>
                        <span className="font-medium text-red-800">Status HTTP:</span>
                        <p className="text-red-700 mt-1">{result.error.status}</p>
                      </div>
                    )}
                    {result.error.__isAuthError && (
                      <div>
                        <span className="font-medium text-red-800">Tipo:</span>
                        <p className="text-red-700 mt-1">Auth Error</p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              <div className="bg-gray-50 rounded-lg p-4">
                <h3 className="font-semibold text-gray-900 mb-2">Detalhes Completos:</h3>
                <pre className="text-xs bg-gray-900 text-green-400 p-4 rounded overflow-auto max-h-96 font-mono">
                  {JSON.stringify(result, null, 2)}
                </pre>
              </div>

              {result.config && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <h3 className="font-semibold text-blue-900 mb-2">Configuração:</h3>
                  <div className="space-y-1 text-sm text-blue-800">
                    <div><span className="font-medium">E-mail:</span> {result.config.email}</div>
                    <div><span className="font-medium">Redirect URL:</span> {result.config.redirectTo}</div>
                    <div><span className="font-medium">Supabase URL:</span> {result.config.supabaseUrl}</div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        <div className="mt-6 bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <h3 className="font-semibold text-yellow-900 mb-2">Checklist de Verificação:</h3>
          <ul className="space-y-2 text-sm text-yellow-800">
            <li>✓ SMTP configurado no Supabase (Resend)</li>
            <li>✓ Redirect URLs configuradas no Dashboard</li>
            <li>✓ E-mail de teste existe no banco ({email})</li>
            <li>? Verificar Console do navegador (F12) para mais detalhes</li>
            <li>? Verificar se o rate limit (60s) foi respeitado</li>
          </ul>
        </div>
      </div>
    </div>
  )
}

export default TestEmailPage
