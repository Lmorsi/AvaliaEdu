import React, { useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'

// Public landing page for QR code deep links.
// URL format: /s/:token
// Camera reads QR → opens this URL → redirects to /mobile-grade?token=TOKEN
// If not logged in, goes to /login then returns here via redirect param.
const QRLandingPage: React.FC = () => {
  const { token } = useParams<{ token: string }>()
  const { user, loading } = useAuth()
  const navigate = useNavigate()

  useEffect(() => {
    if (loading) return
    if (!token) {
      navigate('/', { replace: true })
      return
    }

    if (user) {
      navigate(`/mobile-grade?token=${encodeURIComponent(token)}`, { replace: true })
    } else {
      navigate(`/login?redirect=${encodeURIComponent(`/s/${token}`)}`, { replace: true })
    }
  }, [loading, user, token, navigate])

  return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        <div className="w-12 h-12 rounded-full border-4 border-blue-600 border-t-transparent animate-spin" />
        <p className="text-gray-400 text-sm">Verificando cartão...</p>
      </div>
    </div>
  )
}

export default QRLandingPage
