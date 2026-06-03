import React, { useState } from 'react'
import { AlertCircle, Check, X } from 'lucide-react'

const DebugPage: React.FC = () => {
  const [checks, setChecks] = useState({
    https: window.location.protocol === 'https:',
    getUserMedia: !!navigator.mediaDevices?.getUserMedia,
    supabaseUrl: !!import.meta.env.VITE_SUPABASE_URL,
    supabaseKey: !!import.meta.env.VITE_SUPABASE_ANON_KEY,
    omrService: 'Não testado',
  })

  const testOMRService = async () => {
    try {
      const urls = [
        'http://localhost:8000',
        'http://127.0.0.1:8000',
        import.meta.env.VITE_OMR_SERVICE_URL || '',
      ].filter(Boolean)

      const response = await fetch(`${urls[0]}/api/omr/health`, {
        method: 'GET',
      })
      setChecks(prev => ({ ...prev, omrService: response.ok ? 'Online' : 'Erro' }))
    } catch (err) {
      setChecks(prev => ({ ...prev, omrService: 'Offline' }))
    }
  }

  return (
    <div className="min-h-screen bg-gray-950 p-4">
      <div className="max-w-md mx-auto space-y-6">
        <h1 className="text-white text-2xl font-bold">Diagnóstico do Sistema</h1>

        <div className="space-y-3">
          <div className="bg-gray-800 rounded-lg p-4 border border-gray-700 space-y-3">
            <CheckItem label="HTTPS" value={checks.https} />
            <CheckItem label="getUserMedia" value={checks.getUserMedia} />
            <CheckItem label="Supabase URL" value={checks.supabaseUrl} />
            <CheckItem label="Supabase Key" value={checks.supabaseKey} />

            <button
              onClick={testOMRService}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded-lg transition text-sm"
            >
              Testar OMR Service
            </button>
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-400">OMR Service</span>
              <span
                className={`font-medium ${
                  checks.omrService === 'Online'
                    ? 'text-green-400'
                    : checks.omrService === 'Offline'
                      ? 'text-red-400'
                      : 'text-gray-400'
                }`}
              >
                {checks.omrService}
              </span>
            </div>
          </div>

          <div className="bg-blue-900/20 border border-blue-600 rounded-lg p-3 space-y-2">
            <p className="text-blue-300 text-sm font-medium">Próximos passos:</p>
            <ul className="text-blue-300/80 text-xs space-y-1">
              <li>1. Certifique-se de estar em HTTPS</li>
              <li>2. Permita acesso à câmera no navegador</li>
              <li>3. Teste com QR code: /s/test-token</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  )
}

function CheckItem({ label, value }: { label: string; value: boolean | string }) {
  const isSuccess = value === true || value === 'Online'
  const isWarning = value === 'Offline'

  return (
    <div className="flex items-center justify-between text-sm">
      <span className="text-gray-400">{label}</span>
      <div className="flex items-center gap-2">
        {isSuccess && <Check className="w-4 h-4 text-green-400" />}
        {!isSuccess && !isWarning && <X className="w-4 h-4 text-red-400" />}
        {isWarning && <AlertCircle className="w-4 h-4 text-yellow-400" />}
        <span
          className={`font-medium ${
            isSuccess ? 'text-green-400' : isWarning ? 'text-yellow-400' : 'text-red-400'
          }`}
        >
          {value === true ? 'OK' : value === false ? 'Não' : value}
        </span>
      </div>
    </div>
  )
}

export default DebugPage
