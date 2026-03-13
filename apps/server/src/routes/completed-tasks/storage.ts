/**
 * Storage layer for completed tasks — JSON file read/write operations.
 *
 * Data is stored at `{projectPath}/.automaker/completed-tasks.json`.
 * Handles corrupt files by backing up and returning defaults.
 */

import path from 'path';
import { getAutomakerDir, ensureAutomakerDir, secureFs } from '@automaker/platform';
import { createLogger } from '@automaker/utils';
import type { CompletedTasksFile } from '@automaker/types';
import { COMPLETED_TASKS_VERSION } from '@automaker/types';

const logger = createLogger('CompletedTasksStorage');

const FILENAME = 'completed-tasks.json';

/**
 * Get the absolute path to the completed-tasks.json file for a project
 */
export function getCompletedTasksFilePath(projectPath: string): string {
  return path.join(getAutomakerDir(projectPath), FILENAME);
}

/**
 * Create a default (empty) completed tasks file structure
 */
function createDefaultFile(): CompletedTasksFile {
  return {
    version: COMPLETED_TASKS_VERSION,
    tasks: [],
    lastUpdated: new Date().toISOString(),
  };
}

/**
 * Back up a corrupt file before replacing it with defaults
 */
async function createBackup(filePath: string): Promise<void> {
  try {
    const backupPath = `${filePath}.bak`;
    await secureFs.copyFile(filePath, backupPath);
    logger.warn(`Backed up corrupt file to ${backupPath}`);
  } catch (err) {
    logger.error('Failed to create backup:', err);
  }
}

/**
 * Read completed tasks from the project JSON file.
 *
 * - File doesn't exist → returns default empty structure
 * - File is empty/corrupt → creates backup, returns default, logs warning
 */
export async function readCompletedTasks(projectPath: string): Promise<CompletedTasksFile> {
  const filePath = getCompletedTasksFilePath(projectPath);

  try {
    const raw = (await secureFs.readFile(filePath, 'utf-8')) as string;

    if (!raw || raw.trim().length === 0) {
      return createDefaultFile();
    }

    const parsed = JSON.parse(raw) as CompletedTasksFile;

    // Basic schema validation
    if (!parsed.tasks || !Array.isArray(parsed.tasks)) {
      logger.warn('Invalid completed-tasks.json structure, backing up and resetting');
      await createBackup(filePath);
      return createDefaultFile();
    }

    return parsed;
  } catch (err: unknown) {
    // File doesn't exist yet — that's fine
    if (err && typeof err === 'object' && 'code' in err && (err as any).code === 'ENOENT') {
      return createDefaultFile();
    }

    // JSON parse error or other read error — back up and reset
    logger.warn('Error reading completed-tasks.json, backing up and resetting:', err);
    await createBackup(filePath);
    return createDefaultFile();
  }
}

/**
 * Write completed tasks to the project JSON file.
 *
 * Ensures the `.automaker/` directory exists before writing.
 * Updates `lastUpdated` automatically.
 */
export async function writeCompletedTasks(
  projectPath: string,
  data: CompletedTasksFile
): Promise<void> {
  await ensureAutomakerDir(projectPath);
  const filePath = getCompletedTasksFilePath(projectPath);

  data.lastUpdated = new Date().toISOString();

  // Write to temp file first, then rename for atomicity
  const tmpPath = `${filePath}.tmp`;
  await secureFs.writeFile(tmpPath, JSON.stringify(data, null, 2), 'utf-8');
  await secureFs.rename(tmpPath, filePath);
}
