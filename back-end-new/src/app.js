import express from 'express';
import helmet from 'helmet';
import { env } from './config/env.js';
import { corsMiddleware } from './middleware/cors.js';
import { generalApiLimiter, authLimiter } from './middleware/rateLimit.js';
import { errorHandler, notFoundHandler } from './middleware/errorHandler.js';
import healthRoutes from './routes/health.routes.js';
import mainRoutes from './routes/index.js';

export function createApp() {
  const app = express();

  // 0. Trust Proxy configuration (for reverse proxies like Nginx, Cloudflare, AWS ALB)
  if (env.isProduction || process.env.TRUST_PROXY === 'true') {
    app.set('trust proxy', 1);
  }

  // 1. Security Headers with Helmet
  app.use(
    helmet({
      crossOriginResourcePolicy: { policy: 'cross-origin' },
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'", 'https:'],
          styleSrc: ["'self'", "'unsafe-inline'", 'https:'],
          imgSrc: ["'self'", 'data:', 'https:', 'blob:'],
          connectSrc: ["'self'", 'http:', 'https:'],
        },
      },
      hsts: env.isProduction,
    }),
  );

  // 2. CORS
  app.use(corsMiddleware);

  // 3. Body Parsing
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true, limit: '10mb' }));

  // 4. Rate Limiting Middleware
  // Stricter limiter on sensitive auth routes
  app.use(['/auth/login', '/api/auth/login', '/auth/register-company', '/api/auth/register-company', '/platform/auth/login', '/api/platform/auth/login'], authLimiter);
  // General API rate limiter across all api endpoints
  app.use(['/api', '/users', '/projects', '/tasks', '/notifications', '/compliance-rules', '/compliance-violations', '/compliance-categories', '/compliance-bindings', '/evidence', '/platform', '/executive', '/attachments', '/bootstrap', '/permissions', '/role-templates', '/role-assignments'], generalApiLimiter);

  // 5. Routes
  app.use(healthRoutes);
  app.use(mainRoutes);

  // 6. 404 Handler (unmatched routes)
  app.use(notFoundHandler);

  // 7. Centralized Error Handler
  app.use(errorHandler);

  return app;
}

export const app = createApp();
