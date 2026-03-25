import { useCallback, useEffect, useMemo, useRef, useState, type MutableRefObject } from 'react';
import { MessageSquare, FileText, BarChart3, CheckCircle, ListTodo } from 'lucide-react';
import { createLogger } from '@automaker/utils/logger';
import { useQueryClient } from '@tanstack/react-query';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import type { SessionListItem } from '@/types/electron';
import { useKeyboardShortcutsConfig } from '@/hooks/use-keyboard-shortcuts';
import { getElectronAPI } from '@/lib/electron';
import { useSessions } from '@/hooks/queries';
import { queryKeys } from '@/lib/query-keys';
import { DeleteSessionDialog } from '@/components/dialogs/delete-session-dialog';
import { DeleteAllArchivedSessionsDialog } from '@/components/dialogs/delete-all-archived-sessions-dialog';
import { DeleteOldSessionsDialog } from '@/components/dialogs/delete-old-sessions-dialog';
import { DocsPanel } from '@/components/views/agent-view/components/docs-panel';
import { LeftOverviewPanel } from '@/components/session-manager/left-overview-panel';
import { CompletedTasksPanel } from '@/components/session-manager/completed-tasks-panel';
import { TasksPanel } from '@/components/session-manager/tasks-panel';
import { useProjectLookup } from '@/hooks/use-project-lookup';
import { useSessionSearch } from '@/hooks/use-session-search';
import { useSessionFilter } from '@/hooks/use-session-filter';
import { useProjectGrouping } from '@/hooks/use-project-grouping';
import { useAppStore } from '@/store/app-store';
import { useOrchestratorStore } from '@/store/orchestrator-store';
import { cn } from '@/lib/utils';
import type { StreamEvent } from '@/types/electron';
import { SessionManagerHeader } from '@/components/session-manager/session-manager-header';
import { SessionListControls } from '@/components/session-manager/session-list-controls';
import { SessionListItemRow } from '@/components/session-manager/session-list-item';
import { SessionItemErrorBoundary } from '@/components/session-manager/session-item-error-boundary';
import { OrchestratorRunHeader } from '@/components/session-manager/orchestrator-run-header';
import {
  ProjectGroupSection,
  INITIAL_VISIBLE,
  LOAD_MORE_COUNT,
} from '@/components/session-manager/project-group-section';
import { generateRandomSessionName } from '@/components/session-manager/session-name-generator';
import { validateSessionData } from '@/lib/session-utils';
import { SessionListSkeleton } from '@/components/session-manager/session-list-skeleton';
import { SessionListError } from '@/components/session-manager/session-list-error';

const logger = createLogger('SessionManager');

interface SessionManagerProps {
  currentSessionId: string | null;
  onSelectSession: (sessionId: string | null, sessionProjectPath?: string) => void;
  projectPath: string;
  isCurrentSessionThinking?: boolean;
  onQuickCreateRef?: MutableRefObject<
    ((attachOrchestratorRunId?: boolean) => Promise<void>) | null
  >;
}

