import { useCallback, useEffect, useRef } from 'react';
import { getElectronAPI } from '@/lib/electron';
import type { StreamEvent } from '@/types/electron';
import { getMessageTimestamp } from '../components/chat-view-utils';
import {
  appendThinkingDetail,
  createThinkingBlock,
  finalizeThinkingBlock,
  nowIso as nowThinkingIso,
  type ThinkingBlockData,
} from '../services/thinking-utils';
import {
  buildResultData,
  createLegacyToolCallGroup,
  createRunningToolStep,
  createToolCallGroup,
  finalizeRunningSteps,
  nowIso as nowToolIso,
  type ToolCallGroupData,
  type ToolCallStep,
} from '../services/tool-call-utils';
import { useSessionStore } from '../stores/session-store';
import type { SessionMessage } from '../stores/types';

interface UseChatStreamSyncOptions {
  activeSessionId: string | null;
  isProcessing: boolean;
}

interface PendingToolGroupState {
  id: string;
  messageId?: string;
  startedAt: string;
  steps: ToolCallStep[];
}

interface PendingThinkingState {
  id: string;
  messageId?: string;
  startedAt: string;
  detailText?: string;
}

type ChatStreamEvent =
  | StreamEvent
  | {
      type: 'started';
      sessionId: string;
    }
  | {
      type: 'thinking';
      sessionId: string;
      messageId?: string;
      content: string;
    };

function getLatestAssistantMessageId(messages: SessionMessage[]): string | undefined {
  for (let index = messages.length - 1; index >= 0; index -= 1) {
    const message = messages[index];
    if (message?.role === 'assistant') {
      return message.id;
    }
  }
  return undefined;
}

function toUserImpact(error: string): string {
  const value = error.toLowerCase();
  if (value.includes('timeout') || value.includes('timed out')) {
    return 'Ein Tool hat zu lange gebraucht. Das Ergebnis kann unvollständig sein.';
  }
  if (value.includes('permission') || value.includes('forbidden') || value.includes('denied')) {
    return 'Ein Tool durfte den Schritt nicht ausführen. Bitte Rechte oder Pfad prüfen.';
  }
  return 'Ein Tool-Schritt hat nicht geklappt. Das Ergebnis kann unvollständig sein.';
}

function isAbortLikeError(error: string): boolean {
  const value = error.toLowerCase();
  return (
    value.includes('abort') ||
    value.includes('aborted') ||
    value.includes('cancel') ||
    value.includes('stopp') ||
    value.includes('stop')
  );
}

