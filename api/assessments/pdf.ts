import type { VercelRequest, VercelResponse } from '@vercel/node';
import prisma from '../lib/db';

async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: '方法不允许' });
  }

  try {
    const { id } = req.query;

    if (!id || typeof id !== 'string') {
      return res.status(400).json({ error: '缺少测评ID' });
    }

    const assessment = await prisma.assessment.findUnique({
      where: { id },
      include: {
        redemptionCode: {
          select: {
            packageType: true,
          },
        },
      },
    });

    if (!assessment) {
      return res.status(404).json({ error: '测评不存在' });
    }

    // Parse JSON strings for SQLite compatibility
    const scores = typeof assessment.scores === 'string' ? JSON.parse(assessment.scores) : assessment.scores;

    // Generate HTML for PDF
    const html = generateReportHTML({
      id: assessment.id,
      code: assessment.code,
      scores,
      aiAnalysis: assessment.aiAnalysis || '',
      createdAt: assessment.createdAt,
    });

    // Return HTML that can be printed as PDF
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    return res.status(200).send(html);

  } catch (error) {
    console.error('Generate PDF error:', error);
    return res.status(500).json({ error: '生成PDF失败' });
  }
}

// 获取内耗等级信息
function getLevelInfo(score: number) {
  if (score <= 30) return { level: '低内耗型', emoji: '🌟', color: '#10b981' };
  if (score <= 50) return { level: '轻度内耗型', emoji: '🌤️', color: '#f59e0b' };
  if (score <= 70) return { level: '中度内耗型', emoji: '🌧️', color: '#f97316' };
  if (score <= 85) return { level: '重度内耗型', emoji: '⛈️', color: '#ef4444' };
  return { level: '严重内耗型', emoji: '🌪️', color: '#dc2626' };
}

