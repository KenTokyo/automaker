import { useState, useCallback, useEffect } from 'react';
import { useNavigate } from '@tanstack/react-router';
import { toast } from 'sonner';
import { getElectronAPI } from '@/lib/electron';
import { getHttpApiClient } from '@/lib/http-api-client';
import { useAppStore } from '@/store/app-store';
import { useWorktrees as useWorktreesQuery } from '@/hooks/queries';
import { useWorktreeInitScript, useProjectSettings } from '@/hooks/queries';
import { useWorktreeBranches } from '@/hooks/queries';
import { usePullWorktree, usePushWorktree, useOpenInEditor } from '@/hooks/mutations';
import { useTestRunnersStore } from '@/store/test-runners-store';
import { useTestRunnerEvents } from '@/hooks/use-test-runners';
import type {
  TestRunnerStartedEvent,
  TestRunnerOutputEvent,
  TestRunnerCompletedEvent,
} from '@/types/electron';
import type {
  WorktreeInfo,
  DevServerInfo,
  GitRepoStatus,
  TestSessionInfo,
} from '../../board-view/worktree-panel/types';

interface UseAgentWorktreeActionsOptions {
  projectPath: string | undefined;
}

/**
 * Hook that provides worktree actions for the Agent View header.
 * Encapsulates all state and handlers needed for the WorktreeActionsDropdown.
 * Only operates on the main worktree (project root).
 */
