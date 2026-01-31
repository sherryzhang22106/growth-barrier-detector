
import { AssessmentResponse, Scores } from '../types';
import { QUESTIONS } from '../constants';

/**
 * 核心逻辑：将用户回答映射为实际分值
 * CHOICE 类型：回答值为索引(idx)，根据索引从配置中提取 value
 * SCALE 类型：回答值为分值本身
 */
const getScore = (qId: number, val: any): number => {
  if (val === undefined || val === null) return 0;
  const q = QUESTIONS.find(q => q.id === qId);
  if (!q) return 0;

  if (q.type === 'CHOICE') {
    // val 在这里是选项索引
    const idx = Number(val);
    return q.options?.[idx]?.value || 0;
  }
  
  if (q.type === 'SCALE') {
    return Number(val) || 0;
  }

  return 0;
};

/**
 * 维度得分计算
 */
export const calculateDimensionScores = (responses: AssessmentResponse) => {
  const scores: Record<string, number> = {
    "金钱与价值": getScore(6, responses[6]) + getScore(7, responses[7]) + getScore(8, responses[8]),
    "自我价值": getScore(9, responses[9]) + getScore(10, responses[10]) + getScore(11, responses[11]),
    "能力信念": getScore(12, responses[12]) + getScore(13, responses[13]) + getScore(14, responses[14]),
    "关系模式": getScore(15, responses[15]) + getScore(16, responses[16]) + getScore(17, responses[17]),
    "时间与年龄": getScore(18, responses[18]) + getScore(19, responses[19]) + getScore(20, responses[20]),
    "风险与失败": getScore(21, responses[21]) + getScore(22, responses[22]) + getScore(23, responses[23]),
    "世界观": getScore(24, responses[24]) + getScore(25, responses[25]) + getScore(26, responses[26]),
    "完美主义": getScore(27, responses[27]) + getScore(28, responses[28]) + getScore(29, responses[29])
  };

  // 转换为 0-5 分制用于显示
  const displayScores: Record<string, number> = {};
  Object.entries(scores).forEach(([name, sum]) => {
    const max = name === "完美主义" ? 13 : 12;
    displayScores[name] = Number(((sum / max) * 5).toFixed(2));
  });

  return { raw: scores, display: displayScores };
};

/**
 * 行为模式得分计算
 */
export const calculateBehaviorScores = (responses: AssessmentResponse) => {
  const patterns: Record<string, number> = {
    "拖延与逃避": getScore(30, responses[30]) + getScore(31, responses[31]) + getScore(32, responses[32]),
    "自我破坏": getScore(33, responses[33]) + getScore(34, responses[34]) + getScore(35, responses[35]),
    "过度补偿": getScore(36, responses[36]) + getScore(37, responses[37]) + getScore(38, responses[38]),
    "过度防御": getScore(39, responses[39]) + getScore(40, responses[40]) + getScore(41, responses[41]),
    "能量内耗": getScore(42, responses[42]) + getScore(43, responses[43]) + getScore(44, responses[44]),
    "完美主义行为": getScore(45, responses[45]) + getScore(46, responses[46]) + getScore(47, responses[47])
  };

  const getLevel = (score: number, max: number) => {
    if (max === 12) {
      if (score <= 4) return "轻度";
      if (score <= 8) return "中度";
      return "重度";
    } else {
      if (score <= 4) return "轻度";
      if (score <= 9) return "中度";
      return "重度";
    }
  };

  const results: Record<string, { score: number; level: string }> = {};
  Object.entries(patterns).forEach(([name, score]) => {
    const max = ["自我破坏", "能量内耗", "完美主义行为"].includes(name) ? 13 : 12;
    results[name] = { score, level: getLevel(score, max) };
  });

  return results;
};

/**
 * 综合阻碍指数算法
 */
export const calculateObstacleIndex = (rawBeliefs: Record<string, number>, rawBehaviors: Record<string, { score: number; level: string }>, responses: AssessmentResponse) => {
  const beliefScore = 
    (rawBeliefs["金钱与价值"] || 0) * 0.12 +
    (rawBeliefs["自我价值"] || 0) * 0.20 +
    (rawBeliefs["能力信念"] || 0) * 0.15 +
    (rawBeliefs["关系模式"] || 0) * 0.13 +
    (rawBeliefs["时间与年龄"] || 0) * 0.08 +
    (rawBeliefs["风险与失败"] || 0) * 0.12 +
    (rawBeliefs["世界观"] || 0) * 0.08 +
    (rawBeliefs["完美主义"] || 0) * 0.12;

  const beliefPercentage = beliefScore / 12.12;
  const behaviorTotal = Object.values(rawBehaviors).reduce((acc: number, val) => acc + val.score, 0);
  const behaviorPercentage = behaviorTotal / 75;

  let baseIndex = (beliefPercentage * 0.55 + behaviorPercentage * 0.45) * 10;

  const timeFactorMap: Record<string, number> = { "0": 1.0, "1": 1.1, "2": 1.2, "3": 1.3 };
  const q3Index = responses[3]?.toString() || "0";
  const multiplier = timeFactorMap[q3Index] || 1.0;

  const satisfaction = Number(responses[5]) || 5;
  const satisfactionFactor = 1 + (10 - satisfaction) * 0.02;

  const finalIndex = baseIndex * multiplier * satisfactionFactor;
  return Math.min(Number(finalIndex.toFixed(1)), 10.0);
};

/**
 * 核心阻碍识别
 */
export const identifyCoreObstacle = (beliefRawScores: Record<string, number>, behaviorRawScores: Record<string, { score: number; level: string }>) => {
  const topBeliefs = Object.entries(beliefRawScores)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 2);

  const topBehavior = Object.entries(behaviorRawScores)
    .sort(([, a], [, b]) => b.score - a.score)[0];

  const correlations: Record<string, string[]> = {
    "自我价值": ["自我破坏", "过度补偿"],
    "完美主义": ["拖延与逃避", "能量内耗", "完美主义行为"],
    "能力信念": ["拖延与逃避", "自我破坏"],
    "风险与失败": ["拖延与逃避", "过度防御"],
    "关系模式": ["过度补偿", "过度防御"]
  };

  const primary = topBeliefs[0][0];
  const behaviorName = topBehavior[0];
  const isStronglyCorrelated = correlations[primary]?.includes(behaviorName);

  return {
    primary_belief: primary,
    key_behavior: behaviorName,
    pattern_type: isStronglyCorrelated ? "强关联型" : "多点型",
    severity_boost: isStronglyCorrelated ? 1.2 : 1.0
  };
};

/**
 * 等级划分
 */
export const getLevelString = (index: number) => {
  if (index <= 2.9) return "绿灯区 (轻度阻碍)";
  if (index <= 4.9) return "黄灯区 (中度阻碍)";
  if (index <= 6.9) return "橙灯区 (中重度阻碍)";
  if (index <= 8.4) return "红灯区 (重度阻碍)";
  return "紧急区 (极重度阻碍)";
};
