/**
 * Storage layer for tasks — `.automaker/tasks/*.md` file operations.
 *
 * Each task is stored as a Markdown file with YAML frontmatter
 * in the `.automaker/tasks/` directory of the project root.
 */

import path from 'path';
import fs from 'fs';
import { createLogger } from '@automaker/utils';
import { getTasksDir, ensureTasksDir } from '@automaker/platform';
import type { Task, TaskStatus, TaskPriority, TaskFilter } from '@automaker/types';
import { TASK_STATUSES, TASK_PRIORITIES } from '@automaker/types';

const logger = createLogger('TasksStorage');

/**
 * Read all tasks from `.automaker/tasks/*.md` files.
 *
 * - Directory doesn't exist -> returns empty array
 * - Files starting with `_` are skipped (reserved for templates/README)
 * - Unparseable files are silently skipped
 */
export async function readTasks(projectPath: string, filters?: TaskFilter): Promise<Task[]> {
  const dir = getTasksDir(projectPath);

  try {
    await fs.promises.access(dir, fs.constants.R_OK);
  } catch {
    return [];
  }

  const entries = await fs.promises.readdir(dir);
  const mdFiles = entries.filter((e) => e.endsWith('.md') && !e.startsWith('_'));

  let tasks: Task[] = [];
  for (const file of mdFiles) {
    try {
      const content = await fs.promises.readFile(path.join(dir, file), 'utf-8');
      const parsed = parseFrontmatter(content, file);
      if (parsed) tasks.push(parsed);
    } catch {
      logger.debug(`Skipping unparseable file: ${file}`);
    }
  }

  // Apply filters if provided
  if (filters) {
    if (filters.search) {
      const lower = filters.search.toLowerCase();
      tasks = tasks.filter(
        (t) =>
          t.title.toLowerCase().includes(lower) ||
          t.description.toLowerCase().includes(lower) ||
          (t.summary && t.summary.toLowerCase().includes(lower))
      );
    }

    if (filters.tags && filters.tags.length > 0) {
      tasks = tasks.filter((t) => t.tags.some((tag: string) => filters.tags!.includes(tag)));
    }

    if (filters.status && filters.status.length > 0) {
      tasks = tasks.filter((t) => filters.status!.includes(t.status));
    }

    if (filters.priority && filters.priority.length > 0) {
      tasks = tasks.filter((t) => filters.priority!.includes(t.priority));
    }

    if (filters.since) {
      tasks = tasks.filter((t) => t.date >= filters.since!);
    }

    if (filters.until) {
      tasks = tasks.filter((t) => t.date <= filters.until!);
    }

    if (filters.limit && filters.limit > 0) {
      tasks = tasks.slice(0, filters.limit);
    }
  }

  // Sort newest first by default
  tasks.sort((a, b) => b.date.localeCompare(a.date));
  return tasks;
}

/**
 * Write a single task as a Markdown file.
 * Creates the `.automaker/tasks/` directory if it does not exist.
 */
export async function writeTask(projectPath: string, task: Task): Promise<void> {
  await ensureTasksDir(projectPath);
  const dir = getTasksDir(projectPath);

  const content = buildMarkdown(task);
  await fs.promises.writeFile(path.join(dir, task.filename), content, 'utf-8');
}

/**
 * Read a single task by filename.
 * Returns null if the file doesn't exist.
 */
export async function readTask(projectPath: string, filename: string): Promise<Task | null> {
  const dir = getTasksDir(projectPath);
  const filePath = path.join(dir, filename);

  try {
    const content = await fs.promises.readFile(filePath, 'utf-8');
    return parseFrontmatter(content, filename);
  } catch {
    return null;
  }
}

/**
 * Update a task by reading, merging updates, and writing back.
 * Returns the updated task, or null if the file doesn't exist.
 */
