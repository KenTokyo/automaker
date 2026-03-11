/**
 * Markdown Explorer routes - search files within a project
 *
 * Tree browsing and file reading are handled by the existing /api/fs routes.
 * This module adds project-wide search (by filename + optional content).
 */

import { Router } from 'express';
import { validatePathParams } from '../../middleware/validate-paths.js';
import { createSearchHandler } from './routes/search.js';
import { createFilesByTimeHandler } from './routes/files-by-time.js';

export function createMarkdownExplorerRoutes(): Router {
  const router = Router();

  router.post('/search', validatePathParams('projectPath'), createSearchHandler());
  router.get('/files-by-time', createFilesByTimeHandler());

  return router;
}
