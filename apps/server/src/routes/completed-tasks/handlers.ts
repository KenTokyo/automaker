/**
 * Request handlers for completed tasks CRUD operations.
 *
 * GET    /                — List tasks (with filtering, sorting, pagination)
 * POST   /                — Create a new completed task
 * DELETE /:taskId         — Delete a task by ID
 * GET    /stats           — Aggregate statistics
 */

import type { Request, Response } from 'express';
import { randomUUID } from 'crypto';
import { createLogger } from '@automaker/utils';
import { getErrorMessage, createLogError } from '../common.js';
import { readCompletedTasks, writeCompletedTasks } from './storage.js';
import type { EventEmitter } from '../../lib/events.js';
import type {
  CompletedTask,
  CompletedTaskCategory,
  CompletedTaskBadge,
  CompletedTaskSortField,
  CompletedTaskSortOrder,
} from '@automaker/types';
import { COMPLETED_TASKS_VERSION } from '@automaker/types';

const logger = createLogger('CompletedTasks');
const logError = createLogError(logger);

const VALID_CATEGORIES: CompletedTaskCategory[] = [
  'feature',
  'bugfix',
  'improvement',
  'config',
  'refactor',
  'docs',
];
const MAX_TITLE_LENGTH = 200;

// ────────────────────────────────────────────────────────────────────────────
// LIST
// ────────────────────────────────────────────────────────────────────────────

export function createListHandler() {
  return async (req: Request, res: Response): Promise<void> => {
    try {
      const projectPath = req.query.projectPath as string;
      if (!projectPath) {
        res.status(400).json({ success: false, error: 'projectPath query param is required' });
        return;
      }

      const file = await readCompletedTasks(projectPath);
      let tasks = file.tasks;

      // --- Filters ---
      const search = req.query.search as string | undefined;
      if (search) {
        const lower = search.toLowerCase();
        tasks = tasks.filter(
          (t) =>
            t.title.toLowerCase().includes(lower) ||
            t.description.toLowerCase().includes(lower) ||
            (t.summary && t.summary.toLowerCase().includes(lower))
        );
      }

      const categoriesParam = req.query.categories as string | undefined;
      if (categoriesParam) {
        const cats = categoriesParam.split(',') as CompletedTaskCategory[];
        tasks = tasks.filter((t) => cats.includes(t.category));
      }

      const badgesParam = req.query.badges as string | undefined;
      if (badgesParam) {
        const badges = badgesParam.split(',') as CompletedTaskBadge[];
        tasks = tasks.filter((t) => t.badges.some((b) => badges.includes(b)));
      }

      const since = req.query.since as string | undefined;
      if (since) {
        tasks = tasks.filter((t) => t.completedAt >= since);
      }

      const until = req.query.until as string | undefined;
      if (until) {
        tasks = tasks.filter((t) => t.completedAt <= until);
      }

      // --- Sort ---
      const sortBy = (req.query.sortBy as CompletedTaskSortField) || 'completedAt';
      const sortOrder = (req.query.sortOrder as CompletedTaskSortOrder) || 'desc';
      const direction = sortOrder === 'asc' ? 1 : -1;

      tasks.sort((a, b) => {
        const aVal = a[sortBy] ?? '';
        const bVal = b[sortBy] ?? '';
        if (aVal < bVal) return -1 * direction;
        if (aVal > bVal) return 1 * direction;
        return 0;
      });

      // --- Pagination ---
      const total = tasks.length;
      const offset = parseInt(req.query.offset as string, 10) || 0;
      const limit = parseInt(req.query.limit as string, 10) || 0;

      if (offset > 0) {
        tasks = tasks.slice(offset);
      }
      if (limit > 0) {
        tasks = tasks.slice(0, limit);
      }

      res.json({ success: true, tasks, total });
    } catch (error) {
      logError(error, 'Failed to list completed tasks');
      res.status(500).json({ success: false, error: getErrorMessage(error) });
    }
  };
}

// ────────────────────────────────────────────────────────────────────────────
// CREATE
// ────────────────────────────────────────────────────────────────────────────