export function SessionManager({
  currentSessionId,
  onSelectSession,
  projectPath,
  isCurrentSessionThinking = false,
  onQuickCreateRef,
}: SessionManagerProps) {
  const shortcuts = useKeyboardShortcutsConfig();
  const { getProjectName, getBadgeColor, getProject } = useProjectLookup();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<'active' | 'archived'>('active');
  const [editingSessionId, setEditingSessionId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [newSessionName, setNewSessionName] = useState('');
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [sessionToDelete, setSessionToDelete] = useState<SessionListItem | null>(null);
  const [isDeleteAllArchivedDialogOpen, setIsDeleteAllArchivedDialogOpen] = useState(false);
  const [isMultiselectMode, setIsMultiselectMode] = useState(false);
  const [selectedSessionIds, setSelectedSessionIds] = useState<Set<string>>(new Set());
  const [timeFilterHours, setTimeFilterHours] = useState<number | null>(null);
  const [isDeleteOldSessionsDialogOpen, setIsDeleteOldSessionsDialogOpen] = useState(false);

  // Project tree: which projects are expanded + how many sessions are visible per project
  const [expandedProjects, setExpandedProjects] = useState<Record<string, boolean>>({});
  const [projectVisibleCounts, setProjectVisibleCounts] = useState<Record<string, number>>({});

  const {
    data: rawSessions = [],
    refetch: refetchSessions,
    isLoading: isSessionsLoading,
    isError: isSessionsError,
    error: sessionsError,
  } = useSessions(true);

  // Validiere Session-Daten zur Laufzeit – repariert fehlende Felder, filtert kaputte Einträge
  const sessions = useMemo(() => validateSessionData(rawSessions), [rawSessions]);
  const { searchTerm, debouncedSearchTerm, setSearchTerm, clearSearch } = useSessionSearch();

  const {
    filterProjectPath,
    setFilterProjectPath,
    resetFilter,
    filteredSessions: filteredBySearchAndProject,
    sessionCountByProject,
  } = useSessionFilter({ sessions, searchTerm: debouncedSearchTerm });

  const expandedOrchestratorRuns = useAppStore((state) => state.expandedOrchestratorRuns);
  const toggleOrchestratorRunExpanded = useAppStore((state) => state.toggleOrchestratorRunExpanded);

  const leftPanelTab = useAppStore((state) => state.leftPanelTab);
  const setLeftPanelTab = useAppStore((state) => state.setLeftPanelTab);
  const sessionFontSize = useAppStore((state) => state.sessionFontSize);
  const setSessionFontSize = useAppStore((state) => state.setSessionFontSize);
  const maxSessionsPerProject = useAppStore((state) => state.maxSessionsPerProject);

  useEffect(() => {
    resetFilter();
    setTimeFilterHours(null);
  }, [projectPath, resetFilter]);

  const cleanupInProgressRef = useRef(false);

  const invalidateSessions = useCallback(async () => {
    await queryClient.invalidateQueries({ queryKey: queryKeys.sessions.all(true) });
    await refetchSessions();
  }, [queryClient, refetchSessions]);

  useEffect(() => {
    const api = getElectronAPI();
    if (!api?.agent) return;

    const unsubscribe = api.agent.onStream((rawEvent) => {
      const event = rawEvent as StreamEvent;
      if (
        event.type === 'started' ||
        event.type === 'complete' ||
        event.type === 'error' ||
        event.type === 'session_metadata_updated'
      ) {
        void invalidateSessions();
      }
    });

    return unsubscribe;
  }, [invalidateSessions]);

  const resolveOrchestratorRunIdForSessionCreation = (): string | undefined => {
    const orchestratorState = useOrchestratorStore.getState();
    if (!orchestratorState.isEnabled) {
      return undefined;
    }

    const persistedRunId = orchestratorState.orchestratorRunId?.trim();
    if (persistedRunId) {
      // Keep one stable run ID so all orchestrator phases stay under one parent history block.
      return persistedRunId;
    }

    // Fallback for edge cases where no run ID is stored yet.
    return orchestratorState.startNewRun() ?? undefined;
  };

  /**
   * Find an existing empty session (0 messages, not archived) for the current project.
   * This prevents creating duplicate empty sessions when the user clicks "New" repeatedly.
   */
  const findReusableEmptySession = (): SessionListItem | undefined => {
    return sessions.find(
      (s) =>
        s.projectPath === projectPath &&
        s.messageCount === 0 &&
        !s.isArchived &&
        s.status !== 'running'
    );
  };

  const handleCreateSession = async () => {
    // If user didn't type a custom name, try to reuse an existing empty session
    if (!newSessionName.trim()) {
      const existingEmpty = findReusableEmptySession();
      if (existingEmpty) {
        setNewSessionName('');
        setIsCreating(false);
        onSelectSession(existingEmpty.id);
        return;
      }
    }

    const api = getElectronAPI();
    if (!api?.sessions) return;

    // User-initiated creation: never attach orchestrator run ID
    const runIdForSession = undefined;
    const sessionName = newSessionName.trim() || generateRandomSessionName();
    const result = await api.sessions.create(
      sessionName,
      projectPath,
      projectPath,
      runIdForSession
    );

    if (result.success && result.session?.id) {
      setNewSessionName('');
      setIsCreating(false);
      await invalidateSessions();
      onSelectSession(result.session.id);
    }
  };

  const handleQuickCreateSession = async (attachOrchestratorRunId?: boolean) => {
    // Reuse an existing empty session instead of creating a new one
    const existingEmpty = findReusableEmptySession();
    if (existingEmpty) {
      onSelectSession(existingEmpty.id);
      return;
    }

    const api = getElectronAPI();
    if (!api?.sessions) return;

    // Only attach orchestrator run ID when explicitly requested (orchestrator auto-phase)
    const runIdForSession = attachOrchestratorRunId
      ? resolveOrchestratorRunIdForSessionCreation()
      : undefined;
    const sessionName = generateRandomSessionName();
    const result = await api.sessions.create(
      sessionName,
      projectPath,
      projectPath,
      runIdForSession
    );

    if (result.success && result.session?.id) {
      await invalidateSessions();
      onSelectSession(result.session.id);
    }
  };

  useEffect(() => {
    if (onQuickCreateRef) {
      onQuickCreateRef.current = handleQuickCreateSession;
    }

    return () => {
      if (onQuickCreateRef) {
        onQuickCreateRef.current = null;
      }
    };
  }, [onQuickCreateRef, projectPath]);

  const handleRenameSession = async (sessionId: string) => {
    const api = getElectronAPI();
    if (!editingName.trim() || !api?.sessions) return;

    const result = await api.sessions.update(sessionId, editingName, undefined);
    if (result.success) {
      setEditingSessionId(null);
      setEditingName('');
      await invalidateSessions();
    }
  };

  const handleArchiveSession = async (sessionId: string) => {
    const api = getElectronAPI();
    if (!api?.sessions) {
      logger.error('[SessionManager] Sessions API not available');
      return;
    }

    try {
      const result = await api.sessions.archive(sessionId);
      if (result.success) {
        if (currentSessionId === sessionId) {
          onSelectSession(null);
        }
        await invalidateSessions();
      } else {
        logger.error('[SessionManager] Archive failed:', result.error);
      }
    } catch (error) {
      logger.error('[SessionManager] Archive error:', error);
    }
  };

  const handleUnarchiveSession = async (sessionId: string) => {
    const api = getElectronAPI();
    if (!api?.sessions) {
      logger.error('[SessionManager] Sessions API not available');
      return;
    }

    try {
      const result = await api.sessions.unarchive(sessionId);
      if (result.success) {
        await invalidateSessions();
      } else {
        logger.error('[SessionManager] Unarchive failed:', result.error);
      }
    } catch (error) {
      logger.error('[SessionManager] Unarchive error:', error);
    }
  };

  const handleDeleteSession = (session: SessionListItem) => {
    setSessionToDelete(session);
    setIsDeleteDialogOpen(true);
  };

  const confirmDeleteSession = async (sessionId: string) => {
    const api = getElectronAPI();
    if (!api?.sessions) return;

    const result = await api.sessions.delete(sessionId);
    if (result.success) {
      await invalidateSessions();
      if (currentSessionId === sessionId) {
        const activeSessionsList = sessions.filter((session) => !session.isArchived);
        if (activeSessionsList.length > 0) {
          onSelectSession(activeSessionsList[0].id);
        }
      }
    }

    setSessionToDelete(null);
  };

  const activeSessions = sessions.filter((session) => !session.isArchived);
  const archivedSessions = sessions.filter((session) => session.isArchived);
  const runningSessions = useMemo(
    () =>
      new Set(
        sessions.filter((session) => session.status === 'running').map((session) => session.id)
      ),
    [sessions]
  );

  const handleDeleteAllArchivedSessions = async () => {
    const api = getElectronAPI();
    if (!api?.sessions) return;

    for (const session of archivedSessions) {
      await api.sessions.delete(session.id);
    }

    await invalidateSessions();
    setIsDeleteAllArchivedDialogOpen(false);
  };

  useEffect(() => {
    if (maxSessionsPerProject <= 0 || cleanupInProgressRef.current) return;

    const projectActiveSessions = activeSessions
      .filter((session) => session.projectPath === projectPath)
      .sort((a, b) => new Date(a.updatedAt).getTime() - new Date(b.updatedAt).getTime());

    const excess = projectActiveSessions.length - maxSessionsPerProject;
    if (excess <= 0) return;

    const sessionsToDelete = projectActiveSessions
      .filter((session) => session.id !== currentSessionId)
      .slice(0, excess);

    if (sessionsToDelete.length === 0) return;

    cleanupInProgressRef.current = true;
    const api = getElectronAPI();
    const sessionsApi = api?.sessions;

    if (!sessionsApi) {
      cleanupInProgressRef.current = false;
      return;
    }

    (async () => {
      try {
        for (const session of sessionsToDelete) {
          await sessionsApi.delete(session.id);
          logger.info(`Auto-deleted old session: ${session.name} (${session.id})`);
        }
        await invalidateSessions();
      } catch (err) {
        logger.error('Failed to auto-cleanup sessions:', err);
      } finally {
        cleanupInProgressRef.current = false;
      }
    })();
  }, [sessions, maxSessionsPerProject, projectPath, currentSessionId, invalidateSessions]);

  const toggleSessionSelection = (sessionId: string) => {
    setSelectedSessionIds((previous) => {
      const next = new Set(previous);
      if (next.has(sessionId)) {
        next.delete(sessionId);
      } else {
        next.add(sessionId);
      }
      return next;
    });
  };

  const toggleGroupSelection = (sessionIds: string[]) => {
    setSelectedSessionIds((previous) => {
      const next = new Set(previous);
      const allSelected = sessionIds.every((sessionId) => next.has(sessionId));

      if (allSelected) {
        for (const sessionId of sessionIds) {
          next.delete(sessionId);
        }
      } else {
        for (const sessionId of sessionIds) {
          next.add(sessionId);
        }
      }

      return next;
    });
  };

  const filteredByTime = useMemo(() => {
    if (timeFilterHours === null) {
      return filteredBySearchAndProject;
    }

    const cutoffMs = Date.now() - timeFilterHours * 60 * 60 * 1000;
    return filteredBySearchAndProject.filter((session) => {
      const updatedAtMs = new Date(session.updatedAt).getTime();
      return Number.isFinite(updatedAtMs) && updatedAtMs >= cutoffMs;
    });
  }, [filteredBySearchAndProject, timeFilterHours]);

  const filteredActive = filteredByTime.filter((session) => !session.isArchived);
  const filteredArchived = filteredByTime.filter((session) => session.isArchived);
  const displayedSessions = activeTab === 'active' ? filteredActive : filteredArchived;
  const isFiltering = !!debouncedSearchTerm || !!filterProjectPath || timeFilterHours !== null;

  // Group sessions by project for tree view
  const projectGroups = useProjectGrouping({
    sessions: displayedSessions,
    getProjectName,
    expandedRunIds: expandedOrchestratorRuns,
  });

  // Auto-expand the current project on initial load
  useEffect(() => {
    if (projectGroups.length > 0 && Object.keys(expandedProjects).length === 0) {
      // Expand the current project by default
      const currentProjectGroup = projectGroups.find((g) => g.projectPath === projectPath);
      if (currentProjectGroup) {
        setExpandedProjects((prev) => ({ ...prev, [currentProjectGroup.projectPath]: true }));
      }
    }
  }, [projectGroups.length > 0]);

  const toggleProjectExpanded = useCallback((projectPath: string) => {
    setExpandedProjects((prev) => ({ ...prev, [projectPath]: !prev[projectPath] }));
  }, []);

  const showMoreForProject = useCallback((projectPath: string) => {
    setProjectVisibleCounts((prev) => ({
      ...prev,
      [projectPath]: (prev[projectPath] || INITIAL_VISIBLE) + LOAD_MORE_COUNT,
    }));
  }, []);

  const showLessForProject = useCallback((projectPath: string) => {
    setProjectVisibleCounts((prev) => {
      const next = { ...prev };
      delete next[projectPath];
      return next;
    });
  }, []);

  const selectAllInCurrentTab = () => {
    const sessionsToSelect = activeTab === 'active' ? filteredActive : filteredArchived;
    setSelectedSessionIds(new Set(sessionsToSelect.map((session) => session.id)));
  };

  const clearSelection = () => {
    setSelectedSessionIds(new Set());
  };

  const exitMultiselectMode = () => {
    setIsMultiselectMode(false);
    setSelectedSessionIds(new Set());
  };

  const handleBulkDelete = async () => {
    const api = getElectronAPI();
    if (!api?.sessions || selectedSessionIds.size === 0) return;

    for (const sessionId of selectedSessionIds) {
      await api.sessions.delete(sessionId);
      if (currentSessionId === sessionId) {
        onSelectSession(null);
      }
    }

    await invalidateSessions();
    exitMultiselectMode();
  };

  const handleBulkArchive = async () => {
    const api = getElectronAPI();
    if (!api?.sessions || selectedSessionIds.size === 0) return;

    for (const sessionId of selectedSessionIds) {
      await api.sessions.archive(sessionId);
      if (currentSessionId === sessionId) {
        onSelectSession(null);
      }
    }

    await invalidateSessions();
    exitMultiselectMode();
  };

  const handleGroupHeaderAction = (runId: string, sessionIds: string[]) => {
    if (isMultiselectMode) {
      toggleGroupSelection(sessionIds);
      return;
    }

    toggleOrchestratorRunExpanded(runId);
  };

  const handleSelectSession = useCallback(
    (sessionId: string, sessionProjectPath?: string) => {
      // Mark session as clean (read) when user clicks on it
      const session = sessions.find((s) => s.id === sessionId);
      if (session?.isDirty) {
        const api = getElectronAPI();
        if (api?.sessions?.markClean) {
          void api.sessions.markClean(sessionId).then(() => void invalidateSessions());
        }
      }
      onSelectSession(sessionId, sessionProjectPath);
    },
    [sessions, onSelectSession, invalidateSessions]
  );

  const handleDeleteOldSessions = async (olderThanDays: number) => {
    const api = getElectronAPI();
    if (!api?.sessions) return;

    const cutoffMs = Date.now() - olderThanDays * 24 * 60 * 60 * 1000;
    const sessionsToDelete = sessions.filter((session) => {
      const updatedAtMs = new Date(session.updatedAt).getTime();
      return (
        Number.isFinite(updatedAtMs) && updatedAtMs < cutoffMs && session.id !== currentSessionId
      );
    });

    for (const session of sessionsToDelete) {
      await api.sessions.delete(session.id);
    }

    await invalidateSessions();
    setIsDeleteOldSessionsDialogOpen(false);
  };

  const handleQuickCreateFromHeader = () => {
    if (activeTab === 'archived') {
      setActiveTab('active');
    }
    void handleQuickCreateSession();
  };

  /**
   * Creates a new chat session for a specific project (not necessarily the current one).
   * Called from the "+" button next to each project name in the sidebar.
   */
  const handleNewSessionForProject = useCallback(
    async (targetProjectPath: string) => {
      const api = getElectronAPI();
      if (!api?.sessions) return;

      // Try to reuse an existing empty session for that project
      const existingEmpty = sessions.find(
        (s) =>
          s.projectPath === targetProjectPath &&
          s.messageCount === 0 &&
          !s.isArchived &&
          s.status !== 'running'
      );

      if (existingEmpty) {
        // Switch to the tab and select the empty session
        if (activeTab === 'archived') setActiveTab('active');
        onSelectSession(existingEmpty.id, targetProjectPath);
        return;
      }

      const sessionName = generateRandomSessionName();
      const result = await api.sessions.create(
        sessionName,
        targetProjectPath,
        targetProjectPath,
        undefined
      );

      if (result.success && result.session?.id) {
        await invalidateSessions();
        if (activeTab === 'archived') setActiveTab('active');
        onSelectSession(result.session.id, targetProjectPath);
      }
    },
    [sessions, activeTab, onSelectSession, invalidateSessions]
  );

  return (
    <Card className="flex h-full flex-col gap-0 rounded-none py-2">
      <div className="px-2 pt-2">
        <Tabs
          value={leftPanelTab}
          onValueChange={(value) => setLeftPanelTab(value as typeof leftPanelTab)}
          className="w-full gap-0.5"
        >
          <TabsList className="h-6 w-full rounded-md p-0.5">
            <TabsTrigger
              value="sessions"
              className="h-4.5 flex-1 gap-0.5 px-1 text-[10px] font-medium"
            >
              <MessageSquare className="h-2.5 w-2.5" />
              Sessions
            </TabsTrigger>
            <TabsTrigger
              value="completed"
              className="h-4.5 flex-1 gap-0.5 px-1 text-[10px] font-medium"
            >
              <CheckCircle className="h-2.5 w-2.5" />
              Fertig
            </TabsTrigger>
            <TabsTrigger value="docs" className="h-4.5 flex-1 gap-0.5 px-1 text-[10px] font-medium">
              <FileText className="h-2.5 w-2.5" />
              Docs
            </TabsTrigger>
            <TabsTrigger
              value="overview"
              className="h-4.5 flex-1 gap-0.5 px-1 text-[10px] font-medium"
            >
              <BarChart3 className="h-2.5 w-2.5" />
              Übersicht
            </TabsTrigger>
            <TabsTrigger
              value="tasks"
              className="h-4.5 flex-1 gap-0.5 px-1 text-[10px] font-medium"
            >
              <ListTodo className="h-2.5 w-2.5" />
              Tasks
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {leftPanelTab === 'docs' ? (
        <div className="flex-1 overflow-hidden">
          <DocsPanel projectPath={projectPath} />
        </div>
      ) : leftPanelTab === 'overview' ? (
        <div className="flex-1 overflow-hidden">
          <LeftOverviewPanel />
        </div>
      ) : leftPanelTab === 'tasks' ? (
        <div className="flex-1 overflow-hidden">
          <TasksPanel projectPath={projectPath} />
        </div>
      ) : leftPanelTab === 'completed' ? (
        <div className="flex-1 overflow-hidden">
          <CompletedTasksPanel projectPath={projectPath} />
        </div>
      ) : (
        <>
          <SessionManagerHeader
            activeTab={activeTab}
            onActiveTabChange={setActiveTab}
            isMultiselectMode={isMultiselectMode}
            onToggleMultiselectMode={() => {
              if (isMultiselectMode) {
                exitMultiselectMode();
              } else {
                setIsMultiselectMode(true);
              }
            }}
            onQuickCreateSession={handleQuickCreateFromHeader}
            newSessionHotkey={shortcuts.newSession}
            isFiltering={isFiltering}
            activeCount={activeSessions.length}
            filteredActiveCount={filteredActive.length}
            archivedCount={archivedSessions.length}
            filteredArchivedCount={filteredArchived.length}
            searchTerm={searchTerm}
            onSearchTermChange={setSearchTerm}
            onClearSearch={clearSearch}
            filterProjectPath={filterProjectPath}
            onFilterProjectPathChange={setFilterProjectPath}
            filterTimeWindowHours={timeFilterHours}
            onFilterTimeWindowHoursChange={setTimeFilterHours}
            sessionCountByProject={sessionCountByProject}
            sessionFontSize={sessionFontSize}
            onSessionFontSizeChange={setSessionFontSize}
            onDeleteOldSessions={() => setIsDeleteOldSessionsDialogOpen(true)}
          />

          <CardContent
            className="flex-1 space-y-1.5 overflow-y-auto px-3 pb-2 pr-1 scroll-smooth"
            data-testid="session-list"
          >
            <SessionListControls
              activeTab={activeTab}
              archivedSessionCount={archivedSessions.length}
              isMultiselectMode={isMultiselectMode}
              selectedSessionCount={selectedSessionIds.size}
              isCreating={isCreating}
              newSessionName={newSessionName}
              onNewSessionNameChange={setNewSessionName}
              onCreateSession={() => void handleCreateSession()}
              onCancelCreate={() => {
                setIsCreating(false);
                setNewSessionName('');
              }}
              onSelectAllInCurrentTab={selectAllInCurrentTab}
              onClearSelection={clearSelection}
              onBulkArchive={() => void handleBulkArchive()}
              onBulkDelete={() => void handleBulkDelete()}
              onDeleteAllArchived={() => setIsDeleteAllArchivedDialogOpen(true)}
            />

            {isSessionsLoading && rawSessions.length === 0 && <SessionListSkeleton count={5} />}

            {isSessionsError && rawSessions.length === 0 && (
              <SessionListError error={sessionsError} onRetry={() => void refetchSessions()} />
            )}

            {projectGroups.map((group) => (
              <ProjectGroupSection
                key={group.projectPath}
                group={group}
                expandedRunIds={expandedOrchestratorRuns}
                isExpanded={!!expandedProjects[group.projectPath]}
                onToggleExpanded={() => toggleProjectExpanded(group.projectPath)}
                visibleCount={projectVisibleCounts[group.projectPath] || INITIAL_VISIBLE}
                onShowMore={() => showMoreForProject(group.projectPath)}
                onShowLess={() => showLessForProject(group.projectPath)}
                onNewSession={(path) => void handleNewSessionForProject(path)}
                renderDisplayEntry={(displayEntry) => {
                  if (displayEntry.type === 'single') {
                    const session = displayEntry.session;
                    return (
                      <SessionItemErrorBoundary
                        key={`boundary-${session.id}`}
                        sessionId={session.id}
                        sessionName={session.name}
                      >
                        <SessionListItemRow
                          session={session}
                          currentSessionId={currentSessionId}
                          isCurrentSessionThinking={isCurrentSessionThinking}
                          runningSessions={runningSessions}
                          sessionFontSize={sessionFontSize}
                          isMultiselectMode={isMultiselectMode}
                          isSelected={selectedSessionIds.has(session.id)}
                          editingSessionId={editingSessionId}
                          editingName={editingName}
                          onEditingNameChange={setEditingName}
                          onStartEditing={(sessionId, currentName) => {
                            setEditingSessionId(sessionId);
                            setEditingName(currentName);
                          }}
                          onStopEditing={() => {
                            setEditingSessionId(null);
                            setEditingName('');
                          }}
                          onRenameSession={(sessionId) => void handleRenameSession(sessionId)}
                          onArchiveSession={(sessionId) => void handleArchiveSession(sessionId)}
                          onUnarchiveSession={(sessionId) => void handleUnarchiveSession(sessionId)}
                          onDeleteSession={handleDeleteSession}
                          onSelectSession={handleSelectSession}
                          onToggleSelection={toggleSessionSelection}
                          getProjectName={getProjectName}
                          getBadgeColor={getBadgeColor}
                          getProject={getProject}
                        />
                      </SessionItemErrorBoundary>
                    );
                  }

                  const sessionIds = displayEntry.group.sessions.map((session) => session.id);
                  const selectedCount = sessionIds.reduce(
                    (count, sessionId) => count + (selectedSessionIds.has(sessionId) ? 1 : 0),
                    0
                  );
                  const allSessionsSelected =
                    sessionIds.length > 0 && selectedCount === sessionIds.length;

                  return (
                    <div
                      key={`orchestrator-${displayEntry.group.runId}`}
                      className="space-y-1 animate-in fade-in slide-in-from-bottom-1 duration-200"
                    >
                      <OrchestratorRunHeader
                        group={displayEntry.group}
                        isExpanded={displayEntry.group.isExpanded}
                        onToggle={() =>
                          handleGroupHeaderAction(displayEntry.group.runId, sessionIds)
                        }
                        runningSessions={runningSessions}
                        currentSessionId={currentSessionId}
                        isCurrentSessionThinking={isCurrentSessionThinking}
                        sessionFontSize={sessionFontSize}
                        isMultiselectMode={isMultiselectMode}
                        selectedSessionCount={selectedCount}
                        allSessionsSelected={allSessionsSelected}
                      />

                      <div
                        className={cn(
                          'ml-2 grid transition-[grid-template-rows,opacity,margin] duration-300 ease-out',
                          displayEntry.group.isExpanded
                            ? 'mt-1 grid-rows-[1fr] opacity-100'
                            : 'mt-0 grid-rows-[0fr] opacity-0 pointer-events-none'
                        )}
                      >
                        <div className="min-h-0 overflow-hidden">
                          <div className="space-y-1 border-l border-dashed border-muted-foreground/30 pl-2">
                            {displayEntry.group.sessions.map((session, index) => (
                              <SessionItemErrorBoundary
                                key={`boundary-${session.id}`}
                                sessionId={session.id}
                                sessionName={session.name}
                              >
                                <SessionListItemRow
                                  session={session}
                                  currentSessionId={currentSessionId}
                                  isCurrentSessionThinking={isCurrentSessionThinking}
                                  runningSessions={runningSessions}
                                  sessionFontSize={Math.max(10, sessionFontSize - 1)}
                                  isMultiselectMode={isMultiselectMode}
                                  isSelected={selectedSessionIds.has(session.id)}
                                  editingSessionId={editingSessionId}
                                  editingName={editingName}
                                  onEditingNameChange={setEditingName}
                                  onStartEditing={(sessionId, currentName) => {
                                    setEditingSessionId(sessionId);
                                    setEditingName(currentName);
                                  }}
                                  onStopEditing={() => {
                                    setEditingSessionId(null);
                                    setEditingName('');
                                  }}
                                  onRenameSession={(sessionId) =>
                                    void handleRenameSession(sessionId)
                                  }
                                  onArchiveSession={(sessionId) =>
                                    void handleArchiveSession(sessionId)
                                  }
                                  onUnarchiveSession={(sessionId) =>
                                    void handleUnarchiveSession(sessionId)
                                  }
                                  onDeleteSession={handleDeleteSession}
                                  onSelectSession={handleSelectSession}
                                  onToggleSelection={toggleSessionSelection}
                                  getProjectName={getProjectName}
                                  getBadgeColor={getBadgeColor}
                                  getProject={getProject}
                                  phaseIndex={index + 1}
                                />
                              </SessionItemErrorBoundary>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                }}
              />
            ))}

            {projectGroups.length === 0 && (
              <div className="py-8 text-center text-muted-foreground">
                <MessageSquare className="mx-auto mb-2 h-8 w-8 opacity-50" />
                {isFiltering ? (
                  <>
                    <p className="text-xs">Keine passenden Sessions</p>
                    <p className="text-[10px]">Filter anpassen</p>
                  </>
                ) : (
                  <>
                    <p className="text-xs">
                      {activeTab === 'active'
                        ? 'Keine aktiven Sessions'
                        : 'Keine archivierten Sessions'}
                    </p>
                    <p className="text-[10px]">
                      {activeTab === 'active'
                        ? 'Erstelle eine neue Session'
                        : 'Archiviere Sessions um sie hier zu sehen'}
                    </p>
                  </>
                )}
              </div>
            )}
          </CardContent>

          <DeleteSessionDialog
            open={isDeleteDialogOpen}
            onOpenChange={setIsDeleteDialogOpen}
            session={sessionToDelete}
            onConfirm={confirmDeleteSession}
          />

          <DeleteAllArchivedSessionsDialog
            open={isDeleteAllArchivedDialogOpen}
            onOpenChange={setIsDeleteAllArchivedDialogOpen}
            archivedCount={archivedSessions.length}
            onConfirm={handleDeleteAllArchivedSessions}
          />

          <DeleteOldSessionsDialog
            open={isDeleteOldSessionsDialogOpen}
            onOpenChange={setIsDeleteOldSessionsDialogOpen}
            totalSessionCount={sessions.length}
            onConfirm={handleDeleteOldSessions}
          />
        </>
      )}
    </Card>
  );
}
