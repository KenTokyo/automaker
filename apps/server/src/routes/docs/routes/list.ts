/**
 * POST /list endpoint - List all docs for a project
 */

import type { Request, Response } from 'express';
import path from 'path';
import { getDocsDir, ensureDocsDir, secureFs, isPathWithinDirectory } from '@automaker/platform';
import { SUPPORTED_DOC_EXTENSIONS } from '@automaker/types';
import type { DocFile, ListDocsResponse } from '@automaker/types';
import { getErrorMessage, logError } from '../common.js';

export function createListHandler() {
  return async (req: Request, res: Response): Promise<void> => {
    try {
      const { projectPath, subfolder } = req.body as {
        projectPath: string;
        subfolder?: string;
      };

      if (!projectPath) {
        res.status(400).json({ success: false, error: 'projectPath is required' });
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

      let entries;
      try {
        entries = await secureFs.readdir(targetDir, { withFileTypes: true });
      } catch (error) {
        if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
          res.json({ success: true, files: [], totalCount: 0 } satisfies {
            success: true;
          } & ListDocsResponse);
          return;
        }
        throw error;
      }

      const files: DocFile[] = [];

      for (const entry of entries) {
        const entryPath = path.join(targetDir, entry.name);
        const relativePath = path.relative(docsDir, entryPath);
        const ext = path.extname(entry.name).toLowerCase();

        if (entry.isDirectory()) {
          const stats = await secureFs.stat(entryPath);
          files.push({
            name: entry.name,
            path: relativePath,
            absolutePath: entryPath,
            extension: '',
            size: 0,
            createdAt: stats.birthtime.toISOString(),
            modifiedAt: stats.mtime.toISOString(),
            isDirectory: true,
          });
        } else if ((SUPPORTED_DOC_EXTENSIONS as readonly string[]).includes(ext)) {
          const stats = await secureFs.stat(entryPath);
          files.push({
            name: entry.name,
            path: relativePath,
            absolutePath: entryPath,
            extension: ext,
            size: Number(stats.size),
            createdAt: stats.birthtime.toISOString(),
            modifiedAt: stats.mtime.toISOString(),
            isDirectory: false,
          });
        }
      }

      // Sort: directories first, then by modifiedAt descending
      files.sort((a, b) => {
        if (a.isDirectory && !b.isDirectory) return -1;
        if (!a.isDirectory && b.isDirectory) return 1;
        return new Date(b.modifiedAt).getTime() - new Date(a.modifiedAt).getTime();
      });

      res.json({ success: true, files, totalCount: files.length } satisfies {
        success: true;
      } & ListDocsResponse);
    } catch (error) {
      logError(error, 'List docs failed');
      res.status(500).json({ success: false, error: getErrorMessage(error) });
    }
  };
}