export function useAgentWorktreeActions({ projectPath }: UseAgentWorktreeActionsOptions) {
  const navigate = useNavigate();

  // Get the main worktree from the worktrees query
  const { data: worktreeData } = useWorktreesQuery(projectPath ?? '');
  const worktrees = (worktreeData?.worktrees ?? []) as WorktreeInfo[];
  const mainWorktree = worktrees.find((w) => w.isMain);

  // Branch data for the main worktree
  const [currentWorktreePath, setCurrentWorktreePath] = useState<string | undefined>();
  const { data: branchData } = useWorktreeBranches(currentWorktreePath);
  const aheadCount = branchData?.aheadCount ?? 0;
  const behindCount = branchData?.behindCount ?? 0;
  const hasRemoteBranch = branchData?.hasRemoteBranch ?? false;
  const gitRepoStatus: GitRepoStatus = {
    isGitRepo: branchData?.isGitRepo ?? false,
    hasCommits: branchData?.hasCommits ?? false,
  };

  // Dev server state
  const [isStartingDevServer, setIsStartingDevServer] = useState(false);
  const [runningDevServer, setRunningDevServer] = useState<DevServerInfo | null>(null);

  // Mutations
  const pullMutation = usePullWorktree();
  const pushMutation = usePushWorktree();
  const openInEditorMutation = useOpenInEditor();

  // Check if init script exists
  const { data: initScriptData } = useWorktreeInitScript(projectPath ?? '');
  const hasInitScript = initScriptData?.exists ?? false;

  // Check if test command is configured
  const { data: projectSettings } = useProjectSettings(projectPath ?? '');
  const hasTestCommand = !!projectSettings?.testCommand;

  // Auto-mode state
  const autoModeByWorktree = useAppStore((state) => state.autoModeByWorktree);
  const currentProject = useAppStore((state) => state.currentProject);
  const setRightPanelMode = useAppStore((state) => state.setRightPanelMode);
  const setBrowserPanelOpen = useAppStore((state) => state.setBrowserPanelOpen);

  const isAutoModeRunning = useCallback((): boolean => {
    if (!currentProject || !mainWorktree) return false;
    const key = `${currentProject.id}::__main__`;
    return autoModeByWorktree[key]?.isRunning ?? false;
  }, [currentProject, mainWorktree, autoModeByWorktree]);

  // Test runner state
  const testRunnersStore = useTestRunnersStore();
  const [isStartingTests, setIsStartingTests] = useState(false);

  // Subscribe to test runner events
  useTestRunnerEvents(
    useCallback(
      (event: TestRunnerStartedEvent) => {
        testRunnersStore.startSession({
          sessionId: event.sessionId,
          worktreePath: event.worktreePath,
          command: event.command,
          status: 'running',
          testFile: event.testFile,
          startedAt: event.timestamp,
        });
      },
      [testRunnersStore]
    ),
    useCallback(
      (event: TestRunnerOutputEvent) => {
        testRunnersStore.appendOutput(event.sessionId, event.content);
      },
      [testRunnersStore]
    ),
    useCallback(
      (event: TestRunnerCompletedEvent) => {
        testRunnersStore.completeSession(
          event.sessionId,
          event.status,
          event.exitCode,
          event.duration
        );
        const statusEmoji =
          event.status === 'passed'
            ? '\u2705'
            : event.status === 'failed'
              ? '\u274c'
              : '\u23f9\ufe0f';
        const statusText =
          event.status === 'passed' ? 'passed' : event.status === 'failed' ? 'failed' : 'stopped';
        toast(`${statusEmoji} Tests ${statusText}`, {
          description: `Exit code: ${event.exitCode ?? 'N/A'}`,
          duration: 4000,
        });
      },
      [testRunnersStore]
    )
  );

  // Dialog states
  const [discardChangesDialogOpen, setDiscardChangesDialogOpen] = useState(false);
  const [discardChangesWorktree, setDiscardChangesWorktree] = useState<WorktreeInfo | null>(null);
  const [logPanelOpen, setLogPanelOpen] = useState(false);
  const [logPanelWorktree, setLogPanelWorktree] = useState<WorktreeInfo | null>(null);
  const [pushToRemoteDialogOpen, setPushToRemoteDialogOpen] = useState(false);
  const [pushToRemoteWorktree, setPushToRemoteWorktree] = useState<WorktreeInfo | null>(null);
  const [mergeDialogOpen, setMergeDialogOpen] = useState(false);
  const [mergeWorktree, setMergeWorktree] = useState<WorktreeInfo | null>(null);
  const [testLogsPanelOpen, setTestLogsPanelOpen] = useState(false);
  const [testLogsPanelWorktree, setTestLogsPanelWorktree] = useState<WorktreeInfo | null>(null);

  const openGitPanel = useCallback(() => {
    setBrowserPanelOpen(true);
    setRightPanelMode('git');
  }, [setBrowserPanelOpen, setRightPanelMode]);

  // Fetch branches when dropdown opens
  const handleActionsDropdownOpenChange = useCallback(
    (open: boolean) => {
      if (open && mainWorktree) {
        setCurrentWorktreePath(mainWorktree.path);
      }
    },
    [mainWorktree]
  );

  // Dev server handlers
  const handleStartDevServer = useCallback(
    async (worktree: WorktreeInfo) => {
      if (isStartingDevServer || !projectPath) return;
      setIsStartingDevServer(true);
      try {
        const api = getElectronAPI();
        if (!api?.worktree?.startDevServer) {
          toast.error('Start dev server API not available');
          return;
        }
        const targetPath = worktree.isMain ? projectPath : worktree.path;
        const result = await api.worktree.startDevServer(projectPath, targetPath);
        if (result.success && result.result) {
          setRunningDevServer({
            worktreePath: result.result.worktreePath,
            port: result.result.port,
            url: result.result.url,
          });
          toast.success(`Dev server started on port ${result.result.port}`);
        } else {
          toast.error(result.error || 'Failed to start dev server');
        }
      } catch {
        toast.error('Failed to start dev server');
      } finally {
        setIsStartingDevServer(false);
      }
    },
    [isStartingDevServer, projectPath]
  );

  const handleStopDevServer = useCallback(
    async (worktree: WorktreeInfo) => {
      if (!projectPath) return;
      try {
        const api = getElectronAPI();
        if (!api?.worktree?.stopDevServer) {
          toast.error('Stop dev server API not available');
          return;
        }
        const targetPath = worktree.isMain ? projectPath : worktree.path;
        const result = await api.worktree.stopDevServer(targetPath);
        if (result.success) {
          setRunningDevServer(null);
          toast.success(result.result?.message || 'Dev server stopped');
        } else {
          toast.error(result.error || 'Failed to stop dev server');
        }
      } catch {
        toast.error('Failed to stop dev server');
      }
    },
    [projectPath]
  );

  const handleOpenDevServerUrl = useCallback(
    (worktree: WorktreeInfo) => {
      if (!runningDevServer) {
        toast.error('Dev server not found');
        return;
      }
      try {
        const devServerUrl = new URL(runningDevServer.url);
        if (devServerUrl.protocol !== 'http:' && devServerUrl.protocol !== 'https:') {
          toast.error('Invalid dev server URL');
          return;
        }
        devServerUrl.hostname = window.location.hostname;
        window.open(devServerUrl.toString(), '_blank', 'noopener,noreferrer');
      } catch {
        toast.error('Failed to open dev server');
      }
    },
    [runningDevServer]
  );

  // Fetch dev server state on mount
  const fetchDevServerState = useCallback(async () => {
    if (!projectPath) return;
    try {
      const api = getElectronAPI();
      if (!api?.worktree?.listDevServers) return;
      const result = await api.worktree.listDevServers();
      if (result.success && result.result?.servers) {
        const { normalizePath } = await import('@/lib/utils');
        const normalizedProjectPath = normalizePath(projectPath);
        const server = result.result.servers.find(
          (s: DevServerInfo) => normalizePath(s.worktreePath) === normalizedProjectPath
        );
        if (server) {
          setRunningDevServer(server);
        }
      }
    } catch {
      // silently ignore
    }
  }, [projectPath]);

  // Call once on mount
  useEffect(() => {
    fetchDevServerState();
  }, [fetchDevServerState]);

  // Git handlers
  const handlePull = useCallback(
    (worktree: WorktreeInfo) => {
      if (pullMutation.isPending) return;
      pullMutation.mutate(worktree.path);
    },
    [pullMutation]
  );

  const handlePush = useCallback(
    (worktree: WorktreeInfo) => {
      if (pushMutation.isPending) return;
      pushMutation.mutate({ worktreePath: worktree.path });
    },
    [pushMutation]
  );

  const handlePushNewBranch = useCallback((worktree: WorktreeInfo) => {
    setPushToRemoteWorktree(worktree);
    setPushToRemoteDialogOpen(true);
  }, []);

  const handleConfirmPushToRemote = useCallback(async (worktree: WorktreeInfo, remote: string) => {
    try {
      const api = getElectronAPI();
      if (!api?.worktree?.push) {
        toast.error('Push API not available');
        return;
      }
      const result = await api.worktree.push(worktree.path, false, remote);
      if (result.success && result.result) {
        toast.success(result.result.message);
      } else {
        toast.error(result.error || 'Failed to push changes');
      }
    } catch {
      toast.error('Failed to push changes');
    }
  }, []);

  // Editor/Terminal handlers
  const handleOpenInEditor = useCallback(
    (worktree: WorktreeInfo, editorCommand?: string) => {
      openInEditorMutation.mutate({ worktreePath: worktree.path, editorCommand });
    },
    [openInEditorMutation]
  );

  const handleOpenInIntegratedTerminal = useCallback(
    (worktree: WorktreeInfo, mode?: 'tab' | 'split') => {
      navigate({
        to: '/terminal',
        search: { cwd: worktree.path, branch: worktree.branch, mode, nonce: Date.now() },
      });
    },
    [navigate]
  );

  const handleOpenInExternalTerminal = useCallback(
    async (worktree: WorktreeInfo, terminalId?: string) => {
      try {
        const api = getElectronAPI();
        if (!api?.worktree?.openInExternalTerminal) return;
        const result = await api.worktree.openInExternalTerminal(worktree.path, terminalId);
        if (result.success && result.result) {
          toast.success(result.result.message);
        } else if (result.error) {
          toast.error(result.error);
        }
      } catch {
        toast.error('Failed to open external terminal');
      }
    },
    []
  );

  // View/Changes handlers
  const handleViewChanges = useCallback(
    (_worktree: WorktreeInfo) => {
      openGitPanel();
    },
    [openGitPanel]
  );

  const handleDiscardChanges = useCallback((worktree: WorktreeInfo) => {
    setDiscardChangesWorktree(worktree);
    setDiscardChangesDialogOpen(true);
  }, []);

  const handleConfirmDiscardChanges = useCallback(async () => {
    if (!discardChangesWorktree) return;
    try {
      const api = getHttpApiClient();
      const result = await api.worktree.discardChanges(discardChangesWorktree.path);
      if (result.success) {
        toast.success('Changes discarded');
      } else {
        toast.error('Failed to discard changes', {
          description: result.error || 'Unknown error',
        });
      }
    } catch (error) {
      toast.error('Failed to discard changes', {
        description: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }, [discardChangesWorktree]);

  // Commit handler (opens the Git panel in Agent view)
  const handleCommit = useCallback(
    (_worktree: WorktreeInfo) => {
      openGitPanel();
    },
    [openGitPanel]
  );

  // PR handler (no-op in agent view)
  const handleCreatePR = useCallback((worktree: WorktreeInfo) => {
    toast.info('Use the Kanban Board for PR operations');
  }, []);

  // PR comments handler (no-op in agent view)
  const handleAddressPRComments = useCallback((_worktree: WorktreeInfo, _prInfo: unknown) => {
    toast.info('Use the Kanban Board for PR operations');
  }, []);

  // Resolve conflicts
  const handleResolveConflicts = useCallback(
    (worktree: WorktreeInfo) => {
      if (!projectPath) return;
      toast.info('Pull & Resolve Conflicts triggered');
      pullMutation.mutate(worktree.path);
    },
    [projectPath, pullMutation]
  );

  // Delete worktree (no-op for main worktree)
  const handleDeleteWorktree = useCallback((_worktree: WorktreeInfo) => {
    toast.info('Cannot delete the main worktree');
  }, []);

  // Dev server logs
  const handleViewDevServerLogs = useCallback((worktree: WorktreeInfo) => {
    setLogPanelWorktree(worktree);
    setLogPanelOpen(true);
  }, []);

  // Init script
  const handleRunInitScript = useCallback(
    async (worktree: WorktreeInfo) => {
      if (!projectPath) return;
      try {
        const api = getHttpApiClient();
        const result = await api.worktree.runInitScript(
          projectPath,
          worktree.path,
          worktree.branch
        );
        if (!result.success) {
          toast.error('Failed to run init script', { description: result.error });
        }
      } catch (error) {
        toast.error('Failed to run init script', {
          description: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    },
    [projectPath]
  );

  // Auto mode toggle
  const handleToggleAutoMode = useCallback(
    async (worktree: WorktreeInfo) => {
      if (!currentProject || !projectPath) return;
      const api = getHttpApiClient();
      const branchName = worktree.isMain ? null : worktree.branch;
      const running = isAutoModeRunning();

      try {
        if (running) {
          const result = await api.autoMode.stop(projectPath, branchName);
          if (result.success) {
            toast.success('Auto Mode stopped');
          } else {
            toast.error(result.error || 'Failed to stop Auto Mode');
          }
        } else {
          const result = await api.autoMode.start(projectPath, branchName);
          if (result.success) {
            toast.success('Auto Mode started');
          } else {
            toast.error(result.error || 'Failed to start Auto Mode');
          }
        }
      } catch {
        toast.error('Error toggling Auto Mode');
      }
    },
    [currentProject, projectPath, isAutoModeRunning]
  );

  // Merge
  const handleMerge = useCallback((worktree: WorktreeInfo) => {
    setMergeWorktree(worktree);
    setMergeDialogOpen(true);
  }, []);

  // Test handlers
  const handleStartTests = useCallback(
    async (worktree: WorktreeInfo) => {
      if (!projectPath) return;
      setIsStartingTests(true);
      try {
        const api = getElectronAPI();
        if (!api?.worktree?.startTests) {
          toast.error('Test runner API not available');
          return;
        }
        const result = await api.worktree.startTests(worktree.path, { projectPath });
        if (result.success) {
          toast.success('Tests started');
        } else {
          toast.error('Failed to start tests', { description: result.error || 'Unknown error' });
        }
      } catch (error) {
        toast.error('Failed to start tests', {
          description: error instanceof Error ? error.message : 'Unknown error',
        });
      } finally {
        setIsStartingTests(false);
      }
    },
    [projectPath]
  );

  const handleStopTests = useCallback(
    async (worktree: WorktreeInfo) => {
      try {
        const session = testRunnersStore.getActiveSession(worktree.path);
        if (!session) {
          toast.error('No active test session to stop');
          return;
        }
        const api = getElectronAPI();
        if (!api?.worktree?.stopTests) {
          toast.error('Test runner API not available');
          return;
        }
        const result = await api.worktree.stopTests(session.sessionId);
        if (result.success) {
          toast.success('Tests stopped');
        } else {
          toast.error('Failed to stop tests', { description: result.error || 'Unknown error' });
        }
      } catch (error) {
        toast.error('Failed to stop tests', {
          description: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    },
    [testRunnersStore]
  );

  const handleViewTestLogs = useCallback((worktree: WorktreeInfo) => {
    setTestLogsPanelWorktree(worktree);
    setTestLogsPanelOpen(true);
  }, []);

  // Get test session info for the main worktree
  const getTestSessionInfo = useCallback((): TestSessionInfo | undefined => {
    if (!mainWorktree) return undefined;
    const session = testRunnersStore.getActiveSession(mainWorktree.path);
    if (!session) {
      const allSessions = Object.values(testRunnersStore.sessions).filter(
        (s) => s.worktreePath === mainWorktree.path
      );
      const lastSession = allSessions.sort(
        (a, b) => new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime()
      )[0];
      if (lastSession) {
        return {
          sessionId: lastSession.sessionId,
          worktreePath: lastSession.worktreePath,
          command: lastSession.command,
          status: lastSession.status as TestSessionInfo['status'],
          testFile: lastSession.testFile,
          startedAt: lastSession.startedAt,
          finishedAt: lastSession.finishedAt,
          exitCode: lastSession.exitCode,
          duration: lastSession.duration,
        };
      }
      return undefined;
    }
    return {
      sessionId: session.sessionId,
      worktreePath: session.worktreePath,
      command: session.command,
      status: session.status as TestSessionInfo['status'],
      testFile: session.testFile,
      startedAt: session.startedAt,
      finishedAt: session.finishedAt,
      exitCode: session.exitCode,
      duration: session.duration,
    };
  }, [mainWorktree, testRunnersStore]);

  const isTestRunning = mainWorktree
    ? testRunnersStore.isWorktreeRunning(mainWorktree.path)
    : false;

  return {
    // The main worktree to operate on
    mainWorktree,

    // Branch data
    aheadCount,
    behindCount,
    hasRemoteBranch,
    gitRepoStatus,

    // Dev server
    isStartingDevServer,
    isDevServerRunning: !!runningDevServer,
    devServerInfo: runningDevServer ?? undefined,

    // Git state
    isPulling: pullMutation.isPending,
    isPushing: pushMutation.isPending,

    // Auto mode
    isAutoModeRunning: isAutoModeRunning(),

    // Tests
    hasTestCommand,
    isStartingTests,
    isTestRunning,
    testSessionInfo: getTestSessionInfo(),

    // Init script
    hasInitScript,

    // Dropdown open handler
    handleActionsDropdownOpenChange,

    // Action handlers
    handlePull,
    handlePush,
    handlePushNewBranch,
    handleOpenInEditor,
    handleOpenInIntegratedTerminal,
    handleOpenInExternalTerminal,
    handleViewChanges,
    handleDiscardChanges,
    handleCommit,
    handleCreatePR,
    handleAddressPRComments,
    handleResolveConflicts,
    handleDeleteWorktree,
    handleStartDevServer,
    handleStopDevServer,
    handleOpenDevServerUrl,
    handleViewDevServerLogs,
    handleRunInitScript,
    handleToggleAutoMode,
    handleMerge,
    handleStartTests,
    handleStopTests,
    handleViewTestLogs,
    handleOpenGitPanel: openGitPanel,

    // Dialog states
    discardChangesDialogOpen,
    setDiscardChangesDialogOpen,
    discardChangesWorktree,
    handleConfirmDiscardChanges,
    logPanelOpen,
    setLogPanelOpen,
    logPanelWorktree,
    pushToRemoteDialogOpen,
    setPushToRemoteDialogOpen,
    pushToRemoteWorktree,
    handleConfirmPushToRemote,
    mergeDialogOpen,
    setMergeDialogOpen,
    mergeWorktree,
    testLogsPanelOpen,
    setTestLogsPanelOpen,
    testLogsPanelWorktree,
  };
}
