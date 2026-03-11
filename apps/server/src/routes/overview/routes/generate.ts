/**
 * POST /api/overview/generate — Generate a new dashboard overview.
 *
 * Body: {
 *   projectPath: string,
 *   sinceHours: number,
 *   timeRange: '12h'|'24h'|'4d'|'1w',
 *   mode?: 'standard'|'simplify'|'detail',
 *   modelOverride?: string
 * }
 *
 * Sends progress updates via WebSocket events and returns the final overview.
 */

import type { Request, Response } from 'express';
import { OverviewService } from '../../../services/overview-service.js';
import { getErrorMessage, createLogError } from '../../common.js';
import { createLogger } from '@automaker/utils';
import type { EventEmitter } from '../../../lib/events.js';
import type { DashboardMode, DashboardTimeRange } from '../../../services/overview-types.js';

const logger = createLogger('OverviewGenerate');
const logError = createLogError(logger);

const VALID_TIME_RANGES = new Set<string>(['12h', '24h', '4d', '1w']);
const VALID_MODES = new Set<string>(['standard', 'simplify', 'detail']);

export function createGenerateHandler(events: EventEmitter, dataDir: string) {
  // Only one generation at a time
  let activeService: OverviewService | null = null;

  return async (req: Request, res: Response): Promise<void> => {
    try {
      const { projectPath, sinceHours, timeRange, mode, modelOverride } = req.body as {
        projectPath?: string;
        sinceHours?: number;
        timeRange?: string;
        mode?: string;
        modelOverride?: string;
      };

      if (!projectPath || typeof projectPath !== 'string') {
        res.status(400).json({ success: false, error: 'projectPath is required' });
        return;
      }
      if (!sinceHours || typeof sinceHours !== 'number' || sinceHours <= 0) {
        res.status(400).json({ success: false, error: 'sinceHours must be a positive number' });
        return;
      }
      if (!timeRange || !VALID_TIME_RANGES.has(timeRange)) {
        res
          .status(400)
          .json({ success: false, error: 'timeRange must be one of: 12h, 24h, 4d, 1w' });
        return;
      }
      if (mode && !VALID_MODES.has(mode)) {
        res
          .status(400)
          .json({ success: false, error: 'mode must be one of: standard, simplify, detail' });
        return;
      }
      if (modelOverride && typeof modelOverride !== 'string') {
        res.status(400).json({ success: false, error: 'modelOverride must be a string' });
        return;
      }

      // Cancel any previous generation
      if (activeService) {
        activeService.cancelGeneration();
      }

      const service = new OverviewService(projectPath, dataDir);
      activeService = service;

      const data = await service.generateOverview(
        sinceHours,
        timeRange as DashboardTimeRange,
        {
          mode: (mode as DashboardMode | undefined) ?? 'standard',
          modelOverride: modelOverride?.trim() || undefined,
        },
        (phase) => {
          events.emit('overview:progress', { phase });
        }
      );

      // Persist for later retrieval
      await service.saveOverview(data);

      // Notify all connected clients
      events.emit('overview:data', { data });

      activeService = null;
      res.json({ success: true, data });
    } catch (error) {
      activeService = null;
      const message = getErrorMessage(error);
      logError(error, 'Overview generation failed');
      events.emit('overview:error', { message });
      res.status(500).json({ success: false, error: message });
    }
  };
}
