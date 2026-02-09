/**
 * Input sanitization utilities for security
 */

// Dangerous patterns that could indicate prompt injection
const PROMPT_INJECTION_PATTERNS = [
  /ignore\s+(previous|above|all)\s+instructions/i,
  /disregard\s+(previous|above|all)/i,
  /forget\s+(everything|all|previous)/i,
  /new\s+instructions?:/i,
  /system\s*:/i,
  /assistant\s*:/i,
  /user\s*:/i,
  /<\/?script/i,
  /javascript:/i,
  /on\w+\s*=/i,
];

// 敏感词列表（基础版，可根据需要扩展）
const SENSITIVE_WORDS = [
  // 政治敏感
  /习近平/gi, /共产党/gi, /六四/gi, /天安门/gi, /法轮功/gi,
  // 暴力相关
  /自杀方法/gi, /如何自杀/gi, /杀人方法/gi,
  // 色情相关
  /色情/gi, /裸体/gi,
  // 可根据需要添加更多
];

// HTML entities to escape
const HTML_ENTITIES: Record<string, string> = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#x27;',
  '/': '&#x2F;',
};

/**
 * Escape HTML special characters to prevent XSS
 */
export function escapeHtml(str: string): string {
  return str.replace(/[&<>"'/]/g, (char) => HTML_ENTITIES[char] || char);
}

/**
 * Check if text contains potential prompt injection
 */
export function containsPromptInjection(text: string): boolean {
  return PROMPT_INJECTION_PATTERNS.some(pattern => pattern.test(text));
}

/**
 * Check if text contains sensitive words
 */
export function containsSensitiveWords(text: string): boolean {
  return SENSITIVE_WORDS.some(pattern => pattern.test(text));
}

/**
 * Filter sensitive words from text
 */
export function filterSensitiveWords(text: string): string {
  let filtered = text;
  SENSITIVE_WORDS.forEach(pattern => {
    filtered = filtered.replace(pattern, '***');
  });
  return filtered;
}

/**
 * Sanitize text for AI prompt usage
 * - Removes potential injection patterns
 * - Filters sensitive words
 * - Limits length
 * - Escapes special characters
 */
export function sanitizeForAI(text: string, maxLength: number = 500): string {
  if (!text || typeof text !== 'string') {
    return '';
  }

  // Trim and limit length
  let sanitized = text.trim().slice(0, maxLength);

  // Remove null bytes and control characters (except newlines and tabs)
  sanitized = sanitized.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '');

  // If injection detected, return a safe placeholder
  if (containsPromptInjection(sanitized)) {
    return '[内容已过滤]';
  }

  // Filter sensitive words
  sanitized = filterSensitiveWords(sanitized);

  return sanitized;
}

/**
 * Sanitize user input for database storage
 */
export function sanitizeInput(text: string, maxLength: number = 1000): string {
  if (!text || typeof text !== 'string') {
    return '';
  }

  return text
    .trim()
    .slice(0, maxLength)
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '');
}

/**
 * Validate and sanitize redemption code format
 */
export function sanitizeCode(code: string): string {
  if (!code || typeof code !== 'string') {
    return '';
  }

  // Only allow alphanumeric characters, max 20 chars
  return code
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '')
    .slice(0, 20);
}

/**
 * Sanitize assessment responses object
 */
export function sanitizeResponses(responses: Record<string, any>): Record<string, any> {
  const sanitized: Record<string, any> = {};

  for (const [key, value] of Object.entries(responses)) {
    // Validate key is a number
    const numKey = parseInt(key, 10);
    if (isNaN(numKey) || numKey < 1 || numKey > 100) {
      continue;
    }

    // Sanitize value based on type
    if (typeof value === 'string') {
      sanitized[numKey] = sanitizeInput(value, 500);
    } else if (typeof value === 'number') {
      // Clamp numeric values to reasonable range
      sanitized[numKey] = Math.max(0, Math.min(100, value));
    }
  }

  return sanitized;
}

export default {
  escapeHtml,
  containsPromptInjection,
  containsSensitiveWords,
  filterSensitiveWords,
  sanitizeForAI,
  sanitizeInput,
  sanitizeCode,
  sanitizeResponses,
};
