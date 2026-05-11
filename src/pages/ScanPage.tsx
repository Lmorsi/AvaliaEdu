import React, { useEffect, useRef, useState, useCallback } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'

type ScanState = 'idle' | 'scanning' | 'loading' | 'success' | 'error'

interface ScannedData {
  token: string
  studentName: string
  assessmentName: string
  className: string
  alreadyGraded: boolean
}

declare const jsQR: any

const ScanPage: React.FC = () => {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const { user } = useAuth()
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const animFrameRef = useRef<number>(0)
  const lastScannedRef = useRef<string>('')

  const [scanState, setScanState] = useState<ScanState>('idle')
  const [scannedData, setScannedData] = useState<ScannedData | null>(null)
  const [errorMsg, setErrorMsg] = useState('')
  const [cameraReady, setCameraReady] = useState(false)
  const [jsQRLoaded, setJsQRLoaded] = useState(false)
  const [manualToken, setManualToken] = useState('')
  const [showManual, setShowManual] = useState(false)

  // Se vier com ?token= na URL (deep link do QR code), processar direto
  useEffect(() => {
    const urlToken = searchParams.get('token')
    if (urlToken && user) {
      processToken(urlToken)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user])

  // Carregar jsQR dinamicamente
  useEffect(() => {
    if (typeof jsQR !== 'undefined') {
      setJsQRLoaded(true)
      return
    }
    const script = document.createElement('script')
    script.src = 'https://cdn.jsdelivr.net/npm/jsqr@1.4.0/dist/jsQR.min.js'
    script.onload = () => setJsQRLoaded(true)
    script.onerror = () => setErrorMsg('Falha ao carregar biblioteca de QR code.')
    document.head.appendChild(script)
    return () => { document.head.removeChild(script) }
  }, [])

  const stopCamera = useCallback(() => {
    if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current)
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop())
      streamRef.current = null
    }
    setCameraReady(false)
  }, [])

  // Lookup by token string in assessment_tokens table
  const lookupByToken = useCallback(async (token: string): Promise<boolean> => {
    const { data: tokenRow, error: tokenErr } = await supabase
      .from('assessment_tokens')
      .select('*, grading_students(name), assessments(nome_avaliacao, tipo_avaliacao), classes(name)')
      .eq('token', token)
      .maybeSingle()

    if (tokenErr || !tokenRow) return false

    if (tokenRow.user_id !== user?.id) {
      setScanState('error')
      setErrorMsg('Este cartão pertence a outro professor.')
      return true
    }

    const { data: existingResult } = await supabase
      .from('student_results')
      .select('id')
      .eq('student_id', tokenRow.student_id)
      .maybeSingle()

    const assessmentName =
      tokenRow.assessments?.nome_avaliacao ||
      tokenRow.assessments?.tipo_avaliacao ||
      tokenRow.qr_code_data?.assessment_name ||
      'Avaliação'

    setScannedData({
      token,
      studentName: tokenRow.grading_students?.name || 'Aluno',
      assessmentName,
      className: tokenRow.classes?.name || tokenRow.qr_code_data?.class_name || 'Turma',
      alreadyGraded: !!existingResult,
    })
    setScanState('success')
    return true
  }, [user?.id])

  // Lookup by assessmentId + studentId for legacy QR codes (token: null)
  const lookupByIds = useCallback(async (assessmentId: string, studentId: string, fallbackName: string): Promise<boolean> => {
    // First try to find an existing token for this pair
    const { data: tokenRow } = await supabase
      .from('assessment_tokens')
      .select('token, user_id, grading_students(name), assessments(nome_avaliacao, tipo_avaliacao), classes(name), qr_code_data')
      .eq('assessment_id', assessmentId)
      .eq('student_id', studentId)
      .maybeSingle()

    if (tokenRow) {
      if (tokenRow.user_id !== user?.id) {
        setScanState('error')
        setErrorMsg('Este cartão pertence a outro professor.')
        return true
      }

      const { data: existingResult } = await supabase
        .from('student_results')
        .select('id')
        .eq('student_id', studentId)
        .maybeSingle()

      const assessmentName =
        tokenRow.assessments?.nome_avaliacao ||
        tokenRow.assessments?.tipo_avaliacao ||
        tokenRow.qr_code_data?.assessment_name ||
        'Avaliação'

      setScannedData({
        token: tokenRow.token,
        studentName: tokenRow.grading_students?.name || fallbackName || 'Aluno',
        assessmentName,
        className: tokenRow.classes?.name || tokenRow.qr_code_data?.class_name || 'Turma',
        alreadyGraded: !!existingResult,
      })
      setScanState('success')
      return true
    }

    // No token registered yet — show info from the JSON payload itself
    setScannedData({
      token: '',
      studentName: fallbackName || 'Aluno',
      assessmentName: 'Avaliação',
      className: 'Turma',
      alreadyGraded: false,
    })
    setScanState('error')
    setErrorMsg('Este cartão ainda não foi registrado no sistema. Gere as folhas pela plataforma para vincular os alunos.')
    return true
  }, [user?.id])

  const processToken = useCallback(async (rawValue: string) => {
    if (!rawValue || rawValue === lastScannedRef.current) return
    lastScannedRef.current = rawValue
    setScanState('loading')
    stopCamera()

    try {
      // Try JSON parse first (legacy format or old QR codes)
      try {
        const parsed = JSON.parse(rawValue)
        // New format: has a real token string
        if (parsed.token && typeof parsed.token === 'string') {
          await lookupByToken(parsed.token)
          return
        }
        // Legacy format: token is null but has assessmentId + studentId
        if (parsed.assessmentId && parsed.studentId) {
          await lookupByIds(parsed.assessmentId, parsed.studentId, parsed.nomeAvaliacao || '')
          return
        }
      } catch {
        // Not JSON — could be a plain token string or a URL
      }

      // Check if it's a deep-link URL: https://site.com/s/TOKEN
      const urlMatch = rawValue.match(/\/s\/([^/?#]+)/)
      if (urlMatch) {
        await lookupByToken(decodeURIComponent(urlMatch[1]))
        return
      }

      // Treat as plain token string
      const found = await lookupByToken(rawValue)
      if (!found) {
        setScanState('error')
        setErrorMsg('QR code não reconhecido ou token inválido. Verifique se o cartão pertence a esta plataforma.')
      }
    } catch (e) {
      setScanState('error')
      setErrorMsg('Erro ao validar o cartão. Tente novamente.')
    }
  }, [stopCamera, lookupByToken, lookupByIds])

  const startScanning = useCallback(() => {
    if (!cameraReady || !jsQRLoaded) return

    const tick = () => {
      const video = videoRef.current
      const canvas = canvasRef.current
      if (!video || !canvas || video.readyState !== video.HAVE_ENOUGH_DATA) {
        animFrameRef.current = requestAnimationFrame(tick)
        return
      }

      canvas.width = video.videoWidth
      canvas.height = video.videoHeight
      const ctx = canvas.getContext('2d')!
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height)
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)

      const code = jsQR(imageData.data, imageData.width, imageData.height, {
        inversionAttempts: 'dontInvert',
      })

      if (code?.data && code.data.length > 5) {
        processToken(code.data)
        return
      }

      animFrameRef.current = requestAnimationFrame(tick)
    }

    animFrameRef.current = requestAnimationFrame(tick)
  }, [cameraReady, jsQRLoaded, processToken])

  const openCamera = useCallback(async () => {
    setScanState('scanning')
    setScannedData(null)
    setErrorMsg('')
    lastScannedRef.current = ''

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } }
      })
      streamRef.current = stream
      if (videoRef.current) {
        videoRef.current.srcObject = stream
        videoRef.current.play()
      }
      setCameraReady(true)
    } catch (e: any) {
      setScanState('error')
      setErrorMsg(
        e.name === 'NotAllowedError'
          ? 'Permissão de câmera negada. Permita o acesso à câmera nas configurações do navegador.'
          : 'Não foi possível acessar a câmera. Verifique se outro app a está usando.'
      )
    }
  }, [])

  useEffect(() => {
    if (cameraReady && jsQRLoaded && scanState === 'scanning') {
      startScanning()
    }
  }, [cameraReady, jsQRLoaded, scanState, startScanning])

  useEffect(() => () => stopCamera(), [stopCamera])

  const handleGoToGrading = () => {
    stopCamera()
    navigate('/dashboard', { state: { view: 'grading', token: scannedData?.token } })
  }

  const handleReset = () => {
    setScanState('idle')
    setScannedData(null)
    setErrorMsg('')
    setManualToken('')
    lastScannedRef.current = ''
  }

  const handleManualSubmit = () => {
    if (manualToken.trim()) processToken(manualToken.trim())
  }

  return (
    <div className="min-h-screen bg-gray-950 flex flex-col">
      {/* Header */}
      <header className="bg-gray-900 border-b border-gray-800 px-4 py-3 flex items-center justify-between">
        <button
          onClick={() => { stopCamera(); navigate('/dashboard') }}
          className="flex items-center text-gray-400 hover:text-white transition-colors"
        >
          <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          <span className="text-sm">Voltar</span>
        </button>
        <h1 className="text-white font-semibold text-base">Escanear Cartão</h1>
        <button
          onClick={() => setShowManual(v => !v)}
          className="text-gray-400 hover:text-white transition-colors text-sm"
        >
          Manual
        </button>
      </header>

      <div className="flex-1 flex flex-col items-center justify-start px-4 py-6 gap-5">

        {/* Entrada manual */}
        {showManual && (
          <div className="w-full max-w-md bg-gray-800 rounded-xl p-4 border border-gray-700">
            <p className="text-gray-300 text-sm mb-3 font-medium">Inserir token manualmente</p>
            <div className="flex gap-2">
              <input
                type="text"
                value={manualToken}
                onChange={e => setManualToken(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleManualSubmit()}
                placeholder="Cole o token aqui..."
                className="flex-1 bg-gray-700 text-white text-sm px-3 py-2 rounded-lg border border-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500 placeholder-gray-500"
              />
              <button
                onClick={handleManualSubmit}
                disabled={!manualToken.trim()}
                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-40"
              >
                Validar
              </button>
            </div>
          </div>
        )}

        {/* Estado: idle */}
        {scanState === 'idle' && (
          <div className="w-full max-w-md flex flex-col items-center gap-6 mt-8">
            <div className="w-24 h-24 rounded-2xl bg-gray-800 border border-gray-700 flex items-center justify-center">
              <svg className="w-12 h-12 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                  d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8H3m-2 4h2M3 20h2m0-16h2m14 0h2M7 4V3m10 1V3M7 20v1m10-1v1" />
              </svg>
            </div>
            <div className="text-center">
              <h2 className="text-white text-xl font-semibold mb-2">Escanear QR Code</h2>
              <p className="text-gray-400 text-sm leading-relaxed max-w-xs">
                Aponte a câmera para o QR code impresso na folha de resposta do aluno para identificá-lo automaticamente.
              </p>
            </div>
            <button
              onClick={openCamera}
              className="w-full max-w-xs bg-blue-600 hover:bg-blue-700 active:scale-95 text-white py-4 px-6 rounded-xl font-semibold text-base transition-all shadow-lg shadow-blue-900/40"
            >
              <svg className="w-5 h-5 inline mr-2 -mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              Abrir Câmera
            </button>
          </div>
        )}

        {/* Estado: scanning */}
        {scanState === 'scanning' && (
          <div className="w-full max-w-md flex flex-col items-center gap-4">
            <div className="relative w-full aspect-square rounded-2xl overflow-hidden bg-black border border-gray-700">
              <video
                ref={videoRef}
                className="absolute inset-0 w-full h-full object-cover"
                playsInline
                muted
              />
              <canvas ref={canvasRef} className="hidden" />

              {/* Overlay de mira */}
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div className="relative w-56 h-56">
                  {/* Cantos */}
                  <div className="absolute top-0 left-0 w-8 h-8 border-t-3 border-l-3 border-blue-400 rounded-tl-lg" style={{ borderWidth: '3px 0 0 3px' }} />
                  <div className="absolute top-0 right-0 w-8 h-8 border-t-3 border-r-3 border-blue-400 rounded-tr-lg" style={{ borderWidth: '3px 3px 0 0' }} />
                  <div className="absolute bottom-0 left-0 w-8 h-8 border-b-3 border-l-3 border-blue-400 rounded-bl-lg" style={{ borderWidth: '0 0 3px 3px' }} />
                  <div className="absolute bottom-0 right-0 w-8 h-8 border-b-3 border-r-3 border-blue-400 rounded-br-lg" style={{ borderWidth: '0 3px 3px 0' }} />
                  {/* Linha de scan animada */}
                  <div className="absolute inset-x-2 top-0 h-0.5 bg-blue-400 opacity-80 animate-scan" />
                </div>
              </div>
            </div>

            <p className="text-gray-400 text-sm text-center">
              Centralize o QR code dentro da mira
            </p>

            <button
              onClick={() => { stopCamera(); setScanState('idle') }}
              className="text-gray-500 hover:text-gray-300 text-sm transition-colors"
            >
              Cancelar
            </button>
          </div>
        )}

        {/* Estado: loading */}
        {scanState === 'loading' && (
          <div className="flex flex-col items-center gap-4 mt-16">
            <div className="w-16 h-16 rounded-full border-4 border-blue-600 border-t-transparent animate-spin" />
            <p className="text-gray-300 text-sm">Validando token...</p>
          </div>
        )}

        {/* Estado: success */}
        {scanState === 'success' && scannedData && (
          <div className="w-full max-w-md flex flex-col gap-4 mt-4">
            <div className={`rounded-2xl border p-5 ${scannedData.alreadyGraded ? 'bg-amber-950/40 border-amber-700' : 'bg-green-950/40 border-green-700'}`}>
              <div className="flex items-center gap-3 mb-4">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center ${scannedData.alreadyGraded ? 'bg-amber-700' : 'bg-green-700'}`}>
                  {scannedData.alreadyGraded ? (
                    <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
                    </svg>
                  ) : (
                    <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  )}
                </div>
                <div>
                  <p className={`font-semibold ${scannedData.alreadyGraded ? 'text-amber-300' : 'text-green-300'}`}>
                    {scannedData.alreadyGraded ? 'Já corrigido anteriormente' : 'QR Code reconhecido!'}
                  </p>
                  <p className="text-gray-400 text-xs">Token válido</p>
                </div>
              </div>

              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-400">Aluno</span>
                  <span className="text-white font-medium">{scannedData.studentName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Avaliação</span>
                  <span className="text-white font-medium text-right max-w-[60%] truncate">{scannedData.assessmentName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Turma</span>
                  <span className="text-white font-medium">{scannedData.className}</span>
                </div>
              </div>
            </div>

            {scannedData.alreadyGraded && (
              <div className="bg-gray-800 border border-gray-700 rounded-xl p-3 text-xs text-gray-400">
                Este aluno ja possui resultado registrado. Você pode corrigir novamente, mas o resultado anterior sera substituído ao salvar.
              </div>
            )}

            <button
              onClick={handleGoToGrading}
              className="w-full bg-blue-600 hover:bg-blue-700 active:scale-95 text-white py-4 rounded-xl font-semibold transition-all shadow-lg shadow-blue-900/40"
            >
              Ir para Correção
            </button>

            <button
              onClick={handleReset}
              className="w-full bg-gray-800 hover:bg-gray-700 text-gray-300 py-3 rounded-xl text-sm font-medium transition-colors"
            >
              Escanear outro cartão
            </button>
          </div>
        )}

        {/* Estado: error */}
        {scanState === 'error' && (
          <div className="w-full max-w-md flex flex-col gap-4 mt-4">
            <div className="bg-red-950/40 border border-red-700 rounded-2xl p-5">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-full bg-red-700 flex items-center justify-center flex-shrink-0">
                  <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </div>
                <p className="text-red-300 font-semibold">Falha no escaneamento</p>
              </div>
              <p className="text-gray-300 text-sm leading-relaxed">{errorMsg}</p>
            </div>

            <button
              onClick={handleReset}
              className="w-full bg-gray-800 hover:bg-gray-700 text-gray-300 py-3 rounded-xl text-sm font-medium transition-colors"
            >
              Tentar novamente
            </button>
          </div>
        )}
      </div>

      <style>{`
        @keyframes scan {
          0% { transform: translateY(0); opacity: 1; }
          50% { transform: translateY(13rem); opacity: 0.6; }
          100% { transform: translateY(0); opacity: 1; }
        }
        .animate-scan { animation: scan 2s ease-in-out infinite; }
      `}</style>
    </div>
  )
}

export default ScanPage
