/**
 * Exemplo de como integrar o sistema de tokens ao fluxo de geração de PDF
 *
 * Este arquivo demonstra como:
 * 1. Gerar tokens para alunos
 * 2. Passar tokens para o servidor de PDF
 * 3. Validar tokens ao processar correções
 */

import { createAssessmentTokens, getStudentToken } from '../lib/tokenUtils'
import { validateTokenOnBackend, processToken } from '../lib/tokenValidation'
import type { AssessmentToken } from '../lib/supabase'

/**
 * PASSO 1: Gerar tokens quando a prova é criada
 * Execute isso ANTES de permitir download do PDF
 */
export const generateTokensForAssessment = async (
  assessmentId: string,
  studentIds: string[],
  userId: string
) => {
  try {
    console.log(`Gerando ${studentIds.length} tokens para prova ${assessmentId}`)

    const tokens = await createAssessmentTokens(
      assessmentId,
      studentIds,
      userId,
      {
        timestamp: new Date().toISOString(),
        totalStudents: studentIds.length
      }
    )

    console.log('Tokens gerados com sucesso:', tokens.length)
    return tokens
  } catch (error) {
    console.error('Erro ao gerar tokens:', error)
    throw error
  }
}

/**
 * PASSO 2: Passar token para o servidor de PDF
 * Modificar a função de geração de PDF para incluir tokens
 */
export const preparePDFDataWithTokens = async (
  assessmentData: any,
  selectedItems: any[],
  studentId?: string
) => {
  try {
    // Se houver studentId, buscar token correspondente
    let token = null
    if (studentId && assessmentData.id) {
      const studentToken = await getStudentToken(
        assessmentData.id,
        studentId
      )
      token = studentToken?.token
    }

    // Retornar dados preparados para o servidor
    return {
      ...assessmentData,
      selectedItems,
      studentId,
      token, // Incluir token no payload
      timestamp: new Date().toISOString()
    }
  } catch (error) {
    console.error('Erro ao preparar dados do PDF:', error)
    throw error
  }
}

/**
 * PASSO 3: Validar token quando receber QR code
 * Use isso em um app de correção ou processamento
 */
export const validateAndProcessQRCode = async (
  qrCodeContent: string
) => {
  try {
    // Parser JSON do QR code
    const qrData = JSON.parse(qrCodeContent)

    if (!qrData.token) {
      throw new Error('Token não encontrado no QR code')
    }

    console.log(`Validando token: ${qrData.token}`)

    // Validar token no backend
    const validationResult = await processToken(qrData.token)

    if (!validationResult.valid) {
      throw new Error('Token inválido ou não encontrado')
    }

    console.log('Token validado com sucesso')
    console.log(`Aluno: ${validationResult.student_id}`)
    console.log(`Prova: ${validationResult.assessment_id}`)

    return {
      valid: true,
      tokenId: validationResult.token_id,
      studentId: validationResult.student_id,
      assessmentId: validationResult.assessment_id,
      isValidated: validationResult.is_validated
    }
  } catch (error) {
    console.error('Erro ao validar QR code:', error)
    return {
      valid: false,
      error: error instanceof Error ? error.message : 'Erro desconhecido'
    }
  }
}

/**
 * PASSO 4: Exemplo completo de fluxo
 */
export const completeTokenFlowExample = async () => {
  // Dados de exemplo
  const userId = 'user-123'
  const assessmentId = 'assessment-456'
  const studentIds = ['student-1', 'student-2', 'student-3']

  try {
    // 1. Gerar tokens para todos os alunos
    console.log('1. Gerando tokens...')
    const tokens = await generateTokensForAssessment(
      assessmentId,
      studentIds,
      userId
    )

    // 2. Professor faz download do PDF (tokens são incluídos nos QR codes)
    console.log('2. Preparando dados para PDF...')
    const pdfData = await preparePDFDataWithTokens(
      { id: assessmentId, nome_avaliacao: 'Avaliação 1' },
      [{ /* items */ }],
      studentIds[0]
    )

    // 3. Aplicativo de correção lê o QR code
    console.log('3. Simulando leitura de QR code...')
    const mockQRCode = JSON.stringify({
      assessmentId,
      studentId: studentIds[0],
      token: tokens[0].token,
      gabarito: [/* dados */]
    })

    // 4. Validar e processar
    console.log('4. Validando token...')
    const result = await validateAndProcessQRCode(mockQRCode)

    if (result.valid) {
      console.log('Fluxo completo validado com sucesso!')
      console.log('Pronto para processar correção')
    }
  } catch (error) {
    console.error('Erro no fluxo completo:', error)
  }
}

/**
 * Integração com useDashboard.ts
 * Adicionar isso na função generatePDF:
 *
 * const generatePDF = useCallback(async (columns: string) => {
 *   // ... código existente ...
 *
 *   // NOVO: Gerar tokens antes de fazer requisição
 *   if (userId && selectedItemsForAssessment.length > 0) {
 *     try {
 *       const students = selectedItemsForAssessment.map(item => item.student_id)
 *       await generateTokensForAssessment(assessmentId, students, userId)
 *     } catch (error) {
 *       console.warn('Aviso ao gerar tokens:', error)
 *     }
 *   }
 *
 *   // Preparar dados com tokens
 *   const pdfDataWithTokens = await preparePDFDataWithTokens(
 *     assessmentData,
 *     selectedItemsForAssessment
 *   )
 *
 *   const response = await callPdfApi('generate-pdf', { columns, ...pdfDataWithTokens })
 *   // ... resto do código ...
 * }, [userId, assessmentData, selectedItemsForAssessment])
 */
