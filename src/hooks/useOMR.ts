import { useState } from 'react';
import type { OMRResult } from '../types';

const ANSWER_OPTIONS = ['A', 'B', 'C', 'D', 'E'];

export function useOMR() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<OMRResult | null>(null);

  const convertImageToBase64 = async (imageFile: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(imageFile);
      reader.onload = () => {
        const base64 = reader.result as string;
        resolve(base64.split(',')[1]);
      };
      reader.onerror = reject;
    });
  };

  const scanAnswerSheet = async (imageFile: File, debug = false): Promise<OMRResult> => {
    setLoading(true);
    setError(null);

    try {
      const photoBase64 = await convertImageToBase64(imageFile);

      // Chama scan-omr (proxy para o OMR service FastAPI)
      const apiUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/scan-omr`;
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          photo: photoBase64,
          filename: imageFile.name || 'gabarito.jpg',
          debug,
        }),
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.error || `HTTP ${response.status}`);
      }

      const data = await response.json() as OMRResult;

      if (!data.success) {
        throw new Error(data.error || 'Falha ao processar gabarito');
      }

      setResult(data);
      return data;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro desconhecido';
      setError(message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  // Converte grids de bolhas (row=questão, col=opção) para mapa de respostas
  const convertBubblesToAnswers = (omrResult: OMRResult): Record<string, string> => {
    // Se o servidor já retornou respostas processadas, usa diretamente
    if (omrResult.answers && Object.keys(omrResult.answers).length > 0) {
      return omrResult.answers;
    }

    const answers: Record<string, string> = {};

    if (!omrResult.bubbles?.grids?.length) return answers;

    for (const grid of omrResult.bubbles.grids) {
      const markedBubbles = grid.bubbles.filter(b => b.marked);
      if (markedBubbles.length === 0) continue;

      // Usa a bolha com maior fill_percentage se houver múltiplas marcadas
      const best = markedBubbles.reduce((a, b) =>
        a.fill_percentage > b.fill_percentage ? a : b
      );

      const questionNum = grid.row + 1;
      const option = ANSWER_OPTIONS[best.col];
      if (option) {
        answers[questionNum.toString()] = option;
      }
    }

    return answers;
  };

  return {
    loading,
    error,
    result,
    scanAnswerSheet,
    convertBubblesToAnswers,
  };
}
