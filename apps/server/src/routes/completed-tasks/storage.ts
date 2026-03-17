/**
 * Storage layer for completed tasks — `.completed/*.md` file operations.
 *
 * Each completed task is stored as a Markdown file with YAML frontmatter
 * in the `.completed/` directory of the project root.
 */

import path from 'path';
import fs from 'fs';
import { createLogger } from '@automaker/utils';
import type { CompletedTask } from '@automaker/types';

const logger = createLogger('CompletedTasksStorage');

/**
 * Get the absolute path to the `.completed/` directory for a project
 */
export function getCompletedDir(projectPath: string): string {
  return path.join(projectPath, '.completed');
}

/**
 * Read all completed tasks from `.completed/*.md` files.
 *
 * - Directory doesn't exist → returns empty array
 * - Files starting with `_` are skipped (reserved for templates/README)
 * - Unparseable files are silently skipped
 */
export async function readCompletedTasks(projectPath: string): Promise<CompletedTask[]> {
  const dir = getCompletedDir(projectPath);

  try {
    await fs.promises.access(dir, fs.constants.R_OK);
  } catch {
    return [];
  }

  const entries = await fs.promises.readdir(dir);
  const mdFiles = entries.filter((e) => e.endsWith('.md') && !e.startsWith('_'));

  const tasks: CompletedTask[] = [];
  for (const file of mdFiles) {
    try {
      const content = await fs.promises.readFile(path.join(dir, file), 'utf-8');
      const parsed = parseFrontmatter(content, file);
      if (parsed) tasks.push(parsed);
    } catch {
      logger.debug(`Skipping unparseable file: ${file}`);
    }
  }

  // Sort newest first by default
  tasks.sort((a, b) => b.date.localeCompare(a.date));
  return tasks;
}

/**
 * Write a single completed task as a Markdown file.
 * Creates the `.completed/` directory if it does not exist.
 */
export async function writeCompletedTask(projectPath: string, task: CompletedTask): Promise<void> {
  const dir = getCompletedDir(projectPath);
  await fs.promises.mkdir(dir, { recursive: true });

  const content = buildMarkdown(task);
  await fs.promises.writeFile(path.join(dir, task.filename), content, 'utf-8');
}

/**
 * Delete a completed task by its filename.
 * Returns true if the file was deleted, false if it didn't exist.
 */
export async function deleteCompletedTask(projectPath: string, filename: string): Promise<boolean> {
  const filePath = path.join(getCompletedDir(projectPath), filename);
  try {
    await fs.promises.unlink(filePath);
    return true;
  } catch {
    return false;
  }
}

// ────────────────────────────────────────────────────────────────────────────
// YAML Frontmatter parsing
// ────────────────────────────────────────────────────────────────────────────

function parseFrontmatter(content: string, filename: string): CompletedTask | null {
  const fmMatch = content.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (!fmMatch) return null;

  const fm = fmMatch[1];
  const body = content.slice(fmMatch[0].length).trim();

  return {
    filename,
    title: extractValue(fm, 'title') || filename.replace(/\.md$/, ''),
    description: extractValue(fm, 'description') || '',
    date: extractValue(fm, 'date') || '',
    status: (extractValue(fm, 'status') || 'success') as CompletedTask['status'],
    effort: (extractValue(fm, 'effort') || '') as CompletedTask['effort'],
    attempt: parseInt(extractValue(fm, 'attempt') || '1', 10) || 1,
    provider: extractValue(fm, 'provider') || '',
    files: extractArrayValue(fm, 'files'),
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
    // Key with empty value → start of YAML list items
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

// ────────────────────────────────────────────────────────────────────────────
// Markdown builder
// ────────────────────────────────────────────────────────────────────────────

function buildMarkdown(task: CompletedTask): string {
  let fm = '---\n';
  fm += `title: ${task.title}\n`;
  fm += `description: ${task.description}\n`;
  fm += `date: ${task.date}\n`;
  fm += `status: ${task.status}\n`;
  if (task.effort) fm += `effort: ${task.effort}\n`;
  if (task.attempt > 1) fm += `attempt: ${task.attempt}\n`;
  if (task.provider) fm += `provider: ${task.provider}\n`;
  if (task.files.length > 0) {
    fm += 'files:\n';
    for (const f of task.files) {
      fm += `  - ${f}\n`;
    }
  }
  if (task.tags.length > 0) {
    fm += `tags: [${task.tags.join(', ')}]\n`;
  }
  fm += '---\n\n';
  fm += task.summary || '';
  return fm;
}
