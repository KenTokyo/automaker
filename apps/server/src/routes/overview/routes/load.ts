/**
 * GET /api/overview/:timeRange — Load a previously saved overview.
 *
 * Query: projectPath
 */

import type { Request, Response } from 'express';
import { OverviewService } from '../../../services/overview-service.js';
import { getErrorMessage, createLogError } from '../../common.js';
import { createLogger } from '@automaker/utils';
import type { DashboardTimeRange } from '../../../services/overview-types.js';

const logError = createLogError(createLogger('OverviewLoad'));

const VALID_TIME_RANGES = new Set<string>(['12h', '24h', '4d', '1w']);

export function createLoadHandler(dataDir: string) {
  return async (req: Request, res: Response): Promise<void> => {
    try {
      const { timeRange } = req.params;
      const projectPath = req.query.projectPath as string;

      if (!projectPath) {
        res.status(400).json({ success: false, error: 'projectPath query param is required' });
        return;
      }
      if (!timeRange || !VALID_TIME_RANGES.has(timeRange)) {
        res.status(400).json({ success: false, error: 'Invalid timeRange' });
        return;
      }

      const service = new OverviewService(projectPath, dataDir);
      const data = await service.loadOverview(timeRange as DashboardTimeRange);

      if (!data) {
        res.status(404).json({ success: false, error: 'No overview found for this time range' });
        return;
      }

      res.json({ success: true, data });
    } catch (error) {
      logError(error, 'Load overview failed');
      res.status(500).json({ success: false, error: getErrorMessage(error) });
    }
  };
}
