import cors from 'cors';
import { env } from '../config/env.js';

// Local development origins. They are trusted ONLY outside production (SEC-M2-16): in production
// the allowed origins come exclusively from FRONTEND_ORIGINS.
const DEV_ORIGINS = [
  'http://localhost:5500',
  'http://127.0.0.1:5500',
  'http://localhost:3000',
  'http://127.0.0.1:3000',
  'http://localhost:64064',
  'http://127.0.0.1:64064',
];

function getAllowedOrigins() {
  const envOrigins = (env.FRONTEND_ORIGINS || '')
    .split(',')
    .map((o) => o.trim())
    .filter(Boolean);
  if (env.isProduction) {
    if (envOrigins.length === 0) {
      console.warn('[CORS] FRONTEND_ORIGINS is empty in production: all browser origins will be blocked.');
    }
    return envOrigins;
  }
  return [...new Set([...DEV_ORIGINS, ...envOrigins])];
}

const allowedOrigins = getAllowedOrigins();

export const corsMiddleware = cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (e.g. mobile apps, curl, server-to-server)
    if (!origin) return callback(null, true);

    if (allowedOrigins.includes(origin)) {
      return callback(null, true);
    }

    if (env.isDevelopment) {
      // In development, allow localhost/127.0.0.1 with any port
      if (/^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin)) {
        return callback(null, true);
      }
    }

    return callback(new Error(`CORS policy blocked access from origin: ${origin}`), false);
  },
  methods: ['GET', 'HEAD', 'PUT', 'PATCH', 'POST', 'DELETE', 'OPTIONS'],
  allowedHeaders: [
    'Content-Type',
    'Authorization',
    'x-user-role',
    'x-user-id',
    'x-user-email',
    'x-company-id',
    'x-platform-admin-id',
    'Accept',
    'Origin',
    'X-Requested-With',
  ],
  credentials: true,
  optionsSuccessStatus: 204,
});
