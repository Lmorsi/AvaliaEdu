import { useState, useEffect } from 'react';
import { Users, Settings, Shield, ChartBar as BarChart2 } from 'lucide-react';
import { supabase } from '../services/supabase';

interface UserProfile {
  id: string;
  email: string;
  name: string;
  role: string;
  created_at: string;
}

export function AdminPage() {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'users' | 'settings' | 'stats'>('users');

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    try {
      const { data, error } = await supabase
        .from('user_profiles')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setUsers(data || []);
    } catch (err) {
      console.error('Error loading users:', err);
    } finally {
      setLoading(false);
    }
  };

  const updateUserRole = async (userId: string, role: string) => {
    try {
      const { error } = await supabase
        .from('user_profiles')
        .update({ role })
        .eq('id', userId);

      if (error) throw error;
      setUsers(prev => prev.map(u => u.id === userId ? { ...u, role } : u));
    } catch (err) {
      console.error('Error updating role:', err);
    }
  };

  return (
    <div style={{ minHeight: '100vh', background: '#f8fafc', fontFamily: 'system-ui, sans-serif' }}>
      <div style={{ background: '#fff', borderBottom: '1px solid #e2e8f0', padding: '1rem 2rem' }}>
        <div style={{ maxWidth: 1200, margin: '0 auto', display: 'flex', alignItems: 'center', gap: 12 }}>
          <Shield size={24} color="#2563eb" />
          <h1 style={{ margin: 0, fontSize: 20, fontWeight: 700, color: '#1e293b' }}>
            Painel Administrativo
          </h1>
        </div>
      </div>

      <div style={{ maxWidth: 1200, margin: '0 auto', padding: '2rem' }}>
        <div style={{ display: 'flex', gap: 8, marginBottom: 24 }}>
          {([
            { key: 'users', label: 'Usuarios', icon: Users },
            { key: 'stats', label: 'Estatisticas', icon: BarChart2 },
            { key: 'settings', label: 'Configuracoes', icon: Settings },
          ] as const).map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              onClick={() => setActiveTab(key)}
              style={{
                display: 'flex', alignItems: 'center', gap: 8,
                padding: '8px 16px', borderRadius: 8, border: 'none', cursor: 'pointer',
                background: activeTab === key ? '#2563eb' : '#fff',
                color: activeTab === key ? '#fff' : '#475569',
                fontWeight: 500, fontSize: 14,
                boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
              }}
            >
              <Icon size={16} />
              {label}
            </button>
          ))}
        </div>

        {activeTab === 'users' && (
          <div style={{ background: '#fff', borderRadius: 12, boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
            <div style={{ padding: '1.5rem', borderBottom: '1px solid #e2e8f0' }}>
              <h2 style={{ margin: 0, fontSize: 16, fontWeight: 600, color: '#1e293b' }}>
                Gerenciar Usuarios ({users.length})
              </h2>
            </div>
            {loading ? (
              <div style={{ padding: '3rem', textAlign: 'center', color: '#94a3b8' }}>
                Carregando...
              </div>
            ) : (
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ background: '#f8fafc' }}>
                    {['Nome', 'Email', 'Funcao', 'Data de Cadastro', 'Acoes'].map(h => (
                      <th key={h} style={{ padding: '12px 16px', textAlign: 'left', fontSize: 12, fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {users.map(user => (
                    <tr key={user.id} style={{ borderTop: '1px solid #e2e8f0' }}>
                      <td style={{ padding: '12px 16px', fontSize: 14, color: '#1e293b', fontWeight: 500 }}>{user.name || 'N/A'}</td>
                      <td style={{ padding: '12px 16px', fontSize: 14, color: '#475569' }}>{user.email}</td>
                      <td style={{ padding: '12px 16px' }}>
                        <span style={{
                          padding: '2px 8px', borderRadius: 999, fontSize: 12, fontWeight: 600,
                          background: user.role === 'admin' ? '#dbeafe' : '#f1f5f9',
                          color: user.role === 'admin' ? '#2563eb' : '#475569',
                        }}>
                          {user.role}
                        </span>
                      </td>
                      <td style={{ padding: '12px 16px', fontSize: 14, color: '#475569' }}>
                        {new Date(user.created_at).toLocaleDateString('pt-BR')}
                      </td>
                      <td style={{ padding: '12px 16px' }}>
                        <button
                          onClick={() => updateUserRole(user.id, user.role === 'admin' ? 'user' : 'admin')}
                          style={{
                            padding: '4px 12px', borderRadius: 6, border: '1px solid #e2e8f0',
                            cursor: 'pointer', fontSize: 12, fontWeight: 500,
                            background: '#fff', color: '#475569',
                          }}
                        >
                          {user.role === 'admin' ? 'Remover Admin' : 'Tornar Admin'}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}

        {activeTab === 'stats' && (
          <div style={{ background: '#fff', borderRadius: 12, padding: '2rem', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
            <h2 style={{ margin: '0 0 1rem', fontSize: 16, fontWeight: 600, color: '#1e293b' }}>
              Estatisticas do Sistema
            </h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16 }}>
              {[
                { label: 'Total de Usuarios', value: users.length },
                { label: 'Administradores', value: users.filter(u => u.role === 'admin').length },
                { label: 'Usuarios Comuns', value: users.filter(u => u.role === 'user').length },
              ].map(stat => (
                <div key={stat.label} style={{ background: '#f8fafc', borderRadius: 8, padding: '1.5rem', textAlign: 'center' }}>
                  <div style={{ fontSize: 32, fontWeight: 700, color: '#2563eb' }}>{stat.value}</div>
                  <div style={{ fontSize: 13, color: '#64748b', marginTop: 4 }}>{stat.label}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'settings' && (
          <div style={{ background: '#fff', borderRadius: 12, padding: '2rem', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
            <h2 style={{ margin: '0 0 1rem', fontSize: 16, fontWeight: 600, color: '#1e293b' }}>
              Configuracoes do Sistema
            </h2>
            <p style={{ color: '#64748b', fontSize: 14 }}>Configuracoes avancadas do sistema.</p>
          </div>
        )}
      </div>
    </div>
  );
}
