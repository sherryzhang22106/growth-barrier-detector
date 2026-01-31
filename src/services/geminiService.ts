import { Scores, ReportData } from "../types";

/**
 * Generate basic report by calling the secure backend API
 * The API key is kept safe on the server side
 */
export const generateReport = async (scores: Scores, openAnswers: string[]): Promise<ReportData> => {
  const response = await fetch('/api/ai/report', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ scores, openAnswers }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || '报告生成失败');
  }

  const result = await response.json();

  if (!result.success) {
    throw new Error(result.error || '报告生成失败');
  }

  return result.data;
};
