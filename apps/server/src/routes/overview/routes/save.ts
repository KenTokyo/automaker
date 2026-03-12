/**
 * POST /api/overview/save — Save an overview as a Markdown file.
 *
 * Body: { projectPath: string, markdown: string, fileName: string }
 * Saves to {projectPath}/.automaker/overviews/{fileName}
 */

import fs from 'fs/promises';
import path from 'path';
import type { Request, Response } from 'express';
import { getErrorMessage, createLogError } from '../../common.js';
import { createLogger } from '@automaker/utils';

const logError = createLogError(createLogger('OverviewSave'));

export function createSaveHandler() {
  return async (req: Request, res: Response): Promise<void> => {
    try {
      const { projectPath, markdown, fileName } = req.body as {
        projectPath?: string;
        markdown?: string;
        fileName?: string;
      };

      if (!projectPath || typeof projectPath !== 'string') {
        res.status(400).json({ success: false, error: 'projectPath is required' });
        return;
      }
      if (!markdown || typeof markdown !== 'string') {
        res.status(400).json({ success: false, error: 'markdown is required' });
        return;
      }
      if (!fileName || typeof fileName !== 'string') {
        res.status(400).json({ success: false, error: 'fileName is required' });
        return;
      }

      // Sanitize fileName: only allow alphanumeric, dash, underscore, dot
      const safeFileName = fileName.replace(/[^a-zA-Z0-9\-_.]/g, '_');
      if (!safeFileName.endsWith('.md')) {
        res.status(400).json({ success: false, error: 'fileName must end with .md' });
        return;
      }

      const overviewsDir = path.join(projectPath, '.automaker', 'overviews');
      await fs.mkdir(overviewsDir, { recursive: true });

      const filePath = path.join(overviewsDir, safeFileName);
      await fs.writeFile(filePath, markdown, 'utf-8');

      res.json({ success: true, filePath });
    } catch (error) {
      logError(error, 'Save overview failed');
      res.status(500).json({ success: false, error: getErrorMessage(error) });
    }
  };
}
