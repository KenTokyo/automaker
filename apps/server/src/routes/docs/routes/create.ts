/**
 * POST /create endpoint - Create a new document
 */

import type { Request, Response } from 'express';
import path from 'path';
import { getDocsDir, ensureDocsDir, secureFs, isPathWithinDirectory } from '@automaker/platform';
import { SUPPORTED_DOC_EXTENSIONS } from '@automaker/types';
import type { DocFile } from '@automaker/types';
import { getErrorMessage, logError } from '../common.js';

/** Regex for valid filenames: alphanumeric, hyphens, underscores, dots */
const VALID_FILENAME_REGEX = /^[a-zA-Z0-9_\-][a-zA-Z0-9_\-. ]*$/;
const MAX_FILENAME_LENGTH = 255;

export function createCreateHandler() {
  return async (req: Request, res: Response): Promise<void> => {
    try {
      const { projectPath, name, content, subfolder } = req.body as {
        projectPath: string;
        name: string;
        content?: string;
        subfolder?: string;
      };

      if (!projectPath || !name) {
        res.status(400).json({ success: false, error: 'projectPath and name are required' });
        return;
      }

      // Validate filename
      if (name.length > MAX_FILENAME_LENGTH) {
        res.status(400).json({ success: false, error: 'Filename too long (max 255 characters)' });
        return;
      }

      if (!VALID_FILENAME_REGEX.test(name)) {
        res.status(400).json({
          success: false,
          error:
            'Invalid filename. Use only letters, numbers, hyphens, underscores, spaces, and dots.',
        });
        return;
      }

      const ext = path.extname(name).toLowerCase();
      if (!(SUPPORTED_DOC_EXTENSIONS as readonly string[]).includes(ext)) {
        res.status(400).json({
          success: false,
          error: `Unsupported file extension. Allowed: ${SUPPORTED_DOC_EXTENSIONS.join(', ')}`,
        });
        return;
      }

      await ensureDocsDir(projectPath);
      const docsDir = getDocsDir(projectPath);
      const targetDir = subfolder ? path.join(docsDir, subfolder) : docsDir;

      // Validate target is within docs dir
      if (!isPathWithinDirectory(targetDir, docsDir)) {
        res.status(403).json({ success: false, error: 'Path traversal not allowed' });
        return;
      }

      // Ensure subfolder exists
      if (subfolder) {
        await secureFs.mkdir(targetDir, { recursive: true });
      }

      const absolutePath = path.join(targetDir, name);

      // Validate final path is within docs dir
      if (!isPathWithinDirectory(absolutePath, docsDir)) {
        res.status(403).json({ success: false, error: 'Path traversal not allowed' });
        return;
      }

      // Check if file already exists
      try {
        await secureFs.access(absolutePath);
        res.status(409).json({ success: false, error: 'File already exists' });
        return;
      } catch {
        // File doesn't exist, good to create
      }

      await secureFs.writeFile(absolutePath, content || '', 'utf-8');
      const stats = await secureFs.stat(absolutePath);
      const relativePath = path.relative(docsDir, absolutePath);

      const file: DocFile = {
        name,
        path: relativePath,
        absolutePath,
        extension: ext,
        size: Number(stats.size),
        createdAt: stats.birthtime.toISOString(),
        modifiedAt: stats.mtime.toISOString(),
        isDirectory: false,
      };

      res.json({ success: true, file });
    } catch (error) {
      logError(error, 'Create doc failed');
      res.status(500).json({ success: false, error: getErrorMessage(error) });
    }
  };
}
