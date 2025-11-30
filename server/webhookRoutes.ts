import { Router } from 'express';
import { handleZoomWebhook } from './webhookHandler';

const router = Router();

/**
 * Zoom webhook endpoint
 * POST /api/webhooks/zoom
 */
router.post('/zoom', handleZoomWebhook);

export default router;
