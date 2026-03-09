import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import { Shield, Mail, Calendar, CheckCircle2, Circle, Filter, Search, Trash2 } from 'lucide-react'

interface Feedback {
  id: string
  user_id: string
  user_name: string
  user_email: string
  message: string
  is_read: boolean
  created_at: string
}

const AdminPage: React.FC = () => {
  const { isAdmin, loading: authLoading } = useAuth()
  const navigate = useNavigate()
  const [feedbacks, setFeedbacks] = useState<Feedback[]>([])
  const [filteredFeedbacks, setFilteredFeedbacks] = useState<Feedback[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<'all' | 'read' | 'unread'>('all')
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedFeedback, setSelectedFeedback] = useState<Feedback | null>(null)

  useEffect(() => {
    if (!authLoading && !isAdmin) {
      navigate('/dashboard')
    }
  }, [isAdmin, authLoading, navigate])

  useEffect(() => {
    fetchFeedbacks()
  }, [])

  useEffect(() => {
    let filtered = feedbacks

    if (filter === 'read') {
      filtered = filtered.filter(f => f.is_read)
    } else if (filter === 'unread') {
      filtered = filtered.filter(f => !f.is_read)
    }

    if (searchTerm) {
      filtered = filtered.filter(f =>
        f.user_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        f.user_email.toLowerCase().includes(searchTerm.toLowerCase()) ||
        f.message.toLowerCase().includes(searchTerm.toLowerCase())
      )
    }

    setFilteredFeedbacks(filtered)
  }, [feedbacks, filter, searchTerm])

  const fetchFeedbacks = async () => {
    try {
      const { data, error } = await supabase
        .from('user_feedback')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) throw error
      setFeedbacks(data || [])
    } catch (error) {
      console.error('Error fetching feedbacks:', error)
    } finally {
      setLoading(false)
    }
  }

  const toggleReadStatus = async (feedback: Feedback) => {
    try {
      const { error } = await supabase
        .from('user_feedback')
        .update({ is_read: !feedback.is_read })
        .eq('id', feedback.id)

      if (error) throw error

      setFeedbacks(prev => prev.map(f =>
        f.id === feedback.id ? { ...f, is_read: !f.is_read } : f
      ))
    } catch (error) {
      console.error('Error updating feedback:', error)
    }
  }

  const deleteFeedback = async (feedbackId: string) => {
    if (!confirm('Tem certeza que deseja excluir esta mensagem?')) return

    try {
      const { error } = await supabase
        .from('user_feedback')
        .delete()
        .eq('id', feedbackId)

      if (error) throw error

      setFeedbacks(prev => prev.filter(f => f.id !== feedbackId))
      setSelectedFeedback(null)
    } catch (error) {
      console.error('Error deleting feedback:', error)
    }
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const unreadCount = feedbacks.filter(f => !f.is_read).length

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 flex items-center justify-center">
        <div className="text-gray-500">Carregando...</div>
      </div>
    )
  }

  if (!isAdmin) {
    return null
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <Shield className="w-8 h-8 text-blue-600" />
            <h1 className="text-3xl font-bold text-gray-900">Painel Administrativo</h1>
          </div>
          <p className="text-gray-600">Gerencie mensagens de feedback dos usuários</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
          <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 mb-1">Total de Mensagens</p>
                <p className="text-3xl font-bold text-gray-900">{feedbacks.length}</p>
              </div>
              <Mail className="w-12 h-12 text-blue-500 opacity-20" />
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 mb-1">Não Lidas</p>
                <p className="text-3xl font-bold text-orange-600">{unreadCount}</p>
              </div>
              <Circle className="w-12 h-12 text-orange-500 opacity-20" />
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 mb-1">Lidas</p>
                <p className="text-3xl font-bold text-green-600">{feedbacks.length - unreadCount}</p>
              </div>
              <CheckCircle2 className="w-12 h-12 text-green-500 opacity-20" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-100">
          <div className="p-6 border-b border-gray-100">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  placeholder="Buscar por nome, email ou mensagem..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setFilter('all')}
                  className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                    filter === 'all'
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  Todas
                </button>
                <button
                  onClick={() => setFilter('unread')}
                  className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                    filter === 'unread'
                      ? 'bg-orange-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  Não Lidas
                </button>
                <button
                  onClick={() => setFilter('read')}
                  className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                    filter === 'read'
                      ? 'bg-green-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  Lidas
                </button>
              </div>
            </div>
          </div>

          <div className="divide-y divide-gray-100">
            {filteredFeedbacks.length === 0 ? (
              <div className="p-12 text-center text-gray-500">
                <Mail className="w-16 h-16 mx-auto mb-4 opacity-20" />
                <p>Nenhuma mensagem encontrada</p>
              </div>
            ) : (
              filteredFeedbacks.map((feedback) => (
                <div
                  key={feedback.id}
                  className={`p-6 hover:bg-gray-50 transition-colors cursor-pointer ${
                    !feedback.is_read ? 'bg-blue-50' : ''
                  }`}
                  onClick={() => setSelectedFeedback(feedback)}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="font-semibold text-gray-900">{feedback.user_name}</h3>
                        {!feedback.is_read && (
                          <span className="px-2 py-1 bg-orange-100 text-orange-700 text-xs font-medium rounded-full">
                            Nova
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-gray-600 mb-2">{feedback.user_email}</p>
                      <p className="text-gray-700 line-clamp-2">{feedback.message}</p>
                      <div className="flex items-center gap-2 mt-3 text-sm text-gray-500">
                        <Calendar className="w-4 h-4" />
                        <span>{formatDate(feedback.created_at)}</span>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          toggleReadStatus(feedback)
                        }}
                        className={`p-2 rounded-lg transition-colors ${
                          feedback.is_read
                            ? 'bg-gray-100 hover:bg-gray-200 text-gray-600'
                            : 'bg-green-100 hover:bg-green-200 text-green-600'
                        }`}
                        title={feedback.is_read ? 'Marcar como não lida' : 'Marcar como lida'}
                      >
                        {feedback.is_read ? <Circle className="w-5 h-5" /> : <CheckCircle2 className="w-5 h-5" />}
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          deleteFeedback(feedback.id)
                        }}
                        className="p-2 bg-red-100 hover:bg-red-200 text-red-600 rounded-lg transition-colors"
                        title="Excluir mensagem"
                      >
                        <Trash2 className="w-5 h-5" />
                      </button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {selectedFeedback && (
        <div
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
          onClick={() => setSelectedFeedback(null)}
        >
          <div
            className="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[80vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-6 border-b border-gray-100">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-2xl font-bold text-gray-900">Detalhes da Mensagem</h2>
                <button
                  onClick={() => setSelectedFeedback(null)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  ✕
                </button>
              </div>
              <div className="space-y-2">
                <div>
                  <span className="text-sm text-gray-600">Nome:</span>
                  <p className="font-medium text-gray-900">{selectedFeedback.user_name}</p>
                </div>
                <div>
                  <span className="text-sm text-gray-600">Email:</span>
                  <p className="font-medium text-gray-900">{selectedFeedback.user_email}</p>
                </div>
                <div>
                  <span className="text-sm text-gray-600">Data:</span>
                  <p className="font-medium text-gray-900">{formatDate(selectedFeedback.created_at)}</p>
                </div>
              </div>
            </div>
            <div className="p-6">
              <h3 className="text-sm text-gray-600 mb-2">Mensagem:</h3>
              <p className="text-gray-900 whitespace-pre-wrap">{selectedFeedback.message}</p>
            </div>
            <div className="p-6 border-t border-gray-100 flex gap-3">
              <button
                onClick={() => {
                  toggleReadStatus(selectedFeedback)
                  setSelectedFeedback(prev => prev ? { ...prev, is_read: !prev.is_read } : null)
                }}
                className={`flex-1 px-4 py-2 rounded-lg font-medium transition-colors ${
                  selectedFeedback.is_read
                    ? 'bg-gray-100 hover:bg-gray-200 text-gray-700'
                    : 'bg-green-600 hover:bg-green-700 text-white'
                }`}
              >
                {selectedFeedback.is_read ? 'Marcar como Não Lida' : 'Marcar como Lida'}
              </button>
              <button
                onClick={() => deleteFeedback(selectedFeedback.id)}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium transition-colors"
              >
                Excluir
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default AdminPage
