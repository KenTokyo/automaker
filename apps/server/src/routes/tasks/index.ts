/**
 * Tasks routes - CRUD for the "Tasks" tab.
 *
 * GET    /            - List tasks (with filters, sorting, pagination)
 * POST   /            - Create a new task
 * PUT    /:taskId     - Update a task
 * DELETE /:taskId     - Delete a task
 */

import { Router } from 'express';
import { validatePathParams } from '../../middleware/validate-paths.js';
import type { EventEmitter } from '../../lib/events.js';
import {
  createListHandler,
  createCreateHandler,
  createUpdateHandler,
  createDeleteHandler,
} from './handlers.js';

export function createTasksRoutes(events: EventEmitter): Router {
  const router = Router();

  router.get('/', validatePathParams('projectPath?', 'projectPaths?'), createListHandler());
  router.post('/', validatePathParams('projectPath'), createCreateHandler(events));
  router.put('/:taskId', validatePathParams('projectPath'), createUpdateHandler(events));
  router.delete('/:taskId', validatePathParams('projectPath'), createDeleteHandler(events));

  return router;
}
