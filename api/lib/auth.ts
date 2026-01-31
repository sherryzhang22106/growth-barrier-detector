import * as jwt from 'jsonwebtoken';
import * as bcrypt from 'bcryptjs';
import type { VercelRequest, VercelResponse } from '@vercel/node';

const JWT_SECRET = process.env.ADMIN_JWT_SECRET || 'fallback-secret-change-in-production';
const JWT_EXPIRY = parseInt(process.env.JWT_EXPIRY_HOURS || '24', 10);

export interface AdminPayload {
  username: string;
  iat: number;
  exp: number;
}

export function generateToken(username: string): string {
  return jwt.sign(
    { username },
    JWT_SECRET,
    { expiresIn: `${JWT_EXPIRY}h` }
  );
}

export function verifyToken(token: string): AdminPayload | null {
  try {
    return jwt.verify(token, JWT_SECRET) as AdminPayload;
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
