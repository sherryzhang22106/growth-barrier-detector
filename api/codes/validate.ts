import type { VercelRequest, VercelResponse } from '@vercel/node';
import prisma from '../lib/db';
import { sanitizeCode } from '../lib/sanitize';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: '方法不允许' });
  }

  try {
    const { code, visitorId } = req.body;

    if (!code) {
      return res.status(400).json({ success: false, message: '请提供兑换码' });
    }

    const sanitizedCode = sanitizeCode(code);

    if (!sanitizedCode) {
      return res.status(400).json({ success: false, message: '兑换码格式无效' });
    }

    const redemptionCode = await prisma.redemptionCode.findUnique({
      where: { code: sanitizedCode },
    });

    if (!redemptionCode) {
      return res.status(404).json({ success: false, message: '兑换码不存在' });
    }

    if (redemptionCode.status === 'USED') {
      return res.status(400).json({ success: false, message: '该兑换码已被使用' });
    }

    if (redemptionCode.status === 'REVOKED') {
      return res.status(400).json({ success: false, message: '该兑换码已被作废' });
    }

    if (redemptionCode.expiresAt && new Date() > redemptionCode.expiresAt) {
      return res.status(400).json({ success: false, message: '该兑换码已过期' });
    }

    // Activate the code
    const updatedCode = await prisma.redemptionCode.update({
      where: { code: sanitizedCode },
      data: {
        status: 'ACTIVATED',
        activatedAt: new Date(),
        userId: visitorId || null,
      },
    });

    return res.status(200).json({
      success: true,
      data: {
        code: updatedCode.code,
        packageType: updatedCode.packageType,
        status: updatedCode.status,
      },
    });
  } catch (error) {
    console.error('Code validation error:', error);
    return res.status(500).json({ success: false, message: '服务器错误' });
  }
}
