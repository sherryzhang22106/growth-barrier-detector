import type { VercelRequest, VercelResponse } from '@vercel/node';
import { generateToken, verifyPassword } from '../lib/auth';
import prisma from '../lib/db';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: '方法不允许' });
  }

  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ error: '请提供用户名和密码' });
    }

    // First check environment variables for admin credentials
    const envUsername = process.env.ADMIN_USERNAME;
    const envPasswordHash = process.env.ADMIN_PASSWORD_HASH;

    if (envUsername && envPasswordHash) {
      if (username === envUsername && verifyPassword(password, envPasswordHash)) {
        const token = generateToken(username);
        return res.status(200).json({
          success: true,
          token,
          username,
        });
      }
    }

    // Fallback to database admin lookup
    const admin = await prisma.admin.findUnique({
      where: { username },
    });

    if (!admin || !verifyPassword(password, admin.passwordHash)) {
      return res.status(401).json({ error: '用户名或密码错误' });
    }

    const token = generateToken(admin.username);

    return res.status(200).json({
      success: true,
      token,
      username: admin.username,
    });
  } catch (error) {
    console.error('Admin login error:', error);
    return res.status(500).json({ error: '服务器错误' });
  }
}
