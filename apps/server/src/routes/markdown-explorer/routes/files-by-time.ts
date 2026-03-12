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

      // sinceHours is optional: 0 or omitted = all markdown files (no time filter)
      const sinceHours = Number.isFinite(sinceHoursRaw) && sinceHoursRaw >= 0 ? sinceHoursRaw : 0;
      const safeLimit = Number.isFinite(limitRaw) ? Math.min(Math.max(limitRaw, 1), 1000) : 500;

      const files = await getFilesFilteredByTime(projectPath, sinceHours, safeLimit);

      res.json({ success: true, files, totalCount: files.length });
    } catch (error) {
      logError(error, 'Files-by-time query failed');
      res.status(500).json({ success: false, error: getErrorMessage(error) });
    }
  };
}
