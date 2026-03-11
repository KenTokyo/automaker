/**
 * POST /search endpoint - Search files within a project
 */

import type { Request, Response } from 'express';
import { searchProject } from '../../../services/markdown-explorer-service.js';
import { getErrorMessage, createLogError } from '../../common.js';
import { createLogger } from '@automaker/utils';

const logError = createLogError(createLogger('MarkdownExplorerSearch'));

export function createSearchHandler() {
  return async (req: Request, res: Response): Promise<void> => {
    try {
      const { projectPath, query, searchContent, limit, sinceHours } = req.body as {
        projectPath: string;
        query: string;
        searchContent?: boolean;
        limit?: number;
        sinceHours?: number;
      };

      if (!projectPath) {
        res.status(400).json({ success: false, error: 'projectPath is required' });
        return;
      }

      if (!query || typeof query !== 'string' || query.trim().length === 0) {
        res.status(400).json({ success: false, error: 'query is required' });
        return;
      }

      // Clamp limit to a sane range
      const safeLimit = Math.min(Math.max(limit ?? 100, 1), 500);

      const safeSinceHours =
        typeof sinceHours === 'number' && Number.isFinite(sinceHours) && sinceHours > 0
          ? sinceHours
          : undefined;

      const results = await searchProject({
        projectPath,
        query: query.trim(),
        searchContent: !!searchContent,
        limit: safeLimit,
        sinceHours: safeSinceHours,
      });

      res.json({ success: true, results, totalCount: results.length });
    } catch (error) {
      logError(error, 'Explorer search failed');
      res.status(500).json({ success: false, error: getErrorMessage(error) });
    }
  };
}
