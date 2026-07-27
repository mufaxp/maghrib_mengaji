import { Router } from 'express';
import { handleWebhook, uploadMiniAppHandler } from '../controllers/webhookController.js';

const router = Router();

router.post('/telehook', handleWebhook);
router.post('/upload-miniapp', uploadMiniAppHandler);

export default router;