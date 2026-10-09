import { env } from '../config/env.js';
import { AppError } from '../utils/errors.js';

/**
 * 404 Not Found Middleware
 */
export function notFoundHandler(req, res, next) {
  res.status(404).json({
    success: false,
    statusCode: 404,
    message: `Cannot ${req.method} ${req.originalUrl || req.url}`,
    timestamp: new Date().toISOString(),
  });
}

/**
 * Centralized Error-Handling Middleware
 */
export function errorHandler(err, req, res, next) {
  let statusCode = err.statusCode || err.status || 500;
  let message = 'Internal server error';
  let errors = err.errors || null;

  // Handle custom AppError instances
  if (err instanceof AppError) {
    statusCode = err.statusCode;
    message = err.message;
    errors = err.errors;
  }

  // Handle CORS errors
  else if (err.message && err.message.includes('CORS')) {
    statusCode = 403;
    message = err.message;
  }

  // Handle JSON Syntax Errors (malformed payload)
  else if (err instanceof SyntaxError && err.status === 400 && 'body' in err) {
    statusCode = 400;
    message = 'Invalid JSON in request body';
  }

  // Handle Prisma-specific known request errors safely
  else if (err.code && typeof err.code === 'string' && err.code.startsWith('P')) {
    switch (err.code) {
      case 'P2002': {
        statusCode = 409;
        const target = Array.isArray(err.meta?.target)
          ? err.meta.target.join(', ')
          : 'field';
        message = `Unique constraint violation: record with this ${target} already exists`;
        break;
      }
      case 'P2025': {
        statusCode = 404;
        message = 'Requested record was not found';
        break;
      }
      case 'P2003': {
        statusCode = 400;
        message = 'Foreign key constraint violation';
        break;
      }
      case 'P2000': {
        statusCode = 400;
        message = 'Input value too long for database field';
        break;
      }
      default: {
        statusCode = 500;
        message = 'Internal server error';
        break;
      }
    }
  }

  // Handle Prisma client query validation errors
  else if (err.name === 'PrismaClientValidationError') {
    statusCode = 400;
    message = 'Invalid database query parameters';
  }

  // Handle other client-side errors (< 500)
  else if (statusCode < 500) {
    message = err.message || 'Bad Request';
  } else {
    // Unexpected 500 errors - do not leak internal runtime or DB details
    statusCode = 500;
    message = 'Internal server error';
  }

  // Log server errors (500+) server-side for diagnostics
  if (statusCode >= 500) {
    console.error(`[SERVER ERROR] ${req?.method || 'UNKNOWN'} ${req?.originalUrl || req?.url || '/'}:`, err.message);
    if (env.isDevelopment && err.stack) {
      console.error(err.stack);
    }
  }

  const responseBody = {
    success: false,
    statusCode,
    message,
    timestamp: new Date().toISOString(),
  };

  if (errors && Array.isArray(errors) && errors.length > 0) {
    responseBody.errors = errors;
  }

  res.status(statusCode).json(responseBody);
}
