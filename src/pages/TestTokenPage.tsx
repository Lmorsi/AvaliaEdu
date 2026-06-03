import React, { useState } from 'react'
import { Copy, Check, X } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'

const TestTokenPage: React.FC = () => {
  const { user } = useAuth()
  const [tokens, setTokens] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [copied, setCopied] = useState<string | null>(null)

  const generateTestToken = async () => {
    try {
      setLoading(true)
      setError(null)

      if (!user) {
        setError('Você precisa estar autenticado')
        return
      }

      // Buscar primeira avaliação
      const { data: assessments } = await supabase
        .from('assessments')
        .select('id, title')
        .limit(1)

      // Buscar primeiro aluno
      const { data: students } = await supabase
        .from('user_profiles')
        .select('id, full_name')
        .eq('role', 'student')
        .limit(1)

      if (!assessments?.[0] || !students?.[0]) {
        setError('Nenhuma avaliação ou aluno encontrado no banco')
        return
      }

      const assessment = assessments[0]
      const student = students[0]
      const token = `test-${Date.now()}-${Math.random().toString(36).substring(7)}`

      // Inserir token no banco
      const { error: insertError } = await supabase.from('assessment_tokens').insert({
        token,
        assessment_id: assessment.id,
        student_id: student.id,
        created_by: user.id,
        is_validated: false,
      })

      if (insertError) throw insertError

      // Gerar URL de teste
      const url = `${window.location.origin}/s/${token}`

      setTokens([
        {
          token,
          assessment: assessment.title,
          student: student.full_name,
          url,
        },
        ...tokens,
      ])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao criar token')
    } finally {
      setLoading(false)
    }
  }

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
    setCopied(text)
    setTimeout(() => setCopied(null), 2000)
  }

  return (
    <div className="min-h-screen bg-gray-950 p-4">
      <div className="max-w-2xl mx-auto space-y-6">
        <div>
          <h1 className="text-white text-3xl font-bold">Gerar Token de Teste</h1>
          <p className="text-gray-400 text-sm mt-2">Crie tokens QR para testar o fluxo completo</p>
        </div>

        <button
          onClick={generateTestToken}
          disabled={loading}
          className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-700 text-white py-3 px-4 rounded-lg font-medium transition"
        >
          {loading ? 'Gerando...' : 'Gerar Novo Token'}
        </button>

        {error && (
          <div className="bg-red-900/30 border border-red-600 rounded-lg p-4 flex gap-2">
            <X className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
            <p className="text-red-300">{error}</p>
          </div>
        )}

        {tokens.length > 0 && (
          <div className="space-y-3">
            <h2 className="text-white font-semibold">Tokens Gerados:</h2>
            {tokens.map((tokenData, idx) => (
              <div key={idx} className="bg-gray-800 rounded-lg p-4 border border-gray-700 space-y-3">
                <div className="space-y-1">
                  <p className="text-gray-400 text-xs">Avaliação</p>
                  <p className="text-white font-medium">{tokenData.assessment}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-gray-400 text-xs">Aluno</p>
                  <p className="text-white font-medium">{tokenData.student}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-gray-400 text-xs">URL de Teste</p>
                  <button
                    onClick={() => copyToClipboard(tokenData.url)}
                    className="w-full bg-gray-700 hover:bg-gray-600 text-gray-300 py-2 px-3 rounded flex items-center justify-between group transition"
                  >
                    <code className="text-xs truncate">{tokenData.url}</code>
                    {copied === tokenData.url ? (
                      <Check className="w-4 h-4 text-green-400 flex-shrink-0" />
                    ) : (
                      <Copy className="w-4 h-4 text-gray-400 group-hover:text-white flex-shrink-0" />
                    )}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

export default TestTokenPage
