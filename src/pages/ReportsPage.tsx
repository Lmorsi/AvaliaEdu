import { useState, useEffect } from 'react';
import { ChartBar as FileBarChart, Download, Eye } from 'lucide-react';
import { supabase } from '../services/supabase';
import { CompiledReportViewer } from '../components/CompiledReportViewer';

interface GradingRecord {
  id: string;
  assessment_name: string;
  total_questions: number;
  grading_date: string;
  created_at: string;
}

export function ReportsPage() {
  const [gradings, setGradings] = useState<GradingRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedGradingId, setSelectedGradingId] = useState<string | null>(null);

  useEffect(() => {
    loadGradings();
  }, []);

  const loadGradings = async () => {
    try {
      const { data, error } = await supabase
        .from('assessment_gradings')
        .select('id, assessment_name, total_questions, grading_date, created_at')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setGradings(data || []);
    } catch (err) {
      console.error('Error loading gradings:', err);
    } finally {
      setLoading(false);
    }
  };

  if (selectedGradingId) {
    return (
      <div style={{ minHeight: '100vh', background: '#f8fafc', padding: '2rem', fontFamily: 'system-ui, sans-serif' }}>
        <div style={{ maxWidth: 900, margin: '0 auto' }}>
          <button
            onClick={() => setSelectedGradingId(null)}
            style={{ marginBottom: 16, padding: '8px 16px', background: '#fff', border: '1px solid #e2e8f0', borderRadius: 8, cursor: 'pointer', fontSize: 14, color: '#475569' }}
          >
            Voltar para Relatorios
          </button>
          <CompiledReportViewer
            gradingId={selectedGradingId}
            onClose={() => setSelectedGradingId(null)}
          />
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', background: '#f8fafc', fontFamily: 'system-ui, sans-serif' }}>
      <div style={{ background: '#fff', borderBottom: '1px solid #e2e8f0', padding: '1.5rem 2rem' }}>
        <div style={{ maxWidth: 900, margin: '0 auto', display: 'flex', alignItems: 'center', gap: 12 }}>
          <FileBarChart size={24} color="#2563eb" />
          <div>
            <h1 style={{ margin: 0, fontSize: 20, fontWeight: 700, color: '#1e293b' }}>Relatorios</h1>
            <p style={{ margin: 0, fontSize: 13, color: '#64748b' }}>Visualize e exporte relatorios de correcoes</p>
          </div>
        </div>
      </div>

      <div style={{ maxWidth: 900, margin: '0 auto', padding: '2rem' }}>
        {loading ? (
          <div style={{ textAlign: 'center', padding: '4rem', color: '#94a3b8' }}>Carregando...</div>
        ) : gradings.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '4rem', color: '#94a3b8', background: '#fff', borderRadius: 12, boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
            <FileBarChart size={48} style={{ marginBottom: 12, opacity: 0.4 }} />
            <p style={{ margin: 0, fontSize: 14 }}>Nenhuma correcao encontrada.</p>
          </div>
        ) : (
          <div style={{ background: '#fff', borderRadius: 12, boxShadow: '0 1px 3px rgba(0,0,0,0.1)', overflow: 'hidden' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: '#f8fafc' }}>
                  {['Avaliacao', 'Questoes', 'Data', 'Acoes'].map(h => (
                    <th key={h} style={{ padding: '12px 16px', textAlign: 'left', fontSize: 12, fontWeight: 600, color: '#64748b', textTransform: 'uppercase' }}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {gradings.map(g => (
                  <tr key={g.id} style={{ borderTop: '1px solid #e2e8f0' }}>
                    <td style={{ padding: '12px 16px', fontSize: 14, fontWeight: 500, color: '#1e293b' }}>{g.assessment_name}</td>
                    <td style={{ padding: '12px 16px', fontSize: 14, color: '#475569' }}>{g.total_questions}</td>
                    <td style={{ padding: '12px 16px', fontSize: 14, color: '#475569' }}>
                      {g.grading_date ? new Date(g.grading_date).toLocaleDateString('pt-BR') : 'N/A'}
                    </td>
                    <td style={{ padding: '12px 16px' }}>
                      <div style={{ display: 'flex', gap: 8 }}>
                        <button
                          onClick={() => setSelectedGradingId(g.id)}
                          style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '4px 12px', background: '#eff6ff', color: '#2563eb', border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 12, fontWeight: 500 }}
                        >
                          <Eye size={12} />
                          Ver
                        </button>
                        <button
                          onClick={() => window.print()}
                          style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '4px 12px', background: '#f1f5f9', color: '#475569', border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 12, fontWeight: 500 }}
                        >
                          <Download size={12} />
                          PDF
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
