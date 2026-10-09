import { PrismaClient } from '@prisma/client';
import { env } from './env.js';

// Singleton instance of PrismaClient
export const prisma = new PrismaClient({
  log: env.isDevelopment ? ['warn', 'error'] : ['error'],
});

/**
 * Test database connectivity without modifying any data or schema
 */
export async function testDbConnection() {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return true;
  } catch (error) {
    console.error('[Prisma] Database connection check failed:', error.message);
    throw error;
  }
}
