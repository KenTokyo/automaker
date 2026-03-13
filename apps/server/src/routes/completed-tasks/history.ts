/**
 * History file endpoints — list and read History/ markdown files.
 *
 * GET /history-files?projectPath=...         — List available .md files in History/
 * GET /history-file?projectPath=...&file=... — Read a single history file's content
 */

import path from 'path';
import fs from 'fs/promises';
import type { Request, Response } from 'express';
import { createLogger } from '@automaker/utils';
import { getErrorMessage, createLogError } from '../common.js';

const logger = createLogger('HistoryFiles');
const logError = createLogError(logger);

const HISTORY_DIR = 'History';
const MAX_FILE_SIZE = 500 * 1024; // 500 KB

/**
 * GET /history-files — List .md files in the project's History/ folder.
 * Sorted by modification date (newest first).
 */
export function createListHistoryFilesHandler() {
  return async (req: Request, res: Response): Promise<void> => {
    try {
      const projectPath = req.query.projectPath as string;
      if (!projectPath) {
        res.status(400).json({ success: false, error: 'projectPath query param is required' });
        return;
      }

      const historyDir = path.join(projectPath, HISTORY_DIR);

      let entries: string[];
      try {
        entries = await fs.readdir(historyDir);
      } catch {
        // Directory doesn't exist — that's fine, return empty list
        res.json({ success: true, files: [] });
        return;
      }

      // Only .md files
      const mdFiles = entries.filter((f) => f.toLowerCase().endsWith('.md'));

      // Get stats for sorting by mtime
      const withStats = await Promise.all(
        mdFiles.map(async (name) => {
          try {
            const stat = await fs.stat(path.join(historyDir, name));
            return { name, mtime: stat.mtimeMs };
          } catch {
            return { name, mtime: 0 };
          }
        })
      );

      // Sort newest first
      withStats.sort((a, b) => b.mtime - a.mtime);

      const files = withStats.map((f) => `${HISTORY_DIR}/${f.name}`);
      res.json({ success: true, files });
    } catch (error) {
      logError(error, 'Failed to list history files');
      res.status(500).json({ success: false, error: getErrorMessage(error) });
    }
  };
}

/**
 * GET /history-file — Read the content of a single history markdown file.
 * Security: the file must reside under History/ (no path traversal).
 */
export function createReadHistoryFileHandler() {
  return async (req: Request, res: Response): Promise<void> => {
    try {
      const projectPath = req.query.projectPath as string;
      const filePath = req.query.file as string;

      if (!projectPath) {
        res.status(400).json({ success: false, error: 'projectPath query param is required' });
        return;
      }
      if (!filePath) {
        res.status(400).json({ success: false, error: 'file query param is required' });
        return;
      }

      // Security: normalise and ensure the file stays within History/
      const normalised = path.normalize(filePath);
      if (
        !normalised.startsWith(`${HISTORY_DIR}${path.sep}`) &&
        !normalised.startsWith(`${HISTORY_DIR}/`)
      ) {
        res.status(403).json({ success: false, error: 'File must be inside the History/ folder' });
        return;
      }

      // Only .md files
      if (!normalised.toLowerCase().endsWith('.md')) {
        res.status(400).json({ success: false, error: 'Only .md files are allowed' });
        return;
      }

      const absPath = path.join(projectPath, normalised);

      // Check that the resolved path is still inside the project
      const resolvedProject = path.resolve(projectPath);
      const resolvedFile = path.resolve(absPath);
      if (!resolvedFile.startsWith(resolvedProject + path.sep)) {
        res.status(403).json({ success: false, error: 'Path traversal not allowed' });
        return;
      }

      // Check file exists and size
      let stat;
      try {
        stat = await fs.stat(absPath);
      } catch {
        res.status(404).json({ success: false, error: 'File not found' });
        return;
      }

      if (stat.size > MAX_FILE_SIZE) {
        res.status(413).json({
          success: false,
          error: 'Datei zu groß (>500 KB). Bitte im Editor öffnen.',
        });
        return;
      }

      const content = await fs.readFile(absPath, 'utf-8');
      const fileName = path.basename(normalised);

      res.json({ success: true, content, fileName });
    } catch (error) {
      logError(error, 'Failed to read history file');
      res.status(500).json({ success: false, error: getErrorMessage(error) });
    }
  };
}
