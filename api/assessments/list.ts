import type { VercelRequest, VercelResponse } from '@vercel/node';
import prisma from '../lib/db';
import { withAuth } from '../lib/auth';

async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: '方法不允许' });
  }

  try {
    const { page = '1', limit = '20', status, code } = req.query;

    const pageNum = Math.max(1, parseInt(page as string, 10));
    const limitNum = Math.min(100, Math.max(1, parseInt(limit as string, 10)));
    const skip = (pageNum - 1) * limitNum;

    const where: any = {};
    if (status) {
      where.aiStatus = status;
    }
    if (code) {
      where.code = code;
    }

    const [assessments, total] = await Promise.all([
      prisma.assessment.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limitNum,
        select: {
          id: true,
          visitorId: true,
          code: true,
          scores: true,
          aiStatus: true,
          createdAt: true,
          completedAt: true,
        },
      }),
      prisma.assessment.count({ where }),
    ]);

    // Parse JSON strings for SQLite compatibility
    const parsedAssessments = assessments.map(a => ({
      ...a,
      scores: typeof a.scores === 'string' ? JSON.parse(a.scores) : a.scores,
    }));

    return res.status(200).json({
      success: true,
      data: parsedAssessments,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages: Math.ceil(total / limitNum),
      },
    });
  } catch (error) {
    console.error('List assessments error:', error);
    return res.status(500).json({ error: '服务器错误' });
  }
}

export default withAuth(handler);
