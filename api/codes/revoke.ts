import type { VercelRequest, VercelResponse } from '@vercel/node';
import prisma from '../lib/db';
import { withAuth } from '../lib/auth';
import { sanitizeCode } from '../lib/sanitize';

async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: '方法不允许' });
  }

  try {
    const { code } = req.body;

    if (!code) {
      return res.status(400).json({ error: '请提供兑换码' });
    }

    const sanitizedCode = sanitizeCode(code);

    const existingCode = await prisma.redemptionCode.findUnique({
      where: { code: sanitizedCode },
    });

    if (!existingCode) {
      return res.status(404).json({ error: '兑换码不存在' });
    }

    if (existingCode.status === 'USED') {
      return res.status(400).json({ error: '已使用的兑换码无法作废' });
    }

    const updatedCode = await prisma.redemptionCode.update({
      where: { code: sanitizedCode },
      data: { status: 'REVOKED' },
    });

    return res.status(200).json({
      success: true,
      data: {
        code: updatedCode.code,
        status: updatedCode.status,
      },
    });
  } catch (error) {
    console.error('Revoke code error:', error);
    return res.status(500).json({ error: '服务器错误' });
  }
}

export default withAuth(handler);
