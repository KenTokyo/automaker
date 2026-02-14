import { useState, useCallback, useEffect, useRef } from 'react';
import { createLogger } from '@automaker/utils/logger';
import { useAppStore } from '@/store/app-store';

const logger = createLogger('AgentSession');

interface UseAgentSessionOptions {
  projectPath: string | undefined;
}

interface UseAgentSessionResult {
  currentSessionId: string | null;
  handleSelectSession: (sessionId: string | null, sessionProjectPath?: string) => void;
}

export function useAgentSession({ projectPath }: UseAgentSessionOptions): UseAgentSessionResult {
  const { setLastSelectedSession, getLastSelectedSession, projects, setCurrentProject } =
    useAppStore();
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);

  // Track if initial session has been loaded
  const initialSessionLoadedRef = useRef(false);

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

  // Restore last selected session when switching to Agent view or when project changes
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
    }
  }, [projectPath, getLastSelectedSession]);

  // Reset initialSessionLoadedRef when project changes
  useEffect(() => {
    initialSessionLoadedRef.current = false;
  }, [projectPath]);

  return {
    currentSessionId,
    handleSelectSession,
  };
}
