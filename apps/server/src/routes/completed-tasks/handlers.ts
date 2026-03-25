/**
 * Request handlers for completed tasks CRUD operations.
 *
 * GET    /                — List tasks (with filtering, sorting, pagination)
 * POST   /                — Create a new completed task (.completed/*.md)
 * DELETE /:taskId         — Delete a task by filename
 * GET    /stats           — Aggregate statistics
 */

import type { Request, Response } from 'express';
import { createLogger } from '@automaker/utils';
import { validatePath, PathNotAllowedError } from '@automaker/platform';
import { getErrorMessage, createLogError } from '../common.js';
import { readCompletedTasks, writeCompletedTask, deleteCompletedTask } from './storage.js';
import type { EventEmitter } from '../../lib/events.js';
import type {
  CompletedTask,
  CompletedTaskSortField,
  CompletedTaskSortOrder,
  CompletedTaskStatus,
  CompletedTaskEffort,
} from '@automaker/types';
import { COMPLETED_TASK_STATUSES, COMPLETED_TASK_EFFORTS } from '@automaker/types';

const logger = createLogger('CompletedTasks');
const logError = createLogError(logger);

const MAX_TITLE_LENGTH = 200;

/**
 * Create a URL-safe slug from a title string.
 */
function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[äöü]/g, (c) => ({ ä: 'ae', ö: 'oe', ü: 'ue' })[c] || c)
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .substring(0, 50);
}

// ────────────────────────────────────────────────────────────────────────────
// LIST
// ────────────────────────────────────────────────────────────────────────────

