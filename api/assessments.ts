import type { VercelRequest, VercelResponse } from '@vercel/node';
import prisma from './lib/db';
import { sanitizeCode, sanitizeResponses, sanitizeInput } from './lib/sanitize';
import { withAuth } from './lib/auth';
import * as XLSX from 'xlsx';

// Submit assessment
async function handleSubmit(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: '方法不允许' });
  }

  try {
    const { visitorId, code, responses, scores } = req.body;

    if (!visitorId || !code || !responses || !scores) {
      return res.status(400).json({ success: false, message: '缺少必要参数' });
    }

    const sanitizedCode = sanitizeCode(code);
    const sanitizedResponses = sanitizeResponses(responses);
    const sanitizedVisitorId = sanitizeInput(visitorId, 100);

    const redemptionCode = await prisma.redemptionCode.findUnique({
      where: { code: sanitizedCode },
    });

    if (!redemptionCode) {
      return res.status(404).json({ success: false, message: '兑换码不存在' });
    }

    if (redemptionCode.status !== 'ACTIVATED') {
      return res.status(400).json({ success: false, message: '兑换码状态无效' });
    }

    const assessment = await prisma.assessment.create({
      data: {
        visitorId: sanitizedVisitorId,
        code: sanitizedCode,
        responses: JSON.stringify(sanitizedResponses),
        scores: JSON.stringify(scores),
        aiStatus: 'pending',
      },
    });

    await prisma.redemptionCode.update({
      where: { code: sanitizedCode },
      data: { status: 'USED' },
    });

    await prisma.progress.deleteMany({
      where: { userId: sanitizedVisitorId },
    });

    return res.status(201).json({
      success: true,
      id: assessment.id,
    });
  } catch (error) {
    console.error('Submit assessment error:', error);
    return res.status(500).json({ success: false, message: '服务器错误' });
  }
}

// Get assessment by ID
async function handleGetById(req: VercelRequest, res: VercelResponse) {
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

// List assessments (admin)
async function handleList(req: VercelRequest, res: VercelResponse) {
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

// Export assessments (admin)
async function handleExport(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: '方法不允许' });
  }

  try {
    const { format = 'json', ids } = req.query;

    let where: any = {};
    if (ids) {
      const idList = (ids as string).split(',').filter(Boolean);
      if (idList.length > 0) {
        where.id = { in: idList };
      }
    }

    const assessments = await prisma.assessment.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        redemptionCode: {
          select: {
            packageType: true,
          },
        },
      },
    });

    if (format === 'xlsx') {
      const data = assessments.map(a => {
        const scores = typeof a.scores === 'string' ? JSON.parse(a.scores) : a.scores;
        return {
          '测评ID': a.id,
          '兑换码': a.code,
          '套餐类型': a.redemptionCode.packageType,
          '访客ID': a.visitorId,
          '阻碍指数': scores?.overallIndex || '',
          '状态等级': scores?.level || '',
          '核心卡点': scores?.coreBarrier || '',
          'AI状态': a.aiStatus,
          '创建时间': a.createdAt.toISOString(),
          '完成时间': a.completedAt?.toISOString() || '',
        };
      });

      const ws = XLSX.utils.json_to_sheet(data);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, '测评数据');

      const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });

      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', `attachment; filename=assessments-${Date.now()}.xlsx`);
      return res.send(buffer);
    }

    return res.status(200).json({
      success: true,
      data: assessments.map(a => ({
        id: a.id,
        code: a.code,
        packageType: a.redemptionCode.packageType,
        visitorId: a.visitorId,
        responses: a.responses,
        scores: a.scores,
        aiAnalysis: a.aiAnalysis,
        aiStatus: a.aiStatus,
        createdAt: a.createdAt,
        completedAt: a.completedAt,
      })),
    });
  } catch (error) {
    console.error('Export assessments error:', error);
    return res.status(500).json({ error: '服务器错误' });
  }
}

// Main handler
export default async function handler(req: VercelRequest, res: VercelResponse) {
  const { action, id } = req.query;

  // Handle CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    switch (action) {
      case 'submit':
        return handleSubmit(req, res);
      case 'get':
        return handleGetById(req, res);
      case 'list':
        return withAuth(handleList)(req, res);
      case 'export':
        return withAuth(handleExport)(req, res);
      default:
        // If no action but has id, treat as get by id
        if (id) {
          return handleGetById(req, res);
        }
        return res.status(400).json({ error: '无效的操作' });
    }
  } catch (error) {
    console.error('Assessments API error:', error);
    return res.status(500).json({ error: '服务器错误' });
  }
}
