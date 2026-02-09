
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
  placeholder?: string;
}

export interface AssessmentResponse {
  [questionId: number]: any;
}

// 内耗维度得分
export interface DimensionScores {
  '思维内耗': number;
  '情绪内耗': number;
  '行动内耗': number;
  '关系内耗': number;
  [key: string]: number;
}

// 维度百分比
export interface DimensionPercentages {
  '思维内耗': number;
  '情绪内耗': number;
  '行动内耗': number;
  '关系内耗': number;
  [key: string]: number;
}

// 结果等级信息
export interface ResultLevel {
  level: string;
  emoji: string;
  percent: string;
  tags: string[];
}

export interface Scores {
  // 各维度原始得分
  dimensionScores: DimensionScores;
  // 各维度百分比 (0-100)
  dimensionPercentages: DimensionPercentages;
  // 总分 (0-100)
  totalScore: number;
  // 等级信息
  levelInfo: ResultLevel;
  // 击败百分比
  beatPercent: number;
  // 最高内耗维度
  topDimension: string;
  // 兼容旧字段
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
