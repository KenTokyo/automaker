/**
 * GET / endpoint - List all sessions
 */

import type { Request, Response } from 'express';
import { detectSessionSignal } from '@automaker/types';
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
      const runningSessionIds = agentService.getRunningSessionIds();
      const runningSubagentSessionIds = agentService.getRunningSubagentSessionIds();
      const stoppedSessionIds = agentService.getStoppedSessionIds();
      const activeSessionIds = new Set([...runningSessionIds, ...runningSubagentSessionIds]);

      // Transform to match frontend SessionListItem interface
      const sessions = await Promise.all(
        sessionsRaw.map(async (s) => {
          let messageCount = typeof s.messageCount === 'number' ? s.messageCount : undefined;
          let preview = typeof s.preview === 'string' ? s.preview : undefined;
          let lastError = typeof s.lastError === 'string' ? s.lastError : undefined;
          let lastSignal = s.lastSignal ?? null;

          // Backward-compatibility for older metadata without cached summary fields.
          if (messageCount === undefined || preview === undefined) {
            const messages = await agentService.loadSession(s.id);
            const lastMessage = messages[messages.length - 1];
            messageCount = messages.length;
            preview = lastMessage?.content?.slice(0, 100) || '';
            lastError = lastMessage?.isError ? getLastErrorPreview(lastMessage.content) : undefined;

            // Also detect signal for legacy sessions without cached lastSignal
            const isOrchestratorSession = Boolean(s.orchestratorRunId);
            const lastAssistant = [...messages].reverse().find((m) => m.role === 'assistant');
            lastSignal = detectSessionSignal(lastAssistant?.content, isOrchestratorSession);
          }

          const isSubagentSession =
            s.sourceType === 'subagent' || (!s.sourceType && Boolean(s.parentToolUseId));
          const isParentActive = !s.parentSessionId || activeSessionIds.has(s.parentSessionId);
          const isRunning = isSubagentSession
            ? isParentActive && activeSessionIds.has(s.id)
            : activeSessionIds.has(s.id);
          const isStopped = stoppedSessionIds.has(s.id);

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
            messageCount: messageCount ?? 0,
            preview,
            status: isRunning ? 'running' : isStopped ? 'stopped' : lastError ? 'failed' : 'idle',
            lastError,
            lastSignal,
            totalElapsedMs: s.totalElapsedMs || 0,
            lastStartedAt: s.lastStartedAt,
            model: s.model,
            thinkingLevel: s.thinkingLevel,
            reasoningEffort: s.reasoningEffort,
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
