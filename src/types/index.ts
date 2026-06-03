export interface Assessment {
  id: string;
  title: string;
  totalQuestions: number;
  answerFormat: 'ABCDE' | 'TF';
}

export interface StudentAssessment {
  studentId: string;
  studentName: string;
  assessmentId: string;
  assessmentTitle: string;
  className: string;
  token: string;
}

// Formato real retornado pelo OMR service (scan-omr edge function)
export interface OMRGrid {
  row: number;
  bubbles: Array<{
    col: number;
    x: number;
    y: number;
    radius: number;
    fill_percentage: number;
    marked: boolean;
  }>;
}

export interface OMRResult {
  success: boolean;
  error?: string;
  qr?: {
    raw: string;
    token: string | null;
    format: string;
  };
  fiducial?: {
    found: boolean;
    count: number;
    corners: number[][];
  };
  bubbles?: {
    found: boolean;
    grids: OMRGrid[];
  };
  corrected_image?: string;
  debug_image?: string;
  // Respostas já convertidas (quando retornadas pelo process-answer-sheet)
  answers?: Record<string, string>;
}

export interface GradingResult {
  studentId: string;
  assessmentId: string;
  answers: Record<string, string>;
  totalQuestions: number;
  correctAnswers: number;
  score: number;
  timestamp: string;
}
