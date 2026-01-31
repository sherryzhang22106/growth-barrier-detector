import type { VercelRequest, VercelResponse } from '@vercel/node';
import prisma from '../lib/db';
import { sanitizeCode, sanitizeResponses, sanitizeInput } from '../lib/sanitize';

export default async function handler(req: VercelRequest, res: VercelResponse) {
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

    // Verify the code exists and is activated
    const redemptionCode = await prisma.redemptionCode.findUnique({
      where: { code: sanitizedCode },
    });

    if (!redemptionCode) {
      return res.status(404).json({ success: false, message: '兑换码不存在' });
    }

    if (redemptionCode.status !== 'ACTIVATED') {
      return res.status(400).json({ success: false, message: '兑换码状态无效' });
    }

    // Create the assessment
    const assessment = await prisma.assessment.create({
      data: {
        visitorId: sanitizedVisitorId,
        code: sanitizedCode,
        responses: sanitizedResponses,
        scores: scores,
        aiStatus: 'pending',
      },
    });

    // Mark the code as used
    await prisma.redemptionCode.update({
      where: { code: sanitizedCode },
      data: { status: 'USED' },
    });

    // Clear progress for this user
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