function generateReportHTML(data: {
  id: string;
  code: string;
  scores: any;
  aiAnalysis: string;
  createdAt: Date;
}): string {
  const { code, scores, aiAnalysis, createdAt } = data;

  // 将指数转换为分数（乘以10）
  const totalScore = Math.round((scores.overallIndex || 0) * 10);
  const levelInfo = getLevelInfo(totalScore);

  return `
<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>内耗指数测评报告 - ${code}</title>
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, 'Noto Sans SC', 'PingFang SC', 'Microsoft YaHei', sans-serif;
      line-height: 1.8;
      color: #1e293b;
      background: #fff;
      padding: 30px;
      font-size: 14px;
    }
    .header {
      text-align: center;
      margin-bottom: 30px;
      padding: 30px;
      background: linear-gradient(135deg, #f97316 0%, #ec4899 100%);
      border-radius: 16px;
      color: white;
    }
    .logo {
      font-size: 28px;
      font-weight: 900;
      margin-bottom: 8px;
    }
    .subtitle {
      color: rgba(255,255,255,0.8);
      font-size: 14px;
    }
    .meta {
      margin-top: 15px;
      font-size: 11px;
      color: rgba(255,255,255,0.7);
    }
    .score-section {
      display: flex;
      justify-content: space-around;
      margin: 25px 0;
      padding: 25px;
      background: linear-gradient(135deg, #fff7ed 0%, #fdf2f8 100%);
      border-radius: 16px;
      border: 1px solid #fed7aa;
    }
    .score-item {
      text-align: center;
    }
    .score-value {
      font-size: 48px;
      font-weight: 900;
      background: linear-gradient(135deg, #f97316 0%, #ec4899 100%);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      background-clip: text;
    }
    .score-unit {
      font-size: 20px;
      color: #9ca3af;
    }
    .score-label {
      font-size: 12px;
      color: #64748b;
      margin-top: 5px;
      font-weight: 600;
    }
    .level-value {
      font-size: 20px;
      font-weight: 700;
      color: ${levelInfo.color};
    }
    .level-emoji {
      font-size: 32px;
      margin-bottom: 5px;
    }
    .barrier-value {
      font-size: 16px;
      font-weight: 700;
      color: #f97316;
    }
    .section {
      margin: 25px 0;
    }
    .section-title {
      font-size: 18px;
      font-weight: 800;
      color: #1e293b;
      margin-bottom: 15px;
      padding-left: 12px;
      border-left: 4px solid #f97316;
    }
    .analysis-content {
      background: linear-gradient(135deg, #fff7ed 0%, #fdf2f8 100%);
      padding: 20px;
      border-radius: 12px;
      white-space: pre-wrap;
      font-size: 13px;
      line-height: 2;
      border: 1px solid #fed7aa;
    }
    .scores-grid {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 12px;
    }
    .score-card {
      background: linear-gradient(135deg, #fff7ed 0%, #fdf2f8 100%);
      padding: 16px 12px;
      border-radius: 12px;
      text-align: center;
      border: 1px solid #fed7aa;
    }
    .score-card-label {
      font-size: 11px;
      color: #64748b;
      margin-bottom: 6px;
      font-weight: 600;
    }
    .score-card-value {
      font-size: 24px;
      font-weight: 800;
      color: #f97316;
    }
    .score-card-percent {
      font-size: 11px;
      color: #9ca3af;
      margin-top: 2px;
    }
    .footer {
      margin-top: 40px;
      padding-top: 20px;
      border-top: 1px solid #fed7aa;
      text-align: center;
      font-size: 11px;
      color: #94a3b8;
    }
    .disclaimer {
      margin-top: 30px;
      padding: 15px;
      background: #fef3c7;
      border-radius: 8px;
      font-size: 11px;
      color: #92400e;
    }
    .qrcode-section {
      margin-top: 30px;
      text-align: center;
      padding: 20px;
      background: #f8fafc;
      border-radius: 12px;
    }
    .qrcode-text {
      font-size: 12px;
      color: #64748b;
      margin-top: 10px;
    }
  </style>
</head>
<body>
  <div class="header">
    <div class="logo">🧠 内耗指数测评报告</div>
    <div class="subtitle">找出你的能量黑洞，拿回属于你的精力</div>
    <div class="meta">
      兑换码: ${code} | 生成时间: ${new Date(createdAt).toLocaleString('zh-CN')}
    </div>
  </div>

  <div class="score-section">
    <div class="score-item">
      <div class="score-value">${totalScore}<span class="score-unit">分</span></div>
      <div class="score-label">内耗指数</div>
    </div>
    <div class="score-item">
      <div class="level-emoji">${levelInfo.emoji}</div>
      <div class="level-value">${levelInfo.level}</div>
      <div class="score-label">内耗等级</div>
    </div>
    <div class="score-item">
      <div class="barrier-value">${scores.coreBarrier || '-'}</div>
      <div class="score-label">最大能量黑洞</div>
    </div>
  </div>

  ${scores.beliefScores ? `
  <div class="section">
    <h2 class="section-title">四维内耗分布</h2>
    <div class="scores-grid">
      ${Object.entries(scores.beliefScores).map(([key, value]) => {
        const numValue = Number(value);
        const percent = Math.round(numValue * 20); // 转换为百分比 (5分制 -> 100%)
        return `
        <div class="score-card">
          <div class="score-card-label">${key}</div>
          <div class="score-card-value">${Math.round(numValue * 10)}</div>
          <div class="score-card-percent">内耗程度 ${percent}%</div>
        </div>
      `}).join('')}
    </div>
  </div>
  ` : ''}

  ${scores.patternScores ? `
  <div class="section">
    <h2 class="section-title">行为模式得分</h2>
    <div class="scores-grid">
      ${Object.entries(scores.patternScores).map(([key, value]) => `
        <div class="score-card">
          <div class="score-card-label">${key}</div>
          <div class="score-card-value">${Math.round(Number(value))}</div>
        </div>
      `).join('')}
    </div>
  </div>
  ` : ''}

  ${aiAnalysis ? `
  <div class="section">
    <h2 class="section-title">🔍 AI 深度分析报告</h2>
    <div class="analysis-content">${aiAnalysis}</div>
  </div>
  ` : ''}

  <div class="disclaimer">
    <strong>免责声明：</strong>本测评报告仅供参考，不构成专业心理咨询或医疗建议。如有心理健康问题，请咨询专业人士。
  </div>

  <div class="footer">
    <p>内耗指数测评 &copy; ${new Date().getFullYear()}</p>
    <p>找出你的能量黑洞，拿回属于你的精力</p>
  </div>
</body>
</html>
  `;
}

export default handler;
