/**
 * POST /queue/add endpoint - Add a prompt to the queue
 */

import type { Request, Response } from 'express';
import type { ThinkingLevel, ReasoningEffort } from '@automaker/types';
import { AgentService } from '../../../services/agent-service.js';
import { createLogger } from '@automaker/utils';
import { getErrorMessage, logError } from '../common.js';
const logger = createLogger('AgentQueue');

export function createQueueAddHandler(agentService: AgentService) {
  return async (req: Request, res: Response): Promise<void> => {
    try {
      const { sessionId, message, imagePaths, model, thinkingLevel, reasoningEffort } =
        req.body as {
          sessionId: string;
          message: string;
          imagePaths?: string[];
          model?: string;
          thinkingLevel?: ThinkingLevel;
          reasoningEffort?: ReasoningEffort;
        };

      const ultraModeActive = thinkingLevel === 'ultrathink' || reasoningEffort === 'xhigh';
      logger.debug('Queue add request:', {
        sessionId,
        messageLength: message?.length ?? 0,
        imageCount: imagePaths?.length ?? 0,
        model,
        thinkingLevel,
        reasoningEffort,
        ultraModeActive,
      });

      if (!sessionId || !message) {
        res.status(400).json({
          success: false,
          error: 'sessionId and message are required',
        });
        return;
      }

      const result = await agentService.addToQueue(sessionId, {
        message,
        imagePaths,
        model,
        thinkingLevel,
        reasoningEffort,
      });
      res.json(result);
    } catch (error) {
      logError(error, 'Add to queue failed');
      res.status(500).json({ success: false, error: getErrorMessage(error) });
    }
  };
}
