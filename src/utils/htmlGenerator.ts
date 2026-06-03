export interface HTMLGeneratorOptions {
  title?: string;
  style?: string;
  scripts?: string[];
}

export function generateAssessmentHTML(
  content: string,
  options: HTMLGeneratorOptions = {}
): string {
  const { title = 'Avaliacao', style = '', scripts = [] } = options;

  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${escapeHtml(title)}</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: Arial, sans-serif; font-size: 14px; line-height: 1.5; color: #333; }
    @media print {
      body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
      @page { margin: 10mm; }
    }
    ${style}
  </style>
</head>
<body>
  ${content}
  ${scripts.map(src => `<script src="${escapeHtml(src)}"><\/script>`).join('\n  ')}
</body>
</html>`;
}

export function generateQuestionHTML(
  questionNumber: number,
  questionText: string,
  alternatives?: string[],
  isDiscursive?: boolean,
  lineCount?: number
): string {
  const altHtml = alternatives
    ? alternatives
        .filter(a => a && a.trim())
        .map((alt, i) => `
      <div style="display:flex;align-items:flex-start;gap:6px;margin:4px 0;">
        <span style="font-weight:bold;min-width:20px;">${String.fromCharCode(65 + i)})</span>
        <span>${escapeHtml(alt)}</span>
      </div>`).join('')
    : '';

  const discursiveLines = isDiscursive
    ? Array.from({ length: lineCount || 5 })
        .map(() => '<div style="border-bottom:1px solid #aaa;height:6mm;margin:3px 0;"></div>')
        .join('')
    : '';

  return `
<div style="margin-bottom:12px;page-break-inside:avoid;">
  <div style="display:flex;align-items:flex-start;gap:6px;margin-bottom:6px;">
    <span style="font-weight:bold;min-width:24px;">${questionNumber}.</span>
    <div style="flex:1;">${questionText}</div>
  </div>
  ${altHtml}
  ${discursiveLines}
</div>`;
}

export function generateAnswerSheetHTML(
  studentName: string,
  assessmentName: string,
  questionCount: number,
  qrCodeDataUrl?: string
): string {
  const bubbles = Array.from({ length: Math.min(questionCount, 60) }, (_, i) => {
    const num = i + 1;
    return `
    <div style="display:flex;align-items:center;gap:6px;margin:3px 0;">
      <span style="font-weight:bold;min-width:20px;font-size:11px;">${num}</span>
      ${['A','B','C','D','E'].map(letter => `
      <div style="display:flex;flex-direction:column;align-items:center;gap:2px;">
        <span style="font-size:9px;font-weight:bold;">${letter}</span>
        <div style="width:10px;height:10px;border:1.5px solid #333;border-radius:50%;"></div>
      </div>`).join('')}
    </div>`;
  }).join('');

  return `
<div style="font-family:Arial,sans-serif;padding:10mm;">
  <div style="display:flex;justify-content:space-between;align-items:flex-start;border-bottom:1px solid #ccc;padding-bottom:8px;margin-bottom:8px;">
    <div>
      <h2 style="font-size:13px;margin:0 0 4px;">${escapeHtml(assessmentName)}</h2>
      <p style="font-size:11px;margin:0;">Aluno(a): ${escapeHtml(studentName)}</p>
      <p style="font-size:9px;margin:4px 0 0;color:#666;">Preencha completamente com caneta azul ou preta.</p>
    </div>
    ${qrCodeDataUrl ? `<img src="${qrCodeDataUrl}" style="width:28mm;height:28mm;" alt="QR Code" />` : ''}
  </div>
  <h3 style="font-size:12px;margin:0 0 6px;">FOLHA DE RESPOSTAS</h3>
  <div style="columns:4;column-gap:8mm;">
    ${bubbles}
  </div>
</div>`;
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
