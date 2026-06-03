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

export interface OMRResult {
  success: boolean;
  error?: string;
  qr?: {
    raw: string;
    token: string;
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
  answers?: Record<string, string>;
}

export interface OMRGrid {
  x: number;
  y: number;
  rows: number;
  cols: number;
  bubbles: Bubble[];
}

export interface Bubble {
  id: string;
  question: number;
  option: string;
  marked: boolean;
  confidence: number;
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
