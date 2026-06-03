import { useState } from 'react';
import { Bug, Server, Database, RefreshCw } from 'lucide-react';
import { supabase } from '../services/supabase';

interface DiagnosticResult {
  name: string;
  status: 'ok' | 'error' | 'pending';
  message: string;
  details?: string;
}

export function DebugPage() {
  const [results, setResults] = useState<DiagnosticResult[]>([]);
  const [running, setRunning] = useState(false);

  const runDiagnostics = async () => {
    setRunning(true);
    const diagnostics: DiagnosticResult[] = [];

    // Check Supabase connection
    try {
      const { data, error } = await supabase.from('user_profiles').select('id').limit(1);
      diagnostics.push({
        name: 'Supabase Connection',
        status: error ? 'error' : 'ok',
        message: error ? 'Falha na conexao' : 'Conexao estabelecida',
        details: error ? error.message : `Retornou ${data?.length ?? 0} registros`,
      });
    } catch (err) {
      diagnostics.push({
        name: 'Supabase Connection',
        status: 'error',
        message: 'Excecao ao conectar',
        details: err instanceof Error ? err.message : 'Erro desconhecido',
      });
    }

    // Check Auth
    try {
      const { data: { session } } = await supabase.auth.getSession();
      diagnostics.push({
        name: 'Autenticacao',
        status: session ? 'ok' : 'error',
        message: session ? 'Sessao ativa' : 'Sem sessao ativa',
        details: session ? `Usuario: ${session.user.email}` : 'Faca login para continuar',
      });
    } catch (err) {
      diagnostics.push({
        name: 'Autenticacao',
        status: 'error',
        message: 'Erro ao verificar sessao',
        details: err instanceof Error ? err.message : 'Erro desconhecido',
      });
    }

    // Check environment variables
    const hasSupabaseUrl = !!import.meta.env.VITE_SUPABASE_URL;
    const hasSupabaseKey = !!import.meta.env.VITE_SUPABASE_ANON_KEY;
    diagnostics.push({
      name: 'Variaveis de Ambiente',
      status: hasSupabaseUrl && hasSupabaseKey ? 'ok' : 'error',
      message: hasSupabaseUrl && hasSupabaseKey ? 'Variaveis configuradas' : 'Variaveis ausentes',
      details: [
        `VITE_SUPABASE_URL: ${hasSupabaseUrl ? 'OK' : 'AUSENTE'}`,
        `VITE_SUPABASE_ANON_KEY: ${hasSupabaseKey ? 'OK' : 'AUSENTE'}`,
      ].join(', '),
    });

    // Check tables
    const tables = ['assessments', 'classes', 'assessment_gradings', 'student_results'];
    for (const table of tables) {
      try {
        const { error } = await supabase.from(table).select('id').limit(1);
        diagnostics.push({
          name: `Tabela: ${table}`,
          status: error ? 'error' : 'ok',
          message: error ? 'Tabela inacessivel' : 'Tabela acessivel',
          details: error ? error.message : undefined,
        });
      } catch (err) {
        diagnostics.push({
          name: `Tabela: ${table}`,
          status: 'error',
          message: 'Excecao ao acessar tabela',
          details: err instanceof Error ? err.message : 'Erro desconhecido',
        });
      }
    }

    setResults(diagnostics);
    setRunning(false);
  };

  const statusColor = (status: DiagnosticResult['status']) => {
    if (status === 'ok') return { bg: '#f0fdf4', border: '#bbf7d0', text: '#16a34a' };
    if (status === 'error') return { bg: '#fef2f2', border: '#fecaca', text: '#dc2626' };
    return { bg: '#f8fafc', border: '#e2e8f0', text: '#64748b' };
  };

  return (
    <div style={{ minHeight: '100vh', background: '#f8fafc', fontFamily: 'system-ui, sans-serif', padding: '2rem' }}>
      <div style={{ maxWidth: 800, margin: '0 auto' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
          <Bug size={28} color="#2563eb" />
          <h1 style={{ margin: 0, fontSize: 24, fontWeight: 700, color: '#1e293b' }}>
            Diagnostico do Sistema
          </h1>
        </div>
        <p style={{ margin: '0 0 2rem', color: '#64748b', fontSize: 14 }}>
          Verifique o estado da conexao com o banco de dados e outros servicos.
        </p>

        <button
          onClick={runDiagnostics}
          disabled={running}
          style={{
            display: 'flex', alignItems: 'center', gap: 8,
            padding: '10px 24px', background: running ? '#94a3b8' : '#2563eb',
            color: '#fff', border: 'none', borderRadius: 8,
            cursor: running ? 'not-allowed' : 'pointer',
            fontWeight: 600, fontSize: 14, marginBottom: 24,
          }}
        >
          <RefreshCw size={16} style={{ animation: running ? 'spin 1s linear infinite' : 'none' }} />
          {running ? 'Executando...' : 'Executar Diagnostico'}
        </button>

        {results.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {results.map((result, i) => {
              const colors = statusColor(result.status);
              return (
                <div
                  key={i}
                  style={{
                    background: colors.bg, border: `1px solid ${colors.border}`,
                    borderRadius: 8, padding: '1rem',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      {result.name.includes('Supabase') ? <Server size={16} color={colors.text} /> :
                       result.name.includes('Tabela') ? <Database size={16} color={colors.text} /> :
                       <Bug size={16} color={colors.text} />}
                      <span style={{ fontWeight: 600, fontSize: 14, color: '#1e293b' }}>{result.name}</span>
                    </div>
                    <span style={{ fontSize: 12, fontWeight: 700, color: colors.text, textTransform: 'uppercase' }}>
                      {result.status}
                    </span>
                  </div>
                  <p style={{ margin: '6px 0 0 24px', fontSize: 13, color: '#475569' }}>{result.message}</p>
                  {result.details && (
                    <p style={{ margin: '4px 0 0 24px', fontSize: 12, color: '#64748b', fontFamily: 'monospace' }}>
                      {result.details}
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {results.length === 0 && !running && (
          <div style={{ textAlign: 'center', padding: '4rem', color: '#94a3b8' }}>
            <Bug size={48} style={{ marginBottom: 12 }} />
            <p style={{ margin: 0, fontSize: 14 }}>Clique em "Executar Diagnostico" para iniciar.</p>
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
