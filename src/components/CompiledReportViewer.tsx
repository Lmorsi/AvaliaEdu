import { useState, useEffect } from 'react';
import { useCompiledReport } from '@/hooks/useCompiledReport';
import { FileText, Download, AlertCircle, Loader } from 'lucide-react';
import type { ReportData } from '@/utils/compiledReportPDF';

interface CompiledReportViewerProps {
  assessmentId: string;
  assessmentTitle: string;
}

export function CompiledReportViewer({ assessmentId, assessmentTitle }: CompiledReportViewerProps) {
  const [reportData, setReportData] = useState<ReportData | null>(null);
  const { loading, error, fetchAssessmentResults, generateAndDownloadReport } = useCompiledReport();

  useEffect(() => {
    loadReport();
  }, [assessmentId]);

  const loadReport = async () => {
    try {
      const data = await fetchAssessmentResults(assessmentId);
      setReportData(data);
    } catch (err) {
      console.error('Erro ao carregar relatório:', err);
    }
  };

  const handleDownload = (format: 'txt' | 'csv') => {
    if (reportData) {
      generateAndDownloadReport(reportData, format);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader className="animate-spin mr-2" />
        <span>Carregando relatório...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start gap-3">
        <AlertCircle className="text-red-600 flex-shrink-0 mt-0.5" />
        <div>
          <h3 className="font-semibold text-red-900">Erro ao carregar relatório</h3>
          <p className="text-red-700 text-sm">{error}</p>
        </div>
      </div>
    );
  }

  if (!reportData) {
    return (
      <div className="text-center p-8 text-gray-500">
        <FileText className="mx-auto mb-2 opacity-50" size={40} />
        <p>Nenhum dado disponível</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">{assessmentTitle}</h2>
            <p className="text-gray-600 text-sm mt-1">Gerado em {reportData.generatedAt}</p>
          </div>
          <FileText className="text-blue-600" size={32} />
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-blue-50 rounded-lg p-4">
            <p className="text-gray-600 text-sm">Total de Estudantes</p>
            <p className="text-2xl font-bold text-blue-600">{reportData.totalStudents}</p>
          </div>
          <div className="bg-green-50 rounded-lg p-4">
            <p className="text-gray-600 text-sm">Pontuação Média</p>
            <p className="text-2xl font-bold text-green-600">{reportData.averageScore.toFixed(1)}%</p>
          </div>
          <div className="bg-yellow-50 rounded-lg p-4">
            <p className="text-gray-600 text-sm">Maior Pontuação</p>
            <p className="text-2xl font-bold text-yellow-600">{reportData.highestScore.toFixed(1)}%</p>
          </div>
          <div className="bg-red-50 rounded-lg p-4">
            <p className="text-gray-600 text-sm">Menor Pontuação</p>
            <p className="text-2xl font-bold text-red-600">{reportData.lowestScore.toFixed(1)}%</p>
          </div>
        </div>

        <div className="flex gap-3">
          <button
            onClick={() => handleDownload('txt')}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Download size={18} />
            Baixar (TXT)
          </button>
          <button
            onClick={() => handleDownload('csv')}
            className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
          >
            <Download size={18} />
            Baixar (CSV)
          </button>
        </div>
      </div>

      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <div className="bg-gray-50 px-6 py-4 border-b border-gray-200">
          <h3 className="font-semibold text-gray-900">Resultados Individuais</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600">Estudante</th>
                <th className="px-6 py-3 text-center text-xs font-semibold text-gray-600">Acertos</th>
                <th className="px-6 py-3 text-center text-xs font-semibold text-gray-600">Pontuação</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600">Data/Hora</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {reportData.results.map((result: any, idx: number) => {
                const percentage = ((result.correctAnswers / result.totalQuestions) * 100).toFixed(2);
                const date = new Date(result.timestamp).toLocaleString('pt-BR');
                return (
                  <tr key={idx} className="hover:bg-gray-50">
                    <td className="px-6 py-4 text-sm text-gray-900">{result.studentId}</td>
                    <td className="px-6 py-4 text-center text-sm text-gray-900">
                      {result.correctAnswers}/{result.totalQuestions}
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span className="inline-block px-3 py-1 rounded-full text-sm font-semibold bg-blue-100 text-blue-800">
                        {percentage}%
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">{date}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
