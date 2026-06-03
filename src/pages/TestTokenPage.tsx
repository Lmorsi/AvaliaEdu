import { useState } from 'react';
import { TestTube, CircleCheck as CheckCircle, Circle as XCircle, Loader } from 'lucide-react';
import { supabase } from '../services/supabase';

interface TestResult {
  name: string;
  status: 'ok' | 'error' | 'running';
  message: string;
}

export function TestTokenPage() {
  const [tokenInput, setTokenInput] = useState('');
  const [results, setResults] = useState<TestResult[]>([]);
  const [running, setRunning] = useState(false);

  const runTest = async () => {
    if (!tokenInput.trim()) return;
    setRunning(true);
    setResults([]);

    const newResults: TestResult[] = [];

    // Test 1: Check token exists
    try {
      const { data, error } = await supabase
        .from('assessment_tokens')
        .select('*')
        .eq('token', tokenInput.trim())
        .maybeSingle();

      if (error) throw error;
      if (!data) {
        newResults.push({ name: 'Token Existe', status: 'error', message: 'Token nao encontrado no banco de dados' });
      } else {
        newResults.push({ name: 'Token Existe', status: 'ok', message: `Token encontrado. Validado: ${data.is_validated ? 'Sim' : 'Nao'}` });

        // Test 2: Check assessment
        if (data.assessment_id) {
          const { data: assessment } = await supabase
            .from('assessments')
            .select('nome_avaliacao')
            .eq('id', data.assessment_id)
            .maybeSingle();

          newResults.push({
            name: 'Avaliacao Associada',
            status: assessment ? 'ok' : 'error',
            message: assessment
              ? `Avaliacao: ${(assessment as { nome_avaliacao: string }).nome_avaliacao || 'Sem nome'}`
              : 'Avaliacao nao encontrada',
          });
        }

        // Test 3: Check student
        if (data.student_id) {
          const { data: student } = await supabase
            .from('grading_students')
            .select('name')
            .eq('id', data.student_id)
            .maybeSingle();

          newResults.push({
            name: 'Aluno Associado',
            status: student ? 'ok' : 'error',
            message: student
              ? `Aluno: ${(student as { name: string }).name || 'Sem nome'}`
              : 'Aluno nao encontrado',
          });
        }

        // Test 4: Validate via edge function
        try {
          const apiUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/validate-assessment-token`;
          const response = await fetch(apiUrl, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ token: tokenInput.trim(), action: 'check' }),
          });
          const result = await response.json();
          newResults.push({
            name: 'Edge Function Validate',
            status: result.valid ? 'ok' : 'error',
            message: result.message || 'Sem mensagem',
          });
        } catch (e) {
          newResults.push({
            name: 'Edge Function Validate',
            status: 'error',
            message: e instanceof Error ? e.message : 'Falha ao chamar edge function',
          });
        }
      }
    } catch (err) {
      newResults.push({
        name: 'Token Existe',
        status: 'error',
        message: err instanceof Error ? err.message : 'Erro desconhecido',
      });
    }

    setResults(newResults);
    setRunning(false);
  };

  return (
    <div style={{ minHeight: '100vh', background: '#f8fafc', fontFamily: 'system-ui, sans-serif', padding: '2rem' }}>
      <div style={{ maxWidth: 700, margin: '0 auto' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
          <TestTube size={28} color="#2563eb" />
          <h1 style={{ margin: 0, fontSize: 24, fontWeight: 700, color: '#1e293b' }}>Testar Token</h1>
        </div>
        <p style={{ margin: '0 0 2rem', color: '#64748b', fontSize: 14 }}>
          Insira um token de avaliacao para verificar sua validade e dados associados.
        </p>

        <div style={{ background: '#fff', borderRadius: 12, padding: '1.5rem', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', marginBottom: 24 }}>
          <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 8 }}>
            Token de Avaliacao
          </label>
          <div style={{ display: 'flex', gap: 8 }}>
            <input
              type="text"
              value={tokenInput}
              onChange={e => setTokenInput(e.target.value)}
              placeholder="Cole o token aqui..."
              style={{ flex: 1, padding: '10px 14px', border: '1px solid #e2e8f0', borderRadius: 8, fontSize: 14, outline: 'none', fontFamily: 'monospace' }}
              onKeyDown={e => e.key === 'Enter' && runTest()}
            />
            <button
              onClick={runTest}
              disabled={running || !tokenInput.trim()}
              style={{ padding: '10px 24px', background: running ? '#94a3b8' : '#2563eb', color: '#fff', border: 'none', borderRadius: 8, cursor: running ? 'not-allowed' : 'pointer', fontWeight: 600, fontSize: 14, display: 'flex', alignItems: 'center', gap: 8 }}
            >
              {running ? <Loader size={16} style={{ animation: 'spin 1s linear infinite' }} /> : null}
              {running ? 'Testando...' : 'Testar'}
            </button>
          </div>
        </div>

        {results.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {results.map((r, i) => (
              <div
                key={i}
                style={{
                  display: 'flex', alignItems: 'flex-start', gap: 12, padding: '1rem',
                  background: r.status === 'ok' ? '#f0fdf4' : '#fef2f2',
                  border: `1px solid ${r.status === 'ok' ? '#bbf7d0' : '#fecaca'}`,
                  borderRadius: 8,
                }}
              >
                {r.status === 'ok' ? <CheckCircle size={18} color="#16a34a" style={{ flexShrink: 0, marginTop: 2 }} /> : <XCircle size={18} color="#dc2626" style={{ flexShrink: 0, marginTop: 2 }} />}
                <div>
                  <div style={{ fontWeight: 600, fontSize: 14, color: '#1e293b' }}>{r.name}</div>
                  <div style={{ fontSize: 13, color: '#475569', marginTop: 2 }}>{r.message}</div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
