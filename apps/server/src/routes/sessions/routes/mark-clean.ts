/**
 * POST /:sessionId/mark-clean endpoint - Mark a session as read
 */

import type { Request, Response } from 'express';
import { AgentService } from '../../../services/agent-service.js';
import { getErrorMessage, logError } from '../common.js';

export function createMarkCleanHandler(agentService: AgentService) {
  return async (req: Request, res: Response): Promise<void> => {
    try {
      const { sessionId } = req.params;
      const success = await agentService.markSessionClean(sessionId);

      if (!success) {
        res.status(404).json({ success: false, error: 'Session not found' });
        return;
      }

      res.json({ success: true });
    } catch (error) {
      logError(error, 'Mark session clean failed');
      res.status(500).json({ success: false, error: getErrorMessage(error) });
    }
  };
}
