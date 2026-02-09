/**
 * Rate limiting utilities for API protection
 * Uses in-memory store for Vercel Serverless (resets on cold start)
 * For production, consider using Redis/Upstash for persistent rate limiting
 */

interface RateLimitEntry {
  count: number;
  resetTime: number;
  blocked?: boolean;
  blockUntil?: number;
}

// In-memory store (will reset on cold start, but provides basic protection)
const rateLimitStore = new Map<string, RateLimitEntry>();

// Cleanup old entries periodically
const CLEANUP_INTERVAL = 60 * 1000; // 1 minute
let lastCleanup = Date.now();

function cleanupExpiredEntries() {
  const now = Date.now();
  if (now - lastCleanup < CLEANUP_INTERVAL) return;

  lastCleanup = now;
  for (const [key, entry] of rateLimitStore.entries()) {
    if (entry.resetTime < now && (!entry.blockUntil || entry.blockUntil < now)) {
      rateLimitStore.delete(key);
    }
  }
}

export interface RateLimitConfig {
  /** Maximum number of requests allowed in the window */
  maxRequests: number;
  /** Time window in milliseconds */
  windowMs: number;
  /** Optional: block duration after exceeding limit (ms) */
  blockDurationMs?: number;
  /** Key prefix for different rate limit types */
  keyPrefix?: string;
}

export interface RateLimitResult {
  success: boolean;
  remaining: number;
  resetTime: number;
  blocked: boolean;
  retryAfter?: number;
}

/**
 * Check rate limit for a given identifier
 */
export function checkRateLimit(
  identifier: string,
  config: RateLimitConfig
): RateLimitResult {
  cleanupExpiredEntries();

  const now = Date.now();
  const key = `${config.keyPrefix || 'rl'}:${identifier}`;
  const entry = rateLimitStore.get(key);

  // Check if blocked
  if (entry?.blocked && entry.blockUntil && entry.blockUntil > now) {
    return {
      success: false,
      remaining: 0,
      resetTime: entry.blockUntil,
      blocked: true,
      retryAfter: Math.ceil((entry.blockUntil - now) / 1000),
    };
  }

  // Reset if window expired
  if (!entry || entry.resetTime < now) {
    const newEntry: RateLimitEntry = {
      count: 1,
      resetTime: now + config.windowMs,
    };
    rateLimitStore.set(key, newEntry);
    return {
      success: true,
      remaining: config.maxRequests - 1,
      resetTime: newEntry.resetTime,
      blocked: false,
    };
  }

  // Increment count
  entry.count++;

  // Check if exceeded
  if (entry.count > config.maxRequests) {
    if (config.blockDurationMs) {
      entry.blocked = true;
      entry.blockUntil = now + config.blockDurationMs;
    }
    return {
      success: false,
      remaining: 0,
      resetTime: entry.blockUntil || entry.resetTime,
      blocked: !!config.blockDurationMs,
      retryAfter: Math.ceil(((entry.blockUntil || entry.resetTime) - now) / 1000),
    };
  }

  return {
    success: true,
    remaining: config.maxRequests - entry.count,
    resetTime: entry.resetTime,
    blocked: false,
  };
}

/**
 * Pre-configured rate limiters for different endpoints
 */
export const rateLimiters = {
  // Code validation: 5 attempts per minute, block for 5 minutes after exceeding
  codeValidation: (ip: string) => checkRateLimit(ip, {
    maxRequests: 5,
    windowMs: 60 * 1000,
    blockDurationMs: 5 * 60 * 1000,
    keyPrefix: 'code',
  }),

  // AI analysis: 10 requests per hour per user
  aiAnalysis: (userId: string) => checkRateLimit(userId, {
    maxRequests: 10,
    windowMs: 60 * 60 * 1000,
    keyPrefix: 'ai',
  }),

  // General API: 100 requests per minute
  general: (ip: string) => checkRateLimit(ip, {
    maxRequests: 100,
    windowMs: 60 * 1000,
    keyPrefix: 'gen',
  }),

  // Admin login: 5 attempts per 15 minutes, block for 30 minutes
  adminLogin: (ip: string) => checkRateLimit(ip, {
    maxRequests: 5,
    windowMs: 15 * 60 * 1000,
    blockDurationMs: 30 * 60 * 1000,
    keyPrefix: 'admin',
  }),

  // Assessment submission: 3 per hour per user
  submission: (userId: string) => checkRateLimit(userId, {
    maxRequests: 3,
    windowMs: 60 * 60 * 1000,
    keyPrefix: 'submit',
  }),
};

/**
 * Get client IP from Vercel request
 */
export function getClientIP(req: any): string {
  return (
    req.headers['x-real-ip'] ||
    req.headers['x-forwarded-for']?.split(',')[0]?.trim() ||
    req.socket?.remoteAddress ||
    'unknown'
  );
}

/**
 * Daily AI usage tracking (for cost control)
 */
const dailyAIUsage = new Map<string, { count: number; date: string }>();

export function checkDailyAILimit(userId: string, maxDaily: number = 5): {
  allowed: boolean;
  used: number;
  remaining: number;
} {
  const today = new Date().toISOString().split('T')[0];
  const key = `daily:${userId}`;
  const entry = dailyAIUsage.get(key);

  if (!entry || entry.date !== today) {
    dailyAIUsage.set(key, { count: 1, date: today });
    return { allowed: true, used: 1, remaining: maxDaily - 1 };
  }

  if (entry.count >= maxDaily) {
    return { allowed: false, used: entry.count, remaining: 0 };
  }

  entry.count++;
  return { allowed: true, used: entry.count, remaining: maxDaily - entry.count };
}

export default {
  checkRateLimit,
  rateLimiters,
  getClientIP,
  checkDailyAILimit,
};
