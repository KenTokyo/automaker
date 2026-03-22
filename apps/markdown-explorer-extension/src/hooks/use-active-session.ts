import { useMemo } from 'react';
import { useShallow } from 'zustand/react/shallow';
import type { SessionState } from '../stores/types';
import { useSessionStore } from '../stores/session-store';

const EMPTY_SESSIONS: SessionState[] = [];

export interface UseActiveSessionResult {
  activeSessionId: string | null;
  activeSession: SessionState | null;
  projectSessions: SessionState[];
  isRunning: boolean;
}

export function useActiveSession(projectPath: string | null | undefined): UseActiveSessionResult {
  const { sessions, sessionOrder, activeSessionId } = useSessionStore(
    useShallow((state) => ({
      sessions: state.sessions,
      sessionOrder: state.sessionOrder,
      activeSessionId: state.activeSessionId,
    }))
  );

  const projectSessions = useMemo(() => {
    if (!projectPath) return EMPTY_SESSIONS;

    const nextSessions = sessionOrder
      .map((sessionId) => sessions[sessionId])
      .filter(
        (session): session is SessionState =>
          !!session && session.projectPath === projectPath && !session.isArchived
      );

    return nextSessions.length > 0 ? nextSessions : EMPTY_SESSIONS;
  }, [projectPath, sessionOrder, sessions]);

  const activeSession = useMemo(() => {
    if (!activeSessionId) return null;
    const session = sessions[activeSessionId];
    if (!session || session.isArchived) return null;
    if (projectPath && session.projectPath !== projectPath) return null;
    return session;
  }, [activeSessionId, projectPath, sessions]);

  return useMemo(
    () => ({
      activeSessionId,
      activeSession,
      projectSessions,
      isRunning: activeSession?.isRunning ?? false,
    }),
    [activeSession, activeSessionId, projectSessions]
  );
}
