/**
 * Completed Tasks routes — CRUD for the "Done" tab.
 *
 * GET    /            — List completed tasks (with filters, sorting, pagination)
 * POST   /            — Create a new completed task
 * DELETE /:taskId     — Delete a completed task
 * GET    /stats       — Aggregate statistics per category/badge
 */

import { Router } from 'express';
import { validatePathParams } from '../../middleware/validate-paths.js';
import type { EventEmitter } from '../../lib/events.js';
import {
  createListHandler,
  createCreateHandler,
  createDeleteHandler,
  createBulkDeleteHandler,
  createStatsHandler,
} from './handlers.js';
import { createListHistoryFilesHandler, createReadHistoryFileHandler } from './history.js';

export function createCompletedTasksRoutes(events: EventEmitter): Router {
  const router = Router();

  // Stats and history must be registered before /:taskId to avoid route conflict
  router.get('/stats', createStatsHandler());
  router.get('/history-files', validatePathParams('projectPath'), createListHistoryFilesHandler());
  router.get('/history-file', validatePathParams('projectPath'), createReadHistoryFileHandler());

  router.post('/bulk-delete', validatePathParams('projectPath'), createBulkDeleteHandler(events));

  router.get('/', validatePathParams('projectPath?', 'projectPaths?'), createListHandler());
  router.post('/', validatePathParams('projectPath'), createCreateHandler(events));
  router.delete('/:taskId', validatePathParams('projectPath'), createDeleteHandler(events));

  return router;
}
