
import { AssessmentResponse, Scores, DimensionScores, DimensionPercentages, ResultLevel } from '../types';
import { QUESTIONS, OVERTHINKING_DIMENSIONS, RESULT_LEVELS } from '../constants';

/**
 * 核心逻辑：将用户回答映射为实际分值
 * CHOICE 类型：回答值为索引(idx)，根据索引从配置中提取 value
 */
const getScore = (qId: number, val: any): number => {
  if (val === undefined || val === null) return 0;
  const q = QUESTIONS.find(q => q.id === qId);
  if (!q) return 0;

  if (q.type === 'CHOICE') {
    const idx = Number(val);
    return q.options?.[idx]?.value || 0;
  }

  return 0;
};

/**
 * 计算各维度得分
 */
export const calculateDimensionScores = (responses: AssessmentResponse): {
  raw: DimensionScores;
  percentages: DimensionPercentages;
  display: Record<string, number>;
} => {
  const raw: DimensionScores = {
    '思维内耗': 0,
    '情绪内耗': 0,
    '行动内耗': 0,
    '关系内耗': 0
  };

  // 计算各维度原始得分
  Object.entries(OVERTHINKING_DIMENSIONS).forEach(([dimension, config]) => {
    let score = 0;
    config.questions.forEach(qId => {
      score += getScore(qId, responses[qId]);
    });
    raw[dimension] = score;
  });

  // 计算百分比
  const percentages: DimensionPercentages = {
    '思维内耗': 0,
    '情绪内耗': 0,
    '行动内耗': 0,
    '关系内耗': 0
  };

  Object.entries(OVERTHINKING_DIMENSIONS).forEach(([dimension, config]) => {
    percentages[dimension] = Math.round((raw[dimension] / config.maxScore) * 100);
  });

  // 兼容旧代码的 display 格式 (0-5分制)
  const display: Record<string, number> = {};
  Object.entries(raw).forEach(([dimension, score]) => {
    const maxScore = OVERTHINKING_DIMENSIONS[dimension as keyof typeof OVERTHINKING_DIMENSIONS]?.maxScore || 28;
    display[dimension] = Number(((score / maxScore) * 5).toFixed(2));
  });

  return { raw, percentages, display };
};

/**
 * 计算总分 (0-100)
 */
export const calculateTotalScore = (dimensionScores: DimensionScores): number => {
  let total = 0;
  Object.entries(OVERTHINKING_DIMENSIONS).forEach(([dimension, config]) => {
    total += dimensionScores[dimension] || 0;
  });
  return Math.round(total);
};

/**
 * 获取结果等级
 */
export const getResultLevel = (totalScore: number): ResultLevel => {
  for (const level of RESULT_LEVELS) {
    if (totalScore >= level.min && totalScore <= level.max) {
      return level;
    }
  }
  return RESULT_LEVELS[RESULT_LEVELS.length - 1];
};

/**
 * 计算击败百分比
 * 基于分数分布模拟
 */
export const calculateBeatPercent = (totalScore: number): number => {
  // 分数越低，击败的人越多
  // 0分 = 击败100%，100分 = 击败0%
  // 使用正态分布模拟，均值50，标准差20
  const mean = 50;
  const std = 20;

  // 简化计算：线性映射 + 微调
  let beatPercent = 100 - totalScore;

  // 根据分数段微调
  if (totalScore <= 25) {
    beatPercent = 88 + (25 - totalScore) * 0.48; // 88-100%
  } else if (totalScore <= 50) {
    beatPercent = 62 + (50 - totalScore) * 1.04; // 62-88%
  } else if (totalScore <= 75) {
    beatPercent = 15 + (75 - totalScore) * 1.88; // 15-62%
  } else {
    beatPercent = Math.max(0, (100 - totalScore) * 0.6); // 0-15%
  }

  return Math.round(Math.min(100, Math.max(0, beatPercent)));
};

/**
 * 找出最高内耗维度
 */
export const getTopDimension = (percentages: DimensionPercentages): string => {
  let topDimension = '思维内耗';
  let maxPercent = 0;

  Object.entries(percentages).forEach(([dimension, percent]) => {
    if (percent > maxPercent) {
      maxPercent = percent;
      topDimension = dimension;
    }
  });

  return topDimension;
};

/**
 * 综合评分计算 - 主入口
 */
export const calculateScores = (responses: AssessmentResponse): Scores => {
  const { raw, percentages, display } = calculateDimensionScores(responses);
  const totalScore = calculateTotalScore(raw);
  const levelInfo = getResultLevel(totalScore);
  const beatPercent = calculateBeatPercent(totalScore);
  const topDimension = getTopDimension(percentages);

  return {
    dimensionScores: raw,
    dimensionPercentages: percentages,
    totalScore,
    levelInfo,
    beatPercent,
    topDimension,
    // 兼容旧字段
    beliefScores: display,
    patternScores: percentages,
    overallIndex: totalScore / 10,
    level: levelInfo.level,
    coreBarrier: topDimension
  };
};

// ========== 兼容旧代码的导出 ==========

/**
 * 行为模式得分计算 (兼容旧代码)
 */
export const calculateBehaviorScores = (responses: AssessmentResponse) => {
  const { percentages } = calculateDimensionScores(responses);
  const results: Record<string, { score: number; level: string }> = {};

  Object.entries(percentages).forEach(([dimension, percent]) => {
    let level = '轻度';
    if (percent > 66) level = '重度';
    else if (percent > 33) level = '中度';
    results[dimension] = { score: percent, level };
  });

  return results;
};

/**
 * 综合阻碍指数算法 (兼容旧代码)
 */
export const calculateObstacleIndex = (
  rawBeliefs: Record<string, number>,
  rawBehaviors: Record<string, { score: number; level: string }>,
  responses: AssessmentResponse
): number => {
  const scores = calculateScores(responses);
  return scores.overallIndex;
};

/**
 * 核心阻碍识别 (兼容旧代码)
 */
export const identifyCoreObstacle = (
  beliefRawScores: Record<string, number>,
  behaviorRawScores: Record<string, { score: number; level: string }>
) => {
  const topDimension = Object.entries(beliefRawScores)
    .sort(([, a], [, b]) => b - a)[0]?.[0] || '思维内耗';

  return {
    primary_belief: topDimension,
    key_behavior: topDimension,
    pattern_type: "内耗型",
    severity_boost: 1.0
  };
};

/**
 * 等级划分 (兼容旧代码)
 */
export const getLevelString = (index: number): string => {
  const totalScore = index * 10;
  const levelInfo = getResultLevel(totalScore);
  return `${levelInfo.emoji} ${levelInfo.level}`;
};
