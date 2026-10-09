import path from 'path';
import { Router } from 'express';
import { authenticate } from '../middleware/authenticate.js';
import { requireRoles } from '../middleware/authorize.js';
import { ROLES } from '../utils/roles.js';
import multer from 'multer';
import fs from 'fs';
import { env } from '../config/env.js';
import {
  listEvidence,
  getEvidenceById,
  createEvidence,
  updateEvidence,
  deleteEvidence,
  uploadEvidenceFile,
  streamEvidenceFile
} from '../controllers/compliance-evidence.controller.js';

const router = Router();


// Configure multer storage
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(process.cwd(), 'uploads');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, `${uniqueSuffix}-${file.originalname}`);
  },
});
const upload = multer({
  storage,
  limits: { fileSize: 20 * 1024 * 1024 }, // 20 MB max
});

// Evidence
router.get(['/evidence', '/api/evidence'], authenticate, listEvidence);
router.get(['/evidence/:id', '/api/evidence/:id'], authenticate, getEvidenceById);
router.get(['/evidence/:id/file', '/api/evidence/:id/file'], authenticate, streamEvidenceFile);
router.post(
  ['/evidence', '/api/evidence'],
  authenticate,
  requireRoles(ROLES.COMPANY_OWNER, ROLES.SYSTEM_ADMIN, ROLES.COMPLIANCE_OFFICER, ROLES.PROJECT_MANAGER, ROLES.TEAM_LEAD, ROLES.TEAM_MEMBER, 'superuser', 'compliance_officer', 'project_manager', 'team_leader', 'team_lead', 'team_member'),
  createEvidence
);
router.post(
  ['/evidence/:id/upload', '/api/evidence/:id/upload'],
  authenticate,
  requireRoles(ROLES.COMPANY_OWNER, ROLES.SYSTEM_ADMIN, ROLES.COMPLIANCE_OFFICER, ROLES.PROJECT_MANAGER, ROLES.TEAM_LEAD, ROLES.TEAM_MEMBER, 'superuser', 'compliance_officer', 'project_manager', 'team_leader', 'team_lead', 'team_member'),
  upload.single('file'),
  uploadEvidenceFile
);
router.patch(
  ['/evidence/:id', '/api/evidence/:id'],
  authenticate,
  requireRoles(ROLES.COMPANY_OWNER, ROLES.SYSTEM_ADMIN, ROLES.COMPLIANCE_OFFICER, ROLES.PROJECT_MANAGER, 'superuser', 'compliance_officer', 'project_manager'),
  updateEvidence
);
router.delete(
  ['/evidence/:id', '/api/evidence/:id'],
  authenticate,
  requireRoles(ROLES.COMPANY_OWNER, ROLES.SYSTEM_ADMIN, ROLES.COMPLIANCE_OFFICER, 'superuser', 'compliance_officer'),
  deleteEvidence
);



export default router;
