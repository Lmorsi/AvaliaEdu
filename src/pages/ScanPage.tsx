import { useState, useRef, useEffect } from 'react';
import { Camera, Upload, QrCode, CircleCheck as CheckCircle, CircleAlert as AlertCircle, Loader } from 'lucide-react';
import { supabase } from '../services/supabase';

type ScanStage = 'select' | 'camera' | 'preview' | 'scanning' | 'result' | 'confirm';

interface QRTokenData {
  token?: string;
  assessmentId?: string;
  studentId?: string;
  gabarito?: Array<{ numero: number; tipo: string; respostaCorreta?: string }>;
}

interface ScanResult {
  token: string | null;
  assessmentName: string;
  tipoAvaliacao: string;
  className: string;
  studentName: string;
  answers: Record<string, string>;
}

export function ScanPage() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [stage, setStage] = useState<ScanStage>('select');
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [capturedFile, setCapturedFile] = useState<File | null>(null);
  const [scanResult, setScanResult] = useState<ScanResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    return () => {
      if (stream) stream.getTracks().forEach(t => t.stop());
    };
  }, [stream]);

  const startCamera = async () => {
    setError(null);
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' },
      });
      if (videoRef.current) videoRef.current.srcObject = mediaStream;
      setStream(mediaStream);
      setStage('camera');
    } catch {
      setError('Nao foi possivel acessar a camera');
    }
  };

  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach(t => t.stop());
      setStream(null);
    }
  };

  const captureFromCamera = () => {
    if (!videoRef.current || !canvasRef.current) return;
    const ctx = canvasRef.current.getContext('2d');
    if (!ctx) return;
    canvasRef.current.width = videoRef.current.videoWidth;
    canvasRef.current.height = videoRef.current.videoHeight;
    ctx.drawImage(videoRef.current, 0, 0);
    const dataUrl = canvasRef.current.toDataURL('image/jpeg');
    setPreview(dataUrl);
    canvasRef.current.toBlob(blob => {
      if (blob) setCapturedFile(new File([blob], 'scan.jpg', { type: 'image/jpeg' }));
    });
    stopCamera();
    setStage('preview');
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setCapturedFile(file);
    const reader = new FileReader();
    reader.onload = ev => setPreview(ev.target?.result as string);
    reader.readAsDataURL(file);
    setStage('preview');
  };

  const processImage = async () => {
    if (!capturedFile) return;
    setStage('scanning');
    setError(null);

    try {
      const base64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
          const result = reader.result as string;
          resolve(result.split(',')[1]);
        };
        reader.onerror = reject;
        reader.readAsDataURL(capturedFile);
      });

      const apiUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/scan-omr`;
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ photo: base64, debug: false }),
      });

      if (!response.ok) throw new Error(`Erro HTTP ${response.status}`);

      const data = await response.json();
      let tokenData: QRTokenData = {};
      let assessmentName = '';
      let tipoAvaliacao = '';
      let className = '';

      if (data.qr?.raw) {
        try {
          tokenData = JSON.parse(data.qr.raw);
          if (tokenData.assessmentId) {
            const { data: assessmentRows } = await supabase
              .from('assessments')
              .select('nome_avaliacao, tipo_avaliacao')
              .eq('id', tokenData.assessmentId)
              .limit(1);

            if (assessmentRows && assessmentRows.length > 0) {
              assessmentName = (assessmentRows[0] as { nome_avaliacao: string; tipo_avaliacao: string }).nome_avaliacao || '';
              tipoAvaliacao = (assessmentRows[0] as { nome_avaliacao: string; tipo_avaliacao: string }).tipo_avaliacao || '';
            }

            const { data: classRows } = await supabase
              .from('classes')
              .select('name, classes(name)')
              .limit(1);

            if (classRows && classRows.length > 0) {
              className = (classRows[0] as { name: string }).name || '';
            }
          }
        } catch {
          tokenData = {};
        }
      }

      setScanResult({
        token: data.qr?.token || null,
        assessmentName,
        tipoAvaliacao,
        className,
        studentName: '',
        answers: data.answers || {},
      });

      setStage('result');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao processar imagem');
      setStage('preview');
    }
  };

  const confirmResults = async () => {
    if (!scanResult?.token) return;
    setStage('confirm');

    try {
      await supabase
        .from('assessment_tokens')
        .update({ is_validated: true, validation_timestamp: new Date().toISOString() })
        .eq('token', scanResult.token);
    } catch (err) {
      console.error('Error confirming:', err);
    }
  };

  const reset = () => {
    setStage('select');
    setPreview(null);
    setCapturedFile(null);
    setScanResult(null);
    setError(null);
  };

  return (
    <div style={{ minHeight: '100vh', background: '#f8fafc', fontFamily: 'system-ui, sans-serif' }}>
      <div style={{ background: '#fff', borderBottom: '1px solid #e2e8f0', padding: '1.5rem 2rem' }}>
        <div style={{ maxWidth: 800, margin: '0 auto', display: 'flex', alignItems: 'center', gap: 12 }}>
          <QrCode size={24} color="#2563eb" />
          <div>
            <h1 style={{ margin: 0, fontSize: 20, fontWeight: 700, color: '#1e293b' }}>Escanear Gabarito</h1>
            <p style={{ margin: 0, fontSize: 13, color: '#64748b' }}>Fotografe a folha de respostas para correcao automatica</p>
          </div>
        </div>
      </div>

      <div style={{ maxWidth: 800, margin: '0 auto', padding: '2rem' }}>
        {error && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 8, padding: '12px 16px', marginBottom: 16, color: '#dc2626', fontSize: 14 }}>
            <AlertCircle size={16} />
            {error}
          </div>
        )}

        {stage === 'select' && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <button
              onClick={startCamera}
              style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12, padding: '2rem', background: '#fff', border: '2px solid #e2e8f0', borderRadius: 12, cursor: 'pointer', transition: 'all 0.2s' }}
              onMouseEnter={e => (e.currentTarget.style.borderColor = '#2563eb')}
              onMouseLeave={e => (e.currentTarget.style.borderColor = '#e2e8f0')}
            >
              <Camera size={40} color="#2563eb" />
              <div>
                <div style={{ fontWeight: 600, color: '#1e293b', marginBottom: 4 }}>Usar Camera</div>
                <div style={{ fontSize: 13, color: '#64748b' }}>Tire uma foto do gabarito</div>
              </div>
            </button>
            <button
              onClick={() => fileInputRef.current?.click()}
              style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12, padding: '2rem', background: '#fff', border: '2px solid #e2e8f0', borderRadius: 12, cursor: 'pointer', transition: 'all 0.2s' }}
              onMouseEnter={e => (e.currentTarget.style.borderColor = '#2563eb')}
              onMouseLeave={e => (e.currentTarget.style.borderColor = '#e2e8f0')}
            >
              <Upload size={40} color="#2563eb" />
              <div>
                <div style={{ fontWeight: 600, color: '#1e293b', marginBottom: 4 }}>Carregar Arquivo</div>
                <div style={{ fontSize: 13, color: '#64748b' }}>Selecione uma imagem</div>
              </div>
            </button>
            <input ref={fileInputRef} type="file" accept="image/*" onChange={handleFileUpload} style={{ display: 'none' }} />
          </div>
        )}

        {stage === 'camera' && (
          <div style={{ background: '#000', borderRadius: 12, overflow: 'hidden' }}>
            <video ref={videoRef} autoPlay playsInline style={{ width: '100%', display: 'block', maxHeight: 500, objectFit: 'cover' }} />
            <div style={{ display: 'flex', gap: 12, padding: '1rem', justifyContent: 'center' }}>
              <button onClick={captureFromCamera} style={{ padding: '12px 32px', background: '#2563eb', color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer', fontWeight: 600 }}>
                Capturar
              </button>
              <button onClick={() => { stopCamera(); setStage('select'); }} style={{ padding: '12px 24px', background: '#475569', color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer', fontWeight: 600 }}>
                Cancelar
              </button>
            </div>
          </div>
        )}

        {stage === 'preview' && preview && (
          <div>
            <img src={preview} alt="Preview" style={{ width: '100%', borderRadius: 12, marginBottom: 16 }} />
            <div style={{ display: 'flex', gap: 12 }}>
              <button onClick={processImage} style={{ flex: 1, padding: '12px', background: '#2563eb', color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer', fontWeight: 600 }}>
                Processar Gabarito
              </button>
              <button onClick={reset} style={{ padding: '12px 24px', background: '#fff', color: '#475569', border: '1px solid #e2e8f0', borderRadius: 8, cursor: 'pointer', fontWeight: 600 }}>
                Cancelar
              </button>
            </div>
          </div>
        )}

        {stage === 'scanning' && (
          <div style={{ textAlign: 'center', padding: '4rem', background: '#fff', borderRadius: 12, boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
            <Loader size={48} color="#2563eb" style={{ animation: 'spin 1s linear infinite', marginBottom: 16 }} />
            <p style={{ fontSize: 16, fontWeight: 600, color: '#1e293b', margin: 0 }}>Processando imagem...</p>
            <p style={{ fontSize: 14, color: '#64748b', margin: '8px 0 0' }}>Aguarde enquanto analisamos o gabarito</p>
          </div>
        )}

        {stage === 'result' && scanResult && (
          <div style={{ background: '#fff', borderRadius: 12, padding: '2rem', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 20 }}>
              <CheckCircle size={20} color="#16a34a" />
              <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: '#1e293b' }}>Gabarito Processado</h2>
            </div>

            {scanResult.assessmentName && (
              <div style={{ background: '#f8fafc', borderRadius: 8, padding: '1rem', marginBottom: 16 }}>
                <p style={{ margin: 0, fontSize: 14, color: '#475569' }}>
                  <strong>Avaliacao:</strong> {scanResult.assessmentName}
                </p>
                {scanResult.tipoAvaliacao && (
                  <p style={{ margin: '4px 0 0', fontSize: 14, color: '#475569' }}>
                    <strong>Tipo:</strong> {scanResult.tipoAvaliacao}
                  </p>
                )}
              </div>
            )}

            {Object.keys(scanResult.answers).length > 0 ? (
              <div>
                <h3 style={{ fontSize: 14, fontWeight: 600, color: '#64748b', textTransform: 'uppercase', margin: '0 0 12px' }}>
                  Respostas Detectadas
                </h3>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(80px, 1fr))', gap: 8 }}>
                  {Object.entries(scanResult.answers).map(([q, a]) => (
                    <div key={q} style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 8, padding: '8px', textAlign: 'center' }}>
                      <div style={{ fontSize: 11, color: '#64748b', fontWeight: 600 }}>Q{q}</div>
                      <div style={{ fontSize: 18, fontWeight: 700, color: '#16a34a' }}>{a}</div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <p style={{ color: '#64748b', fontSize: 14 }}>Nenhuma resposta detectada.</p>
            )}

            <div style={{ display: 'flex', gap: 12, marginTop: 20 }}>
              <button onClick={confirmResults} style={{ flex: 1, padding: '12px', background: '#16a34a', color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer', fontWeight: 600 }}>
                Confirmar e Salvar
              </button>
              <button onClick={reset} style={{ padding: '12px 24px', background: '#fff', color: '#475569', border: '1px solid #e2e8f0', borderRadius: 8, cursor: 'pointer', fontWeight: 600 }}>
                Refazer
              </button>
            </div>
          </div>
        )}

        {stage === 'confirm' && (
          <div style={{ textAlign: 'center', padding: '4rem', background: '#fff', borderRadius: 12, boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
            <CheckCircle size={64} color="#16a34a" style={{ marginBottom: 16 }} />
            <h2 style={{ fontSize: 22, fontWeight: 700, color: '#1e293b', margin: '0 0 8px' }}>Salvo com Sucesso!</h2>
            <p style={{ color: '#64748b', fontSize: 14, margin: '0 0 24px' }}>O gabarito foi processado e salvo.</p>
            <button onClick={reset} style={{ padding: '12px 32px', background: '#2563eb', color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer', fontWeight: 600 }}>
              Escanear Novo Gabarito
            </button>
          </div>
        )}
      </div>

      <canvas ref={canvasRef} style={{ display: 'none' }} />

      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
