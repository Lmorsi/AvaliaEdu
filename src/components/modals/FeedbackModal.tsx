import React, { useState } from 'react'
import { supabase } from '../../lib/supabase'

interface FeedbackModalProps {
  isOpen: boolean
  onClose: () => void
  userId: string | undefined
  userName: string
  userEmail: string
}

const FeedbackModal: React.FC<FeedbackModalProps> = ({ isOpen, onClose, userId, userName, userEmail }) => {
  const [formData, setFormData] = useState({
    name: userName || '',
    email: userEmail || '',
    message: ''
  })
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!formData.name || !formData.email || !formData.message) {
      alert('Por favor, preencha todos os campos.')
      return
    }

    if (!userId) {
      alert('Você precisa estar autenticado para enviar feedback.')
      return
    }

    setIsSubmitting(true)

    try {
      const { error } = await supabase
        .from('user_feedback')
        .insert([{
          user_id: userId,
          user_name: formData.name,
          user_email: formData.email,
          message: formData.message
        }])

      if (error) throw error

      alert('Mensagem enviada com sucesso! Obrigado pelo seu feedback.')
      setFormData({
        name: userName || '',
        email: userEmail || '',
        message: ''
      })
      onClose()
    } catch (error) {
      console.error('Erro ao enviar feedback:', error)
      alert('Erro ao enviar mensagem. Tente novamente.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleClose = () => {
    if (formData.message && !confirm('Deseja descartar a mensagem?')) {
      return
    }
    setFormData({
      name: userName || '',
      email: userEmail || '',
      message: ''
    })
    onClose()
  }

  if (!isOpen) return null

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) handleClose()
      }}
    >
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-gradient-to-r from-blue-600 to-blue-700 text-white p-4 md:p-6 rounded-t-lg z-10">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <i className="fas fa-comment-dots text-2xl"></i>
              <h2 className="text-xl md:text-2xl font-bold">Contate-nos</h2>
            </div>
            <button
              onClick={handleClose}
              className="text-white hover:text-gray-200 transition-colors p-2"
            >
              <i className="fas fa-times text-xl"></i>
            </button>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="p-4 md:p-6 space-y-4">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <p className="text-sm text-blue-800">
              <i className="fas fa-info-circle mr-2"></i>
              Envie sua mensagem, sugestão ou dúvida. Nossa equipe entrará em contato com você em breve.
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Nome Completo <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Digite seu nome"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              E-mail <span className="text-red-500">*</span>
            </label>
            <input
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="seu@email.com"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Mensagem <span className="text-red-500">*</span>
            </label>
            <textarea
              value={formData.message}
              onChange={(e) => setFormData({ ...formData, message: e.target.value })}
              rows={8}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
              placeholder="Digite sua mensagem, sugestão ou dúvida..."
              required
            />
            <p className="text-xs text-gray-500 mt-1">
              {formData.message.length} caracteres
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 pt-4">
            <button
              type="button"
              onClick={handleClose}
              className="flex-1 px-6 py-3 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors font-medium"
            >
              <i className="fas fa-times mr-2"></i>
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex-1 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? (
                <>
                  <i className="fas fa-spinner fa-spin mr-2"></i>
                  Enviando...
                </>
              ) : (
                <>
                  <i className="fas fa-paper-plane mr-2"></i>
                  Enviar Mensagem
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default FeedbackModal