export function createCreateHandler(events: EventEmitter) {
  return async (req: Request, res: Response): Promise<void> => {
    try {
      const {
        projectPath,
        title,
        description,
        category,
        badges,
        historyFile,
        relatedFiles,
        chatSessionId,
        featureId,
        summary,
        commitHash,
      } = req.body;

      if (!projectPath || typeof projectPath !== 'string') {
        res.status(400).json({ success: false, error: 'projectPath is required' });
        return;
      }
      if (!title || typeof title !== 'string') {
        res.status(400).json({ success: false, error: 'title is required' });
        return;
      }
      if (!category || !VALID_CATEGORIES.includes(category)) {
        res
          .status(400)
          .json({
            success: false,
            error: `category must be one of: ${VALID_CATEGORIES.join(', ')}`,
          });
        return;
      }

      const task: CompletedTask = {
        id: randomUUID(),
        title: title.length > MAX_TITLE_LENGTH ? title.slice(0, MAX_TITLE_LENGTH) : title,
        description: description || '',
        category,
        badges: Array.isArray(badges) ? badges : [],
        completedAt: new Date().toISOString(),
        projectPath,
        historyFile: historyFile || undefined,
        relatedFiles: Array.isArray(relatedFiles) ? relatedFiles : undefined,
        chatSessionId: chatSessionId || undefined,
        featureId: featureId || undefined,
        summary: summary || undefined,
        commitHash: commitHash || undefined,
      };

      const file = await readCompletedTasks(projectPath);
      file.tasks.push(task);
      file.version = COMPLETED_TASKS_VERSION;
      await writeCompletedTasks(projectPath, file);

      events.emit('completed-task:created', { task });
      logger.info(`Created completed task "${task.title}" (${task.id})`);

      res.status(201).json({ success: true, task });
    } catch (error) {
      logError(error, 'Failed to create completed task');
      res.status(500).json({ success: false, error: getErrorMessage(error) });
    }
  };
}

// ────────────────────────────────────────────────────────────────────────────
// DELETE
// ────────────────────────────────────────────────────────────────────────────

export function createDeleteHandler(events: EventEmitter) {
  return async (req: Request, res: Response): Promise<void> => {
    try {
      const taskId = req.params.taskId;
      const projectPath = req.query.projectPath as string;

      if (!projectPath) {
        res.status(400).json({ success: false, error: 'projectPath query param is required' });
        return;
      }
      if (!taskId) {
        res.status(400).json({ success: false, error: 'taskId param is required' });
        return;
      }

      const file = await readCompletedTasks(projectPath);
      const index = file.tasks.findIndex((t) => t.id === taskId);

      if (index === -1) {
        res.status(404).json({ success: false, error: 'Task not found' });
        return;
      }

      const [deleted] = file.tasks.splice(index, 1);
      await writeCompletedTasks(projectPath, file);

      events.emit('completed-task:deleted', { taskId, projectPath });
      logger.info(`Deleted completed task "${deleted.title}" (${taskId})`);

      res.json({ success: true });
    } catch (error) {
      logError(error, 'Failed to delete completed task');
      res.status(500).json({ success: false, error: getErrorMessage(error) });
    }
  };
}

// ────────────────────────────────────────────────────────────────────────────
// STATS
// ────────────────────────────────────────────────────────────────────────────

export function createStatsHandler() {
  return async (req: Request, res: Response): Promise<void> => {
    try {
      const projectPath = req.query.projectPath as string;
      if (!projectPath) {
        res.status(400).json({ success: false, error: 'projectPath query param is required' });
        return;
      }

      const file = await readCompletedTasks(projectPath);
      const tasks = file.tasks;

      // Count per category
      const byCategory: Record<string, number> = {};
      for (const cat of VALID_CATEGORIES) {
        byCategory[cat] = 0;
      }
      for (const t of tasks) {
        byCategory[t.category] = (byCategory[t.category] || 0) + 1;
      }

      // Count per badge
      const byBadge: Record<string, number> = {};
      for (const t of tasks) {
        for (const b of t.badges) {
          byBadge[b] = (byBadge[b] || 0) + 1;
        }
      }

      // Time range
      let oldest: string | null = null;
      let newest: string | null = null;
      for (const t of tasks) {
        if (!oldest || t.completedAt < oldest) oldest = t.completedAt;
        if (!newest || t.completedAt > newest) newest = t.completedAt;
      }

      res.json({
        success: true,
        stats: {
          total: tasks.length,
          byCategory,
          byBadge,
          oldest,
          newest,
        },
      });
    } catch (error) {
      logError(error, 'Failed to get completed task stats');
      res.status(500).json({ success: false, error: getErrorMessage(error) });
    }
  };
}
