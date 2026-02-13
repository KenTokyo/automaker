/**
 * POST /read endpoint - Read a document's content
 */

import type { Request, Response } from 'express';
import path from 'path';
import { getDocsDir, secureFs, isPathWithinDirectory } from '@automaker/platform';
import type { DocFile, DocContent } from '@automaker/types';
import { getErrorMessage, logError } from '../common.js';

/** Maximum file size for reading (5MB) */
const MAX_FILE_SIZE = 5 * 1024 * 1024;

export function createReadHandler() {
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

      const stats = await secureFs.stat(absolutePath);

      if (Number(stats.size) > MAX_FILE_SIZE) {
        res.status(413).json({ success: false, error: 'File too large (max 5MB)' });
        return;
      }

      const content = (await secureFs.readFile(absolutePath, 'utf-8')) as string;
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

      const docContent: DocContent = { file, content };

      res.json({ success: true, ...docContent });
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
        res.status(404).json({ success: false, error: 'File not found' });
        return;
      }
      logError(error, 'Read doc failed');
      res.status(500).json({ success: false, error: getErrorMessage(error) });
    }
  };
}
