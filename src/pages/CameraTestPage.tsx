import { useState, useRef, useEffect } from 'react';
import { Camera, Upload, RefreshCw, CircleCheck as CheckCircle } from 'lucide-react';

export function CameraTestPage() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [cameraActive, setCameraActive] = useState(false);
  const [cameraAvailable, setCameraAvailable] = useState<boolean | null>(null);

  useEffect(() => {
    checkCameraAvailability();
    return () => {
      if (stream) {
        stream.getTracks().forEach(t => t.stop());
      }
    };
  }, [stream]);

  const checkCameraAvailability = async () => {
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      const hasCamera = devices.some(d => d.kind === 'videoinput');
      setCameraAvailable(hasCamera);
    } catch {
      setCameraAvailable(false);
    }
  };

  const startCamera = async () => {
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' },
      });
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
      }
      setStream(mediaStream);
      setCameraActive(true);
    } catch (err) {
      console.error('Camera error:', err);
      alert('Nao foi possivel acessar a camera');
    }
  };

  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach(t => t.stop());
      setStream(null);
    }
    setCameraActive(false);
  };

  const capturePhoto = () => {
    if (!videoRef.current || !canvasRef.current) return;
    const ctx = canvasRef.current.getContext('2d');
    if (!ctx) return;
    canvasRef.current.width = videoRef.current.videoWidth;
    canvasRef.current.height = videoRef.current.videoHeight;
    ctx.drawImage(videoRef.current, 0, 0);
    const dataUrl = canvasRef.current.toDataURL('image/jpeg');
    setCapturedImage(dataUrl);
    stopCamera();
  };

  const reset = () => {
    setCapturedImage(null);
    setCameraActive(false);
  };

  return (
    <div style={{ minHeight: '100vh', background: '#f8fafc', fontFamily: 'system-ui, sans-serif', padding: '2rem' }}>
      <div style={{ maxWidth: 600, margin: '0 auto' }}>
        <h1 style={{ margin: '0 0 8px', fontSize: 24, fontWeight: 700, color: '#1e293b' }}>
          Teste de Camera
        </h1>
        <p style={{ margin: '0 0 2rem', color: '#64748b', fontSize: 14 }}>
          Verifique se sua camera esta funcionando corretamente.
        </p>

        {cameraAvailable === false && (
          <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 8, padding: '1rem', marginBottom: 16, color: '#dc2626', fontSize: 14 }}>
            Nenhuma camera encontrada neste dispositivo.
          </div>
        )}

        {cameraAvailable === true && (
          <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 8, padding: '1rem', marginBottom: 16, color: '#16a34a', fontSize: 14, display: 'flex', alignItems: 'center', gap: 8 }}>
            <CheckCircle size={16} />
            Camera detectada e disponivel.
          </div>
        )}

        <div style={{ background: '#fff', borderRadius: 12, overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', marginBottom: 16 }}>
          {cameraActive ? (
            <video
              ref={videoRef}
              autoPlay
              playsInline
              style={{ width: '100%', display: 'block', maxHeight: 400, objectFit: 'cover', background: '#000' }}
            />
          ) : capturedImage ? (
            <img src={capturedImage} alt="Captura" style={{ width: '100%', display: 'block' }} />
          ) : (
            <div style={{ height: 300, display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f1f5f9', flexDirection: 'column', gap: 12 }}>
              <Camera size={48} color="#94a3b8" />
              <p style={{ margin: 0, color: '#94a3b8', fontSize: 14 }}>Camera inativa</p>
            </div>
          )}
        </div>

        <canvas ref={canvasRef} style={{ display: 'none' }} />

        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
          {!cameraActive && !capturedImage && (
            <button
              onClick={startCamera}
              style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 20px', background: '#2563eb', color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer', fontWeight: 600, fontSize: 14 }}
            >
              <Camera size={16} />
              Iniciar Camera
            </button>
          )}

          {cameraActive && (
            <>
              <button
                onClick={capturePhoto}
                style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 20px', background: '#16a34a', color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer', fontWeight: 600, fontSize: 14 }}
              >
                <Upload size={16} />
                Capturar Foto
              </button>
              <button
                onClick={stopCamera}
                style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 20px', background: '#fff', color: '#475569', border: '1px solid #e2e8f0', borderRadius: 8, cursor: 'pointer', fontWeight: 600, fontSize: 14 }}
              >
                Parar Camera
              </button>
            </>
          )}

          {capturedImage && (
            <button
              onClick={reset}
              style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 20px', background: '#fff', color: '#475569', border: '1px solid #e2e8f0', borderRadius: 8, cursor: 'pointer', fontWeight: 600, fontSize: 14 }}
            >
              <RefreshCw size={16} />
              Nova Foto
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
