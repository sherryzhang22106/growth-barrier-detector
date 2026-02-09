import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import type { VercelRequest, VercelResponse } from '@vercel/node';

// 动态获取 JWT 配置（解决 ES 模块加载顺序问题）
function getJwtSecret(): string | undefined {
  return process.env.ADMIN_JWT_SECRET;
}

function getJwtExpiry(): number {
  return parseInt(process.env.JWT_EXPIRY_HOURS || '24', 10);
}

export interface AdminPayload {
  username: string;
  iat: number;
  exp: number;
}

export function generateToken(username: string): string {
  const secret = getJwtSecret();
  if (!secret || secret.length < 32) {
    throw new Error('JWT secret not configured or too short (min 32 chars)');
  }
  return jwt.sign(
    { username },
    secret,
    { expiresIn: `${getJwtExpiry()}h` }
  );
}

export function verifyToken(token: string): AdminPayload | null {
  const secret = getJwtSecret();
  if (!secret) {
    console.error('JWT secret not configured');
    return null;
  }
  try {
    return jwt.verify(token, secret) as AdminPayload;
  } catch {
    return null;
  }
}

export function verifyPassword(password: string, hash: string): boolean {
  return bcrypt.compareSync(password, hash);
}

export function hashPassword(password: string): string {
  return bcrypt.hashSync(password, 10);
}

export function extractToken(req: VercelRequest): string | null {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    return authHeader.substring(7);
  }
  return null;
}

export function withAuth(
  handler: (req: VercelRequest, res: VercelResponse, admin: AdminPayload) => Promise<any>
) {
  return async (req: VercelRequest, res: VercelResponse) => {
    const token = extractToken(req);

    if (!token) {
      return res.status(401).json({ error: '未提供认证令牌' });
    }

    const payload = verifyToken(token);

    if (!payload) {
      return res.status(401).json({ error: '认证令牌无效或已过期' });
    }

    return handler(req, res, payload);
  };
}

export default { generateToken, verifyToken, verifyPassword, hashPassword, extractToken, withAuth };
