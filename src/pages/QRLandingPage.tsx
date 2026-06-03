import { useEffect, useRef, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Camera, RotateCcw, CircleCheck as CheckCircle, CircleAlert as AlertCircle, Loader } from 'lucide-react';
import { useOMR } from '../hooks/useOMR';

type Stage = 'loading' | 'ready' | 'preview' | 'processing' | 'result' | 'saved' | 'error';

interface TokenInfo {
  studentName: string;
  assessmentName: string;
  className: string;
  studentId: string;
  assessmentId: string;
  tokenId: string;
}

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

export function QRLandingPage() {
  const { token } = useParams<{ token: string }>();
  const [stage, setStage] = useState<Stage>('loading');
  const [tokenInfo, setTokenInfo] = useState<TokenInfo | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [detectedAnswers, setDetectedAnswers] = useState<Record<string, string>>({});
  const [saveError, setSaveError] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const { loading: omrLoading, scanAnswerSheet, convertBubblesToAnswers } = useOMR();

  useEffect(() => {
    if (!token) {
      setErrorMsg('QR code inválido — token não encontrado.');
      setStage('error');
      return;
    }
    checkToken(token);
  }, [token]);

  const callEdge = async (fn: string, body: object) => {
    const res = await fetch(`${SUPABASE_URL}/functions/v1/${fn}`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });
    return res.json();
  };

  const checkToken = async (t: string) => {
    try {
      const data = await callEdge('validate-assessment-token', { token: t, action: 'check' });
      if (!data.valid) {
        setErrorMsg(data.message || 'Token inválido ou expirado.');
        setStage('error');
        return;
      }
      setTokenInfo({
        studentName: data.data?.student_name || 'Aluno',
        assessmentName: data.data?.assessment_name || 'Avaliação',
        className: data.data?.class_name || '',
        studentId: data.student_id || '',
        assessmentId: data.assessment_id || '',
        tokenId: data.token_id || '',
      });
      setStage('ready');
    } catch {
      setErrorMsg('Não foi possível verificar o QR code. Verifique sua conexão.');
      setStage('error');
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    // Reset input so o mesmo arquivo pode ser reselecionado
    e.target.value = '';
    setSelectedFile(file);
    const reader = new FileReader();
    reader.onload = (ev) => setPreview(ev.target?.result as string);
    reader.readAsDataURL(file);
    setStage('preview');
  };

  const openCamera = () => fileInputRef.current?.click();

  const processImage = async () => {
    if (!selectedFile) return;
    setStage('processing');
    try {
      const omrResult = await scanAnswerSheet(selectedFile);
      const answers = convertBubblesToAnswers(omrResult);
      setDetectedAnswers(answers);
      setStage('result');
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Erro ao processar';
      setSaveError(msg);
      setStage('preview');
    }
  };

  const retake = () => {
    setPreview(null);
    setSelectedFile(null);
    setSaveError(null);
    setStage('ready');
    // Abre câmera automaticamente
    setTimeout(() => fileInputRef.current?.click(), 100);
  };

  const saveAnswers = async () => {
    if (!tokenInfo || !token) return;
    setSaveError(null);
    try {
      const data = await callEdge('validate-assessment-token', {
        token,
        action: 'validate',
        answers: detectedAnswers,
        student_id: tokenInfo.studentId,
        assessment_id: tokenInfo.assessmentId,
      });
      if (!data.valid && !data.saved) {
        throw new Error(data.message || 'Erro ao salvar');
      }
      setStage('saved');
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : 'Erro ao salvar respostas');
    }
  };

  // ── Loading ────────────────────────────────────────────────────────────────
  if (stage === 'loading') {
    return (
      <div className="min-h-screen bg-white flex flex-col items-center justify-center gap-4">
        <Loader className="animate-spin text-blue-500" size={40} />
        <p className="text-gray-500 text-sm">Verificando QR code…</p>
      </div>
    );
  }

  // ── Error ─────────────────────────────────────────────────────────────────
  if (stage === 'error') {
    return (
      <div className="min-h-screen bg-white flex flex-col items-center justify-center gap-6 px-6">
        <AlertCircle className="text-red-500" size={56} />
        <div className="text-center">
          <p className="text-gray-800 font-medium text-lg">QR Code inválido</p>
          <p className="text-gray-500 text-sm mt-1">{errorMsg}</p>
        </div>
      </div>
    );
  }

  // ── Saved ─────────────────────────────────────────────────────────────────
  if (stage === 'saved') {
    return (
      <div className="min-h-screen bg-white flex flex-col items-center justify-center gap-6 px-6">
        <CheckCircle className="text-emerald-500" size={72} />
        <div className="text-center">
          <p className="text-gray-800 font-bold text-xl">Respostas salvas!</p>
          <p className="text-gray-500 text-sm mt-2">
            {tokenInfo?.assessmentName} · {tokenInfo?.studentName}
          </p>
        </div>
        <div className="mt-4 rounded-xl border border-gray-100 bg-gray-50 p-4 w-full max-w-xs">
          <p className="text-xs text-gray-400 uppercase tracking-wide mb-3 font-medium">
            Respostas registradas
          </p>
          <div className="grid grid-cols-5 gap-2">
            {Object.entries(detectedAnswers).map(([q, ans]) => (
              <div key={q} className="flex flex-col items-center">
                <span className="text-xs text-gray-400">{q}</span>
                <span className="text-sm font-bold text-emerald-600">{ans}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // ── Processing ────────────────────────────────────────────────────────────
  if (stage === 'processing') {
    return (
      <div className="min-h-screen bg-white flex flex-col items-center justify-center gap-6 px-6">
        <div className="relative">
          {preview && (
            <img
              src={preview}
              alt="Processando"
              className="w-64 h-80 object-cover rounded-2xl opacity-40"
            />
          )}
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3">
            <Loader className="animate-spin text-blue-500" size={40} />
            <p className="text-gray-700 font-medium text-sm bg-white/90 px-3 py-1 rounded-full">
              Lendo gabarito…
            </p>
          </div>
        </div>
      </div>
    );
  }

  // ── Preview ───────────────────────────────────────────────────────────────
  if (stage === 'preview' && preview) {
    return (
      <div className="min-h-screen bg-gray-900 flex flex-col">
        <div className="flex-1 relative">
          <img
            src={preview}
            alt="Foto do gabarito"
            className="w-full h-full object-contain"
            style={{ maxHeight: 'calc(100vh - 140px)' }}
          />
          {saveError && (
            <div className="absolute bottom-4 left-4 right-4 bg-red-500/90 text-white text-sm rounded-xl px-4 py-3 text-center">
              {saveError}
            </div>
          )}
        </div>
        <div className="bg-gray-900 px-6 pb-8 pt-4 flex gap-3">
          <button
            onClick={retake}
            className="flex-1 flex items-center justify-center gap-2 py-4 rounded-2xl bg-gray-700 text-white font-medium text-base"
          >
            <RotateCcw size={20} />
            Tirar novamente
          </button>
          <button
            onClick={processImage}
            disabled={omrLoading}
            className="flex-1 flex items-center justify-center gap-2 py-4 rounded-2xl bg-blue-500 text-white font-bold text-base disabled:opacity-60"
          >
            Processar
          </button>
        </div>
      </div>
    );
  }

  // ── Result ────────────────────────────────────────────────────────────────
  if (stage === 'result') {
    const answerEntries = Object.entries(detectedAnswers);
    return (
      <div className="min-h-screen bg-white flex flex-col">
        <div className="flex-1 overflow-y-auto px-6 pt-8 pb-4">
          <p className="text-xs text-gray-400 uppercase tracking-wide font-medium mb-1">
            {tokenInfo?.assessmentName}
          </p>
          <h1 className="text-xl font-bold text-gray-800 mb-1">{tokenInfo?.studentName}</h1>
          {tokenInfo?.className && (
            <p className="text-sm text-gray-500 mb-6">{tokenInfo.className}</p>
          )}

          {answerEntries.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 gap-4">
              <AlertCircle className="text-amber-400" size={48} />
              <p className="text-gray-600 font-medium text-center">
                Nenhuma resposta detectada.
              </p>
              <p className="text-gray-400 text-sm text-center">
                Certifique-se de que o gabarito está bem iluminado e que os marcadores de canto estão visíveis.
              </p>
            </div>
          ) : (
            <>
              <p className="text-sm text-gray-500 mb-4">
                {answerEntries.length} resposta{answerEntries.length !== 1 ? 's' : ''} detectada{answerEntries.length !== 1 ? 's' : ''}
              </p>
              <div className="grid grid-cols-4 gap-3">
                {answerEntries.map(([question, answer]) => (
                  <div
                    key={question}
                    className="flex flex-col items-center bg-gray-50 rounded-xl py-3 px-2"
                  >
                    <span className="text-xs text-gray-400 font-medium">Q{question}</span>
                    <span className="text-2xl font-bold text-blue-600 mt-1">{answer}</span>
                  </div>
                ))}
              </div>
            </>
          )}

          {saveError && (
            <div className="mt-4 bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl px-4 py-3">
              {saveError}
            </div>
          )}
        </div>

        <div className="px-6 pb-8 pt-2 flex flex-col gap-3 border-t border-gray-100">
          <button
            onClick={saveAnswers}
            disabled={answerEntries.length === 0}
            className="w-full py-4 rounded-2xl bg-emerald-500 text-white font-bold text-base disabled:opacity-40"
          >
            Confirmar e salvar
          </button>
          <button
            onClick={retake}
            className="w-full py-4 rounded-2xl bg-gray-100 text-gray-600 font-medium text-base flex items-center justify-center gap-2"
          >
            <RotateCcw size={18} />
            Tirar nova foto
          </button>
        </div>
      </div>
    );
  }

  // ── Ready (câmera) ────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-white flex flex-col items-center justify-between px-6 py-12">
      {/* Header */}
      <div className="text-center">
        <p className="text-xs font-bold tracking-widest text-blue-500 uppercase mb-1">AvaliaEdu</p>
        <h1 className="text-2xl font-bold text-gray-800">
          {tokenInfo?.assessmentName || 'Avaliação'}
        </h1>
        <p className="text-gray-500 text-sm mt-1">{tokenInfo?.studentName}</p>
        {tokenInfo?.className && (
          <p className="text-gray-400 text-xs mt-0.5">{tokenInfo.className}</p>
        )}
      </div>

      {/* Botão principal */}
      <div className="flex flex-col items-center gap-6">
        <button
          onClick={openCamera}
          className="w-36 h-36 rounded-full bg-blue-500 flex items-center justify-center shadow-2xl shadow-blue-200 active:scale-95 transition-transform"
          aria-label="Tirar foto do gabarito"
        >
          <Camera size={64} color="white" strokeWidth={1.5} />
        </button>
        <div className="text-center">
          <p className="text-gray-700 font-semibold text-lg">Fotografar gabarito</p>
          <p className="text-gray-400 text-sm mt-1">
            Aponte a câmera para o cartão-resposta preenchido
          </p>
        </div>
      </div>

      {/* Dica */}
      <p className="text-center text-xs text-gray-300 max-w-xs">
        Segure o celular paralelo ao gabarito · boa iluminação · inclua os 4 cantos
      </p>

      {/* Input oculto — abre câmera no mobile */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        onChange={handleFileChange}
        className="hidden"
      />
    </div>
  );
}
