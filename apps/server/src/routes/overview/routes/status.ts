/**
 * GET /api/overview/status — Get the status of all time-range overviews.
 *
 * Query: projectPath
 * Returns which time ranges have saved data and when they were generated.
 */

import type { Request, Response } from 'express';
import { OverviewService } from '../../../services/overview-service.js';
import { getErrorMessage, createLogError } from '../../common.js';
import { createLogger } from '@automaker/utils';

const logError = createLogError(createLogger('OverviewStatus'));

export function createStatusHandler(dataDir: string) {
  return async (req: Request, res: Response): Promise<void> => {
    try {
      const projectPath = req.query.projectPath as string;

      if (!projectPath) {
        res.status(400).json({ success: false, error: 'projectPath query param is required' });
        return;
      }

      const service = new OverviewService(projectPath, dataDir);
      const status = await service.getOverviewStatus();

      res.json({ success: true, status });
    } catch (error) {
      logError(error, 'Overview status check failed');
      res.status(500).json({ success: false, error: getErrorMessage(error) });
    }
  };
}
