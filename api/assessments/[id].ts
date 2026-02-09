import type { VercelRequest, VercelResponse } from '@vercel/node';
import prisma from '../lib/db';

export default async function handler(req: VercelRequest, res: VercelResponse) {
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

    return res.status(200).json({
      success: true,
      data: {
        id: assessment.id,
        visitorId: assessment.visitorId,
        code: assessment.code,
        packageType: assessment.redemptionCode.packageType,
        responses: typeof assessment.responses === 'string' ? JSON.parse(assessment.responses) : assessment.responses,
        scores: typeof assessment.scores === 'string' ? JSON.parse(assessment.scores) : assessment.scores,
        aiAnalysis: assessment.aiAnalysis,
        aiStatus: assessment.aiStatus,
        createdAt: assessment.createdAt,
        completedAt: assessment.completedAt,
      },
    });
  } catch (error) {
    console.error('Get assessment error:', error);
    return res.status(500).json({ error: '服务器错误' });
  }
}
