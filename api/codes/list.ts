import type { VercelRequest, VercelResponse } from '@vercel/node';
import prisma from '../lib/db';
import { withAuth } from '../lib/auth';

async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: '方法不允许' });
  }

  try {
    const { status, page = '1', limit = '20' } = req.query;

    const pageNum = Math.max(1, parseInt(page as string, 10));
    const limitNum = Math.min(100, Math.max(1, parseInt(limit as string, 10)));
    const skip = (pageNum - 1) * limitNum;

    const where = status && status !== 'ALL' ? { status: status as string } : {};

    const [codes, total] = await Promise.all([
      prisma.redemptionCode.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limitNum,
        include: {
          _count: {
            select: { assessments: true },
          },
        },
      }),
      prisma.redemptionCode.count({ where }),
    ]);

    return res.status(200).json({
      success: true,
      data: codes.map(c => ({
        code: c.code,
        packageType: c.packageType,
        status: c.status,
        createdAt: c.createdAt,
        activatedAt: c.activatedAt,
        expiresAt: c.expiresAt,
        assessmentCount: c._count.assessments,
      })),
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages: Math.ceil(total / limitNum),
      },
    });
  } catch (error) {
    console.error('List codes error:', error);
    return res.status(500).json({ error: '服务器错误' });
  }
}

export default withAuth(handler);
