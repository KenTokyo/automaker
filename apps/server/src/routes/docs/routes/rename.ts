/**
 * POST /rename endpoint - Rename a document or folder
 */

import type { Request, Response } from 'express';
import path from 'path';
import { getDocsDir, ensureDocsDir, secureFs, isPathWithinDirectory } from '@automaker/platform';
import { getErrorMessage, logError } from '../common.js';

const VALID_FILENAME_REGEX = /^[a-zA-Z0-9_\-][a-zA-Z0-9_\-. ]*$/;

export function createRenameHandler() {
  return async (req: Request, res: Response): Promise<void> => {
    try {
      const { projectPath, filePath, newName } = req.body as {
        projectPath: string;
        filePath: string;
        newName: string;
      };

      if (!projectPath || !filePath || !newName) {
        res
          .status(400)
          .json({ success: false, error: 'projectPath, filePath, and newName are required' });
        return;
      }

      if (!VALID_FILENAME_REGEX.test(newName)) {
        res.status(400).json({
          success: false,
          error:
            'Invalid filename. Use only letters, numbers, hyphens, underscores, spaces, and dots.',
        });
        return;
      }

      await ensureDocsDir(projectPath);
      const docsDir = getDocsDir(projectPath);
      const oldAbsolutePath = path.join(docsDir, filePath);

      // Validate old path is within docs dir
      if (!isPathWithinDirectory(oldAbsolutePath, docsDir)) {
        res.status(403).json({ success: false, error: 'Path traversal not allowed' });
        return;
      }

      // Build new path (same directory, different name)
      const parentDir = path.dirname(oldAbsolutePath);
      const newAbsolutePath = path.join(parentDir, newName);

      // Validate new path is within docs dir
      if (!isPathWithinDirectory(newAbsolutePath, docsDir)) {
        res.status(403).json({ success: false, error: 'Path traversal not allowed' });
        return;
      }

      // Check old file exists
      try {
        await secureFs.access(oldAbsolutePath);
      } catch {
        res.status(404).json({ success: false, error: 'File not found' });
        return;
      }

      // Check new name doesn't already exist
      try {
        await secureFs.access(newAbsolutePath);
        res.status(409).json({ success: false, error: 'A file with that name already exists' });
        return;
      } catch {
        // Good, doesn't exist
      }

      await secureFs.rename(oldAbsolutePath, newAbsolutePath);

      res.json({ success: true });
    } catch (error) {
      logError(error, 'Rename doc failed');
      res.status(500).json({ success: false, error: getErrorMessage(error) });
    }
  };
}
