import React, { useRef, useEffect, useState } from 'react'
import { X, Camera, RotateCw } from 'lucide-react'
import jsQR from 'jsqr'

interface CameraCaptureProps {
  onCapture: (file: File) => void
  onClose: () => void
}

export default function CameraCapture({ onCapture, onClose }: CameraCaptureProps) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const animationFrameRef = useRef<number>()

  const [isReady, setIsReady] = useState(false)
  const [qrDetected, setQrDetected] = useState(false)
  const [alignmentScore, setAlignmentScore] = useState(0)
  const [countdown, setCountdown] = useState<number | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [facingMode, setFacingMode] = useState<'environment' | 'user'>('environment')

  useEffect(() => {
    startCamera()
    return () => {
      stopCamera()
    }
  }, [facingMode])

  useEffect(() => {
    if (countdown !== null && countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000)
      return () => clearTimeout(timer)
    } else if (countdown === 0) {
      capturePhoto()
    }
  }, [countdown])

  const startCamera = async () => {
    try {
      setError(null)
      setIsReady(false)

      const constraints = {
        video: {
          facingMode,
          width: { ideal: 1920 },
          height: { ideal: 1080 },
          aspectRatio: { ideal: 16/9 }
        }
      }

      const stream = await navigator.mediaDevices.getUserMedia(constraints)
      streamRef.current = stream

      if (videoRef.current) {
        videoRef.current.srcObject = stream
        videoRef.current.onloadedmetadata = () => {
          videoRef.current?.play()
          setIsReady(true)
          startDetection()
        }
      }
    } catch (err) {
      console.error('Erro ao acessar câmera:', err)
      setError('Não foi possível acessar a câmera. Verifique as permissões.')
    }
  }

  const stopCamera = () => {
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current)
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop())
    }
  }

  const startDetection = () => {
    const detect = () => {
      if (!videoRef.current || !canvasRef.current || !isReady) {
        animationFrameRef.current = requestAnimationFrame(detect)
        return
      }

      const video = videoRef.current
      const canvas = canvasRef.current
      const ctx = canvas.getContext('2d')

      if (!ctx || video.readyState !== video.HAVE_ENOUGH_DATA) {
        animationFrameRef.current = requestAnimationFrame(detect)
        return
      }

      canvas.width = video.videoWidth
      canvas.height = video.videoHeight

      ctx.drawImage(video, 0, 0, canvas.width, canvas.height)
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)

      // Detectar QR Code
      const qrCode = jsQR(imageData.data, imageData.width, imageData.height)

      if (qrCode) {
        setQrDetected(true)

        // Calcular score de alinhamento baseado na posição do QR code
        const qrCenterX = (qrCode.location.topLeftCorner.x + qrCode.location.bottomRightCorner.x) / 2
        const qrCenterY = (qrCode.location.topLeftCorner.y + qrCode.location.bottomRightCorner.y) / 2
        const centerX = canvas.width / 2
        const centerY = canvas.height / 2

        // Calcular distância do centro
        const distanceX = Math.abs(qrCenterX - centerX) / centerX
        const distanceY = Math.abs(qrCenterY - centerY) / centerY

        // Calcular tamanho do QR code
        const qrWidth = qrCode.location.bottomRightCorner.x - qrCode.location.topLeftCorner.x
        const qrHeight = qrCode.location.bottomRightCorner.y - qrCode.location.topLeftCorner.y
        const qrSize = Math.max(qrWidth, qrHeight)
        const idealSize = canvas.width * 0.2 // QR code deve ocupar ~20% da largura
        const sizeScore = 1 - Math.abs(qrSize - idealSize) / idealSize

        // Score final (0-100)
        const alignScore = Math.max(0, Math.min(100,
          (1 - (distanceX + distanceY) / 2) * 0.6 * 100 +
          sizeScore * 0.4 * 100
        ))

        setAlignmentScore(Math.round(alignScore))

        // Auto-captura quando bem alinhado
        if (alignScore >= 80 && countdown === null) {
          setCountdown(3)
        } else if (alignScore < 70 && countdown !== null) {
          setCountdown(null)
        }
      } else {
        setQrDetected(false)
        setAlignmentScore(0)
        if (countdown !== null && countdown > 0) {
          setCountdown(null)
        }
      }

      animationFrameRef.current = requestAnimationFrame(detect)
    }

    detect()
  }

  const capturePhoto = () => {
    if (!videoRef.current || !canvasRef.current) return

    const canvas = canvasRef.current
    const video = videoRef.current

    canvas.width = video.videoWidth
    canvas.height = video.videoHeight

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    ctx.save()
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height)
    ctx.restore()

    canvas.toBlob((blob) => {
      if (blob) {
        const file = new File([blob], `assessment-${Date.now()}.jpg`, { type: 'image/jpeg' })
        onCapture(file)
        stopCamera()
        onClose()
      }
    }, 'image/jpeg', 0.95)
  }

  const toggleCamera = () => {
    setFacingMode(prev => prev === 'environment' ? 'user' : 'environment')
  }

  return (
    <div className="fixed inset-0 bg-black z-50 flex flex-col">
      {/* Header */}
      <div className="absolute top-0 left-0 right-0 z-10 bg-gradient-to-b from-black/70 to-transparent p-4">
        <div className="flex items-center justify-between text-white">
          <button
            onClick={() => {
              stopCamera()
              onClose()
            }}
            className="p-2 hover:bg-white/20 rounded-full transition-colors"
          >
            <X size={24} />
          </button>

          <button
            onClick={toggleCamera}
            className="p-2 hover:bg-white/20 rounded-full transition-colors"
          >
            <RotateCw size={24} />
          </button>
        </div>
      </div>

      {/* Video Container - Forçar orientação horizontal */}
      <div className="flex-1 relative flex items-center justify-center bg-black">
        <div className="relative w-full h-full max-w-6xl">
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className="w-full h-full object-contain"
          />
          <canvas ref={canvasRef} className="hidden" />

          {/* Guias de enquadramento */}
          <div className="absolute inset-0 pointer-events-none">
            {/* Frame de enquadramento */}
            <div className="absolute inset-8 md:inset-16">
              {/* Cantos */}
              <div className="absolute top-0 left-0 w-16 h-16 border-t-4 border-l-4 border-white rounded-tl-lg" />
              <div className="absolute top-0 right-0 w-16 h-16 border-t-4 border-r-4 border-white rounded-tr-lg" />
              <div className="absolute bottom-0 left-0 w-16 h-16 border-b-4 border-l-4 border-white rounded-bl-lg" />
              <div className="absolute bottom-0 right-0 w-16 h-16 border-b-4 border-r-4 border-white rounded-br-lg" />

              {/* Linhas de grade */}
              <div className="absolute top-1/3 left-0 right-0 h-px bg-white/30" />
              <div className="absolute top-2/3 left-0 right-0 h-px bg-white/30" />
              <div className="absolute left-1/3 top-0 bottom-0 w-px bg-white/30" />
              <div className="absolute left-2/3 top-0 bottom-0 w-px bg-white/30" />
            </div>

            {/* Indicador de centralização */}
            <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2">
              <div className={`w-8 h-8 rounded-full border-4 transition-colors ${
                qrDetected ? 'border-green-500 bg-green-500/20' : 'border-white/50'
              }`} />
            </div>
          </div>
        </div>
      </div>

      {/* Bottom UI */}
      <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-6">
        <div className="max-w-6xl mx-auto">
          {/* Status e Score */}
          <div className="mb-6 text-center">
            {error ? (
              <div className="bg-red-500/90 text-white px-4 py-3 rounded-lg mb-4">
                {error}
              </div>
            ) : (
              <>
                {!qrDetected && (
                  <div className="text-white text-lg mb-2">
                    Posicione o cartão resposta no enquadramento
                  </div>
                )}

                {qrDetected && (
                  <div className="space-y-2">
                    <div className="text-white text-lg font-semibold">
                      QR Code Detectado!
                    </div>

                    {/* Barra de alinhamento */}
                    <div className="max-w-md mx-auto">
                      <div className="flex items-center gap-3 mb-1">
                        <span className="text-white text-sm">Alinhamento:</span>
                        <div className="flex-1 h-3 bg-white/20 rounded-full overflow-hidden">
                          <div
                            className={`h-full transition-all duration-300 ${
                              alignmentScore >= 80 ? 'bg-green-500' :
                              alignmentScore >= 60 ? 'bg-yellow-500' :
                              'bg-red-500'
                            }`}
                            style={{ width: `${alignmentScore}%` }}
                          />
                        </div>
                        <span className="text-white text-sm font-bold w-12">
                          {alignmentScore}%
                        </span>
                      </div>

                      <div className="text-white/80 text-sm">
                        {alignmentScore >= 80 && 'Perfeito! Capturando...'}
                        {alignmentScore >= 60 && alignmentScore < 80 && 'Ajuste um pouco mais'}
                        {alignmentScore < 60 && 'Centralize o cartão'}
                      </div>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>

          {/* Countdown */}
          {countdown !== null && countdown > 0 && (
            <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 pointer-events-none">
              <div className="text-white text-9xl font-bold animate-pulse">
                {countdown}
              </div>
            </div>
          )}

          {/* Botão de captura manual */}
          <div className="flex justify-center gap-4">
            <button
              onClick={capturePhoto}
              disabled={!isReady}
              className="bg-white hover:bg-gray-100 disabled:bg-gray-500 text-gray-900 rounded-full p-6 shadow-lg transition-all disabled:cursor-not-allowed"
            >
              <Camera size={32} />
            </button>
          </div>

          <div className="text-center text-white/60 text-sm mt-4">
            {isReady ? 'Toque para capturar manualmente' : 'Iniciando câmera...'}
          </div>
        </div>
      </div>

      {/* Instruções */}
      <div className="absolute top-20 left-0 right-0 text-center pointer-events-none">
        <div className="inline-block bg-black/70 text-white px-6 py-3 rounded-lg">
          <div className="text-sm font-semibold mb-1">
            Mantenha o dispositivo na horizontal
          </div>
          <div className="text-xs text-white/80">
            O QR Code deve estar visível e centralizado
          </div>
        </div>
      </div>
    </div>
  )
}
