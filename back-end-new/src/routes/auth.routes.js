import { Router } from 'express';
import { authenticate } from '../middleware/authenticate.js';
import { loginLimiters, registerLimiter, setPasswordLimiter, changePasswordLimiter, forgotPasswordLimiters } from '../middleware/rateLimit.js';
import {
  handleLogin,
  handleRegisterCompany,
  handleSetPassword,
  handleGetMe,
  handleGetPublicPlans,
  handleChangePassword,
  handleForgotPassword,
} from '../controllers/auth.controller.js';

const router = Router();

// Route Mappings supporting both direct and /api prefixed routes
router.post(['/auth/login', '/api/auth/login'], ...loginLimiters, handleLogin);
router.post(['/auth/register-company', '/api/auth/register-company', '/companies/register', '/api/companies/register'], registerLimiter, handleRegisterCompany);
router.post(['/auth/set-password', '/api/auth/set-password'], setPasswordLimiter, handleSetPassword);
router.post(['/auth/forgot-password', '/api/auth/forgot-password'], ...forgotPasswordLimiters, handleForgotPassword);
router.post(['/auth/change-password', '/api/auth/change-password'], authenticate, changePasswordLimiter, handleChangePassword);
router.get(['/auth/me', '/api/auth/me'], authenticate, handleGetMe);
router.get(['/auth/public-plans', '/api/auth/public-plans', '/public/plans', '/api/public/plans'], handleGetPublicPlans);

export default router;
