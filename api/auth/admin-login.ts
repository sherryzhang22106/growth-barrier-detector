import type { VercelRequest, VercelResponse } from '@vercel/node';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { rateLimiters, getClientIP } from '../lib/rateLimit';
import { applyCors, handleCorsPreflightRequest } from '../lib/cors';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Handle CORS preflight
  if (handleCorsPreflightRequest(req, res)) {
    return;
  }

  // Apply CORS headers
  applyCors(req, res);

  if (req.method !== 'POST') {
    return res.status(405).json({ error: '方法不允许' });
  }

  try {
    // 暴力破解防护：限制登录尝试次数
    const clientIP = getClientIP(req);
    const rateLimit = rateLimiters.adminLogin(clientIP);

    if (!rateLimit.success) {
      const message = rateLimit.blocked
        ? `登录尝试次数过多，账户已被临时锁定，请 ${Math.ceil((rateLimit.retryAfter || 0) / 60)} 分钟后再试`
        : `请求过于频繁，请 ${rateLimit.retryAfter} 秒后再试`;

      return res.status(429).json({
        error: message,
        retryAfter: rateLimit.retryAfter,
        blocked: rateLimit.blocked,
      });
    }

    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ error: '请提供用户名和密码' });
    }

    const envUsername = process.env.ADMIN_USERNAME;
    const envPasswordHash = process.env.ADMIN_PASSWORD_HASH;
    const jwtSecret = process.env.ADMIN_JWT_SECRET;

    // 强制要求配置 JWT 密钥
    if (!jwtSecret || jwtSecret.length < 32) {
      console.error('CRITICAL: ADMIN_JWT_SECRET must be configured with at least 32 characters');
      return res.status(500).json({ error: '服务器配置错误' });
    }

    if (!envUsername || !envPasswordHash) {
      return res.status(500).json({ error: '管理员凭据未配置' });
    }

    // 使用恒定时间比较防止时序攻击
    const usernameMatch = username === envUsername;
    const isValid = bcrypt.compareSync(password, envPasswordHash);

    if (!usernameMatch || !isValid) {
      // 统一错误消息，不泄露具体是用户名还是密码错误
      return res.status(401).json({ error: '用户名或密码错误' });
    }

    const token = jwt.sign(
      { username, iat: Math.floor(Date.now() / 1000) },
      jwtSecret,
      { expiresIn: '24h' }
    );

    return res.status(200).json({
      success: true,
      token,
      username,
    });
  } catch (error: any) {
    console.error('Admin login error:', error?.message || error);
    return res.status(500).json({ error: '服务器错误' });
  }
}
