import type { VercelRequest, VercelResponse } from '@vercel/node';
import prisma from './lib/db';
import { withAuth } from './lib/auth';
import { sanitizeCode } from './lib/sanitize';

function generateCode(prefix: string = 'GROW'): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = prefix;
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

// List codes (admin only)
async function listCodes(req: VercelRequest, res: VercelResponse) {
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
}

// Valid package types
const VALID_PACKAGE_TYPES = ['STANDARD', 'PREMIUM', 'ENTERPRISE'];

// Create codes (admin only)
async function createCodes(req: VercelRequest, res: VercelResponse) {
  const { count = 1, packageType = 'STANDARD', prefix = 'GROW', expiresInDays } = req.body;

  // Validate packageType
  const normalizedPackageType = String(packageType).toUpperCase();
  if (!VALID_PACKAGE_TYPES.includes(normalizedPackageType)) {
    return res.status(400).json({
      success: false,
      error: `无效的套餐类型，有效值为: ${VALID_PACKAGE_TYPES.join(', ')}`
    });
  }

  const codeCount = Math.min(100, Math.max(1, Number(count) || 1));
  const sanitizedPrefix = sanitizeCode(prefix).slice(0, 8) || 'GROW';

  const codes: string[] = [];
  const existingCodes = new Set(
    (await prisma.redemptionCode.findMany({ select: { code: true } })).map(c => c.code)
  );

  let attempts = 0;
  while (codes.length < codeCount && attempts < codeCount * 10) {
    const newCode = generateCode(sanitizedPrefix);
    if (!existingCodes.has(newCode) && !codes.includes(newCode)) {
      codes.push(newCode);
    }
    attempts++;
  }

  if (codes.length === 0) {
    return res.status(500).json({ success: false, error: '无法生成唯一兑换码' });
  }

  const expiresAt = expiresInDays
    ? new Date(Date.now() + parseInt(expiresInDays, 10) * 24 * 60 * 60 * 1000)
    : null;

  try {
    await prisma.redemptionCode.createMany({
      data: codes.map(code => ({
        code,
        packageType: normalizedPackageType,
        status: 'UNUSED',
        expiresAt,
      })),
    });
  } catch (dbError: any) {
    console.error('Database error creating codes:', dbError);
    return res.status(500).json({
      success: false,
      error: `数据库错误: ${dbError.message || '创建兑换码失败'}`
    });
  }

  return res.status(201).json({
    success: true,
    data: {
      codes,
      count: codes.length,
      packageType: normalizedPackageType,
      expiresAt,
    },
  });
}

// Revoke code (admin only)
async function revokeCode(req: VercelRequest, res: VercelResponse) {
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
}

// Validate code (public)
async function validateCode(req: VercelRequest, res: VercelResponse) {
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
}

// Main handler
export default async function handler(req: VercelRequest, res: VercelResponse) {
  const { action } = req.query;

  try {
    // Validate action is public
    if (action === 'validate' && req.method === 'POST') {
      return validateCode(req, res);
    }

    // All other actions require auth
    const authHandler = withAuth(async (authReq: VercelRequest, authRes: VercelResponse) => {
      switch (action) {
        case 'list':
          if (req.method !== 'GET') {
            return authRes.status(405).json({ error: '方法不允许' });
          }
          return listCodes(authReq, authRes);

        case 'create':
          if (req.method !== 'POST') {
            return authRes.status(405).json({ error: '方法不允许' });
          }
          return createCodes(authReq, authRes);

        case 'revoke':
          if (req.method !== 'POST') {
            return authRes.status(405).json({ error: '方法不允许' });
          }
          return revokeCode(authReq, authRes);

        default:
          return authRes.status(400).json({ error: '无效的操作' });
      }
    });

    return authHandler(req, res);
  } catch (error) {
    console.error('Codes API error:', error);
    return res.status(500).json({ error: '服务器错误' });
  }
}
