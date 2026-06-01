import { useState, useRef, useEffect } from 'react'
import { Camera, Upload, Loader, CheckCircle, AlertCircle, X } from 'lucide-react'
import { useOMR } from '../hooks/useOMR'

interface AnswerSheetUploadProps {
  onSuccess?: (answers: Record<number, string>) => void
  onTokenValidated?: (data: any) => void
}

export const AnswerSheetUpload = ({ onSuccess, onTokenValidated }: AnswerSheetUploadProps) => {
  const [mode, setMode] = useState<'upload' | 'camera' | null>(null)
  const [preview, setPreview] = useState<string | null>(null)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [isCameraActive, setIsCameraActive] = useState(false)

  const { loading, error, result, scanAnswerSheet, convertBubblesToAnswers, validateQRToken } =
    useOMR()

  // Inicia câmera
  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } },
      })
      if (videoRef.current) {
        videoRef.current.srcObject = stream
        setIsCameraActive(true)
      }
    } catch (err) {
      console.error('Camera error:', err)
      alert('Não foi possível acessar a câmera')
    }
  }

  // Para câmera
  const stopCamera = () => {
    if (videoRef.current?.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream
      stream.getTracks().forEach((track) => track.stop())
      setIsCameraActive(false)
    }
  }

  // Captura foto da câmera
  const capturePhoto = () => {
    if (videoRef.current && canvasRef.current) {
      const ctx = canvasRef.current.getContext('2d')
      if (ctx) {
        canvasRef.current.width = videoRef.current.videoWidth
        canvasRef.current.height = videoRef.current.videoHeight
        ctx.drawImage(videoRef.current, 0, 0)
        canvasRef.current.toBlob((blob) => {
          if (blob) {
            const file = new File([blob], 'answer_sheet.jpg', { type: 'image/jpeg' })
            handleFileSelected(file)
          }
        }, 'image/jpeg', 0.95)
      }
    }
  }

  // Processa arquivo selecionado
  const handleFileSelected = async (file: File) => {
    setSelectedFile(file)
    const reader = new FileReader()
    reader.onload = (e) => {
      setPreview(e.target?.result as string)
    }
    reader.readAsDataURL(file)
    setMode(null)
    stopCamera()
  }

  // Processa upload de arquivo
  const handleUploadChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      handleFileSelected(file)
    }
  }

  // Processa imagem com OMR
  const handleProcessImage = async () => {
    if (!selectedFile) return

    const omrResult = await scanAnswerSheet(selectedFile, false)
    if (!omrResult) return

    // Valida token QR
    if (omrResult.qr?.token) {
      const validation = await validateQRToken(omrResult.qr.token)
      if (validation.valid && onTokenValidated) {
        onTokenValidated(validation.data)
      }
    }

    // Converte bolhas em respostas
    const answers = convertBubblesToAnswers(omrResult)
    if (onSuccess) {
      onSuccess(answers)
    }
  }

  // Limpa e volta ao estado inicial
  const handleClear = () => {
    setPreview(null)
    setSelectedFile(null)
    setMode(null)
    setResult(null)
  }

  return (
    <div className="w-full max-w-2xl mx-auto p-4 space-y-4">
      <div className="bg-white rounded-lg border border-gray-200">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-100">
          <h2 className="text-lg font-semibold text-gray-900">Escanear Folha de Respostas</h2>
          <p className="text-sm text-gray-600 mt-1">
            Tire uma foto ou carregue a imagem da folha preenchida
          </p>
        </div>

        {/* Conteúdo */}
        <div className="p-6 space-y-4">
          {/* Modo de Captura - Seleção */}
          {!mode && !preview && (
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => setMode('camera')}
                className="p-4 border border-gray-300 rounded-lg hover:bg-gray-50 transition flex flex-col items-center gap-2 text-center"
              >
                <Camera className="w-6 h-6 text-blue-600" />
                <span className="font-medium text-sm">Usar Câmera</span>
              </button>
              <button
                onClick={() => fileInputRef.current?.click()}
                className="p-4 border border-gray-300 rounded-lg hover:bg-gray-50 transition flex flex-col items-center gap-2 text-center"
              >
                <Upload className="w-6 h-6 text-blue-600" />
                <span className="font-medium text-sm">Carregar Arquivo</span>
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleUploadChange}
                className="hidden"
              />
            </div>
          )}

          {/* Câmera */}
          {mode === 'camera' && (
            <div className="space-y-3">
              <video
                ref={videoRef}
                autoPlay
                playsInline
                className="w-full rounded-lg bg-black"
                onLoadedMetadata={startCamera}
              />
              <div className="flex gap-2">
                <button
                  onClick={capturePhoto}
                  className="flex-1 bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 transition font-medium"
                >
                  Capturar Foto
                </button>
                <button
                  onClick={() => {
                    setMode(null)
                    stopCamera()
                  }}
                  className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition"
                >
                  Cancelar
                </button>
              </div>
            </div>
          )}

          {/* Preview da Imagem */}
          {preview && (
            <div className="space-y-3">
              <div className="relative">
                <img src={preview} alt="Preview" className="w-full rounded-lg border border-gray-200" />
                {loading && (
                  <div className="absolute inset-0 bg-black/40 rounded-lg flex items-center justify-center">
                    <div className="bg-white px-4 py-2 rounded-lg flex items-center gap-2">
                      <Loader className="w-4 h-4 animate-spin" />
                      <span className="text-sm font-medium">Processando...</span>
                    </div>
                  </div>
                )}
              </div>

              {/* Status do Processamento */}
              {error && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-3 flex gap-2">
                  <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="font-medium text-red-900 text-sm">Erro ao processar</p>
                    <p className="text-red-700 text-sm">{error}</p>
                  </div>
                </div>
              )}

              {result?.success && (
                <div className="bg-green-50 border border-green-200 rounded-lg p-3 flex gap-2">
                  <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="font-medium text-green-900 text-sm">Folha processada com sucesso</p>
                    {result.bubbles?.found && (
                      <p className="text-green-700 text-sm">
                        {result.bubbles.grids.length} questões detectadas
                      </p>
                    )}
                  </div>
                </div>
              )}

              {/* Botões de Ação */}
              <div className="flex gap-2">
                <button
                  onClick={handleProcessImage}
                  disabled={loading}
                  className="flex-1 bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 disabled:bg-gray-400 transition font-medium flex items-center justify-center gap-2"
                >
                  {loading ? (
                    <>
                      <Loader className="w-4 h-4 animate-spin" />
                      Processando...
                    </>
                  ) : (
                    'Processar com OMR'
                  )}
                </button>
                <button
                  onClick={handleClear}
                  disabled={loading}
                  className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:bg-gray-100 transition"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* Debug Image (opcional) */}
          {result?.debug_image && (
            <details className="border border-gray-200 rounded-lg p-3">
              <summary className="cursor-pointer font-medium text-sm text-gray-700">
                Ver imagem de debug
              </summary>
              <img
                src={`data:image/png;base64,${result.debug_image}`}
                alt="Debug"
                className="w-full mt-3 rounded border border-gray-200"
              />
            </details>
          )}
        </div>
      </div>

      {/* Canvas oculto para captura de câmera */}
      <canvas ref={canvasRef} className="hidden" />
    </div>
  )
}