export function useChatStreamSync({ activeSessionId, isProcessing }: UseChatStreamSyncOptions) {
  const pendingToolsBySessionRef = useRef<Map<string, PendingToolGroupState>>(new Map());
  const pendingThinkingBySessionRef = useRef<Map<string, PendingThinkingState>>(new Map());

  const attachToolGroupToMessage = useCallback(
    (sessionId: string, messageId: string, toolCallGroup: ToolCallGroupData) => {
      const store = useSessionStore.getState();
      const session = store.sessions[sessionId];
      if (!session) return;

      const existing = session.messages.find((message) => message.id === messageId);
      store.addMessage(sessionId, {
        id: messageId,
        role: 'assistant',
        content: existing?.content ?? '',
        timestamp: existing?.timestamp ?? getMessageTimestamp(),
        isError: existing?.isError,
        toolCalls: existing?.toolCalls,
        thinking: existing?.thinking,
        thinkingBlock: existing?.thinkingBlock,
        toolCallGroup,
      });
    },
    []
  );

  const attachThinkingToMessage = useCallback(
    (
      sessionId: string,
      messageId: string,
      thinkingBlock: ThinkingBlockData,
      detailText?: string
    ) => {
      const store = useSessionStore.getState();
      const session = store.sessions[sessionId];
      if (!session) return;

      const existing = session.messages.find((message) => message.id === messageId);
      store.addMessage(sessionId, {
        id: messageId,
        role: 'assistant',
        content: existing?.content ?? '',
        timestamp: existing?.timestamp ?? getMessageTimestamp(),
        isError: existing?.isError,
        toolCalls: existing?.toolCalls,
        toolCallGroup: existing?.toolCallGroup,
        thinking: detailText ?? existing?.thinking,
        thinkingBlock,
      });
    },
    []
  );

  useEffect(() => {
    const api = getElectronAPI();
    if (!api.agent) return;

    const unsubscribe = api.agent.onStream((data: unknown) => {
      const event = data as ChatStreamEvent;
      const store = useSessionStore.getState();

      if (!event || typeof event !== 'object' || !('sessionId' in event)) return;
      const sessionExists = Boolean(store.sessions[event.sessionId]);
      if (!sessionExists) return;

      if (event.type === 'started') {
        pendingThinkingBySessionRef.current.set(event.sessionId, {
          id: `thinking-${event.sessionId}-${Date.now().toString(36)}`,
          startedAt: nowThinkingIso(),
        });
        store.setSessionRunning(event.sessionId, true);
        return;
      }

      if (event.type === 'message') {
        store.addMessage(event.sessionId, event.message);
        store.setSessionRunning(event.sessionId, true);

        if (event.message.role === 'assistant') {
          const pendingTools = pendingToolsBySessionRef.current.get(event.sessionId);
          if (pendingTools && !pendingTools.messageId) {
            const nextPendingTools: PendingToolGroupState = {
              ...pendingTools,
              messageId: event.message.id,
            };
            pendingToolsBySessionRef.current.set(event.sessionId, nextPendingTools);
            const group = createToolCallGroup({
              id: nextPendingTools.id,
              messageId: nextPendingTools.messageId,
              steps: nextPendingTools.steps,
              status: 'running',
            });
            attachToolGroupToMessage(event.sessionId, event.message.id, group);
          }

          const pendingThinking = pendingThinkingBySessionRef.current.get(event.sessionId);
          if (pendingThinking && !pendingThinking.messageId) {
            const nextPendingThinking: PendingThinkingState = {
              ...pendingThinking,
              messageId: event.message.id,
            };
            pendingThinkingBySessionRef.current.set(event.sessionId, nextPendingThinking);

            const thinkingBlock = createThinkingBlock({
              id: nextPendingThinking.id,
              status: 'running',
              startedAt: nextPendingThinking.startedAt,
              detailText: nextPendingThinking.detailText,
            });
            attachThinkingToMessage(
              event.sessionId,
              event.message.id,
              thinkingBlock,
              nextPendingThinking.detailText
            );
          }
        }
        return;
      }

      if (event.type === 'stream') {
        store.addMessage(event.sessionId, {
          id: event.messageId,
          role: 'assistant',
          content: event.content,
          timestamp: getMessageTimestamp(),
        });
        store.setSessionRunning(event.sessionId, !event.isComplete);

        const pendingTools = pendingToolsBySessionRef.current.get(event.sessionId);
        if (pendingTools) {
          const nextPendingTools: PendingToolGroupState = {
            ...pendingTools,
            messageId: event.messageId,
          };
          pendingToolsBySessionRef.current.set(event.sessionId, nextPendingTools);
          const group = createToolCallGroup({
            id: nextPendingTools.id,
            messageId: nextPendingTools.messageId,
            steps: nextPendingTools.steps,
            status: 'running',
          });
          attachToolGroupToMessage(event.sessionId, event.messageId, group);
        }

        const pendingThinking = pendingThinkingBySessionRef.current.get(event.sessionId) ?? {
          id: `thinking-${event.sessionId}-${Date.now().toString(36)}`,
          startedAt: nowThinkingIso(),
        };
        const nextPendingThinking: PendingThinkingState = {
          ...pendingThinking,
          messageId: event.messageId,
        };
        pendingThinkingBySessionRef.current.set(event.sessionId, nextPendingThinking);

        const thinkingBlock = createThinkingBlock({
          id: nextPendingThinking.id,
          status: 'running',
          startedAt: nextPendingThinking.startedAt,
          detailText: nextPendingThinking.detailText,
        });
        attachThinkingToMessage(
          event.sessionId,
          event.messageId,
          thinkingBlock,
          nextPendingThinking.detailText
        );
        return;
      }

      if (event.type === 'thinking') {
        const pendingThinking = pendingThinkingBySessionRef.current.get(event.sessionId) ?? {
          id: `thinking-${event.sessionId}-${Date.now().toString(36)}`,
          startedAt: nowThinkingIso(),
        };
        const baseBlock = createThinkingBlock({
          id: pendingThinking.id,
          status: 'running',
          startedAt: pendingThinking.startedAt,
          detailText: pendingThinking.detailText,
        });
        const withDetail = appendThinkingDetail(baseBlock, event.content);

        const nextPendingThinking: PendingThinkingState = {
          ...pendingThinking,
          messageId: event.messageId ?? pendingThinking.messageId,
          detailText: withDetail.detailText,
        };
        pendingThinkingBySessionRef.current.set(event.sessionId, nextPendingThinking);

        if (nextPendingThinking.messageId) {
          attachThinkingToMessage(
            event.sessionId,
            nextPendingThinking.messageId,
            withDetail,
            withDetail.detailText
          );
        }
        return;
      }

      if (event.type === 'tool_use') {
        const session = store.sessions[event.sessionId];
        const fallbackMessageId = session
          ? getLatestAssistantMessageId(session.messages)
          : undefined;
        const pending = pendingToolsBySessionRef.current.get(event.sessionId);
        const now = nowToolIso();
        const currentPending: PendingToolGroupState = pending ?? {
          id: `tool-group-${event.sessionId}-${Date.now().toString(36)}`,
          messageId: fallbackMessageId,
          startedAt: now,
          steps: [],
        };

        const completedSteps = finalizeRunningSteps(currentPending.steps, 'ok', now);
        const nextStep = createRunningToolStep(event.tool, completedSteps.length);
        const nextPending: PendingToolGroupState = {
          ...currentPending,
          messageId: currentPending.messageId ?? fallbackMessageId,
          steps: [...completedSteps, nextStep],
        };
        pendingToolsBySessionRef.current.set(event.sessionId, nextPending);

        if (nextPending.messageId) {
          const group = createToolCallGroup({
            id: nextPending.id,
            messageId: nextPending.messageId,
            steps: nextPending.steps,
            status: 'running',
          });
          attachToolGroupToMessage(event.sessionId, nextPending.messageId, group);
        }

        store.setSessionRunning(event.sessionId, true);
        return;
      }

      if (event.type === 'complete') {
        if (event.messageId) {
          store.addMessage(event.sessionId, {
            id: event.messageId,
            role: 'assistant',
            content: event.content,
            timestamp: getMessageTimestamp(),
          });
        }

        const pendingTools = pendingToolsBySessionRef.current.get(event.sessionId);
        if (pendingTools) {
          const finishedAt = nowToolIso();
          const completedSteps = finalizeRunningSteps(pendingTools.steps, 'ok', finishedAt);
          const session = store.sessions[event.sessionId];
          const targetMessageId =
            event.messageId ??
            pendingTools.messageId ??
            (session ? getLatestAssistantMessageId(session.messages) : undefined);

          if (targetMessageId) {
            const group = createToolCallGroup({
              id: pendingTools.id,
              messageId: targetMessageId,
              steps: completedSteps,
              status: 'ok',
              finishedAt,
              result: buildResultData(event.content),
            });
            attachToolGroupToMessage(event.sessionId, targetMessageId, group);
          }

          pendingToolsBySessionRef.current.delete(event.sessionId);
        } else if (event.messageId && event.toolUses.length > 0) {
          const legacyGroup = createLegacyToolCallGroup({
            messageId: event.messageId,
            toolCalls: event.toolUses,
            content: event.content,
          });
          if (legacyGroup) {
            attachToolGroupToMessage(event.sessionId, event.messageId, legacyGroup);
          }
        }

        const pendingThinking = pendingThinkingBySessionRef.current.get(event.sessionId);
        if (pendingThinking) {
          const finishedAt = nowThinkingIso();
          const session = store.sessions[event.sessionId];
          const targetMessageId =
            event.messageId ??
            pendingThinking.messageId ??
            (session ? getLatestAssistantMessageId(session.messages) : undefined);

          if (targetMessageId) {
            const runningThinking = createThinkingBlock({
              id: pendingThinking.id,
              status: 'running',
              startedAt: pendingThinking.startedAt,
              detailText: pendingThinking.detailText,
            });
            const doneThinking = finalizeThinkingBlock(runningThinking, 'done', {
              finishedAt,
              detailText: pendingThinking.detailText,
            });
            attachThinkingToMessage(
              event.sessionId,
              targetMessageId,
              doneThinking,
              doneThinking.detailText
            );
          }

          pendingThinkingBySessionRef.current.delete(event.sessionId);
        }

        store.setSessionRunning(event.sessionId, false);
        return;
      }

      if (event.type === 'error') {
        store.setSessionRunning(event.sessionId, false, event.error);
        if (event.message) {
          store.addMessage(event.sessionId, event.message);
        }

        const pendingTools = pendingToolsBySessionRef.current.get(event.sessionId);
        if (pendingTools) {
          const finishedAt = nowToolIso();
          const userImpact = toUserImpact(event.error);
          const failedSteps = finalizeRunningSteps(
            pendingTools.steps,
            'error',
            finishedAt,
            event.error,
            userImpact
          );
          const session = store.sessions[event.sessionId];
          const targetMessageId =
            pendingTools.messageId ??
            event.message?.id ??
            (session ? getLatestAssistantMessageId(session.messages) : undefined);

          if (targetMessageId) {
            const group = createToolCallGroup({
              id: pendingTools.id,
              messageId: targetMessageId,
              steps: failedSteps,
              status: 'error',
              finishedAt,
              errorMessage: event.error,
              userImpact,
            });
            attachToolGroupToMessage(event.sessionId, targetMessageId, group);
          }

          pendingToolsBySessionRef.current.delete(event.sessionId);
        }

        const pendingThinking = pendingThinkingBySessionRef.current.get(event.sessionId);
        if (pendingThinking) {
          const finishedAt = nowThinkingIso();
          const aborted = isAbortLikeError(event.error);
          const session = store.sessions[event.sessionId];
          const targetMessageId =
            pendingThinking.messageId ??
            event.message?.id ??
            (session ? getLatestAssistantMessageId(session.messages) : undefined);

          if (targetMessageId) {
            const runningThinking = createThinkingBlock({
              id: pendingThinking.id,
              status: 'running',
              startedAt: pendingThinking.startedAt,
              detailText: pendingThinking.detailText,
            });
            const finalizedThinking = finalizeThinkingBlock(
              runningThinking,
              aborted ? 'aborted' : 'error',
              {
                finishedAt,
                detailText: pendingThinking.detailText,
                errorMessage: aborted ? undefined : event.error,
              }
            );
            attachThinkingToMessage(
              event.sessionId,
              targetMessageId,
              finalizedThinking,
              finalizedThinking.detailText
            );
          }

          pendingThinkingBySessionRef.current.delete(event.sessionId);
        }
        return;
      }

      if (event.type === 'session_metadata_updated') {
        const title = event.name ?? store.sessions[event.sessionId]?.title ?? null;
        store.setSessionTitle(event.sessionId, title, event.description);
      }
    });

    return () => {
      pendingToolsBySessionRef.current.clear();
      pendingThinkingBySessionRef.current.clear();
      unsubscribe();
    };
  }, [attachThinkingToMessage, attachToolGroupToMessage]);

  useEffect(() => {
    if (!activeSessionId || isProcessing) return;

    const pendingThinking = pendingThinkingBySessionRef.current.get(activeSessionId);
    if (!pendingThinking) return;

    const store = useSessionStore.getState();
    const session = store.sessions[activeSessionId];
    if (!session) {
      pendingThinkingBySessionRef.current.delete(activeSessionId);
      return;
    }

    const targetMessageId =
      pendingThinking.messageId ?? getLatestAssistantMessageId(session.messages);
    if (!targetMessageId) {
      pendingThinkingBySessionRef.current.delete(activeSessionId);
      return;
    }

    const runningThinking = createThinkingBlock({
      id: pendingThinking.id,
      status: 'running',
      startedAt: pendingThinking.startedAt,
      detailText: pendingThinking.detailText,
    });
    const abortedThinking = finalizeThinkingBlock(runningThinking, 'aborted', {
      finishedAt: nowThinkingIso(),
      detailText: pendingThinking.detailText,
    });
    attachThinkingToMessage(
      activeSessionId,
      targetMessageId,
      abortedThinking,
      abortedThinking.detailText
    );
    pendingThinkingBySessionRef.current.delete(activeSessionId);
  }, [activeSessionId, attachThinkingToMessage, isProcessing]);
}
