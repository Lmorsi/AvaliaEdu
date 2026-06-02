import { useEffect, useRef, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { supabase } from '../services/supabase';
import { useOMR } from '../hooks/useOMR';
import type { StudentAssessment, OMRResult } from '../types';
import '../styles/MobileGradingPage.css';

type Stage = 'idle' | 'camera' | 'preview' | 'processing' | 'result';

export function MobileGradingPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [stage, setStage] = useState<Stage>('idle');
  const [tokenData, setTokenData] = useState<StudentAssessment | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const { loading: omrLoading, scanAnswerSheet, convertBubblesToAnswers } = useOMR();
  const [omrResult, setOmrResult] = useState<OMRResult | null>(null);

  useEffect(() => {
    const validateToken = async () => {
      try {
        const token = searchParams.get('token');
        if (!token) {
          navigate('/');
          return;
        }

        const { data, error } = await supabase
          .from('assessment_tokens')
          .select('token')
          .eq('token', token)
          .maybeSingle();

        if (error || !data) {
          console.error('Token validation failed:', error);
          navigate('/');
          return;
        }

        setTokenData({
          token,
          studentId: 'student-1',
          studentName: 'Estudante',
          assessmentId: 'assessment-1',
          assessmentTitle: 'Avaliação',
          className: 'Turma A',
        });

        setStage('idle');
      } catch (err) {
        console.error('Validation error:', err);
        navigate('/');
      }
    };

    validateToken();
  }, [searchParams, navigate]);

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' },
      });

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        setStage('camera');
      }
    } catch (err) {
      console.error('Camera error:', err);
      alert('Não foi possível acessar a câmera');
    }
  };

  const capturePhoto = () => {
    if (videoRef.current && canvasRef.current) {
      const context = canvasRef.current.getContext('2d');
      if (context) {
        canvasRef.current.width = videoRef.current.videoWidth;
        canvasRef.current.height = videoRef.current.videoHeight;
        context.drawImage(videoRef.current, 0, 0);
        const imageData = canvasRef.current.toDataURL('image/jpeg');
        setPreview(imageData);

        canvasRef.current.toBlob((blob) => {
          if (blob) {
            setSelectedFile(new File([blob], 'answer-sheet.jpg', { type: 'image/jpeg' }));
          }
        });

        stopCamera();
        setStage('preview');
      }
    }
  };

  const stopCamera = () => {
    if (videoRef.current?.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach((track) => track.stop());
    }
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      const reader = new FileReader();
      reader.onload = (e) => {
        setPreview(e.target?.result as string);
      };
      reader.readAsDataURL(file);
      setStage('preview');
    }
  };

  const processImage = async () => {
    if (!selectedFile) return;

    setStage('processing');
    try {
      const result = await scanAnswerSheet(selectedFile);
      setOmrResult(result);
      setStage('result');
    } catch (err) {
      console.error('Processing error:', err);
      alert('Erro ao processar a imagem');
      setStage('preview');
    }
  };

  const handleSaveAnswers = async () => {
    if (!omrResult || !tokenData) return;

    try {
      const answers = convertBubblesToAnswers(omrResult);

      const { error } = await supabase
        .from('student_results')
        .insert([
          {
            student_id: tokenData.studentId,
            assessment_id: tokenData.assessmentId,
            answers,
            created_at: new Date().toISOString(),
          },
        ]);

      if (error) throw error;

      navigate('/dashboard', {
        state: {
          view: 'grading',
          token: tokenData.token,
          detectedAnswers: answers,
          studentId: tokenData.studentId,
        },
      });
    } catch (err) {
      console.error('Save error:', err);
      alert('Erro ao salvar as respostas');
    }
  };

  return (
    <div className="mobile-grading-container">
      {stage === 'idle' && tokenData && (
        <div className="idle-view">
          <div className="header">
            <h1>Avalia</h1>
            <p className="subtitle">Correção Digital de Gabaritos</p>
          </div>

          <div className="student-info">
            <p>
              <strong>{tokenData.studentName}</strong>
            </p>
            <p className="assessment">{tokenData.assessmentTitle}</p>
          </div>

          <button className="camera-button" onClick={startCamera}>
            <svg viewBox="0 0 24 24" width="64" height="64">
              <path
                fill="currentColor"
                d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.42 0-8-3.58-8-8s3.58-8 8-8 8 3.58 8 8-3.58 8-8 8zm3.5-9c.83 0 1.5-.67 1.5-1.5S16.33 8 15.5 8 14 8.67 14 9.5s.67 1.5 1.5 1.5zm-7 0c.83 0 1.5-.67 1.5-1.5S9.33 8 8.5 8 7 8.67 7 9.5 7.67 11 8.5 11zm3.5 6.5c2.33 0 4.31-1.46 5.11-3.5H6.89c.8 2.04 2.78 3.5 5.11 3.5z"
              />
            </svg>
            <span>Tirar Foto</span>
          </button>

          <button className="upload-button" onClick={() => fileInputRef.current?.click()}>
            <svg viewBox="0 0 24 24" width="48" height="48">
              <path
                fill="currentColor"
                d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z"
              />
            </svg>
            <span>Carregar Arquivo</span>
          </button>

          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleFileUpload}
            style={{ display: 'none' }}
          />
        </div>
      )}

      {stage === 'camera' && (
        <div className="camera-view">
          <video ref={videoRef} autoPlay playsInline />
          <div className="camera-controls">
            <button onClick={capturePhoto} className="capture-btn">
              Capturar
            </button>
            <button onClick={stopCamera} className="cancel-btn">
              Cancelar
            </button>
          </div>
        </div>
      )}

      {stage === 'preview' && preview && (
        <div className="preview-view">
          <img src={preview} alt="Preview" />
          <div className="preview-controls">
            <button onClick={processImage} disabled={omrLoading} className="process-btn">
              {omrLoading ? 'Processando...' : 'Processar Gabarito'}
            </button>
            <button onClick={() => setStage('idle')} className="cancel-btn">
              Cancelar
            </button>
          </div>
        </div>
      )}

      {stage === 'processing' && (
        <div className="processing-view">
          <div className="spinner"></div>
          <p>Processando imagem...</p>
        </div>
      )}

      {stage === 'result' && omrResult && (
        <div className="result-view">
          <h2>Respostas Detectadas</h2>
          <div className="answers-grid">
            {Object.entries(convertBubblesToAnswers(omrResult)).map(([question, answer]) => (
              <div key={question} className="answer-item">
                <span className="question">{question}</span>
                <span className="answer">{answer}</span>
              </div>
            ))}
          </div>
          <div className="result-controls">
            <button onClick={handleSaveAnswers} className="save-btn">
              Salvar Respostas
            </button>
            <button onClick={() => setStage('idle')} className="cancel-btn">
              Repetir
            </button>
          </div>
        </div>
      )}

      <canvas ref={canvasRef} style={{ display: 'none' }} />
    </div>
  );
}
