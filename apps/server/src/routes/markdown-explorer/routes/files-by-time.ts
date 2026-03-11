/**
 * GET /files-by-time endpoint - Get files modified within a time range.
 * Used by the Dashboard and the Explorer time filter.
 */

import type { Request, Response } from 'express';
import { getFilesFilteredByTime } from '../../../services/markdown-explorer-service.js';
import { getErrorMessage, createLogError } from '../../common.js';
import { createLogger } from '@automaker/utils';

const logError = createLogError(createLogger('MarkdownExplorerFilesByTime'));

export function createFilesByTimeHandler() {
  return async (req: Request, res: Response): Promise<void> => {
    try {
      const projectPath = (req.query.projectPath as string) || '';
      const sinceHoursRaw = Number(req.query.sinceHours);
      const limitRaw = Number(req.query.limit);

      if (!projectPath) {
        res.status(400).json({ success: false, error: 'projectPath is required' });
        return;
      }

      if (!Number.isFinite(sinceHoursRaw) || sinceHoursRaw <= 0) {
        res.status(400).json({ success: false, error: 'sinceHours must be a positive number' });
        return;
      }

      const safeLimit = Number.isFinite(limitRaw) ? Math.min(Math.max(limitRaw, 1), 1000) : 500;

      const files = await getFilesFilteredByTime(projectPath, sinceHoursRaw, safeLimit);

      res.json({ success: true, files, totalCount: files.length });
    } catch (error) {
      logError(error, 'Files-by-time query failed');
      res.status(500).json({ success: false, error: getErrorMessage(error) });
    }
  };
}
