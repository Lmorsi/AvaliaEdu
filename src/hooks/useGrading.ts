import { useState } from 'react';
import { supabase } from '../services/supabase';

export interface GradingData {
  assessmentName: string;
  totalQuestions: number;
  answerKey: string[];
  itemDescriptors: string[];
  itemTypes: string[];
  itemAlternatives: string[][];
  itemGroups: number[][];
  folderId: string | null;
}

export interface StudentResult {
  studentId: string;
  studentName: string;
  answers: string[];
  score: number;
  correctCount: number;
  incorrectCount: number;
}

export interface GradingSession {
  id: string;
  assessmentName: string;
  totalQuestions: number;
  answerKey: string[];
  itemDescriptors: string[];
  itemTypes: string[];
  itemAlternatives: string[][];
  itemGroups: number[][];
  folderId: string | null;
  classId: string;
  gradingDate: string;
  createdAt: string;
}

export function useGrading() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const createGrading = async (classId: string, gradingData: GradingData) => {
    setLoading(true);
    setError(null);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Not authenticated');

      const { data, error: insertError } = await supabase
        .from('assessment_gradings')
        .insert([{
          user_id: session.user.id,
          class_id: classId,
          assessment_name: gradingData.assessmentName,
          total_questions: gradingData.totalQuestions,
          answer_key: gradingData.answerKey,
          item_descriptors: gradingData.itemDescriptors,
          item_types: gradingData.itemTypes,
          item_alternatives: gradingData.itemAlternatives,
          item_groups: gradingData.itemGroups,
          folder_id: gradingData.folderId,
          grading_date: new Date().toISOString(),
        }])
        .select()
        .single();

      if (insertError) throw insertError;
      return data;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      setError(message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const getGradings = async () => {
    setLoading(true);
    setError(null);
    try {
      const { data, error: queryError } = await supabase
        .from('assessment_gradings')
        .select('*')
        .order('created_at', { ascending: false });

      if (queryError) throw queryError;
      return data || [];
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      setError(message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const getGradingById = async (gradingId: string) => {
    setLoading(true);
    setError(null);
    try {
      const { data, error: queryError } = await supabase
        .from('assessment_gradings')
        .select('*')
        .eq('id', gradingId)
        .maybeSingle();

      if (queryError) throw queryError;
      return data;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      setError(message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const saveStudentResult = async (
    gradingId: string,
    studentId: string,
    answers: string[],
    answerKey: string[]
  ) => {
    setLoading(true);
    setError(null);
    try {
      const correctCount = answers.filter((a, i) => a === answerKey[i]).length;
      const incorrectCount = answers.filter((a, i) => a !== answerKey[i] && a !== '').length;
      const score = answerKey.length > 0 ? (correctCount / answerKey.length) * 10 : 0;

      const { data, error: insertError } = await supabase
        .from('student_results')
        .insert([{
          grading_id: gradingId,
          student_id: studentId,
          answers,
          score,
          correct_count: correctCount,
          incorrect_count: incorrectCount,
        }])
        .select()
        .single();

      if (insertError) throw insertError;
      return data;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      setError(message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const deleteGrading = async (gradingId: string) => {
    setLoading(true);
    setError(null);
    try {
      const { error: deleteError } = await supabase
        .from('assessment_gradings')
        .delete()
        .eq('id', gradingId);

      if (deleteError) throw deleteError;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      setError(message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  return {
    loading,
    error,
    createGrading,
    getGradings,
    getGradingById,
    saveStudentResult,
    deleteGrading,
  };
}
