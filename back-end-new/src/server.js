import { env, validateEnv } from './config/env.js';
import { prisma, testDbConnection } from './config/prisma.js';
import { app } from './app.js';

// OptiFlow Server Entry Point
async function startServer() {
  try {
    // 1. Validate environment configuration
    validateEnv();

    // 2. Safe database connection check
    console.log('[Startup] Verifying database connection...');
    try {
      await testDbConnection();
      console.log('[Startup] Database connection successful.');
    } catch (dbErr) {
      if (env.isProduction) {
        throw dbErr;
      }
      console.warn('[Startup] Warning: Database server is unreachable. Express server will start in degraded mode.');
    }

    // 3. Start Express HTTP Server
    const server = app.listen(env.PORT, () => {
      console.log(`OptiFlow Express Server running on: http://localhost:${env.PORT}`);
      console.log(`Health Check endpoint available at: http://localhost:${env.PORT}/health`);
      console.log(`Environment: ${env.NODE_ENV}`);
    });

    // 4. Graceful Shutdown Handlers
    const shutdown = async (signal) => {
      console.log(`\n[Shutdown] Received ${signal}. Closing server gracefully...`);
      server.close(async () => {
        console.log('[Shutdown] HTTP server closed.');
        try {
          await prisma.$disconnect();
          console.log('[Shutdown] Database connection disconnected.');
        } catch (err) {
          console.error('[Shutdown] Error disconnecting database:', err);
        }
        process.exit(0);
      });

      // Force exit if hanging
      setTimeout(() => {
        console.error('[Shutdown] Forcefully terminating process.');
        process.exit(1);
      }, 5000);
    };

    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGINT', () => shutdown('SIGINT'));
  } catch (error) {
    console.error('[FATAL] Failed to start server:', error.message);
    process.exit(1);
  }
}

startServer();
