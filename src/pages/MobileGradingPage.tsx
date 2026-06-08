import React, { useEffect, useRef, useState, useCallback } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import { Camera, ArrowLeft, AlertCircle, Loader, CheckCircle, ScanLine, Zap } from 'lucide-react'
import { useOMR, OMRResult } from '../hooks/useOMR'
import { useAuth } from '../contexts/AuthContext'
import { OMRResultModal } from '../components/modals/OMRResultModal'
import { supabase } from '../lib/supabase'

interface TokenData {
  token: string
  student_id: string
  student_name: string
  assessment_id: string
  assessment_name: string
  class_name: string
  class_id: string
  user_id: string
}

type BgScanState = 'idle' | 'scanning' | 'done' | 'error'

const MobileGradingPage: React.FC = () => {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const token = searchParams.get('token')
  const { user } = useAuth()

  const fileInputRef = useRef<HTMLInputElement>(null)
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  // Ref espelha tokenData para que handleSaveAndGrade nunca use closure desatualizado
  const tokenDataRef = useRef<TokenData | null>(null)
  // Promessa do scan em segundo plano — usada quando usuário clica antes do fim
  const bgScanPromiseRef = useRef<Promise<OMRResult> | null>(null)

  const [stage, setStage] = useState<'idle' | 'camera' | 'preview' | 'processing' | 'saved'>('idle')
  const [preview, setPreview] = useState<string | null>(null)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [tokenData, setTokenData] = useState<TokenData | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isCameraActive, setIsCameraActive] = useState(false)
  const [saving, setSaving] = useState(false)
  const [savedGradingId, setSavedGradingId] = useState<string | null>(null)
  const [autoIdentifyFromPhoto, setAutoIdentifyFromPhoto] = useState(false)
  const [showResultModal, setShowResultModal] = useState(false)

  // Estado do scan em segundo plano
  const [bgScanState, setBgScanState] = useState<BgScanState>('idle')
  const [bgScanResult, setBgScanResult] = useState<OMRResult | null>(null)

  const { validateQRToken, saveStudentOMRResult, scanAnswerSheetBackground } = useOMR()

  // Mantém ref sempre sincronizada com o estado
  useEffect(() => {
    tokenDataRef.current = tokenData
  }, [tokenData])

  // Valida token ao carregar página
  useEffect(() => {
    if (!token) {
      setError('Token não fornecido')
      return
    }

    const validateToken = async () => {
      try {
        const validation = await validateQRToken(token)
        if (validation.valid && validation.data) {
          const td: TokenData = {
            token,
            student_id: validation.data.student_id,
            student_name: validation.data.student_name || 'Aluno',
            assessment_id: validation.data.assessment_id,
            assessment_name: validation.data.assessment_name || 'Avaliação',
            class_name: validation.data.class_name || 'Turma',
            class_id: validation.data.class_id || '',
            user_id: validation.data.user_id || '',
          }
          setTokenData(td)
          tokenDataRef.current = td
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

  const stopCamera = () => {
    if (videoRef.current?.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream
      stream.getTracks().forEach((track) => track.stop())
      setIsCameraActive(false)
    }
  }

  const startCamera = useCallback(async () => {
    try {
      setError(null)
      if (!navigator.mediaDevices?.getUserMedia) {
        fileInputRef.current?.click()
        return
      }
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' },
        audio: false,
      })
      if (videoRef.current) {
        videoRef.current.srcObject = stream
        videoRef.current.onloadedmetadata = () => {
          videoRef.current?.play().catch(console.error)
        }
        setIsCameraActive(true)
        setStage('camera')
      }
    } catch (err) {
      let errorMsg = 'Não foi possível acessar a câmera'
      if (err instanceof DOMException) {
        switch (err.name) {
          case 'NotAllowedError':
            errorMsg = 'Permissão negada. Use o botão abaixo para escolher uma foto.'
            break
          case 'NotFoundError':
            errorMsg = 'Câmera não encontrada. Use o botão abaixo para escolher uma foto.'
            break
          case 'NotReadableError':
            errorMsg = 'Câmera ocupada. Feche outros apps e tente novamente.'
            break
          default:
            errorMsg = `Erro: ${(err as Error).message}`
        }
      }
      setError(errorMsg)
      setTimeout(() => fileInputRef.current?.click(), 500)
      setStage('idle')
    }
  }, [])

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

  // Inicia o scan em segundo plano e retorna a promessa
  const startBackgroundScan = useCallback((file: File) => {
    setBgScanState('scanning')
    setBgScanResult(null)
    const promise = scanAnswerSheetBackground(file).then((omrResult) => {
      setBgScanResult(omrResult)
      setBgScanState(omrResult.success ? 'done' : 'error')
      if (!omrResult.success) {
        setError(omrResult.error || 'Erro ao processar imagem.')
      }
      return omrResult
    })
    bgScanPromiseRef.current = promise
    return promise
  }, [scanAnswerSheetBackground])

  const processFile = (file: File) => {
    stopCamera()
    setSelectedFile(file)
    setError(null)
    setBgScanResult(null)
    setBgScanState('idle')
    bgScanPromiseRef.current = null

    const reader = new FileReader()
    reader.onload = (e) => {
      setPreview(e.target?.result as string)
      setStage('preview')
      // Inicia scan em segundo plano assim que preview é mostrado
      startBackgroundScan(file)
    }
    reader.readAsDataURL(file)
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) processFile(file)
    // Reseta o input para permitir reuso
    e.target.value = ''
  }

  const handleReset = () => {
    setStage('idle')
    setPreview(null)
    setSelectedFile(null)
    setError(null)
    setAutoIdentifyFromPhoto(false)
    setBgScanState('idle')
    setBgScanResult(null)
    bgScanPromiseRef.current = null
  }

  const handleProcessWithOMR = async () => {
    if (!selectedFile) return
    setError(null)

    // Se o scan em segundo plano ainda está rodando, mostra spinner e aguarda
    let omrResult: OMRResult
    if (bgScanResult !== null) {
      omrResult = bgScanResult
    } else {
      setStage('processing')
      try {
        if (bgScanPromiseRef.current) {
          omrResult = await bgScanPromiseRef.current
        } else {
          // Fallback: inicia scan agora se não foi iniciado (não deveria acontecer)
          omrResult = await scanAnswerSheetBackground(selectedFile)
        }
      } catch {
        setError('Erro ao processar imagem. Tente novamente.')
        setStage('preview')
        return
      }
    }

    if (!omrResult.success) {
      setError(omrResult.error || 'Erro ao processar imagem.')
      setStage('preview')
      return
    }

    // Ao escanear próximo aluno, identifica o estudante pelo QR da foto
    if (autoIdentifyFromPhoto) {
      const qrToken = omrResult.qr?.token
      if (!qrToken) {
        setError('QR Code do aluno não encontrado na imagem. Verifique se o gabarito tem o QR Code visível.')
        setStage('preview')
        return
      }

      const validation = await validateQRToken(qrToken)
      if (!validation.valid || !validation.data) {
        setError(validation.error || 'QR Code inválido ou expirado.')
        setStage('preview')
        return
      }

      // Atualiza identidade do aluno mantendo contexto da avaliação/turma
      const currentTokenData = tokenDataRef.current
      if (currentTokenData) {
        const newTokenData: TokenData = {
          ...currentTokenData,
          token: qrToken,
          student_id: validation.data.student_id,
          student_name: validation.data.student_name || 'Aluno',
        }
        // Atualiza ref imediatamente (sem esperar re-render) para evitar closure stale
        tokenDataRef.current = newTokenData
        setTokenData(newTokenData)
      }
    }

    setBgScanResult(omrResult)
    setShowResultModal(true)
    setStage('preview')
  }

  const handleScanNextStudent = useCallback(() => {
    setStage('idle')
    setPreview(null)
    setSelectedFile(null)
    setError(null)
    setAutoIdentifyFromPhoto(true)
    setBgScanState('idle')
    setBgScanResult(null)
    bgScanPromiseRef.current = null
    // Pequeno delay para garantir que os estados foram aplicados antes de abrir câmera
    setTimeout(() => fileInputRef.current?.click(), 50)
  }, [])

  const handleSaveAndGrade = async (answers: Record<number, string>) => {
    // Usa ref para garantir dados mais recentes independente do ciclo de render
    const currentTokenData = tokenDataRef.current
    if (!currentTokenData || !user) return

    setSaving(true)
    try {
      const { data: assessment } = await supabase
        .from('assessments')
        .select('*')
        .eq('id', currentTokenData.assessment_id)
        .maybeSingle()

      const answerKey: string[] = []
      const itemTypes: string[] = []
      const itemDescriptors: string[] = []
      const itemAlternatives: string[][] = []
      const itemGroups: number[][] = []
      let answerIndex = 0

      const selectedItems = assessment?.selected_items || assessment?.selectedItems || []
      selectedItems.forEach((item: any) => {
        const tipoItem = item.tipo_item || item.tipoItem
        const descritor = item.descritor || ''

        if (tipoItem === 'multipla_escolha') {
          const correta = item.resposta_correta || item.respostaCorreta || ''
          const alternativas = (item.alternativas || [])
            .filter((a: string) => a && a.trim())
            .map((_: string, idx: number) => String.fromCharCode(65 + idx))

          answerKey.push(correta)
          itemTypes.push('multipla_escolha')
          itemDescriptors.push(descritor)
          itemAlternatives.push(alternativas)
          itemGroups.push([answerIndex])
          answerIndex++
        } else if (tipoItem === 'verdadeiro_falso') {
          const afirmativas = [
            ...(item.afirmativas || []),
            ...(item.afirmativas_extras || item.afirmativasExtras || []),
          ].filter((a: string) => a && a.trim())

          const gabaritos = [
            ...(item.gabarito_afirmativas || item.gabaritoAfirmativas || []),
            ...(item.gabarito_afirmativas_extras || item.gabaritoAfirmativasExtras || []),
          ].filter((_: string, idx: number) => afirmativas[idx] && afirmativas[idx].trim())

          const groupIndices: number[] = []
          gabaritos.forEach((gabarito: string) => {
            answerKey.push(gabarito)
            itemTypes.push('verdadeiro_falso')
            itemDescriptors.push(descritor)
            itemAlternatives.push(['V', 'F'])
            groupIndices.push(answerIndex)
            answerIndex++
          })
          itemGroups.push(groupIndices)
        }
      })

      const saveResult = await saveStudentOMRResult({
        userId: user.id!,
        studentId: currentTokenData.student_id,
        assessmentId: currentTokenData.assessment_id,
        classId: currentTokenData.class_id,
        assessmentName: currentTokenData.assessment_name,
        answers,
        answerKey,
        itemTypes,
        itemDescriptors,
        itemAlternatives,
        itemGroups,
        selectedItems,
      })

      if (!saveResult.success) {
        setError(`Erro ao salvar: ${saveResult.error}`)
        return
      }

      setSavedGradingId(saveResult.gradingId || null)
      setShowResultModal(false)
      setStage('saved')
    } finally {
      setSaving(false)
    }
  }

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
      <header className="bg-gray-900 border-b border-gray-800 px-4 py-3 flex items-center justify-between sticky top-0 z-10">
        <button
          onClick={() => navigate('/scan')}
          className="flex items-center text-gray-400 hover:text-white transition"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div className="text-center">
          <h1 className="text-white font-semibold text-sm">
            {autoIdentifyFromPhoto && stage !== 'saved' ? 'Identificando aluno...' : tokenData.student_name}
          </h1>
          <p className="text-gray-400 text-xs">{tokenData.assessment_name} · {tokenData.class_name}</p>
        </div>
        <div className="w-5" />
      </header>

      <div className="flex-1 flex flex-col items-center justify-center px-4 py-8 space-y-6">

        {/* Stage: Idle */}
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
              onClick={() => fileInputRef.current?.click()}
              className="w-full bg-gradient-to-br from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 active:from-blue-800 active:to-blue-900 rounded-2xl p-8 flex flex-col items-center gap-4 border border-blue-500 transition shadow-lg hover:shadow-xl touch-manipulation"
            >
              <Camera className="w-24 h-24 text-white drop-shadow-lg" />
              <div className="text-center">
                <span className="text-white font-bold text-lg block">Abrir Câmera</span>
                <span className="text-blue-100 text-xs block mt-1">Toque e tire a foto do gabarito</span>
              </div>
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
        )}

        {/* Stage: Camera */}
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
                style={{ WebkitPlaysinline: 'true' } as React.CSSProperties}
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
                onClick={() => { stopCamera(); handleReset() }}
                className="flex-1 bg-gray-800 hover:bg-gray-700 active:scale-95 text-gray-300 py-3 px-4 rounded-lg transition"
              >
                Cancelar
              </button>
            </div>
          </div>
        )}

        {/* Stage: Preview */}
        {stage === 'preview' && preview && (
          <div className="w-full max-w-md space-y-4">
            <div className="space-y-2">
              <p className="text-gray-400 text-sm font-medium">Foto capturada:</p>
              <img src={preview} alt="Preview" className="w-full rounded-xl border-2 border-gray-700" />
            </div>

            {/* Indicador de processamento em segundo plano */}
            {bgScanState === 'scanning' && (
              <div className="bg-blue-900/30 border border-blue-700 rounded-lg p-3 flex items-center gap-3">
                <Loader className="w-4 h-4 animate-spin text-blue-400 flex-shrink-0" />
                <div className="flex-1">
                  <p className="text-blue-300 text-sm font-medium">Analisando gabarito...</p>
                  <p className="text-blue-400/70 text-xs">O resultado estará pronto em instantes</p>
                </div>
              </div>
            )}

            {bgScanState === 'done' && (
              <div className="bg-green-900/20 border border-green-700 rounded-lg p-3 flex items-center gap-3">
                <Zap className="w-4 h-4 text-green-400 flex-shrink-0" />
                <p className="text-green-300 text-sm font-medium">Análise concluída — resultado pronto!</p>
              </div>
            )}

            {!showResultModal && (
              <div className="space-y-2">
                <button
                  onClick={handleProcessWithOMR}
                  disabled={bgScanState === 'idle'}
                  className={`w-full text-white py-3 px-4 rounded-lg font-medium transition flex items-center justify-center gap-2 ${
                    bgScanState === 'done'
                      ? 'bg-green-600 hover:bg-green-700 active:scale-95'
                      : 'bg-blue-600 hover:bg-blue-700 active:scale-95'
                  }`}
                >
                  {bgScanState === 'scanning' && <Loader className="w-4 h-4 animate-spin" />}
                  {bgScanState === 'done' ? 'Ver Resultado' : 'Processar Gabarito'}
                </button>
                <button
                  onClick={() => { handleReset(); startCamera() }}
                  className="w-full bg-gray-800 hover:bg-gray-700 active:scale-95 text-gray-300 py-3 px-4 rounded-lg transition"
                >
                  Tirar Outra Foto
                </button>
              </div>
            )}

            {error && !showResultModal && (
              <div className="bg-red-900/30 border border-red-600 rounded-lg p-3 flex gap-2">
                <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0" />
                <div>
                  <p className="text-red-300 text-sm">{error}</p>
                  <button
                    onClick={() => { handleReset() }}
                    className="text-red-400 text-xs underline mt-1"
                  >
                    Tirar outra foto
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Stage: Processing (aguardando scan que ainda estava em andamento) */}
        {stage === 'processing' && (
          <div className="text-center space-y-4">
            <Loader className="w-12 h-12 animate-spin text-blue-600 mx-auto" />
            <p className="text-gray-300 font-medium">Processando gabarito...</p>
            <p className="text-gray-500 text-sm">Isso pode levar até 1 minuto.<br />Aguarde sem fechar a tela.</p>
          </div>
        )}

        {/* Stage: Saved */}
        {stage === 'saved' && (
          <div className="w-full max-w-md space-y-6 text-center">
            <div className="flex flex-col items-center gap-4">
              <div className="w-20 h-20 rounded-full bg-green-900/40 border-2 border-green-500 flex items-center justify-center">
                <CheckCircle className="w-10 h-10 text-green-400" />
              </div>
              <div>
                <h2 className="text-white text-2xl font-bold">Gabarito Salvo!</h2>
                <p className="text-gray-400 text-sm mt-1">
                  Respostas de <span className="text-white font-medium">{tokenData.student_name}</span> registradas com sucesso.
                </p>
              </div>
            </div>

            <div className="bg-gray-800 rounded-xl p-4 border border-gray-700 text-left space-y-2">
              <p className="text-gray-400 text-xs font-medium uppercase tracking-wider">Detalhes</p>
              <div className="space-y-1">
                <p className="text-gray-300 text-sm"><span className="text-gray-500">Avaliação:</span> {tokenData.assessment_name}</p>
                <p className="text-gray-300 text-sm"><span className="text-gray-500">Turma:</span> {tokenData.class_name}</p>
                <p className="text-gray-300 text-sm"><span className="text-gray-500">Aluno:</span> {tokenData.student_name}</p>
              </div>
            </div>

            <button
              onClick={handleScanNextStudent}
              className="w-full bg-blue-600 hover:bg-blue-700 active:scale-95 text-white py-3 px-4 rounded-xl font-bold transition flex items-center justify-center gap-2"
            >
              <ScanLine className="w-5 h-5" />
              Escanear Próximo Aluno
            </button>
          </div>
        )}
      </div>

      {/* Modal de Resultado */}
      {showResultModal && bgScanResult && (
        <OMRResultModal
          result={bgScanResult}
          tokenData={tokenData}
          saving={saving}
          onSave={handleSaveAndGrade}
          onCancel={() => {
            setShowResultModal(false)
            handleReset()
          }}
        />
      )}

      <canvas ref={canvasRef} className="hidden" />
    </div>
  )
}

export default MobileGradingPage
