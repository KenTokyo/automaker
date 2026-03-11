import { useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import type { PhaseModelEntry, ReasoningEffort, ThinkingLevel } from '@automaker/types';
import { createLogger } from '@automaker/utils/logger';
import { toast } from 'sonner';
import { useShallow } from 'zustand/react/shallow';
import { getElectronAPI } from '@/lib/electron';
import type { SessionListItem } from '@/types/electron';
import {
  createReusableSessionCopy,
  createSessionFromServer,
  getProjectSessions,
  isReusableIdleSession,
  useSessionStore,
} from '../stores/session-store';

const logger = createLogger('SessionActions');

const GREEK_SESSION_NAMES = [
  'Alpha',
  'Beta',
  'Gamma',
  'Delta',
  'Epsilon',
  'Zeta',
  'Eta',
  'Theta',
  'Iota',
  'Kappa',
  'Lambda',
  'Mu',
  'Nu',
  'Xi',
  'Omikron',
  'Pi',
  'Rho',
  'Sigma',
  'Tau',
  'Upsilon',
  'Phi',
  'Chi',
  'Psi',
  'Omega',
] as const;

const EMPTY_SESSION_LIST: SessionListItem[] = [];

function createSessionName(existingNames: string[]): string {
  const usedNames = new Set(existingNames.map((name) => name.trim().toLowerCase()).filter(Boolean));
  const nextGreekName = GREEK_SESSION_NAMES.find((name) => !usedNames.has(name.toLowerCase()));
  if (nextGreekName) return nextGreekName;
  return `Chat ${existingNames.length + 1}`;
}

interface SessionContext {
  projectPath: string;
  workingDirectory: string;
  modelSelection: PhaseModelEntry;
}

interface SendMessageInput {
  sessionId: string;
  message: string;
  workingDirectory?: string;
  imagePaths?: string[];
  model?: string;
  thinkingLevel?: ThinkingLevel;
  reasoningEffort?: ReasoningEffort;
}

export function useSessionActions() {
  const queryClient = useQueryClient();
  const { maxIdleSessions } = useSessionStore(
    useShallow((state) => ({
      maxIdleSessions: state.maxIdleSessions,
    }))
  );

  const syncSessionsFromServer = useCallback(
    (sessions: SessionListItem[], context: SessionContext) => {
      useSessionStore.getState().syncSessionsFromServer({
        projectPath: context.projectPath,
        workingDirectory: context.workingDirectory,
        sessions,
        defaultModel: context.modelSelection,
      });
    },
    []
  );

  const refreshSessionsForProject = useCallback(
    async (context: SessionContext): Promise<SessionListItem[]> => {
      const api = getElectronAPI();
      if (!api.sessions) {
        logger.warn('Sessions API not available during refresh');
        return EMPTY_SESSION_LIST;
      }

      const result = await api.sessions.list(true);
      if (!result.success) {
        throw new Error(result.error || 'Sessions konnten nicht geladen werden.');
      }

      const sessions = (result.sessions ?? EMPTY_SESSION_LIST).filter(
        (session) => session.projectPath === context.projectPath && !session.isArchived
      );
      syncSessionsFromServer(sessions, context);
      return sessions;
    },
    [syncSessionsFromServer]
  );

  const archiveIdleOverflowSessions = useCallback(
    async (projectPath: string) => {
      const api = getElectronAPI();
      if (!api.sessions) return;

      const archivedIds = useSessionStore
        .getState()
        .closeIdleSessions(maxIdleSessions, projectPath);
      if (archivedIds.length === 0) return;

      await Promise.all(
        archivedIds.map(async (sessionId) => {
          try {
            await api.sessions?.archive(sessionId);
          } catch (error) {
            logger.warn('Failed to archive idle session on server', { sessionId, error });
          }
        })
      );
    },
    [maxIdleSessions]
  );

  const createSession = useCallback(
    async (context: SessionContext): Promise<string | null> => {
      const api = getElectronAPI();
      if (!api.sessions) {
        toast.error('Session-API ist nicht verfügbar.');
        return null;
      }

      const storeState = useSessionStore.getState();
      const projectSessions = getProjectSessions(storeState, context.projectPath);
      const nextSessionName = createSessionName(projectSessions.map((session) => session.name));
      const activeSession = storeState.activeSessionId
        ? (storeState.sessions[storeState.activeSessionId] ?? null)
        : null;

      const activeReusable =
        activeSession &&
        activeSession.projectPath === context.projectPath &&
        isReusableIdleSession(activeSession)
          ? activeSession
          : null;

      const fallbackReusable =
        projectSessions.find(
          (session) =>
            session.id !== activeSession?.id &&
            session.projectPath === context.projectPath &&
            isReusableIdleSession(session)
        ) ?? null;

      const reusableSession = activeReusable ?? fallbackReusable;
      if (reusableSession) {
        const reusableCopy = createReusableSessionCopy(
          storeState,
          reusableSession.id,
          nextSessionName
        );
        if (reusableCopy) {
          useSessionStore.getState().upsertSession(reusableCopy);
          useSessionStore.getState().switchSession(reusableCopy.id);
        }

        try {
          await api.agent?.clear(reusableSession.id);
          await api.agent?.start(reusableSession.id, context.workingDirectory);
        } catch (error) {
          logger.warn('Reusable session could not be reset on server', error);
        }

        await archiveIdleOverflowSessions(context.projectPath);
        return reusableSession.id;
      }

      try {
        const result = await api.sessions.create(
          nextSessionName,
          context.projectPath,
          context.workingDirectory
        );
        if (!result.success || !result.session?.id) {
          throw new Error(result.error || 'Session konnte nicht erstellt werden.');
        }

        const sessionForStore = createSessionFromServer(
          {
            id: result.session.id,
            name: result.session.name,
            description: undefined,
            projectPath: result.session.projectPath || context.projectPath,
            createdAt: result.session.createdAt,
            updatedAt: result.session.updatedAt,
            messageCount: 0,
            isArchived: false,
            tags: [],
            preview: '',
          },
          context.projectPath,
          context.workingDirectory,
          context.modelSelection
        );

        useSessionStore.getState().upsertSession(sessionForStore);
        useSessionStore.getState().switchSession(sessionForStore.id);

        await api.agent?.start(sessionForStore.id, context.workingDirectory);
        void queryClient.invalidateQueries({ queryKey: ['sessions'] });
        await archiveIdleOverflowSessions(context.projectPath);
        return sessionForStore.id;
      } catch (error) {
        logger.error('Failed to create session', error);
        toast.error('Chat konnte nicht erstellt werden.');
        return null;
      }
    },
    [archiveIdleOverflowSessions, queryClient]
  );

  const switchSession = useCallback((sessionId: string) => {
    useSessionStore.getState().switchSession(sessionId);
  }, []);

  const closeSession = useCallback(
    async (sessionId: string): Promise<boolean> => {
      const api = getElectronAPI();
      try {
        if (api.sessions) {
          const result = await api.sessions.archive(sessionId);
          if (!result.success) {
            throw new Error(result.error || 'Session konnte nicht geschlossen werden.');
          }
        }
        useSessionStore.getState().closeSession(sessionId);
        void queryClient.invalidateQueries({ queryKey: ['sessions'] });
        return true;
      } catch (error) {
        logger.error('Failed to close session', error);
        toast.error('Chat konnte nicht geschlossen werden.');
        return false;
      }
    },
    [queryClient]
  );

  const renameSession = useCallback(
    async (sessionId: string, nextName: string): Promise<boolean> => {
      const api = getElectronAPI();
      const trimmedName = nextName.trim();
      if (!trimmedName) {
        toast.error('Name darf nicht leer sein.');
        return false;
      }

      try {
        if (api.sessions) {
          const result = await api.sessions.update(sessionId, trimmedName, undefined);
          if (!result.success) {
            throw new Error(result.error || 'Chat konnte nicht umbenannt werden.');
          }
        }

        useSessionStore.getState().updateSession(sessionId, { name: trimmedName });
        void queryClient.invalidateQueries({ queryKey: ['sessions'] });
        return true;
      } catch (error) {
        logger.error('Failed to rename session', error);
        toast.error('Chat konnte nicht umbenannt werden.');
        return false;
      }
    },
    [queryClient]
  );

  const removeSession = useCallback(
    async (sessionId: string): Promise<boolean> => {
      const api = getElectronAPI();
      try {
        if (api.sessions) {
          const result = await api.sessions.delete(sessionId);
          if (!result.success) {
            throw new Error(result.error || 'Session konnte nicht gelöscht werden.');
          }
        }
        useSessionStore.getState().removeSession(sessionId);
        void queryClient.invalidateQueries({ queryKey: ['sessions'] });
        return true;
      } catch (error) {
        logger.error('Failed to remove session', error);
        toast.error('Chat konnte nicht gelöscht werden.');
        return false;
      }
    },
    [queryClient]
  );

  const stopExecution = useCallback(async (sessionId: string): Promise<boolean> => {
    const api = getElectronAPI();
    if (!api.agent) return false;
    const result = await api.agent.stop(sessionId);
    return result.success;
  }, []);

  const sendMessage = useCallback(async (input: SendMessageInput): Promise<boolean> => {
    const api = getElectronAPI();
    if (!api.agent) return false;

    const result = await api.agent.send(
      input.sessionId,
      input.message,
      input.workingDirectory,
      input.imagePaths,
      input.model,
      input.thinkingLevel,
      input.reasoningEffort
    );

    return result.success;
  }, []);

  return {
    syncSessionsFromServer,
    refreshSessionsForProject,
    createSession,
    switchSession,
    closeSession,
    renameSession,
    removeSession,
    stopExecution,
    sendMessage,
  };
}
