import { supabase } from './supabase'
import type { AssessmentToken } from './supabase'

/**
 * Gera um token criptográfico único para um aluno
 * Formato: TIMESTAMP_RANDOM_HASH
 * Exemplo: 1734000000_a1b2c3d4e5f6g7h8
 */
export const generateUniqueToken = (): string => {
  const timestamp = Date.now().toString(36)
  const random = Math.random().toString(36).substring(2, 15)
  return `${timestamp}_${random}`
}

/**
 * Cria tokens para todos os alunos de uma turma para uma prova específica
 */
export const createAssessmentTokens = async (
  assessmentId: string,
  studentIds: string[],
  userId: string,
  qrCodeData?: any
): Promise<AssessmentToken[]> => {
  const tokens: any[] = []

  for (const studentId of studentIds) {
    const token = generateUniqueToken()
    tokens.push({
      assessment_id: assessmentId,
      student_id: studentId,
      user_id: userId,
      token,
      qr_code_data: qrCodeData || null
    })
  }

  const { data, error } = await supabase
    .from('assessment_tokens')
    .insert(tokens)
    .select()

  if (error) {
    console.error('Erro ao criar tokens:', error)
    throw error
  }

  return data || []
}

/**
 * Cria um token único para um aluno específico
 */
export const createSingleToken = async (
  assessmentId: string,
  studentId: string,
  userId: string,
  qrCodeData?: any
): Promise<AssessmentToken> => {
  const token = generateUniqueToken()

  const { data, error } = await supabase
    .from('assessment_tokens')
    .insert({
      assessment_id: assessmentId,
      student_id: studentId,
      user_id: userId,
      token,
      qr_code_data: qrCodeData || null
    })
    .select()
    .single()

  if (error) {
    console.error('Erro ao criar token:', error)
    throw error
  }

  return data
}

/**
 * Valida um token de prova
 * Retorna os dados do token se válido
 */
export const validateToken = async (token: string): Promise<AssessmentToken | null> => {
  const { data, error } = await supabase
    .from('assessment_tokens')
    .select('*')
    .eq('token', token)
    .maybeSingle()

  if (error) {
    console.error('Erro ao validar token:', error)
    return null
  }

  return data
}

/**
 * Marca um token como validado no backend
 */
export const markTokenAsValidated = async (token: string): Promise<boolean> => {
  const { error } = await supabase
    .from('assessment_tokens')
    .update({
      is_validated: true,
      validation_timestamp: new Date().toISOString()
    })
    .eq('token', token)

  if (error) {
    console.error('Erro ao marcar token como validado:', error)
    return false
  }

  return true
}

/**
 * Busca todos os tokens de uma prova
 */
export const getAssessmentTokens = async (
  assessmentId: string,
  userId: string
): Promise<AssessmentToken[]> => {
  const { data, error } = await supabase
    .from('assessment_tokens')
    .select('*')
    .eq('assessment_id', assessmentId)
    .eq('user_id', userId)
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Erro ao buscar tokens da prova:', error)
    return []
  }

  return data || []
}

/**
 * Busca o token de um aluno específico em uma prova
 */
export const getStudentToken = async (
  assessmentId: string,
  studentId: string
): Promise<AssessmentToken | null> => {
  const { data, error } = await supabase
    .from('assessment_tokens')
    .select('*')
    .eq('assessment_id', assessmentId)
    .eq('student_id', studentId)
    .maybeSingle()

  if (error) {
    console.error('Erro ao buscar token do aluno:', error)
    return null
  }

  return data
}

/**
 * Verifica se um token foi validado
 */
export const isTokenValidated = async (token: string): Promise<boolean> => {
  const tokenData = await validateToken(token)
  return tokenData?.is_validated || false
}

/**
 * Deleta tokens de uma prova (quando a prova é deletada)
 */
export const deleteAssessmentTokens = async (assessmentId: string): Promise<boolean> => {
  const { error } = await supabase
    .from('assessment_tokens')
    .delete()
    .eq('assessment_id', assessmentId)

  if (error) {
    console.error('Erro ao deletar tokens da prova:', error)
    return false
  }

  return true
}
