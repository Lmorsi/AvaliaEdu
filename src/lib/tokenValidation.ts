/**
 * Serviço para validar tokens de prova via Edge Function
 */

interface ValidationResponse {
  valid: boolean
  token_id?: string
  assessment_id?: string
  student_id?: string
  is_validated?: boolean
  message: string
}

/**
 * Valida um token via Edge Function
 * @param token - Token a validar
 * @param action - 'validate' para marcar como validado, 'check' apenas para verificar
 */
export const validateTokenOnBackend = async (
  token: string,
  action: 'validate' | 'check' = 'validate'
): Promise<ValidationResponse> => {
  try {
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
    const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

    if (!supabaseUrl || !anonKey) {
      throw new Error('Credenciais do Supabase não configuradas')
    }

    const functionUrl = `${supabaseUrl}/functions/v1/validate-assessment-token`

    const response = await fetch(functionUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${anonKey}`,
        'X-Client-Info': 'supabase-js/2.75.0'
      },
      body: JSON.stringify({
        token,
        action
      })
    })

    if (!response.ok) {
      const errorData = await response.json()
      throw new Error(errorData.message || 'Erro ao validar token')
    }

    return await response.json()
  } catch (error) {
    console.error('Erro na validação de token:', error)
    throw error
  }
}

/**
 * Apenas verifica se um token existe e é válido sem marcá-lo como validado
 */
export const checkToken = async (token: string): Promise<ValidationResponse> => {
  return validateTokenOnBackend(token, 'check')
}

/**
 * Valida e marca um token como processado
 */
export const processToken = async (token: string): Promise<ValidationResponse> => {
  return validateTokenOnBackend(token, 'validate')
}
