import { Router } from 'express';
import { getHealth } from '../controllers/health.controller.js';

const router = Router();

/**
 * GET /health
 * Performs a health check including safe database ping
 */
router.get(['/health', '/api/health'], getHealth);

export default router;
