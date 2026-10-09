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
  FRONTEND_ORIGINS: process.env.FRONTEND_ORIGINS || '',
  isProduction: process.env.NODE_ENV === 'production',
  isDevelopment: (process.env.NODE_ENV || 'development') === 'development',
};

