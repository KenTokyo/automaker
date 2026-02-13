/**
 * POST /update endpoint - Update a document's content
 */

import type { Request, Response } from 'express';
import path from 'path';
import { getDocsDir, secureFs, isPathWithinDirectory } from '@automaker/platform';
import type { DocFile } from '@automaker/types';
import { getErrorMessage, logError } from '../common.js';

/** Maximum file size for writing (5MB) */
const MAX_CONTENT_SIZE = 5 * 1024 * 1024;

export function createUpdateHandler() {
  return async (req: Request, res: Response): Promise<void> => {
    try {
      const { projectPath, filePath, content } = req.body as {
        projectPath: string;
        filePath: string;
        content: string;
      };

      if (!projectPath || !filePath || content === undefined) {
        res.status(400).json({
          success: false,
          error: 'projectPath, filePath, and content are required',
        });
        return;
      }

      if (content.length > MAX_CONTENT_SIZE) {
        res.status(413).json({ success: false, error: 'Content too large (max 5MB)' });
        return;
      }

      const docsDir = getDocsDir(projectPath);
      const absolutePath = path.join(docsDir, filePath);

      // Validate path is within docs dir
      if (!isPathWithinDirectory(absolutePath, docsDir)) {
        res.status(403).json({ success: false, error: 'Path traversal not allowed' });
        return;
      }

      // Check if file exists
      try {
        await secureFs.access(absolutePath);
      } catch {
        res.status(404).json({ success: false, error: 'File not found' });
        return;
      }

      await secureFs.writeFile(absolutePath, content, 'utf-8');
      const stats = await secureFs.stat(absolutePath);
      const ext = path.extname(filePath).toLowerCase();

      const file: DocFile = {
        name: path.basename(filePath),
        path: filePath,
        absolutePath,
        extension: ext,
        size: Number(stats.size),
        createdAt: stats.birthtime.toISOString(),
        modifiedAt: stats.mtime.toISOString(),
        isDirectory: false,
      };

      res.json({ success: true, file });
    } catch (error) {
      logError(error, 'Update doc failed');
      res.status(500).json({ success: false, error: getErrorMessage(error) });
    }
  };
}
