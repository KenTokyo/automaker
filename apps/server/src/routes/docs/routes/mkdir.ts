/**
 * POST /mkdir endpoint - Create a new folder in docs
 */

import type { Request, Response } from 'express';
import path from 'path';
import { getDocsDir, ensureDocsDir, secureFs, isPathWithinDirectory } from '@automaker/platform';
import type { DocFile } from '@automaker/types';
import { getErrorMessage, logError } from '../common.js';

/** Regex for valid folder names */
const VALID_FOLDERNAME_REGEX = /^[a-zA-Z0-9_\-][a-zA-Z0-9_\-. ]*$/;

export function createMkdirHandler() {
  return async (req: Request, res: Response): Promise<void> => {
    try {
      const { projectPath, name, subfolder } = req.body as {
        projectPath: string;
        name: string;
        subfolder?: string;
      };

      if (!projectPath || !name) {
        res.status(400).json({ success: false, error: 'projectPath and name are required' });
        return;
      }

      if (!VALID_FOLDERNAME_REGEX.test(name)) {
        res.status(400).json({
          success: false,
          error:
            'Invalid folder name. Use only letters, numbers, hyphens, underscores, spaces, and dots.',
        });
        return;
      }

      await ensureDocsDir(projectPath);
      const docsDir = getDocsDir(projectPath);
      const parentDir = subfolder ? path.join(docsDir, subfolder) : docsDir;
      const absolutePath = path.join(parentDir, name);

      // Validate path is within docs dir
      if (!isPathWithinDirectory(absolutePath, docsDir)) {
        res.status(403).json({ success: false, error: 'Path traversal not allowed' });
        return;
      }

      // Check if already exists
      try {
        await secureFs.access(absolutePath);
        res.status(409).json({ success: false, error: 'Folder already exists' });
        return;
      } catch {
        // Doesn't exist, good to create
      }

      await secureFs.mkdir(absolutePath, { recursive: true });
      const stats = await secureFs.stat(absolutePath);
      const relativePath = path.relative(docsDir, absolutePath);

      const file: DocFile = {
        name,
        path: relativePath,
        absolutePath,
        extension: '',
        size: 0,
        createdAt: stats.birthtime.toISOString(),
        modifiedAt: stats.mtime.toISOString(),
        isDirectory: true,
      };

      res.json({ success: true, file });
    } catch (error) {
      logError(error, 'Create folder failed');
      res.status(500).json({ success: false, error: getErrorMessage(error) });
    }
  };
}
