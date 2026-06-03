import React, { useEffect, useRef, useState, useCallback } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import { Camera, ArrowLeft, AlertCircle, Loader } from 'lucide-react'
import { useOMR } from '../hooks/useOMR'
import { OMRResultModal } from '../components/modals/OMRResultModal'

interface TokenData {
  token: string
  student_id: string
  student_name: string
  assessment_id: string
  assessment_name: string
  class_name: string
}

const MobileGradingPage: React.FC = () => {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const token = searchParams.get('token')

  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [stage, setStage] = useState<'idle' | 'camera' | 'preview' | 'processing'>('idle')
  const [preview, setPreview] = useState<string | null>(null)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [tokenData, setTokenData] = useState<TokenData | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isCameraActive, setIsCameraActive] = useState(false)

  const { loading, result, scanAnswerSheet, convertBubblesToAnswers, validateQRToken } = useOMR()
  const [showResultModal, setShowResultModal] = useState(false)

  // Validar token ao carregar página
  useEffect(() => {
    if (!token) {
      setError('Token não fornecido')
      return
    }

    const validateToken = async () => {
      try {
        const validation = await validateQRToken(token)
        if (validation.valid && validation.data) {
          setTokenData({
            token,
            student_id: validation.data.student_id,
            student_name: validation.data.student_name || 'Aluno',
            assessment_id: validation.data.assessment_id,
            assessment_name: validation.data.assessment_name || 'Avaliação',
            class_name: validation.data.class_name || 'Turma',
          })
        } else {
          setError(validation.error || 'Token inválido')
        }
      } catch (err) {
        setError('Erro ao validar token')
        console.error(err)
      }
    }

    validateToken()
  }, [token, validateQRToken])

  // Inicia câmera
  const startCamera = useCallback(async () => {
    try {
      setError(null)

      // Verifica se a API está disponível
      if (!navigator.mediaDevices?.getUserMedia) {
        console.warn('getUserMedia não disponível, usando fallback para file input')
        fileInputRef.current?.click()
        return
      }

      // Tenta com constraints simples primeiro (melhor compatibilidade iOS)
      const constraints = {
        video: {
          facingMode: 'environment'
        },
        audio: false
      }

      console.log('Solicitando acesso à câmera...')
      const stream = await navigator.mediaDevices.getUserMedia(constraints)
      console.log('Stream obtido com sucesso')

      if (videoRef.current) {
        videoRef.current.srcObject = stream
        videoRef.current.onloadedmetadata = () => {
          videoRef.current?.play().catch(err => {
            console.error('Erro ao reproduzir video:', err)
          })
        }
        setIsCameraActive(true)
        setStage('camera')
      }
    } catch (err) {
      console.error('Camera error:', err)

      let errorMsg = 'Não foi possível acessar a câmera'
      let showFileInput = false

      if (err instanceof DOMException) {
        switch (err.name) {
          case 'NotAllowedError':
            errorMsg = 'Permissão negada. Use o botão abaixo para escolher uma foto.'
            showFileInput = true
            break
          case 'NotFoundError':
            errorMsg = 'Câmera não encontrada. Use o botão abaixo para escolher uma foto.'
            showFileInput = true
            break
          case 'NotReadableError':
            errorMsg = 'Câmera ocupada. Feche outros apps e tente novamente.'
            showFileInput = true
            break
          case 'SecurityError':
            errorMsg = 'HTTPS obrigatório para acessar câmera.'
            break
          default:
            errorMsg = `Erro: ${err.message}`
            showFileInput = true
        }
      }

      setError(errorMsg)

      // Se falhou, abre o seletor de arquivo como fallback
      if (showFileInput) {
        setTimeout(() => {
          fileInputRef.current?.click()
        }, 500)
      }

      setStage('idle')
    }
  }, [])

  // Para câmera
  const stopCamera = () => {
    if (videoRef.current?.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream
      stream.getTracks().forEach((track) => track.stop())
      setIsCameraActive(false)
    }
  }

  // Captura foto
  const capturePhoto = () => {
    if (videoRef.current && canvasRef.current) {
      const ctx = canvasRef.current.getContext('2d')
      if (ctx) {
        canvasRef.current.width = videoRef.current.videoWidth
        canvasRef.current.height = videoRef.current.videoHeight
        ctx.drawImage(videoRef.current, 0, 0)
        canvasRef.current.toBlob((blob) => {
          if (blob) {
            const file = new File([blob], 'gabarito.jpg', { type: 'image/jpeg' })
            processFile(file)
          }
        }, 'image/jpeg', 0.95)
      }
    }
  }

  // Processa arquivo
  const processFile = async (file: File) => {
    stopCamera()
    setSelectedFile(file)
    const reader = new FileReader()
    reader.onload = (e) => {
      setPreview(e.target?.result as string)
      setStage('preview')
    }
    reader.readAsDataURL(file)
  }

  // Handler para upload de arquivo
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      processFile(file)
    }
  }

  // Processa com OMR
  const handleProcessWithOMR = async () => {
    if (!selectedFile) return

    console.log('Iniciando processamento OMR...')
    setStage('processing')
    setError(null)

    try {
      const omrResult = await scanAnswerSheet(selectedFile, false)

      console.log('Resultado OMR:', omrResult)

      if (!omrResult || !omrResult.success) {
        setError('Falha ao processar gabarito. Tente novamente.')
        setStage('preview')
        return
      }

      // Se chegou aqui, mostra o modal
      console.log('Mostrando modal de resultado')
      setShowResultModal(true)
    } catch (err) {
      console.error('Erro durante processamento:', err)
      setError('Erro ao processar gabarito. Tente novamente.')
      setStage('preview')
    }
  }

  // Volta ao estado inicial
  const handleReset = () => {
    setStage('idle')
    setPreview(null)
    setSelectedFile(null)
    setError(null)
  }

  // Salvar e redirecionar para dashboard
  const handleSaveAndGrade = async (answers: Record<number, string>) => {
    if (!tokenData) return

    // Navega para dashboard com respostas detectadas
    navigate('/dashboard', {
      state: {
        view: 'grading',
        token: token,
        detectedAnswers: answers,
        studentId: tokenData.student_id,
      },
    })
  }

  // Erro na validação do token
  if (error && !tokenData) {
    return (
      <div className="min-h-screen bg-gray-950 flex flex-col items-center justify-center p-4">
        <div className="bg-gray-800 rounded-xl p-6 border border-red-500 max-w-sm text-center space-y-4">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto" />
          <h1 className="text-white font-semibold text-lg">Erro</h1>
          <p className="text-gray-300">{error}</p>
          <button
            onClick={() => navigate('/scan')}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded-lg transition"
          >
            Voltar para Leitura de QR
          </button>
        </div>
      </div>
    )
  }

  // Carregando
  if (!tokenData) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <Loader className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-950 flex flex-col">
      {/* Header */}
      <header className="bg-gray-900 border-b border-gray-800 px-4 py-3 flex items-center justify-between sticky top-0">
        <button
          onClick={() => navigate('/scan')}
          className="flex items-center text-gray-400 hover:text-white transition"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div className="text-center">
          <h1 className="text-white font-semibold text-sm">{tokenData.student_name}</h1>
          <p className="text-gray-400 text-xs">{tokenData.assessment_name}</p>
        </div>
        <div className="w-5" />
      </header>

      {/* Conteúdo */}
      <div className="flex-1 flex flex-col items-center justify-center px-4 py-8 space-y-6">
        {/* Stage: Idle - Instruções */}
        {stage === 'idle' && (
          <div className="w-full max-w-md space-y-6">
            <div className="text-center space-y-2">
              <h2 className="text-white text-2xl font-bold">Fotografar Gabarito</h2>
              <p className="text-gray-400 text-sm">
                Tire uma foto clara do gabarito preenchido com os marcadores fiduciais visíveis
              </p>
            </div>

            {error && (
              <div className="bg-red-900/30 border border-red-600 rounded-lg p-3 flex gap-2">
                <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-red-300 text-sm font-medium">Erro</p>
                  <p className="text-red-300/80 text-xs">{error}</p>
                </div>
              </div>
            )}

            <button
              onClick={startCamera}
              className="w-full bg-gradient-to-br from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 active:from-blue-800 active:to-blue-900 rounded-2xl p-8 flex flex-col items-center gap-4 border border-blue-500 transition shadow-lg hover:shadow-xl touch-manipulation"
            >
              <Camera className="w-24 h-24 text-white drop-shadow-lg" />
              <div className="text-center">
                <span className="text-white font-bold text-lg block">Abrir Câmera</span>
                <span className="text-blue-100 text-xs block mt-1">Toque e tire a foto do gabarito</span>
              </div>
            </button>

            <div className="space-y-3">
              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-gray-700" />
                </div>
                <div className="relative flex justify-center">
                  <span className="px-2 bg-gray-950 text-gray-500 text-sm">ou</span>
                </div>
              </div>

              <button
                onClick={() => fileInputRef.current?.click()}
                className="w-full bg-gray-800 hover:bg-gray-700 active:bg-gray-900 text-gray-300 py-3 px-4 rounded-lg transition border border-gray-700 font-medium touch-manipulation"
              >
                Escolher Arquivo da Galeria
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                capture="environment"
                onChange={handleFileChange}
                className="hidden"
              />
            </div>
          </div>
        )}

        {/* Stage: Camera - Video ao vivo */}
        {stage === 'camera' && (
          <div className="w-full max-w-md space-y-4">
            <div className="space-y-2">
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                controls={false}
                className="w-full rounded-xl bg-black border-2 border-green-500 aspect-video object-cover"
                style={{
                  WebkitPlaysinline: 'true'
                } as React.CSSProperties}
              />
              <p className="text-center text-gray-400 text-sm">
                Posicione o gabarito com os marcadores fiduciais visíveis
              </p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={capturePhoto}
                className="flex-1 bg-green-600 hover:bg-green-700 active:scale-95 text-white py-3 px-4 rounded-lg font-medium transition"
              >
                Capturar Foto
              </button>
              <button
                onClick={() => {
                  stopCamera()
                  handleReset()
                }}
                className="flex-1 bg-gray-800 hover:bg-gray-700 active:scale-95 text-gray-300 py-3 px-4 rounded-lg transition"
              >
                Cancelar
              </button>
            </div>
          </div>
        )}

        {/* Stage: Preview - Revisar imagem */}
        {stage === 'preview' && preview && (
          <div className="w-full max-w-md space-y-4">
            <div className="space-y-2">
              <p className="text-gray-400 text-sm font-medium">Foto capturada:</p>
              <img src={preview} alt="Preview" className="w-full rounded-xl border-2 border-gray-700" />
            </div>

            {loading && (
              <div className="bg-blue-900/30 border border-blue-500 rounded-lg p-4 flex items-center gap-3">
                <Loader className="w-5 h-5 animate-spin text-blue-500" />
                <span className="text-blue-300 font-medium text-sm">Processando imagem...</span>
              </div>
            )}

            {!loading && (
              <div className="space-y-2">
                <button
                  onClick={handleProcessWithOMR}
                  className="w-full bg-blue-600 hover:bg-blue-700 active:scale-95 text-white py-3 px-4 rounded-lg font-medium transition"
                >
                  Processar Gabarito
                </button>
                <button
                  onClick={() => {
                    handleReset()
                    startCamera()
                  }}
                  className="w-full bg-gray-800 hover:bg-gray-700 active:scale-95 text-gray-300 py-3 px-4 rounded-lg transition"
                >
                  Tirar Outra Foto
                </button>
              </div>
            )}

            {error && (
              <div className="bg-red-900/30 border border-red-600 rounded-lg p-3 flex gap-2">
                <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0" />
                <p className="text-red-300 text-sm">{error}</p>
              </div>
            )}
          </div>
        )}

        {/* Stage: Processing - Aguardando resultado */}
        {stage === 'processing' && (
          <div className="text-center space-y-4">
            <Loader className="w-12 h-12 animate-spin text-blue-600 mx-auto" />
            <p className="text-gray-300 font-medium">Processando gabarito...</p>
          </div>
        )}
      </div>

      {/* Modal de Resultado */}
      {showResultModal && result && (
        <OMRResultModal
          result={result}
          tokenData={tokenData}
          onSave={handleSaveAndGrade}
          onCancel={() => {
            setShowResultModal(false)
            handleReset()
          }}
        />
      )}

      {/* Canvas oculto */}
      <canvas ref={canvasRef} className="hidden" />
    </div>
  )
}

export default MobileGradingPage
