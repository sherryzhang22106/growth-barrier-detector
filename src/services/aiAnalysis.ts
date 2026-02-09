import { AssessmentResponse, Scores } from '../types';
import { QUESTIONS } from '../constants';

/**
 * 辅助函数：格式化高分题目
 */
function formatHighScoreQuestions(detailedResponses: Record<number, any>) {
  let output = '';
  for (const [qId, data] of Object.entries(detailedResponses)) {
    if (data.score >= 2) {
      output += `\nQ${qId}: ${data.question}\n`;
      output += `你的选择：${data.text}\n`;
      output += `得分：${data.score}/3\n`;
    }
  }
  return output || "暂无显著高分项";
}

/**
 * 格式化用户数据以便AI分析
 * 这个函数在前端调用，准备数据发送给后端API
 */
export function formatUserDataForAI(responses: AssessmentResponse, scores: Scores) {
  const getAnswerText = (id: number) => {
    const q = QUESTIONS.find(q => q.id === id);
    const val = responses[id];
    if (q?.type === 'CHOICE' && q.options) {
      const idx = Number(val);
      return q.options[idx]?.label || "未选择";
    }
    return val;
  };

  const getChoiceScore = (id: number) => {
    const q = QUESTIONS.find(q => q.id === id);
    const val = responses[id];
    if (q?.type === 'CHOICE' && q.options) {
      const idx = Number(val);
      return q.options[idx]?.value || 0;
    }
    return Number(val) || 0;
  };

  const allDetailed: Record<number, any> = {};
  QUESTIONS.forEach(q => {
    if (responses[q.id] !== undefined && q.type === 'CHOICE') {
      allDetailed[q.id] = {
        question: q.text,
        text: getAnswerText(q.id),
        score: getChoiceScore(q.id)
      };
    }
  });

  return {
    scores: {
      totalScore: scores.totalScore,
      level: scores.level,
      levelInfo: scores.levelInfo,
      beatPercent: scores.beatPercent,
      topDimension: scores.topDimension,
      dimensionScores: scores.dimensionScores,
      dimensionPercentages: scores.dimensionPercentages
    },
    open_responses: {
      q36_breakdown: responses[36] || "未填写",
      q37_vacation: responses[37] || "未填写",
      q38_status: responses[38] || "未填写"
    },
    detailed_responses: allDetailed,
    high_score_summary: formatHighScoreQuestions(allDetailed)
  };
}

// Note: buildAIAnalysisPrompt and callAIAnalysisAPI have been moved to the backend
// The AI analysis is now handled securely by /api/ai/analyze.ts
// This keeps the API key safe on the server side
