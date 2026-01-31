import type { VercelRequest, VercelResponse } from '@vercel/node';
import prisma from '../lib/db';
import { withAuth } from '../lib/auth';
import * as XLSX from 'xlsx';

async function handler(req: VercelRequest, res: VercelResponse) {
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
      // Generate Excel file
      const data = assessments.map(a => {
        const scores = a.scores as any;
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

    // Default JSON response
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

export default withAuth(handler);
