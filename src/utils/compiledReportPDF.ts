import { jsPDF } from 'jspdf';
import type { GradingResult } from '../types/index';

export interface CompiledReportData {
  assessmentName: string;
  className: string;
  gradingDate: string;
  totalStudents: number;
  results: GradingResult[];
  answerKey: string[];
  questionStats: QuestionStat[];
}

export interface QuestionStat {
  questionNumber: number;
  correctAnswer: string;
  totalCorrect: number;
  totalIncorrect: number;
  optionCounts: Record<string, number>;
  successRate: number;
}

export const generateCompiledReportPDF = (reportData: CompiledReportData): Blob => {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 15;
  let y = margin;

  // Title
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.text('RELATORIO DE CORRECAO', pageWidth / 2, y, { align: 'center' });
  y += 8;

  doc.setFontSize(11);
  doc.setFont('helvetica', 'normal');
  doc.text(reportData.assessmentName, pageWidth / 2, y, { align: 'center' });
  y += 6;
  doc.text(`Turma: ${reportData.className}  |  Data: ${reportData.gradingDate}`, pageWidth / 2, y, { align: 'center' });
  y += 10;

  // Summary
  doc.setDrawColor(0);
  doc.line(margin, y, pageWidth - margin, y);
  y += 6;

  doc.setFont('helvetica', 'bold');
  doc.text('RESUMO', margin, y);
  y += 6;

  doc.setFont('helvetica', 'normal');
  const avgScore = reportData.results.length > 0
    ? reportData.results.reduce((acc, r) => acc + r.score, 0) / reportData.results.length
    : 0;

  doc.text(`Total de Alunos: ${reportData.totalStudents}`, margin, y); y += 5;
  doc.text(`Avaliados: ${reportData.results.length}`, margin, y); y += 5;
  doc.text(`Media da Turma: ${avgScore.toFixed(2)}`, margin, y); y += 8;

  // Answer key
  doc.line(margin, y, pageWidth - margin, y);
  y += 6;
  doc.setFont('helvetica', 'bold');
  doc.text('GABARITO', margin, y);
  y += 6;

  doc.setFont('helvetica', 'normal');
  const keyText = reportData.answerKey.map((a, i) => `${i + 1}:${a}`).join('  ');
  const keyLines = doc.splitTextToSize(keyText, pageWidth - 2 * margin);
  doc.text(keyLines, margin, y);
  y += keyLines.length * 5 + 8;

  // Student results table
  if (y > 240) { doc.addPage(); y = margin; }
  doc.line(margin, y, pageWidth - margin, y);
  y += 6;
  doc.setFont('helvetica', 'bold');
  doc.text('RESULTADOS DOS ALUNOS', margin, y);
  y += 6;

  // Table header
  const colWidths = [80, 25, 30, 30];
  const cols = ['Aluno', 'Acertos', 'Erros', 'Nota'];
  let x = margin;
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  cols.forEach((col, i) => {
    doc.text(col, x + 2, y);
    x += colWidths[i];
  });
  y += 5;
  doc.line(margin, y, pageWidth - margin, y);
  y += 4;

  doc.setFont('helvetica', 'normal');
  reportData.results.forEach(result => {
    if (y > 275) { doc.addPage(); y = margin; }
    x = margin;
    const row = [
      result.studentId,
      result.correctAnswers.toString(),
      (result.totalQuestions - result.correctAnswers).toString(),
      result.score.toFixed(2),
    ];
    row.forEach((cell, i) => {
      doc.text(cell, x + 2, y);
      x += colWidths[i];
    });
    y += 5;
  });

  // Question stats
  if (reportData.questionStats.length > 0) {
    if (y > 230) { doc.addPage(); y = margin; }
    y += 4;
    doc.line(margin, y, pageWidth - margin, y);
    y += 6;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.text('ESTATISTICAS POR QUESTAO', margin, y);
    y += 6;

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    reportData.questionStats.forEach(stat => {
      if (y > 275) { doc.addPage(); y = margin; }
      const optStr = Object.entries(stat.optionCounts)
        .map(([k, v]) => `${k}:${v}`)
        .join(', ');
      doc.text(
        `Q${stat.questionNumber} (Gabarito: ${stat.correctAnswer}) - Acertos: ${stat.totalCorrect} (${stat.successRate.toFixed(0)}%) | ${optStr}`,
        margin, y
      );
      y += 5;
    });
  }

  return doc.output('blob');
};

export const downloadCompiledReportPDF = (reportData: CompiledReportData): void => {
  const blob = generateCompiledReportPDF(reportData);
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `relatorio_${reportData.assessmentName.replace(/\s+/g, '_')}.pdf`;
  a.click();
  URL.revokeObjectURL(url);
};
