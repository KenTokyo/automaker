/**
 * Request handlers for tasks CRUD operations.
 *
 * GET    /            - List tasks (with filtering, sorting, pagination)
 * POST   /            - Create a new task (.automaker/tasks/*.md)
 * PUT    /:taskId     - Update a task by filename
 * DELETE /:taskId     - Delete a task by filename
 */

import type { Request, Response } from 'express';
import { createLogger } from '@automaker/utils';
import { validatePath, PathNotAllowedError } from '@automaker/platform';
import { getErrorMessage, createLogError } from '../common.js';
import { readTasks, writeTask, updateTask, deleteTask } from './storage.js';
import type { EventEmitter } from '../../lib/events.js';
import type {
  Task,
  TaskStatus,
  TaskPriority,
  TaskSortField,
  TaskSortOrder,
} from '@automaker/types';
import { TASK_STATUSES, TASK_PRIORITIES } from '@automaker/types';

const logger = createLogger('Tasks');
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

// ----------------------------------------------------------------------------
// LIST
// ----------------------------------------------------------------------------

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

      let tasks: Task[];

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

        const allTasks: Task[] = [];
        for (let i = 0; i < paths.length; i++) {
          try {
            const pTasks = await readTasks(paths[i]);
            const pName = projectNames[i] || paths[i].split(/[\\/]/).pop() || paths[i];
            for (const t of pTasks) {
              t.projectPath = paths[i];
              t.projectName = pName;
            }
            allTasks.push(...pTasks);
          } catch {
            logger.debug(`Skipping project ${paths[i]} - read error`);
          }
        }

        // Sort newest first across all projects
        allTasks.sort((a, b) => b.date.localeCompare(a.date));
        tasks = allTasks;
      } else {
        tasks = await readTasks(projectPath);
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
        tasks = tasks.filter((t) => t.tags.some((tag: string) => tags.includes(tag)));
      }

      const statusParam = req.query.status as string | undefined;
      if (statusParam) {
        const statuses = statusParam.split(',') as TaskStatus[];
        tasks = tasks.filter((t) => statuses.includes(t.status));
      }

      const priorityParam = req.query.priority as string | undefined;
      if (priorityParam) {
        const priorities = priorityParam.split(',') as TaskPriority[];
        tasks = tasks.filter((t) => priorities.includes(t.priority));
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
      const sortBy = (req.query.sortBy as TaskSortField) || 'date';
      const sortOrder = (req.query.sortOrder as TaskSortOrder) || 'desc';
      const direction = sortOrder === 'asc' ? 1 : -1;

      const priorityOrder: Record<string, number> = { P1: 1, P2: 2, P3: 3, P4: 4, '': 5 };
      const statusOrder: Record<string, number> = { open: 1, in_progress: 2, done: 3 };

      tasks.sort((a, b) => {
        let aVal: string | number;
        let bVal: string | number;

        if (sortBy === 'priority') {
          aVal = priorityOrder[a.priority] || 5;
          bVal = priorityOrder[b.priority] || 5;
        } else if (sortBy === 'status') {
          aVal = statusOrder[a.status] || 0;
          bVal = statusOrder[b.status] || 0;
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
      logError(error, 'Failed to list tasks');
      res.status(500).json({ success: false, error: getErrorMessage(error) });
    }
  };
}

// ----------------------------------------------------------------------------
// CREATE
// ----------------------------------------------------------------------------

export function createCreateHandler(events: EventEmitter) {
  return async (req: Request, res: Response): Promise<void> => {
    try {
      const { projectPath, title, description, date, status, priority, tags, summary } = req.body;

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
      const taskStatus: TaskStatus = status && TASK_STATUSES.includes(status) ? status : 'open';
      const taskPriority: TaskPriority =
        priority && TASK_PRIORITIES.includes(priority) ? priority : '';

      const slug = slugify(title);
      const filename = `${taskDate}_${slug}.md`;

      const task: Task = {
        filename,
        title: title.length > MAX_TITLE_LENGTH ? title.slice(0, MAX_TITLE_LENGTH) : title,
        description: description || '',
        date: taskDate,
        status: taskStatus,
        priority: taskPriority,
        tags: Array.isArray(tags) ? tags : [],
        summary: summary || '',
      };

      await writeTask(projectPath, task);

      events.emit('task:created', { task });
      logger.info(`Created task "${task.title}" (${task.filename})`);

      res.status(201).json({ success: true, task });
    } catch (error) {
      logError(error, 'Failed to create task');
      res.status(500).json({ success: false, error: getErrorMessage(error) });
    }
  };
}

// ----------------------------------------------------------------------------
// UPDATE
// ----------------------------------------------------------------------------

export function createUpdateHandler(events: EventEmitter) {
  return async (req: Request, res: Response): Promise<void> => {
    try {
      const taskId = req.params.taskId;
      const projectPath = req.body.projectPath as string;

      if (!projectPath) {
        res.status(400).json({ success: false, error: 'projectPath is required in body' });
        return;
      }
      if (!taskId) {
        res.status(400).json({ success: false, error: 'taskId param is required' });
        return;
      }

      const { title, description, status, priority, tags, summary } = req.body;

      // Build updates object with only provided fields
      const updates: Partial<Omit<Task, 'filename'>> = {};

      if (title !== undefined) {
        updates.title =
          typeof title === 'string' && title.length > MAX_TITLE_LENGTH
            ? title.slice(0, MAX_TITLE_LENGTH)
            : title;
      }
      if (description !== undefined) updates.description = description;
      if (status !== undefined && TASK_STATUSES.includes(status)) {
        updates.status = status;
      }
      if (priority !== undefined && TASK_PRIORITIES.includes(priority)) {
        updates.priority = priority;
      }
      if (tags !== undefined && Array.isArray(tags)) updates.tags = tags;
      if (summary !== undefined) updates.summary = summary;

      const updatedTask = await updateTask(projectPath, taskId, updates);

      if (!updatedTask) {
        res.status(404).json({ success: false, error: 'Task not found' });
        return;
      }

      events.emit('task:updated', { task: updatedTask });
      logger.info(`Updated task "${updatedTask.title}" (${updatedTask.filename})`);

      res.json({ success: true, task: updatedTask });
    } catch (error) {
      logError(error, 'Failed to update task');
      res.status(500).json({ success: false, error: getErrorMessage(error) });
    }
  };
}

// ----------------------------------------------------------------------------
// DELETE
// ----------------------------------------------------------------------------

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

      // taskId is the filename (e.g. "2026-03-18_refactor-auth.md")
      const deleted = await deleteTask(projectPath, taskId);

      if (!deleted) {
        res.status(404).json({ success: false, error: 'Task not found' });
        return;
      }

      events.emit('task:deleted', { taskId, projectPath });
      logger.info(`Deleted task "${taskId}"`);

      res.json({ success: true });
    } catch (error) {
      logError(error, 'Failed to delete task');
      res.status(500).json({ success: false, error: getErrorMessage(error) });
    }
  };
}
