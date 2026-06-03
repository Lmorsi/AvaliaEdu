import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { supabase } from '../services/supabase';
import '../styles/Dashboard.css';

interface GradingState {
  view: string;
  token: string;
  detectedAnswers: Record<string, string>;
  studentId: string;
}

export function Dashboard() {
  const location = useLocation();
  const navigate = useNavigate();
  const [assessments, setAssessments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const state = location.state as GradingState | null;

  useEffect(() => {
    const loadData = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) {
          navigate('/login');
          return;
        }

        const { data, error } = await supabase
          .from('assessments')
          .select('id, title, total_questions')
          .limit(10);

        if (error) throw error;
        setAssessments(data || []);
      } catch (err) {
        console.error('Error loading data:', err);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [navigate]);

  if (state?.view === 'grading') {
    return (
      <div className="dashboard-container">
        <div className="grading-view">
          <h1>Respostas Detectadas - Confirmar</h1>

          <div className="answers-review">
            <h2>Respostas do Estudante</h2>
            <div className="answers-grid">
              {Object.entries(state.detectedAnswers).map(([question, answer]) => (
                <div key={question} className="answer-card">
                  <div className="question-number">{question}</div>
                  <div className="answer-value">{answer}</div>
                </div>
              ))}
            </div>
          </div>

          <div className="grading-controls">
            <button className="btn-confirm" onClick={() => navigate('/dashboard')}>
              Confirmar e Salvar
            </button>
            <button className="btn-cancel" onClick={() => navigate('/mobile-grade')}>
              Voltar e Repetir
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="dashboard-container">
      <div className="dashboard-header">
        <h1>Dashboard</h1>
        <div className="flex gap-2 items-center">
          <button
            onClick={() => navigate('/print-answer-sheets')}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-500 text-white text-sm font-medium hover:bg-blue-600 transition-colors"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="6 9 6 2 18 2 18 9"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect x="6" y="14" width="12" height="8"/>
            </svg>
            Imprimir Gabaritos
          </button>
          <button onClick={() => supabase.auth.signOut()} className="logout-btn">
            Sair
          </button>
        </div>
      </div>

      {loading ? (
        <div className="loading">Carregando...</div>
      ) : (
        <div className="assessments-list">
          <h2>Avaliações</h2>
          {assessments.length === 0 ? (
            <p>Nenhuma avaliação encontrada.</p>
          ) : (
            <div className="assessments-grid">
              {assessments.map((assessment) => (
                <div key={assessment.id} className="assessment-card">
                  <h3>{assessment.title}</h3>
                  <p>{assessment.total_questions} questões</p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
