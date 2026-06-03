import { useEffect, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Printer, ArrowLeft, TriangleAlert as AlertTriangle, Loader } from 'lucide-react';
import { supabase } from '../services/supabase';

interface AssessmentWithTokens {
  id: string;
  title: string;
  total_questions: number;
  class_name: string;
  tokens: StudentToken[];
}

interface StudentToken {
  id: string;
  token: string;
  student_name: string;
  is_validated: boolean;
}

interface ArUcoMarkers {
  tl: string; // base64 PNG — ID 0
  tr: string; // base64 PNG — ID 1
  bl: string; // base64 PNG — ID 2
  br: string; // base64 PNG — ID 3
}

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY as string;
const ANSWER_OPTIONS = ['A', 'B', 'C', 'D', 'E'];

// Busca marcador ArUco via scan-omr edge function
async function fetchMarker(id: number): Promise<string | null> {
  try {
    const res = await fetch(
      `${SUPABASE_URL}/functions/v1/scan-omr?action=marker&id=${id}`,
      { headers: { Authorization: `Bearer ${SUPABASE_ANON_KEY}` } }
    );
    if (!res.ok) return null;
    const data = await res.json();
    return data.image ? `data:image/png;base64,${data.image}` : null;
  } catch {
    return null;
  }
}

// Componente QR code gerado via canvas usando qrcode.js
function QRCodeCanvas({ value, size = 120 }: { value: string; size?: number }) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current || !value) return;
    containerRef.current.innerHTML = '';
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const QRCode = (window as any).QRCode;
      if (QRCode) {
        new QRCode(containerRef.current, { text: value, width: size, height: size, correctLevel: QRCode.CorrectLevel?.M });
        return;
      }
    } catch {
      // fallback abaixo
    }
    // Fallback: exibe o token como texto pequeno legível
    const el = document.createElement('div');
    el.style.cssText = `width:${size}px;height:${size}px;display:flex;align-items:center;justify-content:center;border:2px solid #000;background:#fff;font-size:7px;word-break:break-all;padding:4px;text-align:center;`;
    el.textContent = value;
    containerRef.current.appendChild(el);
  }, [value, size]);

  return <div ref={containerRef} />;
}

// Marcador ArUco: mostra imagem carregada ou quadrado placeholder
function ArUcoMarker({ src, size = 56 }: { src: string | null; size?: number }) {
  if (src) {
    return (
      <img
        src={src}
        width={size}
        height={size}
        alt="ArUco marker"
        style={{ imageRendering: 'pixelated', display: 'block' }}
      />
    );
  }
  // Placeholder: borda preta simples se o serviço OMR não estiver disponível
  return (
    <div
      style={{
        width: size,
        height: size,
        border: '3px solid #000',
        background: '#fff',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: 7,
        color: '#999',
        textAlign: 'center',
        lineHeight: '1.2',
      }}
    >
      ArUco
    </div>
  );
}

