import type { PhaseModelEntry } from '@automaker/types';
import { create } from 'zustand';
import type { SessionListItem } from '@/types/electron';
import { sanitizeThinkingBlock } from '../services/thinking-utils';
import { sanitizeToolCallGroup } from '../services/tool-call-utils';
import type { SessionMessage, SessionState, SessionStoreState } from './types';
import {
  DEFAULT_IDLE_SESSION_LIMIT,
  EMPTY_IDS,
  EMPTY_MESSAGES,
  clampIdleSessionsLimit,
  createSessionsFromSnapshot,
  getSessionFromServer,
  isReusableIdleSession,
  normalizeOrder,
  nowIso,
  prependId,
  removeId,
  resetSessionForReuse,
  sessionSortByUpdatedAt,
  updatePreviewFromMessages,
} from './session-store-helpers';

export { isSessionIdle, isReusableIdleSession } from './session-store-helpers';

function normalizeSessionMessage(message: SessionMessage): SessionMessage {
  return {
    ...message,
    thinkingBlock: sanitizeThinkingBlock(message.thinkingBlock),
    toolCallGroup: sanitizeToolCallGroup(message.toolCallGroup),
  };
}

function mergeSessionMessage(existing: SessionMessage, incoming: SessionMessage): SessionMessage {
  return normalizeSessionMessage({
    ...existing,
    ...incoming,
    toolCalls: incoming.toolCalls ?? existing.toolCalls,
    toolCallGroup: incoming.toolCallGroup ?? existing.toolCallGroup,
    thinking: incoming.thinking ?? existing.thinking,
    thinkingBlock: incoming.thinkingBlock ?? existing.thinkingBlock,
  });
}

