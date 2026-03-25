/**
 * GET / endpoint - List all sessions
 */

import type { Request, Response } from 'express';
import { AgentService } from '../../../services/agent-service.js';
import { getErrorMessage, logError } from '../common.js';

function getLastErrorPreview(content: string | undefined): string | undefined {
  if (!content) return undefined;
  const normalized = content.replace(/^Error:\s*/i, '').trim();
  return normalized || undefined;
}

export function createIndexHandler(agentService: AgentService) {
  return async (req: Request, res: Response): Promise<void> => {
    try {
      const includeArchived = req.query.includeArchived === 'true';
      const sessionsRaw = await agentService.listSessions(includeArchived);

      // Transform to match frontend SessionListItem interface
      const sessions = await Promise.all(
        sessionsRaw.map(async (s) => {
          const messages = await agentService.loadSession(s.id);
          const lastMessage = messages[messages.length - 1];
          const lastError = lastMessage?.isError
            ? getLastErrorPreview(lastMessage.content)
            : undefined;
          const isRunning =
            agentService.isSessionRunning(s.id) || agentService.isSubagentSessionRunning(s.id);
          const preview = lastMessage?.content?.slice(0, 100) || '';

          return {
            id: s.id,
            name: s.name,
            description: s.description,
            projectPath: s.projectPath || s.workingDirectory,
            workingDirectory: s.workingDirectory,
            createdAt: s.createdAt,
            updatedAt: s.updatedAt,
            isArchived: s.archived || false,
            isDirty: s.isDirty || false,
            tags: s.tags || [],
            orchestratorRunId: s.orchestratorRunId,
            sourceType: s.sourceType,
            parentSessionId: s.parentSessionId,
            parentToolUseId: s.parentToolUseId,
            messageCount: messages.length,
            preview,
            status: isRunning
              ? 'running'
              : agentService.isSessionStopped(s.id)
                ? 'stopped'
                : lastError
                  ? 'failed'
                  : 'idle',
            lastError,
            totalElapsedMs: s.totalElapsedMs || 0,
            lastStartedAt: s.lastStartedAt,
          };
        })
      );

      res.json({ success: true, sessions });
    } catch (error) {
      logError(error, 'List sessions failed');
      res.status(500).json({ success: false, error: getErrorMessage(error) });
    }
  };
}
