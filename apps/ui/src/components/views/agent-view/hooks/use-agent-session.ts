import { useState, useCallback, useEffect, useRef, type MutableRefObject } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { createLogger } from '@automaker/utils/logger';
import { useAppStore } from '@/store/app-store';
import { useShallow } from 'zustand/react/shallow';
import { getElectronAPI } from '@/lib/electron';
import { generateRandomSessionName } from '@/components/session-manager/session-name-generator';
import { queryKeys } from '@/lib/query-keys';

const logger = createLogger('AgentSession');

interface UseAgentSessionOptions {
  projectPath: string | undefined;
  /** Ref to the quick-create function exposed by SessionManager (used as fallback) */
  quickCreateSessionRef?: MutableRefObject<(() => Promise<void>) | null>;
}

interface UseAgentSessionResult {
  currentSessionId: string | null;
  handleSelectSession: (sessionId: string | null, sessionProjectPath?: string) => void;
}

export function useAgentSession({
  projectPath,
  quickCreateSessionRef,
}: UseAgentSessionOptions): UseAgentSessionResult {
  const { setLastSelectedSession, getLastSelectedSession, projects, setCurrentProject } =
    useAppStore(
      useShallow((s) => ({
        setLastSelectedSession: s.setLastSelectedSession,
        getLastSelectedSession: s.getLastSelectedSession,
        projects: s.projects,
        setCurrentProject: s.setCurrentProject,
      }))
    );
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const queryClient = useQueryClient();

  // Track if initial session has been loaded
  const initialSessionLoadedRef = useRef(false);
  // Track if auto-create is in progress to prevent duplicate session creation
  const autoCreateInProgressRef = useRef(false);

  // Handle session selection with persistence
  // If sessionProjectPath is provided and differs from the current project, switch projects
  const handleSelectSession = useCallback(
    (sessionId: string | null, sessionProjectPath?: string) => {
      // If the session belongs to a different project, switch to that project first
      if (sessionProjectPath && sessionProjectPath !== projectPath) {
        const targetProject = projects.find((p) => p.path === sessionProjectPath);
        if (targetProject) {
          logger.info(
            'Switching project for session:',
            sessionId,
            'from',
            projectPath,
            'to',
            sessionProjectPath
          );
          setCurrentProject(targetProject);
        }
      }

      setCurrentSessionId(sessionId);
      // Persist the selection for the session's project (or current project)
      const effectiveProjectPath = sessionProjectPath || projectPath;
      if (effectiveProjectPath) {
        setLastSelectedSession(effectiveProjectPath, sessionId);
      }
    },
    [projectPath, projects, setCurrentProject, setLastSelectedSession]
  );

  // Auto-create a new session for a project
  const autoCreateSession = useCallback(
    async (forProjectPath: string) => {
      if (autoCreateInProgressRef.current) return;
      autoCreateInProgressRef.current = true;

      try {
        const api = getElectronAPI();
        if (!api?.sessions) {
          logger.warn('Sessions API not available for auto-create');
          return;
        }

        const sessionName = generateRandomSessionName();
        logger.info('Auto-creating new session for project:', forProjectPath, 'name:', sessionName);

        // Auto-created sessions on project switch are independent (no orchestrator run ID)
        const result = await api.sessions.create(
          sessionName,
          forProjectPath,
          forProjectPath,
          undefined
        );

        if (result.success && result.session?.id) {
          // Invalidate session queries so SessionManager picks up the new session
          await queryClient.invalidateQueries({ queryKey: queryKeys.sessions.all(true) });

          // Set the new session as current and persist
          setCurrentSessionId(result.session.id);
          setLastSelectedSession(forProjectPath, result.session.id);
          logger.info('Auto-created session:', result.session.id, 'for project:', forProjectPath);
        } else {
          logger.error('Auto-create session failed:', result.error);
        }
      } catch (err) {
        logger.error('Error auto-creating session:', err);
      } finally {
        autoCreateInProgressRef.current = false;
      }
    },
    [queryClient, setLastSelectedSession]
  );

  // Restore last selected session when switching to Agent view or when project changes
  // If no previous session exists, auto-create one
  useEffect(() => {
    if (!projectPath) {
      // No project, reset
      setCurrentSessionId(null);
      initialSessionLoadedRef.current = false;
      return;
    }

    // Only restore once per project
    if (initialSessionLoadedRef.current) return;
    initialSessionLoadedRef.current = true;

    const lastSessionId = getLastSelectedSession(projectPath);
    if (lastSessionId) {
      logger.info('Restoring last selected session:', lastSessionId);
      setCurrentSessionId(lastSessionId);
    } else {
      // No previous session for this project – auto-create one
      logger.info('No previous session for project, auto-creating:', projectPath);
      void autoCreateSession(projectPath);
    }
  }, [projectPath, getLastSelectedSession, autoCreateSession]);

  // Reset initialSessionLoadedRef when project changes
  useEffect(() => {
    initialSessionLoadedRef.current = false;
  }, [projectPath]);

  return {
    currentSessionId,
    handleSelectSession,
  };
}
