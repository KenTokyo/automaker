/**
 * POST /stop endpoint - Stop execution
 */

import type { Request, Response } from 'express';
import { AgentService } from '../../../services/agent-service.js';
import { getErrorMessage, logError } from '../common.js';

export function createStopHandler(agentService: AgentService) {
  return async (req: Request, res: Response): Promise<void> => {
    try {
      const { sessionId, reason } = req.body as {
        sessionId: string;
        reason?: 'manual' | 'time_limit';
      };

      if (!sessionId) {
        res.status(400).json({ success: false, error: 'sessionId is required' });
        return;
      }

      const stopReason = reason === 'time_limit' ? 'time_limit' : 'manual';
      const result = await agentService.stopExecution(sessionId, stopReason);
      res.json(result);
    } catch (error) {
      logError(error, 'Stop execution failed');
      res.status(500).json({ success: false, error: getErrorMessage(error) });
    }
  };
}
