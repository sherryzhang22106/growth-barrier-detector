import type { VercelRequest, VercelResponse } from '@vercel/node';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: '方法不允许' });
  }

  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ error: '请提供用户名和密码' });
    }

    const envUsername = process.env.ADMIN_USERNAME;
    const envPasswordHash = process.env.ADMIN_PASSWORD_HASH;
    const jwtSecret = process.env.ADMIN_JWT_SECRET || 'fallback-secret';

    if (!envUsername || !envPasswordHash) {
      return res.status(500).json({ error: '管理员凭据未配置' });
    }

    if (username !== envUsername) {
      return res.status(401).json({ error: '用户名或密码错误' });
    }

    const isValid = bcrypt.compareSync(password, envPasswordHash);

    if (!isValid) {
      return res.status(401).json({ error: '用户名或密码错误' });
    }

    const token = jwt.sign({ username }, jwtSecret, { expiresIn: '24h' });

    return res.status(200).json({
      success: true,
      token,
      username,
    });
  } catch (error: any) {
    console.error('Admin login error:', error?.message || error);
    return res.status(500).json({ error: '服务器错误', details: error?.message });
  }
}
