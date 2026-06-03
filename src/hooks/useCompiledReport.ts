import { useState, useCallback } from 'react';
import { supabase } from '@/services/supabase';
import {
  generateCompiledReport,
  downloadCompiledReport,
  generateCSVReport,
  downloadCSVReport,
  calculateStatistics,
  type ReportData,
} from '@/utils/compiledReportPDF';
import type { GradingResult } from '@/types/index';

export function useCompiledReport() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchAssessmentResults = useCallback(
    async (assessmentId: string) => {
      try {
        setLoading(true);
        setError(null);

        const { data: assessment, error: assessmentError } = await supabase
          .from('assessments')
          .select('*')
          .eq('id', assessmentId)
          .maybeSingle();

        if (assessmentError) throw assessmentError;
        if (!assessment) throw new Error('Avaliação não encontrada');

        const { data: results, error: resultsError } = await supabase
          .from('assessment_gradings')
          .select('*')
          .eq('assessment_id', assessmentId);

        if (resultsError) throw resultsError;

        const typedResults = results as GradingResult[];
        const stats = calculateStatistics(typedResults, assessment.total_questions);

        const reportData: ReportData = {
          assessment: {
            id: assessment.id,
            title: assessment.title,
            totalQuestions: assessment.total_questions,
            answerFormat: assessment.answer_format,
          },
          results: typedResults,
          generatedAt: new Date().toLocaleString('pt-BR'),
          totalStudents: typedResults.length,
          averageScore: stats.average,
          highestScore: stats.highest,
          lowestScore: stats.lowest,
        };

        return reportData;
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Erro ao buscar resultados';
        setError(message);
        throw err;
      } finally {
        setLoading(false);
      }
    },
    []
  );

  const generateAndDownloadReport = useCallback(
    (reportData: ReportData, format: 'txt' | 'csv' = 'txt') => {
      try {
        if (format === 'csv') {
          const csv = generateCSVReport(reportData);
          downloadCSVReport(csv, reportData.assessment.title);
        } else {
          const text = generateCompiledReport(reportData);
          downloadCompiledReport(text, reportData.assessment.title);
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Erro ao gerar relatório';
        setError(message);
        throw err;
      }
    },
    []
  );

  return {
    loading,
    error,
    fetchAssessmentResults,
    generateAndDownloadReport,
  };
}
