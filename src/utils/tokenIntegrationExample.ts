import { supabase } from '../services/supabase';

export interface AssessmentToken {
  id: string;
  assessment_id: string;
  student_id: string;
  user_id: string;
  token: string;
  qr_code_data?: Record<string, unknown>;
  is_validated: boolean;
  validation_timestamp?: string;
  created_at: string;
}

export const generateUniqueToken = (): string => {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 10);
  return `${timestamp}_${random}`;
};

export const createSingleToken = async (
  assessmentId: string,
  studentId: string,
  userId: string,
  qrCodeData?: Record<string, unknown>
): Promise<AssessmentToken | null> => {
  const token = generateUniqueToken();

  const { data, error } = await supabase
    .from('assessment_tokens')
    .insert([{
      assessment_id: assessmentId,
      student_id: studentId,
      user_id: userId,
      token,
      qr_code_data: qrCodeData || null,
      is_validated: false,
    }])
    .select()
    .maybeSingle();

  if (error) {
    console.error('Error creating token:', error);
    return null;
  }

  return data as AssessmentToken;
};

export const createAssessmentTokens = async (
  assessmentId: string,
  studentIds: string[],
  userId: string,
  qrCodeData?: Record<string, unknown>
): Promise<AssessmentToken[]> => {
  const tokens = studentIds.map(studentId => ({
    assessment_id: assessmentId,
    student_id: studentId,
    user_id: userId,
    token: generateUniqueToken(),
    qr_code_data: qrCodeData || null,
    is_validated: false,
  }));

  const { data, error } = await supabase
    .from('assessment_tokens')
    .insert(tokens)
    .select();

  if (error) {
    console.error('Error creating tokens:', error);
    return [];
  }

  return (data || []) as AssessmentToken[];
};

export const validateToken = async (token: string): Promise<AssessmentToken | null> => {
  const { data, error } = await supabase
    .from('assessment_tokens')
    .select('*')
    .eq('token', token)
    .maybeSingle();

  if (error || !data) return null;
  return data as AssessmentToken;
};

export const markTokenAsValidated = async (token: string): Promise<boolean> => {
  const { error } = await supabase
    .from('assessment_tokens')
    .update({
      is_validated: true,
      validation_timestamp: new Date().toISOString(),
    })
    .eq('token', token);

  return !error;
};

export const getAssessmentTokens = async (
  assessmentId: string,
  userId: string
): Promise<AssessmentToken[]> => {
  const { data, error } = await supabase
    .from('assessment_tokens')
    .select('*')
    .eq('assessment_id', assessmentId)
    .eq('user_id', userId);

  if (error) return [];
  return (data || []) as AssessmentToken[];
};

export const getStudentToken = async (
  assessmentId: string,
  studentId: string
): Promise<AssessmentToken | null> => {
  const { data, error } = await supabase
    .from('assessment_tokens')
    .select('*')
    .eq('assessment_id', assessmentId)
    .eq('student_id', studentId)
    .maybeSingle();

  if (error || !data) return null;
  return data as AssessmentToken;
};

export const isTokenValidated = async (token: string): Promise<boolean> => {
  const result = await validateToken(token);
  return result?.is_validated ?? false;
};

export const deleteAssessmentTokens = async (assessmentId: string): Promise<boolean> => {
  const { error } = await supabase
    .from('assessment_tokens')
    .delete()
    .eq('assessment_id', assessmentId);

  return !error;
};
