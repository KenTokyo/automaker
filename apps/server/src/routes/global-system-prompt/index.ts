/**
 * Global System Prompt Routes
 *
 * HTTP API for loading and saving the global system prompt.
 * The global system prompt is always included in every agent chat session.
 *
 * Endpoints:
 * - GET  /api/global-system-prompt       - Load the current prompt
 * - POST /api/global-system-prompt/save  - Save/update the prompt
 */

import { Router } from 'express';
import type { Request, Response } from 'express';
import { createLogger } from '@automaker/utils';
import {
  loadGlobalSystemPrompt,
  saveGlobalSystemPrompt,
} from '../../services/global-system-prompt-service.js';

const logger = createLogger('GlobalSystemPromptRoutes');

export function createGlobalSystemPromptRoutes(): Router {
  const router = Router();

  /**
   * Load the global system prompt
   * GET /api/global-system-prompt
   */
  router.get('/', async (_req: Request, res: Response) => {
    try {
      const content = await loadGlobalSystemPrompt();
      res.json({ success: true, content });
    } catch (error) {
      logger.error('Failed to load global system prompt:', error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to load global system prompt',
      });
    }
  });

  /**
   * Save the global system prompt
   * POST /api/global-system-prompt/save
   * Body: { content: string }
   */
  router.post('/save', async (req: Request, res: Response) => {
    try {
      const { content } = req.body as { content: string };

      if (typeof content !== 'string') {
        return res.status(400).json({
          success: false,
          error: 'content must be a string',
        });
      }

      const success = await saveGlobalSystemPrompt(content);

      if (!success) {
        return res.status(500).json({
          success: false,
          error: 'Failed to save global system prompt',
        });
      }

      res.json({ success: true });
    } catch (error) {
      logger.error('Failed to save global system prompt:', error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to save global system prompt',
      });
    }
  });

  return router;
}
