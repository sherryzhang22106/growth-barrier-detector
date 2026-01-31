import type { VercelRequest, VercelResponse } from '@vercel/node';
import prisma from '../lib/db';
import { withAuth } from '../lib/auth';
import { sanitizeCode } from '../lib/sanitize';

function generateCode(prefix: string = 'GROW'): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = prefix;
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: '方法不允许' });
  }

  try {
    const { count = 1, packageType = 'STANDARD', prefix = 'GROW', expiresInDays } = req.body;

    const codeCount = Math.min(100, Math.max(1, parseInt(count, 10)));
    const sanitizedPrefix = sanitizeCode(prefix).slice(0, 8) || 'GROW';

    const codes: string[] = [];
    const existingCodes = new Set(
      (await prisma.redemptionCode.findMany({ select: { code: true } })).map(c => c.code)
    );

    // Generate unique codes
    let attempts = 0;
    while (codes.length < codeCount && attempts < codeCount * 10) {
      const newCode = generateCode(sanitizedPrefix);
      if (!existingCodes.has(newCode) && !codes.includes(newCode)) {
        codes.push(newCode);
      }
      attempts++;
    }

    if (codes.length === 0) {
      return res.status(500).json({ error: '无法生成唯一兑换码' });
    }

    const expiresAt = expiresInDays
      ? new Date(Date.now() + parseInt(expiresInDays, 10) * 24 * 60 * 60 * 1000)
      : null;

    // Batch create codes
    await prisma.redemptionCode.createMany({
      data: codes.map(code => ({
        code,
        packageType,
        status: 'UNUSED',
        expiresAt,
      })),
    });

    return res.status(201).json({
      success: true,
      data: {
        codes,
        count: codes.length,
        packageType,
        expiresAt,
      },
    });
  } catch (error) {
    console.error('Create codes error:', error);
    return res.status(500).json({ error: '服务器错误' });
  }
}

export default withAuth(handler);
