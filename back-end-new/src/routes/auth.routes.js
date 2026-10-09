import { Router } from 'express';
import { authenticate } from '../middleware/authenticate.js';
import {
  handleLogin,
  handleRegisterCompany,
  handleGetMe,
  handleGetPublicPlans,
} from '../controllers/auth.controller.js';

const router = Router();

// Route Mappings supporting both direct and /api prefixed routes
router.post(['/auth/login', '/api/auth/login'], handleLogin);
router.post(['/auth/register-company', '/api/auth/register-company', '/companies/register', '/api/companies/register'], handleRegisterCompany);
router.get(['/auth/me', '/api/auth/me'], authenticate, handleGetMe);
router.get(['/auth/public-plans', '/api/auth/public-plans', '/public/plans', '/api/public/plans'], handleGetPublicPlans);

export default router;
