/**
 * Overview routes — AI-powered dashboard overview generation.
 *
 * POST   /generate   — Start a new overview generation
 * DELETE /generate   — Cancel a running generation
 * GET    /status     — Check which time ranges have data
 * GET    /:timeRange — Load a saved overview (12h, 24h, 4d, 1w)
 */

import { Router } from 'express';
import { validatePathParams } from '../../middleware/validate-paths.js';
import type { EventEmitter } from '../../lib/events.js';
import { createGenerateHandler } from './routes/generate.js';
import { createCancelHandler } from './routes/cancel.js';
import { createLoadHandler } from './routes/load.js';
import { createStatusHandler } from './routes/status.js';

export function createOverviewRoutes(events: EventEmitter, dataDir: string): Router {
  const router = Router();

  router.post('/generate', validatePathParams('projectPath'), createGenerateHandler(events, dataDir));
  router.delete('/generate', createCancelHandler());
  router.get('/status', createStatusHandler(dataDir));
  router.get('/:timeRange', createLoadHandler(dataDir));

  return router;
}
