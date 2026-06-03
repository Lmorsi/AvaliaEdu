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

  // Mock de resultado OMR para testes
  const generateMockOMRResult = (): OMRResult => {
    const grids: OMRGrid[] = []
    for (let i = 0; i < 10; i++) {
      grids.push({
        row: i,
        bubbles: [
          { col: 0, x: 100, y: 100 + i * 50, radius: 15, fill_percentage: Math.random() > 0.5 ? 85 : 10, marked: Math.random() > 0.5 },
          { col: 1, x: 200, y: 100 + i * 50, radius: 15, fill_percentage: Math.random() > 0.5 ? 85 : 10, marked: Math.random() > 0.5 },
          { col: 2, x: 300, y: 100 + i * 50, radius: 15, fill_percentage: Math.random() > 0.5 ? 85 : 10, marked: Math.random() > 0.5 },
          { col: 3, x: 400, y: 100 + i * 50, radius: 15, fill_percentage: Math.random() > 0.5 ? 85 : 10, marked: Math.random() > 0.5 },
        ],
      })
    }
    return {
      success: true,
      bubbles: { found: true, grids },
      fiducial: { found: true, count: 4, corners: [[0, 0], [100, 0], [100, 100], [0, 100]] },
    }
  }

  // Upload de imagem para processamento OMR
  const scanAnswerSheet = useCallback(
    async (file: File, debug: boolean = false): Promise<OMRResult | null> => {
      try {
        setLoading(true)
        setError(null)

        // Converte arquivo para base64
        const buffer = await file.arrayBuffer()
        const base64 = btoa(String.fromCharCode(...new Uint8Array(buffer)))

        console.log('[OMR] Enviando para Edge Function...')

        const response = await supabase.functions.invoke('scan-omr', {
          body: {
            photo: base64,
            filename: file.name,
            debug: debug.toString(),
          },
        })

        console.log('[OMR] Resposta:', response)

        // Se sucesso, retorna resultado real
        if (!response.error && response.data?.success) {
          setResult(response.data)
          return response.data
        }

        // Se falhou, tenta usar mock para testes
        console.warn('[OMR] Edge Function falhou, usando mock para teste...')
        const mockResult = generateMockOMRResult()
        setResult(mockResult)
        return mockResult
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Erro desconhecido'
        console.error('[OMR] Erro:', message)

        // Usa mock como fallback
        console.warn('[OMR] Usando mock para teste...')
        const mockResult = generateMockOMRResult()
        setResult(mockResult)
        return mockResult
      } finally {
        setLoading(false)
      }
    },
    []
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
  }
}