// Folha de gabarito individual para impressão
function AnswerSheet({
  studentName,
  assessmentTitle,
  className,
  totalQuestions,
  tokenUrl,
  markers,
  markerSize,
}: {
  studentName: string;
  assessmentTitle: string;
  className: string;
  totalQuestions: number;
  tokenUrl: string;
  markers: ArUcoMarkers | null;
  markerSize: number;
}) {
  const questions = Array.from({ length: totalQuestions }, (_, i) => i + 1);

  return (
    <div
      className="answer-sheet-page"
      style={{
        width: '210mm',
        minHeight: '297mm',
        padding: '10mm',
        boxSizing: 'border-box',
        fontFamily: 'Arial, sans-serif',
        background: '#fff',
        pageBreakAfter: 'always',
      }}
    >
      {/* Cabeçalho */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8, borderBottom: '1px solid #ddd', paddingBottom: 8 }}>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 9, fontWeight: 700, color: '#2563eb', letterSpacing: 1, textTransform: 'uppercase', marginBottom: 2 }}>
            AvaliaEdu
          </div>
          <div style={{ fontSize: 13, fontWeight: 700, color: '#111', marginBottom: 2 }}>
            {assessmentTitle}
          </div>
          <div style={{ fontSize: 11, color: '#444', marginBottom: 1 }}>
            Aluno: <strong>{studentName}</strong>
          </div>
          {className && (
            <div style={{ fontSize: 10, color: '#666' }}>Turma: {className}</div>
          )}
        </div>
        <div style={{ textAlign: 'center' }}>
          <QRCodeCanvas value={tokenUrl} size={80} />
          <div style={{ fontSize: 7, color: '#999', marginTop: 2, maxWidth: 80, wordBreak: 'break-all' }}>
            Escaneie para corrigir
          </div>
        </div>
      </div>

      {/* Instruções */}
      <div style={{ fontSize: 8, color: '#888', marginBottom: 6, borderBottom: '1px dashed #eee', paddingBottom: 4 }}>
        Preencha completamente o círculo correspondente à sua resposta. Use caneta azul ou preta.
        Não faça marcas fora dos círculos. Total de questões: <strong>{totalQuestions}</strong>
      </div>

      {/* Área de detecção com marcadores ArUco nos cantos */}
      <div
        style={{
          position: 'relative',
          border: '1px solid transparent', // border invisível para alinhamento
        }}
      >
        {/* Linha superior: TL marker + espaço + TR marker */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 2 }}>
          <ArUcoMarker src={markers?.tl ?? null} size={markerSize} />
          <div style={{ flex: 1 }} />
          <ArUcoMarker src={markers?.tr ?? null} size={markerSize} />
        </div>

        {/* Grid de respostas */}
        <div style={{ padding: `0 ${markerSize + 4}px`, marginTop: 2, marginBottom: 2 }}>
          {questions.map((q) => (
            <div
              key={q}
              style={{
                display: 'flex',
                alignItems: 'center',
                marginBottom: totalQuestions > 30 ? 3 : totalQuestions > 20 ? 4 : 5,
              }}
            >
              {/* Número da questão */}
              <div
                style={{
                  width: 20,
                  fontSize: 9,
                  fontWeight: 600,
                  color: '#333',
                  flexShrink: 0,
                  textAlign: 'right',
                  paddingRight: 6,
                }}
              >
                {q}
              </div>

              {/* Bolhas */}
              <div style={{ display: 'flex', gap: totalQuestions > 30 ? 6 : 8 }}>
                {ANSWER_OPTIONS.map((opt) => {
                  const bubbleSize = totalQuestions > 30 ? 16 : totalQuestions > 20 ? 18 : 20;
                  return (
                    <div
                      key={opt}
                      style={{
                        width: bubbleSize,
                        height: bubbleSize,
                        borderRadius: '50%',
                        border: '1.5px solid #000',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: bubbleSize * 0.45,
                        color: '#333',
                        fontWeight: 500,
                        flexShrink: 0,
                      }}
                    >
                      {opt}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        {/* Linha inferior: BL marker + espaço + BR marker */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginTop: 2 }}>
          <ArUcoMarker src={markers?.bl ?? null} size={markerSize} />
          <div style={{ flex: 1 }} />
          <ArUcoMarker src={markers?.br ?? null} size={markerSize} />
        </div>
      </div>

      {/* Rodapé */}
      <div style={{ marginTop: 6, borderTop: '1px dashed #eee', paddingTop: 4, fontSize: 7, color: '#bbb', textAlign: 'center' }}>
        Não escreva nesta área · AvaliaEdu © {new Date().getFullYear()}
      </div>
    </div>
  );
}

// ─── Página principal ─────────────────────────────────────────────────────────
export function AnswerSheetPrintPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const assessmentIdParam = searchParams.get('assessment');

  const [assessments, setAssessments] = useState<AssessmentWithTokens[]>([]);
  const [selectedId, setSelectedId] = useState<string>(assessmentIdParam || '');
  const [markers, setMarkers] = useState<ArUcoMarkers | null>(null);
  const [markersLoading, setMarkersLoading] = useState(false);
  const [markersError, setMarkersError] = useState(false);
  const [loading, setLoading] = useState(true);
  const [printing, setPrinting] = useState(false);

  // Carrega assessments com seus tokens
  useEffect(() => {
    const load = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) { navigate('/dashboard'); return; }

        const { data: assessmentsData, error } = await supabase
          .from('assessments')
          .select('id, title, total_questions, class_id')
          .eq('user_id', session.user.id)
          .order('created_at', { ascending: false });

        if (error) throw error;

        const enriched: AssessmentWithTokens[] = await Promise.all(
          (assessmentsData || []).map(async (a) => {
            // Busca tokens com nome do aluno
            const { data: tokensData } = await supabase
              .from('assessment_tokens')
              .select('id, token, student_id, is_validated')
              .eq('assessment_id', a.id)
              .eq('user_id', session.user.id);

            // Busca nomes dos alunos
            const studentIds = (tokensData || []).map(t => t.student_id).filter(Boolean);
            const { data: profilesData } = studentIds.length
              ? await supabase.from('user_profiles').select('id, full_name').in('id', studentIds)
              : { data: [] };

            const profileMap = new Map((profilesData || []).map(p => [p.id, p.full_name]));

            // Busca nome da turma
            let className = '';
            if (a.class_id) {
              const { data: classData } = await supabase
                .from('classes').select('name').eq('id', a.class_id).maybeSingle();
              className = classData?.name || '';
            }

            const tokens: StudentToken[] = (tokensData || []).map(t => ({
              id: t.id,
              token: t.token,
              student_name: profileMap.get(t.student_id) || 'Aluno',
              is_validated: t.is_validated || false,
            }));

            return {
              id: a.id,
              title: a.title,
              total_questions: a.total_questions || 20,
              class_name: className,
              tokens,
            };
          })
        );

        setAssessments(enriched);
        if (!selectedId && enriched.length > 0) {
          setSelectedId(enriched[0].id);
        }
      } catch (err) {
        console.error('Erro ao carregar avaliações:', err);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [navigate, selectedId]);

  // Carrega marcadores ArUco quando a página abre
  useEffect(() => {
    const loadMarkers = async () => {
      setMarkersLoading(true);
      setMarkersError(false);
      const [tl, tr, bl, br] = await Promise.all([
        fetchMarker(0),
        fetchMarker(1),
        fetchMarker(2),
        fetchMarker(3),
      ]);
      if (tl && tr && bl && br) {
        setMarkers({ tl, tr, bl, br });
      } else {
        setMarkersError(true);
      }
      setMarkersLoading(false);
    };
    loadMarkers();
  }, []);

  const selectedAssessment = assessments.find(a => a.id === selectedId);

  const handlePrint = () => {
    setPrinting(true);
    setTimeout(() => {
      window.print();
      setPrinting(false);
    }, 300);
  };

  const siteUrl = window.location.origin;
  const markerSize = 52;

  return (
    <>
      {/* ── Interface de controle (não aparece na impressão) ── */}
      <div className="print:hidden min-h-screen bg-gray-50">
        {/* Header */}
        <div className="bg-white border-b border-gray-200 px-6 py-4 flex items-center gap-4">
          <button
            onClick={() => navigate('/dashboard')}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <ArrowLeft size={20} className="text-gray-600" />
          </button>
          <div>
            <h1 className="text-lg font-bold text-gray-800">Imprimir Gabaritos</h1>
            <p className="text-sm text-gray-500">Gere e imprima os cartões-resposta dos alunos</p>
          </div>
        </div>

        <div className="max-w-3xl mx-auto px-6 py-8">
          {/* Status dos marcadores ArUco */}
          {markersLoading && (
            <div className="mb-6 flex items-center gap-3 bg-blue-50 border border-blue-200 rounded-xl px-4 py-3 text-blue-700 text-sm">
              <Loader size={16} className="animate-spin" />
              Carregando marcadores ArUco do serviço OMR…
            </div>
          )}
          {markersError && !markersLoading && (
            <div className="mb-6 flex items-start gap-3 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 text-amber-700 text-sm">
              <AlertTriangle size={16} className="shrink-0 mt-0.5" />
              <div>
                <strong>Serviço OMR indisponível</strong> — os gabaritos serão impressos com marcadores
                de posição. Configure a variável <code className="bg-amber-100 px-1 rounded">OMR_SERVICE_URL</code> na
                edge function <code className="bg-amber-100 px-1 rounded">scan-omr</code> para incluir os marcadores ArUco reais.
              </div>
            </div>
          )}

          {loading ? (
            <div className="flex items-center justify-center py-20 gap-3 text-gray-400">
              <Loader size={24} className="animate-spin" />
              <span>Carregando avaliações…</span>
            </div>
          ) : assessments.length === 0 ? (
            <div className="text-center py-20 text-gray-400">
              <p className="text-lg font-medium">Nenhuma avaliação encontrada</p>
              <p className="text-sm mt-1">Crie uma avaliação e gere os tokens dos alunos primeiro.</p>
            </div>
          ) : (
            <>
              {/* Seletor de avaliação */}
              <div className="bg-white rounded-2xl border border-gray-200 p-6 mb-6">
                <label className="block text-sm font-semibold text-gray-700 mb-3">
                  Selecione a avaliação
                </label>
                <select
                  value={selectedId}
                  onChange={(e) => setSelectedId(e.target.value)}
                  className="w-full border border-gray-200 rounded-xl px-4 py-3 text-gray-800 bg-white focus:outline-none focus:ring-2 focus:ring-blue-300 text-sm"
                >
                  {assessments.map(a => (
                    <option key={a.id} value={a.id}>
                      {a.title} {a.class_name ? `· ${a.class_name}` : ''} ({a.tokens.length} alunos)
                    </option>
                  ))}
                </select>
              </div>

              {/* Resumo e botão de impressão */}
              {selectedAssessment && (
                <div className="bg-white rounded-2xl border border-gray-200 p-6 mb-6">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <p className="font-bold text-gray-800">{selectedAssessment.title}</p>
                      <p className="text-sm text-gray-500 mt-0.5">
                        {selectedAssessment.tokens.length} gabarito{selectedAssessment.tokens.length !== 1 ? 's' : ''} ·{' '}
                        {selectedAssessment.total_questions} questões
                        {selectedAssessment.class_name && ` · ${selectedAssessment.class_name}`}
                      </p>
                    </div>
                    <button
                      onClick={handlePrint}
                      disabled={printing || selectedAssessment.tokens.length === 0}
                      className="flex items-center gap-2 bg-blue-500 hover:bg-blue-600 text-white font-semibold px-5 py-3 rounded-xl transition-colors disabled:opacity-50 text-sm"
                    >
                      <Printer size={18} />
                      {printing ? 'Preparando…' : 'Imprimir PDF'}
                    </button>
                  </div>

                  {/* Lista de alunos */}
                  <div className="divide-y divide-gray-100">
                    {selectedAssessment.tokens.length === 0 ? (
                      <p className="text-gray-400 text-sm py-3">
                        Nenhum token gerado para esta avaliação.
                      </p>
                    ) : (
                      selectedAssessment.tokens.map(t => (
                        <div key={t.id} className="flex items-center justify-between py-2.5">
                          <span className="text-sm text-gray-700">{t.student_name}</span>
                          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                            t.is_validated
                              ? 'bg-emerald-50 text-emerald-600'
                              : 'bg-gray-100 text-gray-400'
                          }`}>
                            {t.is_validated ? 'Corrigido' : 'Pendente'}
                          </span>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* ── Conteúdo para impressão ── */}
      <div className="hidden print:block">
        {selectedAssessment?.tokens.map(t => (
          <AnswerSheet
            key={t.id}
            studentName={t.student_name}
            assessmentTitle={selectedAssessment.title}
            className={selectedAssessment.class_name}
            totalQuestions={selectedAssessment.total_questions}
            tokenUrl={`${siteUrl}/s/${t.token}`}
            markers={markers}
            markerSize={markerSize}
          />
        ))}
      </div>

      {/* CSS de impressão */}
      <style>{`
        @media print {
          @page {
            size: A4;
            margin: 0;
          }
          body { margin: 0; }
          .answer-sheet-page { page-break-after: always; }
        }
      `}</style>
    </>
  );
}
