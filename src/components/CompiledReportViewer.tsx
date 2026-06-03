import { FileText } from 'lucide-react';

interface CompiledReportViewerProps {
  gradingId: string;
  onClose?: () => void;
}

export function CompiledReportViewer({ gradingId, onClose }: CompiledReportViewerProps) {
  return (
    <div style={{ padding: '2rem', background: '#fff', borderRadius: 12 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <FileText size={20} color="#2563eb" />
          <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: '#1e293b' }}>
            Relatorio Compilado
          </h2>
        </div>
        {onClose && (
          <button
            onClick={onClose}
            style={{ padding: '6px 16px', background: '#f1f5f9', border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 14, color: '#475569' }}
          >
            Fechar
          </button>
        )}
      </div>
      <p style={{ color: '#64748b', fontSize: 14 }}>
        Relatorio para correcao ID: <code style={{ background: '#f1f5f9', padding: '2px 6px', borderRadius: 4 }}>{gradingId}</code>
      </p>
    </div>
  );
}
