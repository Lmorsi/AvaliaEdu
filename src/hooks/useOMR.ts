import { useState, useCallback } from 'react'
import { supabase } from '../lib/supabase'

export interface OMRResult {
  success: boolean
  qr?: {
    raw: string
    token: string
    format: string
  }
  fiducial?: {
    found: boolean
    count: number
    corners: number[][]
  }
  bubbles?: {
    found: boolean
    grids: OMRGrid[]
  }
  corrected_image?: string
  debug_image?: string
  error?: string
}

export interface OMRGrid {
  row: number
  bubbles: OMRBubble[]
}

export interface OMRBubble {
  col: number
  x: number
  y: number
  radius: number
  fill_percentage: number
  marked: boolean
}

export interface DetectedAnswers {
  [questionNumber: number]: string | null
}

export const useOMR = () => {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<OMRResult | null>(null)

  // Detecta OMR Service URL (local ou production)
  const getOMRServiceUrl = useCallback(() => {
    // URL configurada via variável de ambiente tem prioridade
    const envUrl = import.meta.env.VITE_OMR_SERVICE_URL as string | undefined
    if (envUrl) return envUrl

    // Se rodando em localhost, tenta o serviço local
    if (typeof window !== 'undefined' && window.location.hostname === 'localhost') {
      return 'http://localhost:8000'
    }

    // Em produção, usa a URL do Railway
    return 'https://avaliaedu-production-00be.up.railway.app'
  }, [])

  // Upload de imagem para processamento OMR
  const scanAnswerSheet = useCallback(
    async (file: File, debug: boolean = false): Promise<OMRResult> => {
      try {
        setLoading(true)
        setError(null)

        const formData = new FormData()
        formData.append('photo', file)
        formData.append('debug', debug.toString())

        const omrUrl = getOMRServiceUrl()

        const response = await fetch(`${omrUrl}/api/omr/scan`, {
          method: 'POST',
          body: formData,
          signal: AbortSignal.timeout(30000),
        })

        if (!response.ok) {
          let errorMsg = `Serviço OMR retornou erro ${response.status}`
          try {
            const errorData = await response.json()
            errorMsg = errorData.error || errorData.detail || errorMsg
          } catch { /* ignora erro de parse */ }
          const result: OMRResult = { success: false, error: errorMsg }
          setResult(result)
          return result
        }

        const data: OMRResult = await response.json()
        setResult(data)
        return data
      } catch (err) {
        const isAbort = err instanceof DOMException && err.name === 'AbortError'
        const isNetwork = err instanceof TypeError && err.message.includes('fetch')
        let message: string
        if (isAbort) {
          message = 'Tempo limite excedido ao conectar ao serviço de leitura de gabaritos.'
        } else if (isNetwork) {
          message = 'Serviço de leitura de gabaritos não está acessível. Verifique se o servidor OMR está em execução.'
        } else {
          message = err instanceof Error ? err.message : 'Erro desconhecido'
        }
        setError(message)
        console.error('OMR scan error:', message)
        return { success: false, error: message }
      } finally {
        setLoading(false)
      }
    },
    [getOMRServiceUrl]
  )

  // Converte resultado OMR em matriz de respostas
  const convertBubblesToAnswers = useCallback(
    (result: OMRResult): DetectedAnswers => {
      const answers: DetectedAnswers = {}

      if (!result.bubbles?.found || !result.bubbles.grids) {
        return answers
      }

      // Mapa de colunas para respostas
      const columnMap: { [key: number]: string } = {
        0: 'A',
        1: 'B',
        2: 'C',
        3: 'D',
        4: 'E',
        5: 'V', // Verdadeiro
        6: 'F', // Falso
      }

      // Processa cada grid (linha de questões)
      result.bubbles.grids.forEach((grid) => {
        let markedColumn: number | null = null

        // Encontra qual bolha foi marcada nesta linha
        grid.bubbles.forEach((bubble) => {
          if (bubble.marked) {
            markedColumn = bubble.col
          }
        })

        // Se encontrou bolha marcada, converte para resposta
        if (markedColumn !== null && markedColumn in columnMap) {
          const questionNumber = grid.row
          answers[questionNumber] = columnMap[markedColumn]
        }
      })

      return answers
    },
    []
  )

  // Valida token do QR code
  const validateQRToken = useCallback(
    async (token: string): Promise<{ valid: boolean; data?: any; error?: string }> => {
      try {
        const response = await supabase.functions.invoke(
          'validate-assessment-token',
          {
            body: { token, action: 'scan' },
          }
        )

        if (response.error) {
          return { valid: false, error: response.error.message }
        }

        return { valid: true, data: response.data }
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Token validation failed'
        return { valid: false, error: message }
      }
    },
    []
  )

  // Salva resultado OMR de um aluno individual diretamente no banco.
  // Cria o assessment_grading se ainda não existir para esta avaliação/turma,
  // e cria/atualiza o student_results correspondente.
  const saveStudentOMRResult = useCallback(
    async (params: {
      userId: string
      studentId: string
      assessmentId: string
      classId: string
      assessmentName: string
      answers: DetectedAnswers
      answerKey: string[]
      itemTypes: string[]
      itemDescriptors: string[]
      itemAlternatives: string[][]
      itemGroups: number[][]
      selectedItems: any[]
    }): Promise<{ success: boolean; gradingId?: string; error?: string }> => {
      try {
        const {
          userId, studentId, assessmentId, classId,
          assessmentName, answers, answerKey,
          itemTypes, itemDescriptors, itemAlternatives, itemGroups, selectedItems,
        } = params

        // Converte Record<number, string> para string[] indexado
        const answersArray: string[] = []
        Object.entries(answers).forEach(([idx, letter]) => {
          answersArray[parseInt(idx)] = letter
        })

        // Preenche posicoes vazias com string vazia
        for (let i = 0; i < answerKey.length; i++) {
          if (answersArray[i] === undefined) answersArray[i] = ''
        }

        // Calcula pontuacao
        let correctCount = 0
        let incorrectCount = 0
        answerKey.forEach((correct, i) => {
          const student = answersArray[i] || ''
          if (student && student.toUpperCase() === correct.toUpperCase()) {
            correctCount++
          } else if (student) {
            incorrectCount++
          }
        })
        const score = answerKey.length > 0 ? (correctCount / answerKey.length) * 100 : 0

        // Busca ou cria o assessment_grading para esta avaliacao+turma
        const { data: existingGrading } = await supabase
          .from('assessment_gradings')
          .select('id')
          .eq('user_id', userId)
          .eq('class_id', classId)
          .eq('assessment_name', assessmentName)
          .maybeSingle()

        let gradingId: string

        if (existingGrading) {
          gradingId = existingGrading.id
        } else {
          const { data: newGrading, error: gradingError } = await supabase
            .from('assessment_gradings')
            .insert({
              user_id: userId,
              class_id: classId,
              assessment_name: assessmentName,
              total_questions: answerKey.length,
              answer_key: answerKey,
              item_descriptors: itemDescriptors,
              item_types: itemTypes,
              item_alternatives: itemAlternatives,
              item_groups: itemGroups,
            })
            .select('id')
            .single()

          if (gradingError || !newGrading) {
            throw new Error(gradingError?.message || 'Falha ao criar registro de correção')
          }
          gradingId = newGrading.id
        }

        // Cria ou atualiza o resultado deste aluno (upsert por grading_id + student_id)
        const { error: resultError } = await supabase
          .from('student_results')
          .upsert(
            {
              grading_id: gradingId,
              student_id: studentId,
              answers: answersArray,
              score,
              correct_count: correctCount,
              incorrect_count: incorrectCount,
            },
            { onConflict: 'grading_id,student_id' }
          )

        if (resultError) throw new Error(resultError.message)

        return { success: true, gradingId }
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Erro desconhecido'
        console.error('saveStudentOMRResult error:', message)
        return { success: false, error: message }
      }
    },
    []
  )

  return {
    loading,
    error,
    result,
    scanAnswerSheet,
    convertBubblesToAnswers,
    validateQRToken,
    saveStudentOMRResult,
    getOMRServiceUrl,
  }
}
