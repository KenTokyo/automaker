import { useCallback } from 'react';
import type { PhaseModelEntry } from '@automaker/types';
import { useSessionStore } from '../stores/session-store';
import type { SessionState } from '../stores/types';

interface CreateSessionContext {
  projectPath: string;
  workingDirectory: string;
  modelSelection: PhaseModelEntry;
}

interface UseChatSessionCloseOptions {
  activeSessionId: null | string;
  currentProjectPath: null | string;
  projectSessions: SessionState[];
  createSession: (context: CreateSessionContext) => Promise<null | string>;
  createSessionContext: () => CreateSessionContext | null;
  closeSession: (sessionId: string) => Promise<boolean>;
  stopSessionExecution: (sessionId: string) => Promise<boolean>;
  persistDraftForSession: (sessionId: null | string) => void;
  persistScrollForSession: (sessionId: null | string) => void;
  onSelectSession: (sessionId: string) => void;
}

export function useChatSessionClose({
  activeSessionId,
  currentProjectPath,
  projectSessions,
  createSession,
  createSessionContext,
  closeSession,
  stopSessionExecution,
  persistDraftForSession,
  persistScrollForSession,
  onSelectSession,
}: UseChatSessionCloseOptions) {
  const handleCloseSession = useCallback(
    async (
      sessionId: string,
      options?: { ensureAtLeastOneTab?: boolean; skipRunningConfirm?: boolean }
    ): Promise<boolean> => {
      const store = useSessionStore.getState();
      const targetSession = store.sessions[sessionId];
      if (!targetSession || targetSession.isArchived) return false;

      if (targetSession.isRunning && !options?.skipRunningConfirm) {
        const confirmed = window.confirm('Dieser Chat läuft noch. Wirklich schließen?');
        if (!confirmed) {
          return false;
        }

        await stopSessionExecution(sessionId);
      }

      if (sessionId === activeSessionId) {
        persistDraftForSession(sessionId);
        persistScrollForSession(sessionId);
      }

      const closed = await closeSession(sessionId);
      if (!closed) return false;

      const shouldEnsureTab = options?.ensureAtLeastOneTab ?? true;
      if (!shouldEnsureTab) return true;
      if (!currentProjectPath) return true;

      const remainingProjectSessions = Object.values(useSessionStore.getState().sessions).filter(
        (session) => session.projectPath === currentProjectPath && !session.isArchived
      );

      if (remainingProjectSessions.length > 0) {
        return true;
      }

      const context = createSessionContext();
      if (!context) return true;
      await createSession(context);
      return true;
    },
    [
      activeSessionId,
      closeSession,
      createSession,
      createSessionContext,
      currentProjectPath,
      persistDraftForSession,
      persistScrollForSession,
      stopSessionExecution,
    ]
  );

  const handleCloseOtherSessions = useCallback(
    async (sessionId: string) => {
      const others = projectSessions.filter((session) => session.id !== sessionId);
      if (others.length === 0) return;

      const runningCount = others.filter((session) => session.isRunning).length;
      if (runningCount > 0) {
        const confirmed = window.confirm(
          runningCount === 1
            ? 'Ein anderer Chat läuft noch. Wirklich schließen?'
            : `${runningCount} andere Chats laufen noch. Wirklich schließen?`
        );
        if (!confirmed) {
          return;
        }
      }

      for (const session of others) {
        if (session.isRunning) {
          await stopSessionExecution(session.id);
        }

        await handleCloseSession(session.id, {
          ensureAtLeastOneTab: false,
          skipRunningConfirm: true,
        });
      }

      if (activeSessionId !== sessionId) {
        onSelectSession(sessionId);
      }
    },
    [activeSessionId, handleCloseSession, onSelectSession, projectSessions, stopSessionExecution]
  );

  return {
    handleCloseSession,
    handleCloseOtherSessions,
  };
}
