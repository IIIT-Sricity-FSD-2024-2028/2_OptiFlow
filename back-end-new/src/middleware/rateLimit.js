import { env } from '../config/env.js';
import { AppError, withCode } from '../utils/errors.js';

/**
 * In-memory fixed-window rate limiter (one counter per key, per process).
 *
 * @param {Object}   options
 * @param {number}   options.windowMs               Window length in ms.
 * @param {number}   options.max                    Requests (or failures) allowed per window per key.
 * @param {string}   [options.message]              Client-safe message for the 429.
 * @param {Function} [options.keyGenerator]         (req) => string | null. Null skips limiting.
 * @param {boolean}  [options.skipSuccessfulRequests]  When true only failed responses (status >= 400)
 *                                                  count, so legitimate users who sign in correctly
 *                                                  are never locked out by their own traffic.
 * @returns {import('express').RequestHandler & { reset: (key?: string) => void }}
 *
 * Counters live in this process only. With several server instances each keeps its own count, so the
 * effective limit is max x instances; move the Map to Redis if the API is scaled out.
 */
export function createRateLimiter({
  windowMs = 15 * 60 * 1000,
  max = 10,
  message = 'Too many attempts. Please try again later.',
  keyGenerator = (req) => req.ip,
  skipSuccessfulRequests = false,
} = {}) {
  const hits = new Map(); // key -> { count, resetAt }

  const sweep = setInterval(() => {
    const now = Date.now();
    for (const [key, entry] of hits) if (entry.resetAt <= now) hits.delete(key);
  }, Math.min(windowMs, 60 * 1000));
  sweep.unref?.();

  const limiter = (req, res, next) => {
    if (!env.RATE_LIMIT_ENABLED) return next();

    const key = keyGenerator(req);
    if (!key) return next();

    const now = Date.now();
    let entry = hits.get(key);
    if (!entry || entry.resetAt <= now) {
      entry = { count: 0, resetAt: now + windowMs };
      hits.set(key, entry);
    }

    if (entry.count >= max) {
      const retryAfterSec = Math.max(1, Math.ceil((entry.resetAt - now) / 1000));
      res.setHeader('Retry-After', String(retryAfterSec));
      res.setHeader('X-RateLimit-Limit', String(max));
      res.setHeader('X-RateLimit-Remaining', '0');
      return next(withCode(new AppError(message, 429), 'RATE_LIMITED'));
    }

    entry.count += 1;
    res.setHeader('X-RateLimit-Limit', String(max));
    res.setHeader('X-RateLimit-Remaining', String(Math.max(0, max - entry.count)));

    if (skipSuccessfulRequests) {
      res.on('finish', () => {
        if (res.statusCode < 400 && entry.count > 0) entry.count -= 1;
      });
    }
    next();
  };

  limiter.reset = (key) => (key === undefined ? hits.clear() : hits.delete(key));
  return limiter;
}

const FIFTEEN_MIN = 15 * 60 * 1000;
const ONE_HOUR = 60 * 60 * 1000;

const emailOf = (req) => String(req.body?.email || '').trim().toLowerCase();

/**
 * Login (tenant and platform): failed attempts only.
 *  - per IP + email: stops guessing one account from one machine
 *  - per email:      stops the same guessing spread across many IPs
 *  - per IP:         stops one machine trying many accounts
 */
export const loginLimiters = [
  createRateLimiter({
    windowMs: FIFTEEN_MIN,
    max: env.AUTH_RATE_LIMIT_MAX,
    skipSuccessfulRequests: true,
    keyGenerator: (req) => (emailOf(req) ? `login:ip-email:${req.ip}:${emailOf(req)}` : null),
    message: 'Too many failed sign-in attempts for this account. Please try again in a few minutes.',
  }),
  createRateLimiter({
    windowMs: FIFTEEN_MIN,
    max: env.AUTH_RATE_LIMIT_MAX * 3,
    skipSuccessfulRequests: true,
    keyGenerator: (req) => (emailOf(req) ? `login:email:${emailOf(req)}` : null),
    message: 'Too many failed sign-in attempts for this account. Please try again in a few minutes.',
  }),
  createRateLimiter({
    windowMs: FIFTEEN_MIN,
    max: env.AUTH_RATE_LIMIT_MAX * 5,
    skipSuccessfulRequests: true,
    keyGenerator: (req) => `login:ip:${req.ip}`,
    message: 'Too many failed sign-in attempts from this address. Please try again in a few minutes.',
  }),
];

/** Company registration: every attempt counts (it creates data and sends email). */
export const registerLimiter = createRateLimiter({
  windowMs: ONE_HOUR,
  max: Math.max(3, Math.floor(env.AUTH_RATE_LIMIT_MAX / 2)),
  keyGenerator: (req) => `register:ip:${req.ip}`,
  message: 'Too many registration attempts from this address. Please try again later.',
});

/** Set-password links: failed attempts per IP (guessing or replaying tokens). */
export const setPasswordLimiter = createRateLimiter({
  windowMs: FIFTEEN_MIN,
  max: env.AUTH_RATE_LIMIT_MAX,
  skipSuccessfulRequests: true,
  keyGenerator: (req) => `set-password:ip:${req.ip}`,
  message: 'Too many failed attempts. Please try again in a few minutes.',
});

/** Change password: failed attempts per signed-in user (current password guessing). Mount after authenticate. */
export const changePasswordLimiter = createRateLimiter({
  windowMs: FIFTEEN_MIN,
  max: env.AUTH_RATE_LIMIT_MAX,
  skipSuccessfulRequests: true,
  keyGenerator: (req) => `change-password:${req.user?.id || req.platformAdmin?.id || req.ip}`,
  message: 'Too many failed attempts. Please try again in a few minutes.',
});

// Kept for existing imports. Mounted on the sign-in routes themselves now (see auth.routes.js).
export const authLimiter = (req, res, next) => next();

// The whole-API limiter stays a pass-through on purpose: a single-page app legitimately fires many
// calls per screen, and a wrong global limit would lock users out. The auth endpoints above are the
// brute-force surface this fix covers.
export const generalApiLimiter = (req, res, next) => next();
