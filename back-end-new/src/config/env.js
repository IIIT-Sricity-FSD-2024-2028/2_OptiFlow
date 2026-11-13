import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load .env from backend root directory
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

/**
 * Validate required environment variables at startup
 */
export function validateEnv() {
  const missing = [];

  if (!process.env.DATABASE_URL) {
    missing.push('DATABASE_URL');
  }

  if (!process.env.JWT_SECRET) {
    missing.push('JWT_SECRET');
  }

  if (missing.length > 0) {
    console.error(`[FATAL] Missing required environment variable(s): ${missing.join(', ')}`);
    console.error(`Please check your .env file or copy from .env.example`);
    process.exit(1);
  }
}

export const env = {
  PORT: parseInt(process.env.PORT || '5500', 10),
  NODE_ENV: process.env.NODE_ENV || 'development',
  DATABASE_URL: process.env.DATABASE_URL,
  JWT_SECRET: process.env.JWT_SECRET,
  JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || '24h',
  PLATFORM_JWT_EXPIRES_IN: process.env.PLATFORM_JWT_EXPIRES_IN || '1h',
  FRONTEND_ORIGINS: process.env.FRONTEND_ORIGINS || '',
  // Public URL of the React app. Used to build links sent to users (set-password invites).
  APP_BASE_URL: (process.env.APP_BASE_URL || 'http://localhost:3000').replace(/\/+$/, ''),
  SET_PASSWORD_TOKEN_TTL: process.env.SET_PASSWORD_TOKEN_TTL || '24h',

  // Transactional email
  EMAIL_PROVIDER: (process.env.EMAIL_PROVIDER || 'console').toLowerCase(), // console | resend | disabled
  EMAIL_FROM: process.env.EMAIL_FROM || 'OptiFlow <no-reply@optiflow.local>',
  RESEND_API_KEY: process.env.RESEND_API_KEY || '',

  // Server-side feature flags for unfinished platform features (default: off => routes return 404)
  FEATURE_PLATFORM_ADMIN_USERS: process.env.FEATURE_PLATFORM_ADMIN_USERS === 'true',
  FEATURE_PLATFORM_SUPPORT_ACCESS: process.env.FEATURE_PLATFORM_SUPPORT_ACCESS === 'true',

  // Tenant auth: how long a company's status/subscription snapshot is cached per process
  AUTH_STATUS_CACHE_TTL_MS: parseInt(process.env.AUTH_STATUS_CACHE_TTL_MS || '30000', 10),
  // Days a PastDue (or Active-past-period-end) subscription keeps working before access is blocked
  SUBSCRIPTION_GRACE_DAYS: parseInt(process.env.SUBSCRIPTION_GRACE_DAYS || '7', 10),

  // Brute-force protection on sign-in, registration, set-password and change-password.
  // AUTH_RATE_LIMIT_MAX = failed attempts allowed per account+IP per 15 minutes (other limits derive from it).
  // Set RATE_LIMIT_ENABLED=false only for load tests or local scripts.
  RATE_LIMIT_ENABLED: process.env.RATE_LIMIT_ENABLED !== 'false',
  AUTH_RATE_LIMIT_MAX: Math.max(1, parseInt(process.env.AUTH_RATE_LIMIT_MAX || '10', 10)),

  isProduction: process.env.NODE_ENV === 'production',
  isDevelopment: (process.env.NODE_ENV || 'development') === 'development',
  isTest: process.env.NODE_ENV === 'test',
};

