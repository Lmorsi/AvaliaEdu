import jsPDF from 'jspdf'
import QRCode from 'qrcode'

interface QRCodeData {
  assessment_id: string
  class_id: string
  grading_id: string
  answer_key: string[]
  item_types: string[]
  item_descriptors: string[]
  item_alternatives: string[][]
  item_groups: number[][]
  total_questions: number
  assessment_name: string
}

interface AssessmentData {
  nomeEscola?: string
  professor?: string
  turma?: string
  componenteCurricular?: string
  data?: string
  tipoAvaliacao?: string
  nomeAvaliacao?: string
  instrucoes?: string
  selectedItems: any[]
  answerKey: string[]
  classId: string
  gradingId: string
}

export async function generateAssessmentPDFWithQRCode(
  assessmentData: AssessmentData
): Promise<void> {
  const pdf = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4'
  })

  const pageWidth = pdf.internal.pageSize.getWidth()
  const pageHeight = pdf.internal.pageSize.getHeight()
  const margin = 15
  const usableWidth = pageWidth - 2 * margin
  let currentY = margin

  const qrCodeData: QRCodeData = {
    assessment_id: assessmentData.gradingId,
    class_id: assessmentData.classId,
    grading_id: assessmentData.gradingId,
    answer_key: assessmentData.answerKey,
    item_types: assessmentData.selectedItems.map((item: any) => item.tipoItem || item.tipo_item || 'multipla_escolha'),
    item_descriptors: assessmentData.selectedItems.map((item: any) => item.descritor || ''),
    item_alternatives: assessmentData.selectedItems.map((item: any) => {
      const tipo = item.tipoItem || item.tipo_item
      if (tipo === 'verdadeiro_falso') {
        return ['V', 'F']
      }
      const alts = item.alternativas || []
      return alts.filter((a: string) => a && a.trim()).map((_: string, idx: number) => String.fromCharCode(65 + idx))
    }),
    item_groups: [],
    total_questions: assessmentData.answerKey.length,
    assessment_name: assessmentData.nomeAvaliacao || assessmentData.tipoAvaliacao || 'Avaliação'
  }

  const qrCodeImage = await QRCode.toDataURL(JSON.stringify(qrCodeData), {
    width: 300,
    margin: 1,
    errorCorrectionLevel: 'H'
  })

  pdf.addImage(qrCodeImage, 'PNG', pageWidth - margin - 30, margin, 30, 30)

  pdf.setFontSize(16)
  pdf.setFont('helvetica', 'bold')

  if (assessmentData.nomeEscola) {
    pdf.text(assessmentData.nomeEscola, margin, currentY, { maxWidth: usableWidth - 35 })
    currentY += 8
  }

  if (assessmentData.nomeAvaliacao || assessmentData.tipoAvaliacao) {
    pdf.setFontSize(14)
    pdf.text(assessmentData.nomeAvaliacao || assessmentData.tipoAvaliacao || '', margin, currentY, { maxWidth: usableWidth - 35 })
    currentY += 7
  }

  pdf.setFontSize(10)
  pdf.setFont('helvetica', 'normal')

  if (assessmentData.professor) {
    pdf.text(`Professor(a): ${assessmentData.professor}`, margin, currentY)
    currentY += 5
  }

  if (assessmentData.turma) {
    pdf.text(`Turma: ${assessmentData.turma}`, margin, currentY)
    currentY += 5
  }

  if (assessmentData.componenteCurricular) {
    pdf.text(`Componente Curricular: ${assessmentData.componenteCurricular}`, margin, currentY)
    currentY += 5
  }

  if (assessmentData.data) {
    pdf.text(`Data: ${assessmentData.data}`, margin, currentY)
    currentY += 5
  }

  currentY += 5
  pdf.setDrawColor(0)
  pdf.line(margin, currentY, pageWidth - margin, currentY)
  currentY += 8

  pdf.setFontSize(10)
  pdf.setFont('helvetica', 'bold')
  pdf.text('CAMPO PARA IDENTIFICAÇÃO (Preencha com caneta):', margin, currentY)
  currentY += 6

  pdf.setFont('helvetica', 'normal')
  pdf.text('Nome Completo: _______________________________________________', margin, currentY)
  currentY += 8
  pdf.text('Matrícula/Nº: _________________________________________________', margin, currentY)
  currentY += 10

  pdf.line(margin, currentY, pageWidth - margin, currentY)
  currentY += 8

  if (assessmentData.instrucoes) {
    pdf.setFontSize(9)
    pdf.setFont('helvetica', 'italic')
    const instrLines = pdf.splitTextToSize(assessmentData.instrucoes, usableWidth)
    pdf.text(instrLines, margin, currentY)
    currentY += instrLines.length * 5 + 5
  }

  pdf.setFontSize(10)
  pdf.setFont('helvetica', 'bold')
  pdf.text('FOLHA DE RESPOSTAS - Marque com X a alternativa correta:', margin, currentY)
  currentY += 8

  const questionsPerColumn = 10
  const columnWidth = usableWidth / 3
  const boxSize = 5
  const spacing = 7

  for (let i = 0; i < assessmentData.answerKey.length; i++) {
    const col = Math.floor(i / questionsPerColumn)
    const row = i % questionsPerColumn

    if (currentY + (row * spacing) > pageHeight - margin - 20) {
      pdf.addPage()
      currentY = margin
      pdf.setFontSize(9)
      pdf.setFont('helvetica', 'italic')
      pdf.text('(Continuação da folha de respostas)', margin, currentY)
      currentY += 8
    }

    const x = margin + (col * columnWidth)
    const y = currentY + (row * spacing)

    pdf.setFont('helvetica', 'normal')
    pdf.setFontSize(9)
    pdf.text(`${i + 1}.`, x, y + 4)

    const options = assessmentData.item_alternatives?.[i] || ['A', 'B', 'C', 'D', 'E']

    options.forEach((option, idx) => {
      const boxX = x + 8 + (idx * 8)
      pdf.rect(boxX, y, boxSize, boxSize)
      pdf.text(option, boxX + 1.5, y + 4)
    })
  }

  currentY += Math.ceil(assessmentData.answerKey.length / questionsPerColumn) * spacing + 10

  if (currentY > pageHeight - margin - 30) {
    pdf.addPage()
    currentY = margin
  }

  pdf.line(margin, currentY, pageWidth - margin, currentY)
  currentY += 8

  pdf.addPage()
  currentY = margin

  pdf.setFontSize(14)
  pdf.setFont('helvetica', 'bold')
  pdf.text('QUESTÕES', margin, currentY)
  currentY += 10

  assessmentData.selectedItems.forEach((item: any, index: number) => {
    const tipoItem = item.tipoItem || item.tipo_item

    if (currentY > pageHeight - margin - 50) {
      pdf.addPage()
      currentY = margin
    }

    pdf.setFontSize(10)
    pdf.setFont('helvetica', 'bold')
    pdf.text(`${index + 1}.`, margin, currentY)
    currentY += 6

    pdf.setFont('helvetica', 'normal')
    const textoItem = item.textoItem || item.texto_item || ''
    if (textoItem) {
      const itemLines = pdf.splitTextToSize(textoItem, usableWidth - 5)
      pdf.text(itemLines, margin + 5, currentY)
      currentY += itemLines.length * 5 + 3
    }

    if (tipoItem === 'multipla_escolha') {
      const alternativas = item.alternativas || []
      alternativas.forEach((alt: string, altIdx: number) => {
        if (alt && alt.trim()) {
          const letra = String.fromCharCode(65 + altIdx)
          const altText = `${letra}) ${alt}`
          const altLines = pdf.splitTextToSize(altText, usableWidth - 10)

          if (currentY + altLines.length * 5 > pageHeight - margin) {
            pdf.addPage()
            currentY = margin
          }

          pdf.text(altLines, margin + 8, currentY)
          currentY += altLines.length * 5 + 2
        }
      })
    } else if (tipoItem === 'verdadeiro_falso') {
      const afirmativas = [
        ...(item.afirmativas || []),
        ...(item.afirmativasExtras || item.afirmativas_extras || [])
      ].filter((a: string) => a && a.trim())

      afirmativas.forEach((afirmativa: string, afIdx: number) => {
        const afText = `${afIdx + 1}) ${afirmativa} ( )`
        const afLines = pdf.splitTextToSize(afText, usableWidth - 10)

        if (currentY + afLines.length * 5 > pageHeight - margin) {
          pdf.addPage()
          currentY = margin
        }

        pdf.text(afLines, margin + 8, currentY)
        currentY += afLines.length * 5 + 2
      })
    }

    currentY += 5
  })

  const fileName = `${assessmentData.nomeAvaliacao || 'Avaliacao'}_${assessmentData.turma || 'Turma'}.pdf`
  pdf.save(fileName.replace(/[^a-z0-9_-]/gi, '_'))
}
