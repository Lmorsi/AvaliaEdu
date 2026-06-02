import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '../services/supabase';
import '../styles/MobileGradingPage.css';

export function QRLandingPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const validateAndRedirect = async () => {
      try {
        const token = searchParams.get('token');
        if (!token) {
          setError('Token não fornecido');
          return;
        }

        const { data: { session } } = await supabase.auth.getSession();
        if (!session) {
          navigate(`/login?redirect=${window.location.pathname}${window.location.search}`);
          return;
        }

        const { data, error: queryError } = await supabase
          .from('assessment_tokens')
          .select('token')
          .eq('token', token)
          .maybeSingle();

        if (queryError) throw queryError;
        if (!data) {
          setError('Token inválido');
          return;
        }

        navigate(`/mobile-grade?token=${token}`);
      } catch (err) {
        console.error('Validation error:', err);
        setError(err instanceof Error ? err.message : 'Erro na validação');
      } finally {
        setLoading(false);
      }
    };

    validateAndRedirect();
  }, [searchParams, navigate]);

  if (loading) {
    return (
      <div className="qr-landing-container">
        <div className="spinner"></div>
        <p>Carregando...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="qr-landing-container">
        <div className="error-box">
          <p>{error}</p>
          <button onClick={() => navigate('/')}>Voltar</button>
        </div>
      </div>
    );
  }

  return null;
}
