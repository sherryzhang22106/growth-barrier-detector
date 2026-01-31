import { AssessmentResponse, Scores } from '../types';
import { QUESTIONS } from '../constants';

/**
 * 辅助函数：格式化高分题目
 */
function formatHighScoreQuestions(detailedResponses: Record<number, any>) {
  let output = '';
  for (const [qId, data] of Object.entries(detailedResponses)) {
    if (data.score >= 3) {
      output += `\nQ${qId}: ${data.question}\n`;
      output += `你的选择：${data.text}\n`;
      output += `得分：${data.score}/4\n`;
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
    if (responses[q.id] !== undefined) {
      allDetailed[q.id] = {
        question: q.text,
        text: getAnswerText(q.id),
        score: getChoiceScore(q.id)
      };
    }
  });

  const beliefEntries = Object.entries(scores.beliefScores).sort((a, b) => b[1] - a[1]);
  const secondaryBelief = beliefEntries.length > 1 ? beliefEntries[1][0] : "无";

  const behaviorEntries = Object.entries(scores.patternScores).sort((a, b) => b[1] - a[1]);
  const keyBehavior = behaviorEntries.length > 0 ? behaviorEntries[0][0] : "无";

  return {
    basic_info: {
      age_group: getAnswerText(1),
      focus_areas: [getAnswerText(2)],
      stuck_duration: getAnswerText(3),
      change_expectation: getAnswerText(4),
      life_satisfaction: responses[5]
    },
    scores: {
      obstacle_index: scores.overallIndex,
      level: scores.level,
      dimensions: scores.beliefScores,
      behaviors: scores.patternScores
    },
    core_issues: {
      primary_belief: scores.coreBarrier,
      primary_score: Math.round((scores.beliefScores[scores.coreBarrier] || 0) / 5 * 12),
      secondary_belief: secondaryBelief,
      key_behavior: keyBehavior
    },
    open_responses: {
      q48_limiting_voice: responses[48] || "我必须完美，否则就不安全",
      q49_fear: responses[49] || "害怕努力后依然失败，证明我彻底无能",
      q50_ideal_future: responses[50] || "内心自由，充满力量地创造生活"
    },
    detailed_responses: allDetailed,
    high_score_summary: formatHighScoreQuestions(allDetailed)
  };
}

// Note: buildAIAnalysisPrompt and callAIAnalysisAPI have been moved to the backend
// The AI analysis is now handled securely by /api/ai/analyze.ts
// This keeps the API key safe on the server side
