/**
 * Docs routes - HTTP API for project documentation management
 */

import { Router } from 'express';
import { validatePathParams } from '../../middleware/validate-paths.js';
import type { SettingsService } from '../../services/settings-service.js';
import { createListHandler } from './routes/list.js';
import { createReadHandler } from './routes/read.js';
import { createCreateHandler } from './routes/create.js';
import { createUpdateHandler } from './routes/update.js';
import { createDeleteHandler } from './routes/delete.js';
import { createMkdirHandler } from './routes/mkdir.js';
import { createRenameHandler } from './routes/rename.js';
import { createAITransformHandler } from './routes/ai-transform.js';

export function createDocsRoutes(settingsService?: SettingsService): Router {
  const router = Router();

  router.post('/list', validatePathParams('projectPath'), createListHandler());
  router.post('/read', validatePathParams('projectPath'), createReadHandler());
  router.post('/create', validatePathParams('projectPath'), createCreateHandler());
  router.post('/update', validatePathParams('projectPath'), createUpdateHandler());
  router.post('/delete', validatePathParams('projectPath'), createDeleteHandler());
  router.post('/mkdir', validatePathParams('projectPath'), createMkdirHandler());
  router.post('/rename', validatePathParams('projectPath'), createRenameHandler());
  router.post('/ai-transform', createAITransformHandler(settingsService));

  return router;
}
