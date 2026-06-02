import { useState } from 'react';
import { supabase } from '../services/supabase';
import type { OMRResult } from '../types';

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

  const scanAnswerSheet = async (imageFile: File, _debug = false) => {
    setLoading(true);
    setError(null);

    try {
      const imageBase64 = await convertImageToBase64(imageFile);

      const apiUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/process-answer-sheet`;
      const headers = {
        'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
        'Content-Type': 'application/json',
      };

      const response = await fetch(apiUrl, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          image: imageBase64,
          debug: _debug,
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json() as OMRResult;

      if (!data.success) {
        throw new Error(data.error || 'Failed to process answer sheet');
      }

      setResult(data);
      return data;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      setError(message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const convertBubblesToAnswers = (omrResult: OMRResult): Record<string, string> => {
    const answers: Record<string, string> = {};

    if (omrResult.bubbles?.grids) {
      for (const grid of omrResult.bubbles.grids) {
        for (const bubble of grid.bubbles) {
          if (bubble.marked && bubble.confidence > 0.5) {
            answers[bubble.question.toString()] = bubble.option;
          }
        }
      }
    }

    if (omrResult.answers) {
      return omrResult.answers;
    }

    return answers;
  };

  const saveGradingResult = async (
    studentId: string,
    assessmentId: string,
    answers: Record<string, string>,
    score?: number
  ) => {
    try {
      const { error: insertError } = await supabase
        .from('student_results')
        .insert([
          {
            student_id: studentId,
            assessment_id: assessmentId,
            answers,
            score: score || 0,
            created_at: new Date().toISOString(),
          },
        ]);

      if (insertError) throw insertError;
      return true;
    } catch (err) {
      console.error('Error saving grading result:', err);
      throw err;
    }
  };

  return {
    loading,
    error,
    result,
    scanAnswerSheet,
    convertBubblesToAnswers,
    saveGradingResult,
  };
}
