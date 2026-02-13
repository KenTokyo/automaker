/**
 * POST /delete endpoint - Delete a document or folder
 */

import type { Request, Response } from 'express';
import path from 'path';
import { getDocsDir, secureFs, isPathWithinDirectory } from '@automaker/platform';
import { getErrorMessage, logError } from '../common.js';

export function createDeleteHandler() {
  return async (req: Request, res: Response): Promise<void> => {
    try {
      const { projectPath, filePath } = req.body as {
        projectPath: string;
        filePath: string;
      };

      if (!projectPath || !filePath) {
        res.status(400).json({ success: false, error: 'projectPath and filePath are required' });
        return;
      }

      const docsDir = getDocsDir(projectPath);
      const absolutePath = path.join(docsDir, filePath);

      // Validate path is within docs dir
      if (!isPathWithinDirectory(absolutePath, docsDir)) {
        res.status(403).json({ success: false, error: 'Path traversal not allowed' });
        return;
      }

      // Check if file/directory exists
      let stats;
      try {
        stats = await secureFs.stat(absolutePath);
      } catch {
        res.status(404).json({ success: false, error: 'File or directory not found' });
        return;
      }

      if (stats.isDirectory()) {
        await secureFs.rm(absolutePath, { recursive: true, force: true });
      } else {
        await secureFs.unlink(absolutePath);
      }

      res.json({ success: true });
    } catch (error) {
      logError(error, 'Delete doc failed');
      res.status(500).json({ success: false, error: getErrorMessage(error) });
    }
  };
}
