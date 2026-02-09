/**
 * CORS configuration for API endpoints
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';

// 允许的域名列表（从环境变量读取，支持多个域名用逗号分隔）
const ALLOWED_ORIGINS = (process.env.ALLOWED_ORIGINS || '')
  .split(',')
  .map(origin => origin.trim())
  .filter(Boolean);

// 默认允许的域名（开发环境）
const DEFAULT_ORIGINS = [
  'http://localhost:3000',
  'http://localhost:5173',
  'http://127.0.0.1:3000',
  'http://127.0.0.1:5173',
];

// 生产环境域名（从 VERCEL_URL 或自定义域名）
if (process.env.VERCEL_URL) {
  ALLOWED_ORIGINS.push(`https://${process.env.VERCEL_URL}`);
}

// 合并所有允许的域名
const ALL_ALLOWED_ORIGINS = [...new Set([...ALLOWED_ORIGINS, ...DEFAULT_ORIGINS])];

/**
 * Check if origin is allowed
 */
export function isOriginAllowed(origin: string | undefined): boolean {
  if (!origin) return false;

  // 在开发环境允许所有 localhost
  if (process.env.NODE_ENV !== 'production') {
    if (origin.includes('localhost') || origin.includes('127.0.0.1')) {
      return true;
    }
  }

  return ALL_ALLOWED_ORIGINS.includes(origin);
}

/**
 * Get CORS headers for a request
 */
export function getCorsHeaders(req: VercelRequest): Record<string, string> {
  const origin = req.headers.origin as string | undefined;
  const headers: Record<string, string> = {
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With',
    'Access-Control-Max-Age': '86400', // 24 hours
    'Access-Control-Allow-Credentials': 'true',
  };

  if (origin && isOriginAllowed(origin)) {
    headers['Access-Control-Allow-Origin'] = origin;
  } else if (process.env.NODE_ENV !== 'production') {
    // 开发环境回退
    headers['Access-Control-Allow-Origin'] = origin || '*';
  }
  // 生产环境不设置 Access-Control-Allow-Origin 如果 origin 不在白名单

  return headers;
}

/**
 * Apply CORS headers to response
 */
export function applyCors(req: VercelRequest, res: VercelResponse): void {
  const headers = getCorsHeaders(req);
  Object.entries(headers).forEach(([key, value]) => {
    res.setHeader(key, value);
  });
}

/**
 * Handle CORS preflight request
 */
export function handleCorsPreflightRequest(req: VercelRequest, res: VercelResponse): boolean {
  if (req.method === 'OPTIONS') {
    applyCors(req, res);
    res.status(200).end();
    return true;
  }
  return false;
}

/**
 * CORS middleware wrapper
 */
export function withCors(
  handler: (req: VercelRequest, res: VercelResponse) => Promise<any>
) {
  return async (req: VercelRequest, res: VercelResponse) => {
    // Handle preflight
    if (handleCorsPreflightRequest(req, res)) {
      return;
    }

    // Apply CORS headers
    applyCors(req, res);

    // Check origin in production
    const origin = req.headers.origin as string | undefined;
    if (process.env.NODE_ENV === 'production' && origin && !isOriginAllowed(origin)) {
      return res.status(403).json({ error: '禁止访问' });
    }

    return handler(req, res);
  };
}

export default {
  isOriginAllowed,
  getCorsHeaders,
  applyCors,
  handleCorsPreflightRequest,
  withCors,
};
