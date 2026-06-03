import { useState } from 'react';
import { CompiledReportViewer } from '@/components/CompiledReportViewer';

// Exemplo de uso da página de relatório compilado
export function ReportsPage() {
  const [selectedAssessmentId, setSelectedAssessmentId] = useState<string | null>(null);
  const [assessmentTitle, setAssessmentTitle] = useState('');

  const handleSelectAssessment = (id: string, title: string) => {
    setSelectedAssessmentId(id);
    setAssessmentTitle(title);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">Relatórios de Avaliações</h1>

        {selectedAssessmentId ? (
          <div>
            <button
              onClick={() => setSelectedAssessmentId(null)}
              className="mb-6 px-4 py-2 text-gray-600 hover:text-gray-900 border border-gray-300 rounded-lg hover:bg-gray-100 transition-colors"
            >
              Voltar para seleção
            </button>
            <CompiledReportViewer assessmentId={selectedAssessmentId} assessmentTitle={assessmentTitle} />
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Exemplo de assessments - substitua com dados reais do Supabase */}
            <div
              onClick={() => handleSelectAssessment('assessment-1', 'Prova de Matemática')}
              className="bg-white rounded-lg border border-gray-200 p-6 cursor-pointer hover:shadow-lg hover:border-blue-300 transition-all"
            >
              <h3 className="font-semibold text-gray-900 mb-2">Prova de Matemática</h3>
              <p className="text-gray-600 text-sm">Clique para visualizar relatório</p>
            </div>

            <div
              onClick={() => handleSelectAssessment('assessment-2', 'Prova de Português')}
              className="bg-white rounded-lg border border-gray-200 p-6 cursor-pointer hover:shadow-lg hover:border-blue-300 transition-all"
            >
              <h3 className="font-semibold text-gray-900 mb-2">Prova de Português</h3>
              <p className="text-gray-600 text-sm">Clique para visualizar relatório</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
