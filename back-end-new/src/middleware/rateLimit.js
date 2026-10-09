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
export function createRateLimiter(options = {}) {
  const windowMs = Number(options.windowMs || 15 * 60 * 1000);
  const max = Number(options.max || 100);
  const message = options.message || 'Too many requests, please try again later.';
  const keyGenerator =
    options.keyGenerator ||
    ((req) => {
      // In development/test or behind a trusted proxy, use direct IP or socket remoteAddress
      return req.ip || req.connection?.remoteAddress || req.socket?.remoteAddress || '127.0.0.1';
    });

  // Map of client key -> Array of timestamps [t1, t2, ...]
  const hits = new Map();

  // Periodic cleanup of expired client entries (every 5 minutes)
  const cleanupInterval = setInterval(() => {
    const now = Date.now();
    for (const [key, timestamps] of hits.entries()) {
      const active = timestamps.filter((t) => now - t < windowMs);
      if (active.length === 0) {
        hits.delete(key);
      } else {
        hits.set(key, active);
      }
    }
  }, Math.min(windowMs, 5 * 60 * 1000));

  if (cleanupInterval.unref) {
    cleanupInterval.unref();
  }

  const limiter = (req, res, next) => {
    // If rate limiting is explicitly disabled in tests/env
    if (process.env.DISABLE_RATE_LIMIT === 'true') {
      return next();
    }

    const key = keyGenerator(req);
    const now = Date.now();

    const clientHits = (hits.get(key) || []).filter((t) => now - t < windowMs);

    const remaining = Math.max(0, max - clientHits.length);
    const resetTime = Math.ceil((clientHits[0] ? clientHits[0] + windowMs : now + windowMs) / 1000);

    res.setHeader('RateLimit-Limit', String(max));
    res.setHeader('RateLimit-Remaining', String(Math.max(0, remaining - 1)));
    res.setHeader('RateLimit-Reset', String(resetTime));

    if (clientHits.length >= max) {
      const retryAfterSeconds = Math.max(1, Math.ceil((clientHits[0] + windowMs - now) / 1000));
      res.setHeader('Retry-After', String(retryAfterSeconds));

      return res.status(429).json({
        success: false,
        statusCode: 429,
        message,
        retryAfter: retryAfterSeconds,
        timestamp: new Date().toISOString(),
      });
    }

    clientHits.push(now);
    hits.set(key, clientHits);

    next();
  };

  // Helper method for testing to reset state
  limiter.reset = () => hits.clear();

  return limiter;
}

// 1. General API Rate Limiter (e.g. 100 requests per 15 minutes)
export const generalApiLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000,
  max: process.env.RATE_LIMIT_MAX ? Number(process.env.RATE_LIMIT_MAX) : 100,
  message: 'Too many requests from this IP. Please try again after 15 minutes.',
});

// 2. Strict Authentication Rate Limiter (e.g. 10 attempts per 15 minutes)
export const authLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000,
  max: process.env.AUTH_RATE_LIMIT_MAX ? Number(process.env.AUTH_RATE_LIMIT_MAX) : 10,
  message: 'Too many authentication attempts. Please try again after 15 minutes.',
});
