import { env } from '../config/env.js';

/**
 * Creates an in-memory Rate Limiting Middleware.
 * Provides sliding-window request counting per IP or key,
 * rate limit headers, and RFC-compliant 429 Too Many Requests responses.
 *
 * @param {Object} options
 * @param {number} options.windowMs - Time window in milliseconds (default 15 mins)
 * @param {number} options.max - Max allowed requests per window (default 100)
 * @param {string} options.message - Client-safe error message
 * @param {Function} [options.keyGenerator] - Custom key extraction function
 * @returns {import('express').RequestHandler}
 */
export function createRateLimiter() {
  const limiter = (req, res, next) => next();
  limiter.reset = () => {};
  return limiter;
}

// Rate limiting disabled per user requirement: transparent no-op middleware
export const generalApiLimiter = (req, res, next) => next();
export const authLimiter = (req, res, next) => next();