export const useSessionStore = create<SessionStoreState>()((set, get) => ({
      sessions: {},
      sessionOrder: EMPTY_IDS,
      activeSessionId: null,
      activeProjectPath: null,
      activeWorkingDirectory: null,
      maxIdleSessions: DEFAULT_IDLE_SESSION_LIMIT,
      hasHydratedFromDisk: false,

      hydrateFromPersistence: (snapshot) =>
        set(() => {
          if (!snapshot) {
            return {
              hasHydratedFromDisk: true,
            };
          }

          const nextSessions = createSessionsFromSnapshot(snapshot);
          const nextSessionOrder = normalizeOrder(snapshot.sessionOrder, nextSessions);

          let nextActiveSessionId =
            snapshot.activeSessionId && nextSessions[snapshot.activeSessionId]
              ? snapshot.activeSessionId
              : null;

          const activeSession = nextActiveSessionId ? nextSessions[nextActiveSessionId] : null;
          if (!activeSession || activeSession.isArchived) {
            nextActiveSessionId = nextSessionOrder[0] ?? null;
          }

          return {
            sessions: nextSessions,
            sessionOrder: nextSessionOrder,
            activeSessionId: nextActiveSessionId,
            activeProjectPath: snapshot.activeProjectPath ?? null,
            activeWorkingDirectory: snapshot.activeWorkingDirectory ?? null,
            maxIdleSessions: clampIdleSessionsLimit(snapshot.maxIdleSessions),
            hasHydratedFromDisk: true,
          };
        }),

      setProjectContext: (projectPath, workingDirectory) =>
        set((state) => {
          const projectSessionIds = state.sessionOrder.filter((sessionId) => {
            const session = state.sessions[sessionId];
            return !!session && session.projectPath === projectPath && !session.isArchived;
          });

          let nextActiveSessionId = state.activeSessionId;
          const currentActive = nextActiveSessionId ? state.sessions[nextActiveSessionId] : null;
          const activeOnCurrentProject = currentActive?.projectPath === projectPath;

          if (!activeOnCurrentProject) {
            nextActiveSessionId = projectSessionIds[0] ?? null;
          }

          return {
            activeProjectPath: projectPath,
            activeWorkingDirectory: workingDirectory,
            activeSessionId: nextActiveSessionId,
          };
        }),

      setMaxIdleSessions: (limit) =>
        set({
          maxIdleSessions: clampIdleSessionsLimit(limit),
        }),

      syncSessionsFromServer: ({ projectPath, workingDirectory, sessions, defaultModel }) =>
        set((state) => {
          const nextSessions = { ...state.sessions };
          const incomingIds = new Set<string>();

          for (const serverSession of sessions) {
            if (serverSession.projectPath !== projectPath) continue;
            const existing = nextSessions[serverSession.id];
            nextSessions[serverSession.id] = getSessionFromServer(
              serverSession,
              existing,
              projectPath,
              workingDirectory,
              defaultModel
            );
            incomingIds.add(serverSession.id);
          }

          if (incomingIds.size > 0) {
            const missingProjectIds = Object.keys(nextSessions).filter((sessionId) => {
              const session = nextSessions[sessionId];
              return (
                session.projectPath === projectPath &&
                !session.isArchived &&
                !incomingIds.has(sessionId)
              );
            });

            for (const missingId of missingProjectIds) {
              nextSessions[missingId] = {
                ...nextSessions[missingId],
                isArchived: true,
                isRunning: false,
                processStatus: 'stopped',
              };
            }
          }

          // When the server returned sessions, rebuild the project order from
          // them. When the server returned nothing (boot race), keep the
          // existing order for this project so hydrated sessions stay visible.
          let projectSessionIds: string[];
          if (incomingIds.size > 0) {
            const sorted = Array.from(incomingIds)
              .map((sessionId) => nextSessions[sessionId])
              .filter((session): session is SessionState => !!session && !session.isArchived)
              .sort(sessionSortByUpdatedAt);
            projectSessionIds = sorted.map((session) => session.id);
          } else {
            projectSessionIds = state.sessionOrder.filter((sessionId) => {
              const session = nextSessions[sessionId];
              return !!session && session.projectPath === projectPath && !session.isArchived;
            });
          }

          const otherSessionIds = state.sessionOrder.filter((sessionId) => {
            const session = nextSessions[sessionId];
            return !!session && session.projectPath !== projectPath && !session.isArchived;
          });

          const nextSessionOrder = [...projectSessionIds, ...otherSessionIds];

          let nextActiveSessionId = state.activeSessionId;
          const activeSession = nextActiveSessionId ? nextSessions[nextActiveSessionId] : null;
          if (activeSession?.projectPath === projectPath) {
            if (!activeSession || activeSession.isArchived) {
              nextActiveSessionId = projectSessionIds[0] ?? null;
            }
          } else if (!nextActiveSessionId && projectSessionIds.length > 0) {
            nextActiveSessionId = projectSessionIds[0];
          }

          return {
            sessions: nextSessions,
            sessionOrder: normalizeOrder(nextSessionOrder, nextSessions),
            activeSessionId: nextActiveSessionId,
          };
        }),

      upsertSession: (session) =>
        set((state) => {
          const nextSessions = {
            ...state.sessions,
            [session.id]: session,
          };

          const nextSessionOrder = normalizeOrder(
            prependId(state.sessionOrder, session.id),
            nextSessions
          );

          return {
            sessions: nextSessions,
            sessionOrder: nextSessionOrder,
          };
        }),

      setActiveSessionId: (sessionId) =>
        set((state) => {
          if (!sessionId) {
            return { activeSessionId: null };
          }
          const targetSession = state.sessions[sessionId];
          if (!targetSession || targetSession.isArchived) {
            return { activeSessionId: null };
          }

          return {
            activeSessionId: sessionId,
            sessionOrder: prependId(state.sessionOrder, sessionId),
          };
        }),

      switchSession: (sessionId) =>
        set((state) => {
          const targetSession = state.sessions[sessionId];
          if (!targetSession || targetSession.isArchived) return state;

          return {
            activeSessionId: sessionId,
            sessionOrder: prependId(state.sessionOrder, sessionId),
          };
        }),

      closeSession: (sessionId) =>
        set((state) => {
          const session = state.sessions[sessionId];
          if (!session) return state;

          const nextSessions = {
            ...state.sessions,
            [sessionId]: {
              ...session,
              isArchived: true,
              isRunning: false,
              processStatus: 'stopped' as const,
            },
          };
          const nextSessionOrder = normalizeOrder(removeId(state.sessionOrder, sessionId), nextSessions);

          let nextActiveSessionId = state.activeSessionId;
          if (state.activeSessionId === sessionId) {
            const sameProjectFallback = nextSessionOrder.find((candidateId) => {
              const candidate = nextSessions[candidateId];
              return candidate?.projectPath === session.projectPath;
            });
            nextActiveSessionId = sameProjectFallback ?? nextSessionOrder[0] ?? null;
          }

          return {
            sessions: nextSessions,
            sessionOrder: nextSessionOrder,
            activeSessionId: nextActiveSessionId,
          };
        }),

      removeSession: (sessionId) =>
        set((state) => {
          if (!state.sessions[sessionId]) return state;
          const nextSessions = { ...state.sessions };
          delete nextSessions[sessionId];
          const nextSessionOrder = normalizeOrder(removeId(state.sessionOrder, sessionId), nextSessions);
          const nextActiveSessionId =
            state.activeSessionId === sessionId ? nextSessionOrder[0] ?? null : state.activeSessionId;

          return {
            sessions: nextSessions,
            sessionOrder: nextSessionOrder,
            activeSessionId: nextActiveSessionId,
          };
        }),

      updateSession: (sessionId, partial) =>
        set((state) => {
          const session = state.sessions[sessionId];
          if (!session) return state;

          const nextSession: SessionState = {
            ...session,
            ...partial,
            updatedAt: partial.updatedAt ?? nowIso(),
          };

          const nextSessions = {
            ...state.sessions,
            [sessionId]: nextSession,
          };

          return {
            sessions: nextSessions,
            sessionOrder: prependId(state.sessionOrder, sessionId),
          };
        }),

      setSessionRunning: (sessionId, isRunning, error) =>
        set((state) => {
          const session = state.sessions[sessionId];
          if (!session) return state;

          const nextStatus = error ? 'error' : isRunning ? 'running' : 'idle';
          return {
            sessions: {
              ...state.sessions,
              [sessionId]: {
                ...session,
                isRunning,
                processStatus: nextStatus,
                updatedAt: nowIso(),
              },
            },
          };
        }),

      setSessionModel: (sessionId, model, thinkingLevel, reasoningEffort) =>
        set((state) => {
          const session = state.sessions[sessionId];
          if (!session) return state;
          return {
            sessions: {
              ...state.sessions,
              [sessionId]: {
                ...session,
                model,
                thinkingLevel,
                reasoningEffort,
              },
            },
          };
        }),

      setMessages: (sessionId, messages) =>
        set((state) => {
          const session = state.sessions[sessionId];
          if (!session) return state;

          const existingById = new Map(session.messages.map((message) => [message.id, message]));
          const nextMessages = messages.map((message) => {
            const normalized = normalizeSessionMessage(message);
            const existing = existingById.get(normalized.id);
            return existing ? mergeSessionMessage(existing, normalized) : normalized;
          });

          return {
            sessions: {
              ...state.sessions,
              [sessionId]: {
                ...session,
                messages: nextMessages,
                messageCount: nextMessages.length,
                preview: updatePreviewFromMessages(nextMessages),
                updatedAt: nowIso(),
              },
            },
          };
        }),

      addMessage: (sessionId, message) =>
        set((state) => {
          const session = state.sessions[sessionId];
          if (!session) return state;

          const normalizedMessage = normalizeSessionMessage(message);

          const existingIndex = session.messages.findIndex((candidate) => candidate.id === message.id);
          const nextMessages =
            existingIndex >= 0
              ? session.messages.map((candidate, index) =>
                  index === existingIndex
                    ? mergeSessionMessage(candidate, normalizedMessage)
                    : candidate
                )
              : [...session.messages, normalizedMessage];

          return {
            sessions: {
              ...state.sessions,
              [sessionId]: {
                ...session,
                messages: nextMessages,
                messageCount: nextMessages.length,
                preview: updatePreviewFromMessages(nextMessages),
                updatedAt: nowIso(),
              },
            },
          };
        }),

      clearMessages: (sessionId) =>
        set((state) => {
          const session = state.sessions[sessionId];
          if (!session) return state;

          return {
            sessions: {
              ...state.sessions,
              [sessionId]: {
                ...session,
                messages: EMPTY_MESSAGES,
                messageCount: 0,
                preview: '',
                totalTokensInput: 0,
                totalTokensOutput: 0,
                totalCost: 0,
                updatedAt: nowIso(),
              },
            },
          };
        }),

      setDraft: (sessionId, draftMessage, draftImages, draftTextFiles) =>
        set((state) => {
          const session = state.sessions[sessionId];
          if (!session) return state;

          return {
            sessions: {
              ...state.sessions,
              [sessionId]: {
                ...session,
                draftMessage,
                draftImages: draftImages ?? session.draftImages,
                draftTextFiles: draftTextFiles ?? session.draftTextFiles,
              },
            },
          };
        }),

      setSessionTitle: (sessionId, title, description) =>
        set((state) => {
          const session = state.sessions[sessionId];
          if (!session) return state;

          return {
            sessions: {
              ...state.sessions,
              [sessionId]: {
                ...session,
                title,
                description: description ?? session.description,
              },
            },
          };
        }),

      setSessionTokens: (sessionId, inputTokens, outputTokens, cost) =>
        set((state) => {
          const session = state.sessions[sessionId];
          if (!session) return state;

          return {
            sessions: {
              ...state.sessions,
              [sessionId]: {
                ...session,
                totalTokensInput: inputTokens,
                totalTokensOutput: outputTokens,
                totalCost: cost,
              },
            },
          };
        }),

      setOrchestratorMode: (sessionId, enabled, runId) =>
        set((state) => {
          const session = state.sessions[sessionId];
          if (!session) return state;

          return {
            sessions: {
              ...state.sessions,
              [sessionId]: {
                ...session,
                orchestratorMode: enabled,
                orchestratorRunId: runId ?? session.orchestratorRunId,
              },
            },
          };
        }),

      incrementOrchestratorIteration: (sessionId) =>
        set((state) => {
          const session = state.sessions[sessionId];
          if (!session) return state;

          return {
            sessions: {
              ...state.sessions,
              [sessionId]: {
                ...session,
                orchestratorIteration: session.orchestratorIteration + 1,
              },
            },
          };
        }),

      markSessionTouched: (sessionId) =>
        set((state) => {
          const session = state.sessions[sessionId];
          if (!session) return state;
          return {
            sessions: {
              ...state.sessions,
              [sessionId]: {
                ...session,
                updatedAt: nowIso(),
              },
            },
            sessionOrder: prependId(state.sessionOrder, sessionId),
          };
        }),

      closeAllSessions: () =>
        set((state) => {
          const nextSessions = Object.fromEntries(
            Object.entries(state.sessions).map(([sessionId, session]) => [
              sessionId,
              {
                ...session,
                isArchived: true,
                isRunning: false,
                processStatus: 'stopped' as const,
              },
            ])
          );

          return {
            sessions: nextSessions,
            sessionOrder: EMPTY_IDS,
            activeSessionId: null,
          };
        }),

      closeIdleSessions: (limit, projectPath) => {
        const state = get();
        const keepCount = Math.max(1, Math.round(limit ?? state.maxIdleSessions));
        const targetProject = projectPath ?? state.activeProjectPath;

        const idleSessions = state.sessionOrder
          .map((sessionId) => state.sessions[sessionId])
          .filter((session): session is SessionState => {
            if (!session) return false;
            if (targetProject && session.projectPath !== targetProject) return false;
            return isReusableIdleSession(session);
          });

        if (idleSessions.length <= keepCount) {
          return EMPTY_IDS;
        }

        const sortedIdleSessions = [...idleSessions].sort(sessionSortByUpdatedAt);
        const sessionsToClose = sortedIdleSessions.slice(keepCount);
        const closeIds = sessionsToClose.map((session) => session.id);

        set((previousState) => {
          const nextSessions = { ...previousState.sessions };
          for (const closeId of closeIds) {
            const existing = nextSessions[closeId];
            if (!existing) continue;
            nextSessions[closeId] = {
              ...existing,
              isArchived: true,
              isRunning: false,
              processStatus: 'stopped' as const,
            };
          }

          const nextOrder = normalizeOrder(
            previousState.sessionOrder.filter((sessionId) => !closeIds.includes(sessionId)),
            nextSessions
          );

          const nextActiveSessionId =
            previousState.activeSessionId && closeIds.includes(previousState.activeSessionId)
              ? nextOrder[0] ?? null
              : previousState.activeSessionId;

          return {
            sessions: nextSessions,
            sessionOrder: nextOrder,
            activeSessionId: nextActiveSessionId,
          };
        });

        return closeIds;
      },
    })
);

export function getProjectSessions(
  state: SessionStoreState,
  projectPath: string | null | undefined
): SessionState[] {
  if (!projectPath) return [];

  return state.sessionOrder
    .map((sessionId) => state.sessions[sessionId])
    .filter(
      (session): session is SessionState =>
        !!session && session.projectPath === projectPath && !session.isArchived
    );
}

export function createReusableSessionCopy(
  state: SessionStoreState,
  sessionId: string,
  nextName: string
): SessionState | null {
  const session = state.sessions[sessionId];
  if (!session) return null;
  return resetSessionForReuse(session, nextName);
}

export function createSessionFromServer(
  serverSession: SessionListItem,
  projectPath: string,
  workingDirectory: string,
  defaultModel: PhaseModelEntry
): SessionState {
  return getSessionFromServer(serverSession, undefined, projectPath, workingDirectory, defaultModel);
}
