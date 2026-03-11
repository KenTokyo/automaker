import { useEffect, useRef } from 'react';
import type { PhaseModelEntry } from '@automaker/types';
import { createLogger } from '@automaker/utils/logger';
import { toast } from 'sonner';
import type { SessionListItem } from '@/types/electron';
import { useSessionStore } from '../stores/session-store';

const logger = createLogger('ProjectSessionBootstrap');

interface SessionContext {
  projectPath: string;
  workingDirectory: string;
  modelSelection: PhaseModelEntry;
}

interface UseProjectSessionBootstrapOptions {
  currentProjectPath: null | string | undefined;
  createSessionContext: () => null | SessionContext;
  createSession: (context: SessionContext) => Promise<null | string>;
  switchSession: (sessionId: string) => void;
  getLastSelectedSession: (projectPath: string) => null | string;
  refreshSessionsForProject: (context: SessionContext) => Promise<SessionListItem[]>;
}

export function useProjectSessionBootstrap({
  currentProjectPath,
  createSessionContext,
  createSession,
  switchSession,
  getLastSelectedSession,
  refreshSessionsForProject,
}: UseProjectSessionBootstrapOptions) {
  const initializeProjectRef = useRef<null | string>(null);

  useEffect(() => {
    if (!currentProjectPath) return;
    if (initializeProjectRef.current === currentProjectPath) return;

    initializeProjectRef.current = currentProjectPath;
    useSessionStore.getState().setProjectContext(currentProjectPath, currentProjectPath);

    let cancelled = false;
    const context = createSessionContext();
    if (!context) return;

    const loadProjectSessions = async () => {
      try {
        const serverSessions: SessionListItem[] = await refreshSessionsForProject(context);
        if (cancelled) return;

        const storeState = useSessionStore.getState();
        const availableSessionIds = new Set(serverSessions.map((session) => session.id));
        const activeSession =
          storeState.activeSessionId && storeState.sessions[storeState.activeSessionId]
            ? storeState.sessions[storeState.activeSessionId]
            : null;

        const activeSessionForProject =
          activeSession &&
          !activeSession.isArchived &&
          activeSession.projectPath === context.projectPath
            ? activeSession
            : null;

        if (activeSessionForProject && availableSessionIds.has(activeSessionForProject.id)) {
          return;
        }

        if (activeSessionForProject && serverSessions.length === 0) {
          switchSession(activeSessionForProject.id);
          return;
        }

        if (serverSessions.length === 0) {
          const localProjectSessions = Object.values(storeState.sessions).filter(
            (session) => session.projectPath === context.projectPath && !session.isArchived
          );

          if (localProjectSessions.length > 0) {
            const fallbackLocalSession =
              storeState.sessionOrder
                .map((sessionId) => storeState.sessions[sessionId])
                .find(
                  (session) =>
                    !!session &&
                    session.projectPath === context.projectPath &&
                    !session.isArchived
                ) ?? localProjectSessions[0];

            if (fallbackLocalSession) {
              switchSession(fallbackLocalSession.id);
              return;
            }
          }

          await createSession(context);
          return;
        }

        const preferredSessionId = getLastSelectedSession(context.projectPath);
        const nextSessionId =
          activeSessionForProject && availableSessionIds.has(activeSessionForProject.id)
            ? activeSessionForProject.id
            : preferredSessionId && availableSessionIds.has(preferredSessionId)
            ? preferredSessionId
            : serverSessions[0]?.id;

        if (nextSessionId) {
          switchSession(nextSessionId);
        }
      } catch (loadError) {
        logger.error('Session bootstrap failed', loadError);
        toast.error('Sessions konnten nicht geladen werden.');
      }
    };

    void loadProjectSessions();

    return () => {
      cancelled = true;
    };
  }, [
    createSession,
    createSessionContext,
    currentProjectPath,
    getLastSelectedSession,
    refreshSessionsForProject,
    switchSession,
  ]);
}
