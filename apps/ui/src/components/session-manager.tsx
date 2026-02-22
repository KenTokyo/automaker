import { useCallback, useEffect, useRef, useState, type MutableRefObject } from 'react';
import { MessageSquare, FileText } from 'lucide-react';
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
import { DocsPanel } from '@/components/views/agent-view/components/docs-panel';
import { useProjectLookup } from '@/hooks/use-project-lookup';
import { useSessionSearch } from '@/hooks/use-session-search';
import { useSessionFilter } from '@/hooks/use-session-filter';
import { useSessionGrouping } from '@/hooks/use-session-grouping';
import { useAppStore } from '@/store/app-store';
import { useOrchestratorStore } from '@/store/orchestrator-store';
import { cn } from '@/lib/utils';
import { SessionManagerHeader } from '@/components/session-manager/session-manager-header';
import { SessionListControls } from '@/components/session-manager/session-list-controls';
import { SessionListItemRow } from '@/components/session-manager/session-list-item';
import { OrchestratorRunHeader } from '@/components/session-manager/orchestrator-run-header';

const logger = createLogger('SessionManager');
const adjectives = [
  'Swift',
  'Bright',
  'Clever',
  'Dynamic',
  'Eager',
  'Focused',
  'Gentle',
  'Happy',
  'Inventive',
  'Jolly',
  'Keen',
  'Lively',
  'Mighty',
  'Noble',
  'Optimal',
  'Peaceful',
  'Quick',
  'Radiant',
  'Smart',
  'Tranquil',
  'Unique',
  'Vibrant',
  'Wise',
  'Zealous',
];

const nouns = [
  'Agent',
  'Builder',
  'Coder',
  'Developer',
  'Explorer',
  'Forge',
  'Garden',
  'Helper',
  'Innovator',
  'Journey',
  'Kernel',
  'Lighthouse',
  'Mission',
  'Navigator',
  'Oracle',
  'Project',
  'Quest',
  'Runner',
  'Spark',
  'Task',
  'Unicorn',
  'Voyage',
  'Workshop',
];

function generateRandomSessionName(): string {
  const adjective = adjectives[Math.floor(Math.random() * adjectives.length)];
  const noun = nouns[Math.floor(Math.random() * nouns.length)];
  const number = Math.floor(Math.random() * 100);
  return `${adjective} ${noun} ${number}`;
}

interface SessionManagerProps {
  currentSessionId: string | null;
  onSelectSession: (sessionId: string | null, sessionProjectPath?: string) => void;
  projectPath: string;
  isCurrentSessionThinking?: boolean;
  onQuickCreateRef?: MutableRefObject<(() => Promise<void>) | null>;
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
  const [runningSessions, setRunningSessions] = useState<Set<string>>(new Set());
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [sessionToDelete, setSessionToDelete] = useState<SessionListItem | null>(null);
  const [isDeleteAllArchivedDialogOpen, setIsDeleteAllArchivedDialogOpen] = useState(false);
  const orchestratorEnabled = useOrchestratorStore((state) => state.isEnabled);
  const orchestratorRunId = useOrchestratorStore((state) => state.orchestratorRunId);
  const activeOrchestratorRunId =
    orchestratorEnabled && orchestratorRunId ? orchestratorRunId : undefined;
  const [isMultiselectMode, setIsMultiselectMode] = useState(false);
  const [selectedSessionIds, setSelectedSessionIds] = useState<Set<string>>(new Set());

  const { data: sessions = [], refetch: refetchSessions } = useSessions(true);
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

  const docsOpen = useAppStore((state) => state.docsOpen);
  const setDocsOpen = useAppStore((state) => state.setDocsOpen);
  const sessionFontSize = useAppStore((state) => state.sessionFontSize);
  const setSessionFontSize = useAppStore((state) => state.setSessionFontSize);
  const maxSessionsPerProject = useAppStore((state) => state.maxSessionsPerProject);

  useEffect(() => {
    resetFilter();
  }, [projectPath, resetFilter]);

  const hasCheckedInitialRef = useRef(false);
  const cleanupInProgressRef = useRef(false);

  const checkRunningSessions = useCallback(async (sessionList: SessionListItem[]) => {
    const api = getElectronAPI();
    if (!api?.agent) return;

    const runningIds = new Set<string>();
    for (const session of sessionList) {
      try {
        const result = await api.agent.getHistory(session.id);
        if (result.success && result.isRunning) {
          runningIds.add(session.id);
        }
      } catch (err) {
        logger.warn(`Failed to check running state for ${session.id}:`, err);
      }
    }

    setRunningSessions(runningIds);
  }, []);

  const invalidateSessions = useCallback(async () => {
    await queryClient.invalidateQueries({ queryKey: queryKeys.sessions.all(true) });
    const result = await refetchSessions();
    if (result.data) {
      await checkRunningSessions(result.data);
    }
  }, [queryClient, refetchSessions, checkRunningSessions]);

  useEffect(() => {
    if (sessions.length > 0 && !hasCheckedInitialRef.current) {
      hasCheckedInitialRef.current = true;
      checkRunningSessions(sessions);
    }
  }, [sessions, checkRunningSessions]);