export function createListHandler() {
  return async (req: Request, res: Response): Promise<void> => {
    try {
      const projectPath = req.query.projectPath as string;
      const projectPaths = req.query.projectPaths as string | undefined;

      if (!projectPath && !projectPaths) {
        res
          .status(400)
          .json({ success: false, error: 'projectPath or projectPaths query param is required' });
        return;
      }

      let tasks: CompletedTask[];

      if (projectPaths) {
        // Multi-project mode: fetch from all specified projects
        const paths = projectPaths.split('|').filter(Boolean);
        const projectNames = ((req.query.projectNames as string) || '').split('|');

        // Validate all paths
        for (const p of paths) {
          try {
            validatePath(p);
          } catch (err) {
            if (err instanceof PathNotAllowedError) {
              res.status(403).json({ success: false, error: err.message });
              return;
            }
            throw err;
          }
        }
        const allTasks: CompletedTask[] = [];

        for (let i = 0; i < paths.length; i++) {
          try {
            const pTasks = await readCompletedTasks(paths[i]);
            const pName = projectNames[i] || paths[i].split(/[\\/]/).pop() || paths[i];
            for (const t of pTasks) {
              t.projectPath = paths[i];
              t.projectName = pName;
            }
            allTasks.push(...pTasks);
          } catch {
            logger.debug(`Skipping project ${paths[i]} – read error`);
          }
        }

        // Sort newest first across all projects
        allTasks.sort((a, b) => b.date.localeCompare(a.date));
        tasks = allTasks;
      } else {
        tasks = await readCompletedTasks(projectPath);
      }

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

      const tagsParam = req.query.tags as string | undefined;
      if (tagsParam) {
        const tags = tagsParam.split(',');
        tasks = tasks.filter((t) => t.tags.some((tag) => tags.includes(tag)));
      }

      const statusParam = req.query.status as string | undefined;
      if (statusParam) {
        const statuses = statusParam.split(',') as CompletedTaskStatus[];
        tasks = tasks.filter((t) => statuses.includes(t.status));
      }

      const effortParam = req.query.effort as string | undefined;
      if (effortParam) {
        const efforts = effortParam.split(',') as CompletedTaskEffort[];
        tasks = tasks.filter((t) => t.effort && efforts.includes(t.effort as CompletedTaskEffort));
      }

      const since = req.query.since as string | undefined;
      if (since) {
        tasks = tasks.filter((t) => t.date >= since);
      }

      const until = req.query.until as string | undefined;
      if (until) {
        tasks = tasks.filter((t) => t.date <= until);
      }

      // --- Sort ---
      const sortBy = (req.query.sortBy as CompletedTaskSortField) || 'date';
      const sortOrder = (req.query.sortOrder as CompletedTaskSortOrder) || 'desc';
      const direction = sortOrder === 'asc' ? 1 : -1;

      const effortOrder: Record<string, number> = { S: 1, M: 2, L: 3, XL: 4 };

      tasks.sort((a, b) => {
        let aVal: string | number;
        let bVal: string | number;

        if (sortBy === 'effort') {
          aVal = effortOrder[a.effort] || 0;
          bVal = effortOrder[b.effort] || 0;
        } else {
          aVal = a[sortBy] ?? '';
          bVal = b[sortBy] ?? '';
        }

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
        date,
        status,
        effort,
        attempt,
        provider,
        files,
        tags,
        summary,
      } = req.body;

      if (!projectPath || typeof projectPath !== 'string') {
        res.status(400).json({ success: false, error: 'projectPath is required' });
        return;
      }
      if (!title || typeof title !== 'string') {
        res.status(400).json({ success: false, error: 'title is required' });
        return;
      }

      const taskDate =
        date && typeof date === 'string' ? date : new Date().toISOString().slice(0, 10);
      const taskStatus: CompletedTaskStatus =
        status && COMPLETED_TASK_STATUSES.includes(status) ? status : 'success';
      const taskEffort: CompletedTask['effort'] =
        effort && COMPLETED_TASK_EFFORTS.includes(effort) ? effort : '';

      const slug = slugify(title);
      const filename = `${taskDate}_${slug}.md`;

      const task: CompletedTask = {
        filename,
        title: title.length > MAX_TITLE_LENGTH ? title.slice(0, MAX_TITLE_LENGTH) : title,
        description: description || '',
        date: taskDate,
        status: taskStatus,
        effort: taskEffort,
        attempt: typeof attempt === 'number' && attempt > 0 ? attempt : 1,
        provider: provider || '',
        files: Array.isArray(files) ? files : [],
        tags: Array.isArray(tags) ? tags : [],
        summary: summary || '',
      };

      await writeCompletedTask(projectPath, task);

      events.emit('completed-task:created', { task });
      logger.info(`Created completed task "${task.title}" (${task.filename})`);

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

      // taskId is now the filename (e.g. "2026-03-17_session-tabs.md")
      const deleted = await deleteCompletedTask(projectPath, taskId);

      if (!deleted) {
        res.status(404).json({ success: false, error: 'Task not found' });
        return;
      }

      events.emit('completed-task:deleted', { taskId, projectPath });
      logger.info(`Deleted completed task "${taskId}"`);

      res.json({ success: true });
    } catch (error) {
      logError(error, 'Failed to delete completed task');
      res.status(500).json({ success: false, error: getErrorMessage(error) });
    }
  };
}

// ────────────────────────────────────────────────────────────────────────────
// BULK DELETE
// ────────────────────────────────────────────────────────────────────────────

export function createBulkDeleteHandler(events: EventEmitter) {
  return async (req: Request, res: Response): Promise<void> => {
    try {
      const { projectPath, filenames } = req.body;

      if (!projectPath || typeof projectPath !== 'string') {
        res.status(400).json({ success: false, error: 'projectPath is required' });
        return;
      }
      if (!Array.isArray(filenames) || filenames.length === 0) {
        res.status(400).json({ success: false, error: 'filenames array is required' });
        return;
      }

      let deletedCount = 0;
      for (const filename of filenames) {
        if (typeof filename !== 'string') continue;
        const deleted = await deleteCompletedTask(projectPath, filename);
        if (deleted) {
          deletedCount++;
          events.emit('completed-task:deleted', { taskId: filename, projectPath });
        }
      }

      logger.info(`Bulk-deleted ${deletedCount}/${filenames.length} tasks from ${projectPath}`);
      res.json({ success: true, deletedCount });
    } catch (error) {
      logError(error, 'Failed to bulk-delete completed tasks');
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

      const tasks = await readCompletedTasks(projectPath);

      // Count per tag
      const byTag: Record<string, number> = {};
      for (const t of tasks) {
        for (const tag of t.tags) {
          byTag[tag] = (byTag[tag] || 0) + 1;
        }
      }

      // Count per status
      const byStatus: Record<string, number> = {};
      for (const t of tasks) {
        byStatus[t.status] = (byStatus[t.status] || 0) + 1;
      }

      // Count per effort
      const byEffort: Record<string, number> = {};
      for (const t of tasks) {
        if (t.effort) {
          byEffort[t.effort] = (byEffort[t.effort] || 0) + 1;
        }
      }

      // Date range
      let oldest: string | null = null;
      let newest: string | null = null;
      for (const t of tasks) {
        if (!oldest || t.date < oldest) oldest = t.date;
        if (!newest || t.date > newest) newest = t.date;
      }

      res.json({
        success: true,
        stats: {
          total: tasks.length,
          byTag,
          byStatus,
          byEffort,
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
