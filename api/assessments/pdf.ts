import type { VercelRequest, VercelResponse } from '@vercel/node';
import prisma from '../lib/db';
import { withAuth } from '../lib/auth';

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

function generateReportHTML(data: {
  id: string;
  code: string;
  scores: any;
  aiAnalysis: string;
  createdAt: Date;
}): string {
  const { code, scores, aiAnalysis, createdAt } = data;

  return `
<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>成长阻碍探测报告 - ${code}</title>
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
      padding-bottom: 20px;
      border-bottom: 3px solid #4f46e5;
    }
    .logo {
      font-size: 24px;
      font-weight: 900;
      color: #4f46e5;
      margin-bottom: 8px;
    }
    .subtitle {
      color: #64748b;
      font-size: 13px;
    }
    .meta {
      margin-top: 15px;
      font-size: 11px;
      color: #94a3b8;
    }
    .score-section {
      display: flex;
      justify-content: space-around;
      margin: 25px 0;
      padding: 20px;
      background: #f8fafc;
      border-radius: 12px;
    }
    .score-item {
      text-align: center;
    }
    .score-value {
      font-size: 36px;
      font-weight: 900;
      color: #4f46e5;
    }
    .score-label {
      font-size: 11px;
      color: #64748b;
      margin-top: 5px;
      font-weight: 600;
    }
    .level-value {
      font-size: 16px;
      font-weight: 700;
      color: #f97316;
    }
    .barrier-value {
      font-size: 14px;
      font-weight: 600;
      color: #475569;
    }
    .section {
      margin: 25px 0;
    }
    .section-title {
      font-size: 16px;
      font-weight: 800;
      color: #1e293b;
      margin-bottom: 15px;
      padding-left: 12px;
      border-left: 4px solid #4f46e5;
    }
    .analysis-content {
      background: #f8fafc;
      padding: 20px;
      border-radius: 10px;
      white-space: pre-wrap;
      font-size: 13px;
      line-height: 2;
    }
    .scores-grid {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 10px;
    }
    .score-card {
      background: #f8fafc;
      padding: 12px;
      border-radius: 8px;
      text-align: center;
    }
    .score-card-label {
      font-size: 10px;
      color: #64748b;
      margin-bottom: 4px;
    }
    .score-card-value {
      font-size: 18px;
      font-weight: 700;
      color: #4f46e5;
    }
    .footer {
      margin-top: 40px;
      padding-top: 20px;
      border-top: 1px solid #e2e8f0;
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
  </style>
</head>
<body>
  <div class="header">
    <div class="logo">成长阻碍探测报告</div>
    <div class="subtitle">基于深层心理学的个性化成长分析</div>
    <div class="meta">
      兑换码: ${code} | 生成时间: ${new Date(createdAt).toLocaleString('zh-CN')}
    </div>
  </div>

  <div class="score-section">
    <div class="score-item">
      <div class="score-value">${scores.overallIndex || '-'}</div>
      <div class="score-label">阻碍指数</div>
    </div>
    <div class="score-item">
      <div class="level-value">${scores.level || '-'}</div>
      <div class="score-label">状态等级</div>
    </div>
    <div class="score-item">
      <div class="barrier-value">${scores.coreBarrier || '-'}</div>
      <div class="score-label">核心卡点</div>
    </div>
  </div>

  ${scores.beliefScores ? `
  <div class="section">
    <h2 class="section-title">信念维度得分</h2>
    <div class="scores-grid">
      ${Object.entries(scores.beliefScores).map(([key, value]) => `
        <div class="score-card">
          <div class="score-card-label">${key}</div>
          <div class="score-card-value">${value}</div>
        </div>
      `).join('')}
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
          <div class="score-card-value">${value}</div>
        </div>
      `).join('')}
    </div>
  </div>
  ` : ''}

  ${aiAnalysis ? `
  <div class="section">
    <h2 class="section-title">AI 深度分析报告</h2>
    <div class="analysis-content">${aiAnalysis}</div>
  </div>
  ` : ''}

  <div class="disclaimer">
    <strong>免责声明：</strong>本测评报告仅供参考，不构成专业心理咨询或医疗建议。如有心理健康问题，请咨询专业人士。
  </div>

  <div class="footer">
    <p>成长阻碍探测器 &copy; ${new Date().getFullYear()}</p>
    <p>基于深层心理学模型与专家 AI 系统开发</p>
  </div>
</body>
</html>
  `;
}

export default withAuth(handler);
