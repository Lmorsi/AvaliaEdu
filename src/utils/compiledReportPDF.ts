import type { GradingResult, Assessment } from '@/types/index';

export interface ReportData {
  assessment: Assessment;
  results: GradingResult[];
  generatedAt: string;
  totalStudents: number;
  averageScore: number;
  highestScore: number;
  lowestScore: number;
}

export function generateCompiledReport(data: ReportData): string {
  const lines: string[] = [];

  lines.push('='.repeat(80));
  lines.push('RELATÓRIO COMPILADO DE AVALIAÇÕES');
  lines.push('='.repeat(80));
  lines.push('');

  lines.push(`Avaliação: ${data.assessment.title}`);
  lines.push(`Total de Questões: ${data.assessment.totalQuestions}`);
  lines.push(`Formato de Respostas: ${data.assessment.answerFormat}`);
  lines.push('');

  lines.push('INFORMAÇÕES DO RELATÓRIO');
  lines.push('-'.repeat(80));
  lines.push(`Data de Geração: ${data.generatedAt}`);
  lines.push(`Total de Estudantes: ${data.totalStudents}`);
  lines.push(`Pontuação Média: ${data.averageScore.toFixed(2)}%`);
  lines.push(`Pontuação Máxima: ${data.highestScore.toFixed(2)}%`);
  lines.push(`Pontuação Mínima: ${data.lowestScore.toFixed(2)}%`);
  lines.push('');

  lines.push('RESULTADOS INDIVIDUAIS');
  lines.push('-'.repeat(80));
  lines.push('Estudante | Questões Corretas | Pontuação | Data/Hora');
  lines.push('-'.repeat(80));

  data.results.forEach((result) => {
    const percentage = ((result.correctAnswers / result.totalQuestions) * 100).toFixed(2);
    const date = new Date(result.timestamp).toLocaleString('pt-BR');
    lines.push(
      `${result.studentId.padEnd(15)} | ${String(result.correctAnswers).padEnd(17)} | ${percentage.padEnd(9)}% | ${date}`
    );
  });

  lines.push('');
  lines.push('='.repeat(80));
  lines.push('FIM DO RELATÓRIO');
  lines.push('='.repeat(80));

  return lines.join('\n');
}

export function downloadCompiledReport(reportText: string, assessmentTitle: string): void {
  const element = document.createElement('a');
  const file = new Blob([reportText], { type: 'text/plain' });

  element.href = URL.createObjectURL(file);
  element.download = `relatorio_${assessmentTitle.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.txt`;
  document.body.appendChild(element);
  element.click();
  document.body.removeChild(element);
  URL.revokeObjectURL(element.href);
}

export function generateCSVReport(data: ReportData): string {
  const rows: string[] = [];

  rows.push('Estudante,Questões Corretas,Total de Questões,Pontuação (%),Data/Hora');

  data.results.forEach((result) => {
    const percentage = ((result.correctAnswers / result.totalQuestions) * 100).toFixed(2);
    const date = new Date(result.timestamp).toLocaleString('pt-BR');
    rows.push(`"${result.studentId}",${result.correctAnswers},${result.totalQuestions},${percentage},${date}`);
  });

  return rows.join('\n');
}

export function downloadCSVReport(csvText: string, assessmentTitle: string): void {
  const element = document.createElement('a');
  const file = new Blob([csvText], { type: 'text/csv;charset=utf-8;' });

  element.href = URL.createObjectURL(file);
  element.download = `relatorio_${assessmentTitle.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.csv`;
  document.body.appendChild(element);
  element.click();
  document.body.removeChild(element);
  URL.revokeObjectURL(element.href);
}

export function calculateStatistics(results: GradingResult[], totalQuestions: number): {
  average: number;
  highest: number;
  lowest: number;
  median: number;
  standardDeviation: number;
} {
  if (results.length === 0) {
    return { average: 0, highest: 0, lowest: 0, median: 0, standardDeviation: 0 };
  }

  const scores = results.map((r) => (r.correctAnswers / totalQuestions) * 100);
  const average = scores.reduce((a, b) => a + b, 0) / scores.length;
  const highest = Math.max(...scores);
  const lowest = Math.min(...scores);

  scores.sort((a, b) => a - b);
  const median = scores.length % 2 === 0 ? (scores[scores.length / 2 - 1] + scores[scores.length / 2]) / 2 : scores[Math.floor(scores.length / 2)];

  const variance = scores.reduce((sum, score) => sum + Math.pow(score - average, 2), 0) / scores.length;
  const standardDeviation = Math.sqrt(variance);

  return {
    average,
    highest,
    lowest,
    median,
    standardDeviation,
  };
}
