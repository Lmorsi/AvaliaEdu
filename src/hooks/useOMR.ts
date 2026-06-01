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
    const urls = [
      'http://localhost:8000',
      'http://127.0.0.1:8000',
      process.env.VITE_OMR_SERVICE_URL || '',
    ].filter(Boolean)

    return urls[0]
  }, [])

  // Upload de imagem para processamento OMR
  const scanAnswerSheet = useCallback(
    async (file: File, debug: boolean = false): Promise<OMRResult | null> => {
      try {
        setLoading(true)
        setError(null)

        const formData = new FormData()
        formData.append('photo', file)
        formData.append('debug', debug.toString())

        const omrUrl = getOMRServiceUrl()
        if (!omrUrl) {
          throw new Error('OMR Service URL not configured')
        }

        const response = await fetch(`${omrUrl}/api/omr/scan`, {
          method: 'POST',
          body: formData,
          signal: AbortSignal.timeout(30000), // 30 segundos
        })

        if (!response.ok) {
          const errorData = await response.json()
          throw new Error(errorData.error || `OMR Service error: ${response.statusText}`)
        }

        const data: OMRResult = await response.json()
        setResult(data)
        return data
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Unknown error'
        setError(message)
        console.error('OMR scan error:', message)
        return null
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

  // Salva resultado do scan no Supabase
  const saveGradingResult = useCallback(
    async (studentId: string, assessmentId: string, answers: DetectedAnswers) => {
      try {
        const { error } = await supabase
          .from('assessment_gradings')
          .insert({
            student_id: studentId,
            assessment_id: assessmentId,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          })

        if (error) throw error

        return true
      } catch (err) {
        console.error('Error saving grading result:', err)
        return false
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
    saveGradingResult,
    getOMRServiceUrl,
  }
}