export async function updateTask(
  projectPath: string,
  filename: string,
  updates: Partial<Omit<Task, 'filename'>>
): Promise<Task | null> {
  const existing = await readTask(projectPath, filename);
  if (!existing) return null;

  const updated: Task = {
    ...existing,
    ...updates,
    // Ensure filename cannot be changed via updates
    filename: existing.filename,
  };

  // Validate status if provided
  if (updates.status && !TASK_STATUSES.includes(updates.status)) {
    updated.status = existing.status;
  }

  // Validate priority if provided
  if (updates.priority !== undefined && !TASK_PRIORITIES.includes(updates.priority)) {
    updated.priority = existing.priority;
  }

  await writeTask(projectPath, updated);
  return updated;
}

/**
 * Delete a task by its filename.
 * Returns true if the file was deleted, false if it didn't exist.
 */
export async function deleteTask(projectPath: string, filename: string): Promise<boolean> {
  const dir = getTasksDir(projectPath);
  const filePath = path.join(dir, filename);

  try {
    await fs.promises.unlink(filePath);
    return true;
  } catch {
    return false;
  }
}

// ----------------------------------------------------------------------------
// YAML Frontmatter parsing
// ----------------------------------------------------------------------------

function parseFrontmatter(content: string, filename: string): Task | null {
  const fmMatch = content.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (!fmMatch) return null;

  const fm = fmMatch[1];
  const body = content.slice(fmMatch[0].length).trim();

  const statusValue = extractValue(fm, 'status') || 'open';
  const priorityValue = extractValue(fm, 'priority') || '';

  return {
    filename,
    title: extractValue(fm, 'title') || filename.replace(/\.md$/, ''),
    description: extractValue(fm, 'description') || '',
    date: extractValue(fm, 'date') || '',
    status: (TASK_STATUSES.includes(statusValue as TaskStatus)
      ? statusValue
      : 'open') as TaskStatus,
    priority: (TASK_PRIORITIES.includes(priorityValue as TaskPriority)
      ? priorityValue
      : '') as TaskPriority,
    tags: extractArrayValue(fm, 'tags'),
    summary: body,
  };
}

function extractValue(fm: string, key: string): string {
  const regex = new RegExp(`^${key}:\\s*(?:"([^"]*)"|'([^']*)'|(.+))$`, 'm');
  const match = fm.match(regex);
  if (!match) return '';
  return (match[1] || match[2] || match[3] || '').trim();
}

function extractArrayValue(fm: string, key: string): string[] {
  const lines = fm.split(/\r?\n/);
  const result: string[] = [];
  let inArray = false;

  for (const line of lines) {
    // Key with empty value -> start of YAML list items
    if (line.match(new RegExp(`^${key}:\\s*$`))) {
      inArray = true;
      continue;
    }
    // Inline array: key: [a, b, c]
    if (line.match(new RegExp(`^${key}:\\s*\\[`))) {
      const inner = line
        .replace(new RegExp(`^${key}:\\s*\\[`), '')
        .replace(/\]$/, '')
        .trim();
      if (!inner) return [];
      return inner.split(',').map((s) => s.trim().replace(/^["']|["']$/g, ''));
    }
    if (inArray) {
      const itemMatch = line.match(/^\s+-\s+(.+)/);
      if (itemMatch) {
        result.push(itemMatch[1].trim());
      } else if (line.match(/^\S/)) {
        break;
      }
    }
  }
  return result;
}

// ----------------------------------------------------------------------------
// Markdown builder
// ----------------------------------------------------------------------------

function buildMarkdown(task: Task): string {
  let fm = '---\n';
  fm += `title: ${task.title}\n`;
  fm += `description: ${task.description}\n`;
  fm += `date: ${task.date}\n`;
  fm += `status: ${task.status}\n`;
  if (task.priority) fm += `priority: ${task.priority}\n`;
  if (task.tags.length > 0) {
    fm += `tags: [${task.tags.join(', ')}]\n`;
  }
  fm += '---\n\n';
  fm += task.summary || '';
  return fm;
}
