
export type PackageType = 'STANDARD' | 'PREMIUM' | 'ENTERPRISE';

export interface RedemptionCode {
  code: string;
  package_type: PackageType;
  status: 'UNUSED' | 'ACTIVATED' | 'EXPIRED';
  created_at: string;
  activated_at?: string;
  user_id?: string;
}

export interface Question {
  id: number;
  text: string;
  type: 'SCALE' | 'CHOICE' | 'OPEN';
  dimension?: string;
  options?: { value: number; label: string }[];
}

export interface AssessmentResponse {
  [questionId: number]: any;
}

export interface Scores {
  beliefScores: { [key: string]: number };
  patternScores: { [key: string]: number };
  overallIndex: number;
  level: string;
  coreBarrier: string;
}

export interface ReportData {
  scores: Scores;
  analysis: string;
  immediateActions: string[];
  plan21Days: {
    week1: string[];
    week2: string[];
    week3: string[];
  };
  relapseWarnings: {
    signal: string;
    strategy: string;
  }[];
  // AI Deep Analysis Extension
  aiStatus?: 'pending' | 'generating' | 'completed' | 'failed';
  aiAnalysis?: string;
  aiGeneratedAt?: string;
  aiWordCount?: number;
}
