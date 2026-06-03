import { jsPDF } from 'jspdf';
import QRCode from 'qrcode';

export interface AssessmentData {
  id?: string;
  nome_avaliacao?: string;
  professor?: string;
  turma?: string;
  data?: string;
  instrucoes?: string;
  nome_escola?: string;
  componente_curricular?: string;
  tipo_avaliacao?: string;
  mostrar_tipo_avaliacao?: boolean;
  selected_items?: AssessmentItem[];
  colunas?: string;
}

export interface AssessmentItem {
  id?: string;
  tipo_item: string;
  texto_item?: string;
  resposta_correta?: string;
  alternativas?: string[];
  afirmativas?: string[];
  gabarito_afirmativas?: string[];
  quantidade_linhas?: number;
}

export interface StudentInfo {
  id: string;
  name: string;
  token?: string;
}

const generateQRCodeDataURL = async (data: string): Promise<string> => {
  return QRCode.toDataURL(data, {
    errorCorrectionLevel: 'M',
    margin: 1,
    width: 200,
  });
};

export const generateAssessmentPDFWithQRCode = async (
  assessmentData: AssessmentData,
  studentInfo: StudentInfo
): Promise<Blob> => {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });

  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 15;
  let y = margin;

  // Header
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text(assessmentData.nome_escola || 'Escola', margin, y);
  y += 8;

  doc.setFontSize(11);
  doc.setFont('helvetica', 'normal');
  if (assessmentData.componente_curricular) {
    doc.text(`Componente: ${assessmentData.componente_curricular}`, margin, y);
    y += 6;
  }
  if (assessmentData.professor) {
    doc.text(`Professor(a): ${assessmentData.professor}`, margin, y);
    y += 6;
  }
  if (assessmentData.turma) {
    doc.text(`Turma: ${assessmentData.turma}`, margin, y);
    y += 6;
  }

  doc.text(`Aluno(a): ${studentInfo.name}`, margin, y);
  y += 6;

  if (assessmentData.data) {
    doc.text(`Data: ${assessmentData.data}`, margin, y);
    y += 6;
  }

  // QR Code
  if (studentInfo.token) {
    const qrUrl = `${window.location.origin}/s/${studentInfo.token}`;
    const qrDataUrl = await generateQRCodeDataURL(qrUrl);
    const qrSize = 30;
    doc.addImage(qrDataUrl, 'PNG', pageWidth - margin - qrSize, margin, qrSize, qrSize);
  }

  y += 5;
  doc.setDrawColor(0);
  doc.line(margin, y, pageWidth - margin, y);
  y += 8;

  // Assessment title
  if (assessmentData.nome_avaliacao) {
    doc.setFontSize(13);
    doc.setFont('helvetica', 'bold');
    doc.text(assessmentData.nome_avaliacao.toUpperCase(), pageWidth / 2, y, { align: 'center' });
    y += 8;
  }

  // Instructions
  if (assessmentData.instrucoes) {
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    const lines = doc.splitTextToSize(`Instrucoes: ${assessmentData.instrucoes}`, pageWidth - 2 * margin);
    doc.text(lines, margin, y);
    y += lines.length * 5 + 5;
  }

  // Items
  const items = assessmentData.selected_items || [];
  doc.setFontSize(11);

  items.forEach((item, index) => {
    if (y > 270) {
      doc.addPage();
      y = margin;
    }

    const itemText = item.texto_item || '';
    const cleanText = itemText.replace(/<[^>]*>/g, '');

    doc.setFont('helvetica', 'bold');
    doc.text(`${index + 1}.`, margin, y);
    doc.setFont('helvetica', 'normal');

    const textLines = doc.splitTextToSize(cleanText, pageWidth - 2 * margin - 8);
    doc.text(textLines, margin + 8, y);
    y += textLines.length * 5 + 3;

    if (item.tipo_item === 'multipla_escolha' && item.alternativas) {
      const validAlts = item.alternativas.filter(a => a && a.trim() !== '');
      validAlts.forEach((alt, altIdx) => {
        if (y > 270) { doc.addPage(); y = margin; }
        const letter = String.fromCharCode(65 + altIdx);
        const altLines = doc.splitTextToSize(`${letter}) ${alt}`, pageWidth - 2 * margin - 12);
        doc.text(altLines, margin + 12, y);
        y += altLines.length * 5 + 2;
      });
    } else if (item.tipo_item === 'verdadeiro_falso' && item.afirmativas) {
      item.afirmativas.filter(a => a && a.trim() !== '').forEach((afirm, afirmIdx) => {
        if (y > 270) { doc.addPage(); y = margin; }
        const afirmLines = doc.splitTextToSize(`${afirmIdx + 1}. ( ) ${afirm}`, pageWidth - 2 * margin - 12);
        doc.text(afirmLines, margin + 12, y);
        y += afirmLines.length * 5 + 2;
      });
    } else if (item.tipo_item === 'discursiva') {
      const lineCount = item.quantidade_linhas || 5;
      for (let l = 0; l < lineCount; l++) {
        if (y > 270) { doc.addPage(); y = margin; }
        doc.setDrawColor(180);
        doc.line(margin, y + 4, pageWidth - margin, y + 4);
        y += 7;
      }
    }

    y += 4;
  });

  return doc.output('blob');
};

export const downloadAssessmentPDF = async (
  assessmentData: AssessmentData,
  studentInfo: StudentInfo
): Promise<void> => {
  const blob = await generateAssessmentPDFWithQRCode(assessmentData, studentInfo);
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `avaliacao_${studentInfo.name.replace(/\s+/g, '_')}.pdf`;
  a.click();
  URL.revokeObjectURL(url);
};
