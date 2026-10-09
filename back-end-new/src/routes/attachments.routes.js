import { Router } from 'express';
import { authenticate } from '../middleware/authenticate.js';
import {
  listAttachments,
  getAttachmentById,
  createAttachment,
  deleteAttachment
} from '../controllers/attachments.controller.js';

const router = Router();

router.get(['/attachments', '/api/attachments'], authenticate, listAttachments);
router.get(['/attachments/:id', '/api/attachments/:id'], authenticate, getAttachmentById);
router.post(['/attachments', '/api/attachments'], authenticate, createAttachment);
router.delete(['/attachments/:id', '/api/attachments/:id'], authenticate, deleteAttachment);

export default router;