  useEffect(() => {
    if (runningSessions.size === 0 && !isCurrentSessionThinking) return;

    const interval = setInterval(async () => {
      if (sessions.length > 0) {
        await checkRunningSessions(sessions);
      }
    }, 3000);

    return () => clearInterval(interval);
  }, [sessions, runningSessions.size, isCurrentSessionThinking, checkRunningSessions]);

  const handleCreateSession = async () => {
    const api = getElectronAPI();
    if (!api?.sessions) return;

    const sessionName = newSessionName.trim() || generateRandomSessionName();
    const result = await api.sessions.create(
      sessionName,
      projectPath,
      projectPath,
      activeOrchestratorRunId
    );

    if (result.success && result.session?.id) {
      setNewSessionName('');
      setIsCreating(false);
      await invalidateSessions();
      onSelectSession(result.session.id);
    }
  };

  const handleQuickCreateSession = async () => {
    const api = getElectronAPI();
    if (!api?.sessions) return;

    const sessionName = generateRandomSessionName();
    const result = await api.sessions.create(
      sessionName,
      projectPath,
      projectPath,
      activeOrchestratorRunId
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
  }, [onQuickCreateRef, projectPath, activeOrchestratorRunId]);

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

  const filteredActive = filteredBySearchAndProject.filter((session) => !session.isArchived);
  const filteredArchived = filteredBySearchAndProject.filter((session) => session.isArchived);
  const displayedSessions = activeTab === 'active' ? filteredActive : filteredArchived;
  const isFiltering = !!debouncedSearchTerm || !!filterProjectPath;

  const displayEntries = useSessionGrouping({
    sessions: displayedSessions,
    expandedRunIds: expandedOrchestratorRuns,
  });

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

  const handleQuickCreateFromHeader = () => {
    if (activeTab === 'archived') {
      setActiveTab('active');
    }
    void handleQuickCreateSession();
  };

  return (
    <Card className="flex h-full flex-col rounded-none">
      <div className="px-3 pt-3">
        <Tabs
          value={docsOpen ? 'docs' : 'sessions'}
          onValueChange={(value) => setDocsOpen(value === 'docs')}
          className="w-full"
        >
          <TabsList className="w-full">
            <TabsTrigger value="sessions" className="flex-1">
              <MessageSquare className="mr-1.5 h-4 w-4" />
              Sessions
            </TabsTrigger>
            <TabsTrigger value="docs" className="flex-1">
              <FileText className="mr-1.5 h-4 w-4" />
              Docs
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {docsOpen ? (
        <div className="flex-1 overflow-hidden">
          <DocsPanel projectPath={projectPath} />
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
            sessionCountByProject={sessionCountByProject}
            sessionFontSize={sessionFontSize}
            onSessionFontSizeChange={setSessionFontSize}
          />

          <CardContent className="flex-1 space-y-2 overflow-y-auto" data-testid="session-list">
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

            {displayEntries.map((displayEntry) => {
              if (displayEntry.type === 'single') {
                const session = displayEntry.session;
                return (
                  <SessionListItemRow
                    key={session.id}
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
                    onSelectSession={onSelectSession}
                    onToggleSelection={toggleSessionSelection}
                    getProjectName={getProjectName}
                    getBadgeColor={getBadgeColor}
                    getProject={getProject}
                  />
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
                <div key={`orchestrator-${displayEntry.group.runId}`} className="space-y-2">
                  <OrchestratorRunHeader
                    group={displayEntry.group}
                    isExpanded={displayEntry.group.isExpanded}
                    onToggle={() => handleGroupHeaderAction(displayEntry.group.runId, sessionIds)}
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
                      'space-y-2 border-l border-dashed border-muted-foreground/30 pl-3',
                      'ml-4',
                      !displayEntry.group.isExpanded && 'hidden'
                    )}
                  >
                    {displayEntry.group.sessions.map((session, index) => (
                      <SessionListItemRow
                        key={session.id}
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
                        onRenameSession={(sessionId) => void handleRenameSession(sessionId)}
                        onArchiveSession={(sessionId) => void handleArchiveSession(sessionId)}
                        onUnarchiveSession={(sessionId) => void handleUnarchiveSession(sessionId)}
                        onDeleteSession={handleDeleteSession}
                        onSelectSession={onSelectSession}
                        onToggleSelection={toggleSessionSelection}
                        getProjectName={getProjectName}
                        getBadgeColor={getBadgeColor}
                        getProject={getProject}
                        phaseIndex={index + 1}
                      />
                    ))}
                  </div>
                </div>
              );
            })}

            {displayEntries.length === 0 && (
              <div className="py-8 text-center text-muted-foreground">
                <MessageSquare className="mx-auto mb-2 h-12 w-12 opacity-50" />
                {isFiltering ? (
                  <>
                    <p className="text-sm">No matching sessions</p>
                    <p className="text-xs">Try adjusting your search or filter</p>
                  </>
                ) : (
                  <>
                    <p className="text-sm">
                      {activeTab === 'active' ? 'No active sessions' : 'No archived sessions'}
                    </p>
                    <p className="text-xs">
                      {activeTab === 'active'
                        ? 'Create your first session to get started'
                        : 'Archive sessions to see them here'}
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
        </>
      )}
    </Card>
  );
}
