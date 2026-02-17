/**
 * Chat Images Routes - HTTP API for managing chat images
 *
 * Provides endpoints for saving and managing images pasted in chat.
 * Images are stored in DATA_DIR/chat-images/ for persistence.
 *
 * Endpoints:
 * - POST /api/chat-images/save - Save a base64 image to disk
 */

import { Router, type Request, type Response } from 'express';
import { createLogger } from '@automaker/utils';
import { saveChatImage, type SaveImageResult } from '../../services/chat-images-service.js';

const logger = createLogger('ChatImagesRoutes');

/**
 * Request body for saving a chat image
 */
interface SaveImageRequest {
  data: string; // Base64 encoded image data
  mimeType?: string; // Optional MIME type
}

/**
 * Create chat images router with all endpoints
 */
export function createChatImagesRoutes(): Router {
  const router = Router();

  /**
   * Save a chat image
   * POST /api/chat-images/save
   * Body: { data: string, mimeType?: string }
   */
  router.post('/save', async (req: Request, res: Response) => {
    try {
      const { data, mimeType } = req.body as SaveImageRequest;

      if (!data) {
        res.status(400).json({
          success: false,
          error: 'Image data is required',
        });
        return;
      }

      logger.debug('Saving chat image...');

      const result: SaveImageResult = await saveChatImage(data, mimeType);

      if (!result.success) {
        res.status(500).json({
          success: false,
          error: result.error || 'Failed to save image',
        });
        return;
      }

      res.json({
        success: true,
        path: result.path,
        filename: result.filename,
      });
    } catch (error) {
      logger.error('Failed to save chat image:', error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to save image',
      });
    }
  });

  return router;
}
