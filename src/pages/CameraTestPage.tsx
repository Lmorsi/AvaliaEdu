import React, { useRef, useState, useCallback } from 'react'
import { Camera, X } from 'lucide-react'

const CameraTestPage: React.FC = () => {
  const videoRef = useRef<HTMLVideoElement>(null)
  const [status, setStatus] = useState<string>('Pronto para testar')
  const [isStreaming, setIsStreaming] = useState(false)

  const startCamera = useCallback(async () => {
    try {
      setStatus('Solicitando câmera...')

      const constraints = {
        video: {
          facingMode: 'environment'
        },
        audio: false
      }

      const stream = await navigator.mediaDevices.getUserMedia(constraints)
      setStatus('Câmera aberta com sucesso!')
      setIsStreaming(true)

      if (videoRef.current) {
        videoRef.current.srcObject = stream
      }
    } catch (err) {
      console.error('Error:', err)
      setStatus(`Erro: ${err instanceof Error ? err.message : String(err)}`)
    }
  }, [])

  const stopCamera = () => {
    if (videoRef.current?.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream
      stream.getTracks().forEach(track => track.stop())
      setIsStreaming(false)
      setStatus('Câmera fechada')
    }
  }

  return (
    <div className="min-h-screen bg-gray-950 p-4 flex flex-col items-center justify-center">
      <div className="w-full max-w-md space-y-6">
        <h1 className="text-white text-2xl font-bold text-center">Teste de Câmera</h1>

        <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
          <p className="text-gray-300 text-center text-sm">{status}</p>
        </div>

        {isStreaming ? (
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className="w-full rounded-lg bg-black border-2 border-green-500"
          />
        ) : (
          <div className="w-full aspect-video bg-black rounded-lg border-2 border-gray-700 flex items-center justify-center">
            <Camera className="w-12 h-12 text-gray-600" />
          </div>
        )}

        <div className="space-y-2">
          {!isStreaming ? (
            <button
              onClick={startCamera}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3 px-4 rounded-lg font-medium transition"
            >
              Abrir Câmera
            </button>
          ) : (
            <button
              onClick={stopCamera}
              className="w-full bg-red-600 hover:bg-red-700 text-white py-3 px-4 rounded-lg font-medium transition flex items-center justify-center gap-2"
            >
              <X className="w-5 h-5" />
              Fechar
            </button>
          )}
        </div>

        <div className="bg-gray-800 rounded-lg p-3 text-gray-400 text-xs space-y-1">
          <p>Informações do Device:</p>
          <p>- HTTPS: {window.location.protocol === 'https:' ? 'Sim' : 'Não'}</p>
          <p>- getUserMedia: {navigator.mediaDevices?.getUserMedia ? 'Sim' : 'Não'}</p>
          <p>- User Agent: {navigator.userAgent.substring(0, 60)}...</p>
        </div>
      </div>
    </div>
  )
}

export default CameraTestPage
