import { useState, useEffect, useCallback, useRef } from 'react';
import { createLogger } from '@automaker/utils/logger';
import { useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

const logger = createLogger('SessionManager');
import { Button } from '@/components/ui/button';
import { HotkeyButton } from '@/components/ui/hotkey-button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Plus,
  MessageSquare,
  Archive,
  Trash2,
  Edit2,
  Check,
  X,
  ArchiveRestore,
  CheckSquare,
  Square,
  FileText,
  AArrowDown,
  AArrowUp,
} from 'lucide-react';
import { Slider } from '@/components/ui/slider';
import { Checkbox } from '@/components/ui/checkbox';
import { Spinner } from '@/components/ui/spinner';
import { cn } from '@/lib/utils';
import type { SessionListItem } from '@/types/electron';
import { useKeyboardShortcutsConfig } from '@/hooks/use-keyboard-shortcuts';
import { getElectronAPI } from '@/lib/electron';
import { useSessions } from '@/hooks/queries';
import { queryKeys } from '@/lib/query-keys';
import { DeleteSessionDialog } from '@/components/dialogs/delete-session-dialog';
import { DeleteAllArchivedSessionsDialog } from '@/components/dialogs/delete-all-archived-sessions-dialog';
import { ProjectBadge } from '@/components/project-badge';
import { useProjectLookup } from '@/hooks/use-project-lookup';
import { useSessionSearch } from '@/hooks/use-session-search';
import { useSessionFilter } from '@/hooks/use-session-filter';
import { SessionSearchInput } from '@/components/session-manager/session-search-input';
import { ProjectFilterDropdown } from '@/components/session-manager/project-filter-dropdown';
import { DocsPanel } from '@/components/views/agent-view/components/docs-panel';
import { useAppStore } from '@/store/app-store';

// Random session name generator
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
  onQuickCreateRef?: React.MutableRefObject<(() => Promise<void>) | null>;
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

  // Multiselect state
  const [isMultiselectMode, setIsMultiselectMode] = useState(false);
  const [selectedSessionIds, setSelectedSessionIds] = useState<Set<string>>(new Set());

  // Use React Query for sessions list - always include archived, filter client-side
  const { data: sessions = [], refetch: refetchSessions } = useSessions(true);

  // Search and filter hooks
  const { searchTerm, debouncedSearchTerm, setSearchTerm, clearSearch } = useSessionSearch();
  const {
    filterProjectPath,
    setFilterProjectPath,
    resetFilter,
    filteredSessions: filteredBySearchAndProject,
    sessionCountByProject,
  } = useSessionFilter({ sessions, searchTerm: debouncedSearchTerm });

  // Reset project filter when the active project changes
  useEffect(() => {
    resetFilter();
  }, [projectPath, resetFilter]);

  // Ref to track if we've done the initial running sessions check
  const hasCheckedInitialRef = useRef(false);

  // Check running state for all sessions
  const checkRunningSessions = useCallback(async (sessionList: SessionListItem[]) => {
    const api = getElectronAPI();
    if (!api?.agent) return;

    const runningIds = new Set<string>();

    // Check each session's running state
    for (const session of sessionList) {
      try {
        const result = await api.agent.getHistory(session.id);
        if (result.success && result.isRunning) {
          runningIds.add(session.id);
        }
      } catch (err) {
        // Ignore errors for individual session checks
        logger.warn(`Failed to check running state for ${session.id}:`, err);
      }
    }

    setRunningSessions(runningIds);
  }, []);

  // Helper to invalidate sessions cache and refetch
  const invalidateSessions = useCallback(async () => {
    await queryClient.invalidateQueries({ queryKey: queryKeys.sessions.all(true) });
    // Also check running state after invalidation
    const result = await refetchSessions();
    if (result.data) {
      await checkRunningSessions(result.data);
    }
  }, [queryClient, refetchSessions, checkRunningSessions]);

  // Check running state on initial load (runs only once when sessions first load)
  useEffect(() => {
    if (sessions.length > 0 && !hasCheckedInitialRef.current) {
      hasCheckedInitialRef.current = true;
      checkRunningSessions(sessions);
    }
  }, [sessions, checkRunningSessions]);

  // Periodically check running state for sessions (useful for detecting when agents finish)
  useEffect(() => {
    // Only poll if there are running sessions
    if (runningSessions.size === 0 && !isCurrentSessionThinking) return;

    const interval = setInterval(async () => {
      if (sessions.length > 0) {
        await checkRunningSessions(sessions);
      }
    }, 3000); // Check every 3 seconds

    return () => clearInterval(interval);
  }, [sessions, runningSessions.size, isCurrentSessionThinking, checkRunningSessions]);

  // Create new session with random name
  const handleCreateSession = async () => {
    const api = getElectronAPI();
    if (!api?.sessions) return;

    const sessionName = newSessionName.trim() || generateRandomSessionName();

    const result = await api.sessions.create(sessionName, projectPath, projectPath);

    if (result.success && result.session?.id) {
      setNewSessionName('');
      setIsCreating(false);
      await invalidateSessions();
      onSelectSession(result.session.id);
    }
  };

  // Create new session directly with a random name (one-click)
  const handleQuickCreateSession = async () => {
    const api = getElectronAPI();
    if (!api?.sessions) return;

    const sessionName = generateRandomSessionName();

    const result = await api.sessions.create(sessionName, projectPath, projectPath);

    if (result.success && result.session?.id) {
      await invalidateSessions();
      onSelectSession(result.session.id);
    }
  };

  // Expose the quick create function via ref for keyboard shortcuts
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

  // Rename session
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

  // Archive session
  const handleArchiveSession = async (sessionId: string) => {
    const api = getElectronAPI();
    if (!api?.sessions) {
      logger.error('[SessionManager] Sessions API not available');
      return;
    }

    try {
      const result = await api.sessions.archive(sessionId);
      if (result.success) {
        // If the archived session was currently selected, deselect it
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

  // Unarchive session
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

  // Open delete session dialog
  const handleDeleteSession = (session: SessionListItem) => {
    setSessionToDelete(session);
    setIsDeleteDialogOpen(true);
  };

  // Confirm delete session
  const confirmDeleteSession = async (sessionId: string) => {
    const api = getElectronAPI();
    if (!api?.sessions) return;

    const result = await api.sessions.delete(sessionId);
    if (result.success) {
      await invalidateSessions();
      if (currentSessionId === sessionId) {
        // Switch to another session or create a new one
        const activeSessionsList = sessions.filter((s) => !s.isArchived);
        if (activeSessionsList.length > 0) {
          onSelectSession(activeSessionsList[0].id);
        }
      }
    }
    setSessionToDelete(null);
  };

  // Delete all archived sessions
  const handleDeleteAllArchivedSessions = async () => {
    const api = getElectronAPI();
    if (!api?.sessions) return;

    // Delete each archived session
    for (const session of archivedSessions) {
      await api.sessions.delete(session.id);
    }

    await invalidateSessions();
    setIsDeleteAllArchivedDialogOpen(false);
  };

  const activeSessions = sessions.filter((s) => !s.isArchived);
  const archivedSessions = sessions.filter((s) => s.isArchived);

  // Session limit auto-cleanup
  const maxSessionsPerProject = useAppStore((s) => s.maxSessionsPerProject);
  const cleanupInProgressRef = useRef(false);

  useEffect(() => {
    if (maxSessionsPerProject <= 0 || cleanupInProgressRef.current) return;

    // Get active sessions for the current project
    const projectActiveSessions = activeSessions
      .filter((s) => s.projectPath === projectPath)
      .sort((a, b) => new Date(a.updatedAt).getTime() - new Date(b.updatedAt).getTime());

    const excess = projectActiveSessions.length - maxSessionsPerProject;
    if (excess <= 0) return;

    // Delete the oldest sessions, but never delete the currently selected one
    const sessionsToDelete = projectActiveSessions
      .filter((s) => s.id !== currentSessionId)
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

  // Multiselect functions
  const toggleSessionSelection = (sessionId: string) => {
    setSelectedSessionIds((prev) => {
      const next = new Set(prev);
      if (next.has(sessionId)) {
        next.delete(sessionId);
      } else {
        next.add(sessionId);
      }
      return next;
    });
  };

  const selectAllInCurrentTab = () => {
    const sessionsToSelect = activeTab === 'active' ? filteredActive : filteredArchived;
    setSelectedSessionIds(new Set(sessionsToSelect.map((s) => s.id)));
  };

  const clearSelection = () => {
    setSelectedSessionIds(new Set());
  };

  const exitMultiselectMode = () => {
    setIsMultiselectMode(false);
    setSelectedSessionIds(new Set());
  };

  // Bulk delete selected sessions
  const handleBulkDelete = async () => {
    const api = getElectronAPI();
    if (!api?.sessions || selectedSessionIds.size === 0) return;

    for (const sessionId of selectedSessionIds) {
      await api.sessions.delete(sessionId);
      // If the deleted session was currently selected, deselect it
      if (currentSessionId === sessionId) {
        onSelectSession(null);
      }
    }

    await invalidateSessions();
    exitMultiselectMode();
  };

  // Bulk archive selected sessions
  const handleBulkArchive = async () => {
    const api = getElectronAPI();
    if (!api?.sessions || selectedSessionIds.size === 0) return;

    for (const sessionId of selectedSessionIds) {
      await api.sessions.archive(sessionId);
      // If the archived session was currently selected, deselect it
      if (currentSessionId === sessionId) {
        onSelectSession(null);
      }
    }

    await invalidateSessions();
    exitMultiselectMode();
  };

  // Apply search + project filter on the tab-specific list
  const filteredActive = filteredBySearchAndProject.filter((s) => !s.isArchived);
  const filteredArchived = filteredBySearchAndProject.filter((s) => s.isArchived);
  const displayedSessions = activeTab === 'active' ? filteredActive : filteredArchived;
  const isFiltering = !!debouncedSearchTerm || !!filterProjectPath;

  const docsOpen = useAppStore((s) => s.docsOpen);
  const setDocsOpen = useAppStore((s) => s.setDocsOpen);
  const sessionFontSize = useAppStore((s) => s.sessionFontSize);
  const setSessionFontSize = useAppStore((s) => s.setSessionFontSize);

  return (
    <Card className="h-full flex flex-col rounded-none">
      {/* Top-level sidebar tabs: Sessions | Docs */}
      <div className="px-3 pt-3">
        <Tabs
          value={docsOpen ? 'docs' : 'sessions'}
          onValueChange={(value) => setDocsOpen(value === 'docs')}
          className="w-full"
        >
          <TabsList className="w-full">
            <TabsTrigger value="sessions" className="flex-1">
              <MessageSquare className="w-4 h-4 mr-1.5" />
              Sessions
            </TabsTrigger>
            <TabsTrigger value="docs" className="flex-1">
              <FileText className="w-4 h-4 mr-1.5" />
              Docs
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {/* Docs Panel (full height when active) */}
      {docsOpen ? (
        <div className="flex-1 overflow-hidden">
          <DocsPanel projectPath={projectPath} />
        </div>
      ) : (
        <>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between mb-4">
              <CardTitle>Agent Sessions</CardTitle>
              <div className="flex items-center gap-2">
                <Button
                  variant={isMultiselectMode ? 'secondary' : 'ghost'}
                  size="sm"
                  onClick={() => {
                    if (isMultiselectMode) {
                      exitMultiselectMode();
                    } else {
                      setIsMultiselectMode(true);
                    }
                  }}
                  title={isMultiselectMode ? 'Exit select mode' : 'Select multiple sessions'}
                  data-testid="multiselect-toggle"
                >
                  {isMultiselectMode ? (
                    <CheckSquare className="w-4 h-4" />
                  ) : (
                    <Square className="w-4 h-4" />
                  )}
                </Button>
                <HotkeyButton
                  variant="default"
                  size="sm"
                  onClick={() => {
                    // Switch to active tab if on archived tab
                    if (activeTab === 'archived') {
                      setActiveTab('active');
                    }
                    handleQuickCreateSession();
                  }}
                  hotkey={shortcuts.newSession}
                  hotkeyActive={false}
                  data-testid="new-session-button"
                  title={`New Session (${shortcuts.newSession})`}
                >
                  <Plus className="w-4 h-4 mr-1" />
                  New
                </HotkeyButton>
              </div>
            </div>

            <Tabs
              value={activeTab}
              onValueChange={(value) => setActiveTab(value as 'active' | 'archived')}
              className="w-full"
            >
              <TabsList className="w-full">
                <TabsTrigger value="active" className="flex-1">
                  <MessageSquare className="w-4 h-4 mr-2" />
                  Active (
                  {isFiltering
                    ? `${filteredActive.length}/${activeSessions.length}`
                    : activeSessions.length}
                  )
                </TabsTrigger>
                <TabsTrigger value="archived" className="flex-1">
                  <Archive className="w-4 h-4 mr-2" />
                  Archived (
                  {isFiltering
                    ? `${filteredArchived.length}/${archivedSessions.length}`
                    : archivedSessions.length}
                  )
                </TabsTrigger>
              </TabsList>
            </Tabs>

            {/* Search & Filter Toolbar */}
            <div className="flex items-center gap-2 mt-3">
              <div className="flex-1 min-w-0">
                <SessionSearchInput
                  value={searchTerm}
                  onChange={setSearchTerm}
                  onClear={clearSearch}
                />
              </div>
              <ProjectFilterDropdown
                selectedProjectPath={filterProjectPath}
                onChange={setFilterProjectPath}
                sessionCounts={sessionCountByProject}
              />
            </div>

            {/* Font Size Slider */}
            <div className="flex items-center gap-2 mt-2">
              <AArrowDown className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
              <Slider
                value={[sessionFontSize]}
                onValueChange={([v]) => setSessionFontSize(v)}
                min={10}
                max={18}
                step={1}
                className="flex-1"
              />
              <AArrowUp className="w-4.5 h-4.5 text-muted-foreground shrink-0" />
              <span className="text-xs text-muted-foreground w-7 text-right tabular-nums">
                {sessionFontSize}
              </span>
            </div>
          </CardHeader>

          <CardContent className="flex-1 overflow-y-auto space-y-2" data-testid="session-list">
            {/* Multiselect toolbar */}
            {isMultiselectMode && (
              <div className="p-2 border rounded-lg bg-muted/50 flex items-center justify-between gap-2 sticky top-0 z-10">
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">
                    {selectedSessionIds.size} selected
                  </span>
                  <Button variant="ghost" size="sm" onClick={selectAllInCurrentTab} className="h-7">
                    Select All
                  </Button>
                  {selectedSessionIds.size > 0 && (
                    <Button variant="ghost" size="sm" onClick={clearSelection} className="h-7">
                      Clear
                    </Button>
                  )}
                </div>
                {selectedSessionIds.size > 0 && (
                  <div className="flex items-center gap-1">
                    {activeTab === 'active' && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={handleBulkArchive}
                        className="h-7"
                        title="Archive selected"
                      >
                        <Archive className="w-4 h-4" />
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handleBulkDelete}
                      className="h-7 text-destructive hover:text-destructive"
                      title="Delete selected"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                )}
              </div>
            )}

            {/* Create new session */}
            {isCreating && (
              <div className="p-3 border rounded-lg bg-muted/50">
                <div className="flex gap-2">
                  <Input
                    placeholder="Session name..."
                    value={newSessionName}
                    onChange={(e) => setNewSessionName(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleCreateSession();
                      if (e.key === 'Escape') {
                        setIsCreating(false);
                        setNewSessionName('');
                      }
                    }}
                    autoFocus
                  />
                  <Button size="sm" onClick={handleCreateSession}>
                    <Check className="w-4 h-4" />
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => {
                      setIsCreating(false);
                      setNewSessionName('');
                    }}
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            )}

            {/* Delete All Archived button - shown at the top of archived sessions */}
            {activeTab === 'archived' && archivedSessions.length > 0 && (
              <div className="pb-2 border-b mb-2">
                <Button
                  variant="destructive"
                  size="sm"
                  className="w-full"
                  onClick={() => setIsDeleteAllArchivedDialogOpen(true)}
                  data-testid="delete-all-archived-sessions-button"
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  Delete All Archived Sessions
                </Button>
              </div>
            )}

            {/* Session list */}
            {displayedSessions.map((session) => {
              const sessionBadgeColor = getBadgeColor(session.projectPath);
              return (
                <div
                  key={session.id}
                  className={cn(
                    'border rounded-lg cursor-pointer transition-colors hover:bg-accent/50',
                    currentSessionId === session.id && 'bg-primary/10 border-primary',
                    session.isArchived && 'opacity-60',
                    isMultiselectMode &&
                      selectedSessionIds.has(session.id) &&
                      'bg-primary/20 border-primary'
                  )}
                  style={{
                    fontSize: `${sessionFontSize}px`,
                    padding: `${Math.max(4, sessionFontSize * 0.6)}px ${Math.max(6, sessionFontSize * 0.75)}px`,
                    borderLeftWidth: sessionBadgeColor ? '3px' : undefined,
                    borderLeftColor: sessionBadgeColor || undefined,
                  }}
                  onClick={() => {
                    if (isMultiselectMode) {
                      toggleSessionSelection(session.id);
                    } else if (!session.isArchived) {
                      // Pass session's projectPath to trigger project switch if needed
                      onSelectSession(session.id, session.projectPath);
                    }
                  }}
                  data-testid={`session-item-${session.id}`}
                >
                  <div className="flex items-start justify-between gap-2">
                    {/* Checkbox for multiselect mode */}
                    {isMultiselectMode && (
                      <div
                        className="flex items-center pt-0.5"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <Checkbox
                          checked={selectedSessionIds.has(session.id)}
                          onCheckedChange={() => toggleSessionSelection(session.id)}
                          data-testid={`session-checkbox-${session.id}`}
                        />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      {editingSessionId === session.id ? (
                        <div className="flex gap-2 mb-2">
                          <Input
                            value={editingName}
                            onChange={(e) => setEditingName(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') handleRenameSession(session.id);
                              if (e.key === 'Escape') {
                                setEditingSessionId(null);
                                setEditingName('');
                              }
                            }}
                            onClick={(e) => e.stopPropagation()}
                            autoFocus
                            className="h-7"
                          />
                          <Button
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleRenameSession(session.id);
                            }}
                            className="h-7"
                          >
                            <Check className="w-3 h-3" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={(e) => {
                              e.stopPropagation();
                              setEditingSessionId(null);
                              setEditingName('');
                            }}
                            className="h-7"
                          >
                            <X className="w-3 h-3" />
                          </Button>
                        </div>
                      ) : (
                        <>
                          <div className="flex items-center gap-1.5 mb-0.5">
                            {/* Show loading indicator if this session is running (either current session thinking or any session in runningSessions) */}
                            {(currentSessionId === session.id && isCurrentSessionThinking) ||
                            runningSessions.has(session.id) ? (
                              <Spinner size="sm" className="shrink-0" />
                            ) : (
                              <MessageSquare
                                style={{
                                  width: `${sessionFontSize}px`,
                                  height: `${sessionFontSize}px`,
                                }}
                                className="text-muted-foreground shrink-0"
                              />
                            )}
                            <h3 className="font-medium truncate" style={{ fontSize: 'inherit' }}>
                              {session.name}
                            </h3>
                            {((currentSessionId === session.id && isCurrentSessionThinking) ||
                              runningSessions.has(session.id)) && (
                              <span
                                className="text-primary bg-primary/10 px-1.5 py-0.5 rounded-full"
                                style={{ fontSize: `${sessionFontSize - 4}px` }}
                              >
                                thinking...
                              </span>
                            )}
                          </div>
                          {session.description && (
                            <p
                              className="text-foreground/80 line-clamp-3 whitespace-pre-line"
                              style={{ fontSize: `${sessionFontSize - 2}px` }}
                            >
                              {session.description}
                            </p>
                          )}
                          {!session.description && session.preview && (
                            <p
                              className="text-muted-foreground truncate"
                              style={{ fontSize: `${sessionFontSize - 4}px` }}
                            >
                              {session.preview}
                            </p>
                          )}
                          <div
                            className="flex items-center gap-2 mt-1 flex-wrap"
                            style={{ fontSize: `${sessionFontSize - 4}px` }}
                          >
                            <span className="text-muted-foreground">
                              {session.messageCount} messages
                            </span>
                            <span className="text-muted-foreground">·</span>
                            <span className="text-muted-foreground">
                              {new Date(session.updatedAt).toLocaleDateString()}
                            </span>
                            {session.projectPath && (
                              <>
                                <span className="text-xs text-muted-foreground">·</span>
                                <ProjectBadge
                                  projectName={getProjectName(session.projectPath)}
                                  projectPath={session.projectPath}
                                  badgeColor={getBadgeColor(session.projectPath)}
                                  backgroundColor={getProject(session.projectPath)?.backgroundColor}
                                  textColor={getProject(session.projectPath)?.textColor}
                                  iconColor={getProject(session.projectPath)?.iconColor}
                                  icon={getProject(session.projectPath)?.icon}
                                  customIconPath={getProject(session.projectPath)?.customIconPath}
                                />
                              </>
                            )}
                          </div>
                        </>
                      )}
                    </div>

                    {/* Actions - hidden in multiselect mode */}
                    {!isMultiselectMode && !session.isArchived && (
                      <div className="flex gap-0.5" onClick={(e) => e.stopPropagation()}>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => {
                            setEditingSessionId(session.id);
                            setEditingName(session.name);
                          }}
                          className="p-0"
                          style={{
                            width: `${sessionFontSize + 6}px`,
                            height: `${sessionFontSize + 6}px`,
                          }}
                          title="Rename session"
                        >
                          <Edit2
                            style={{
                              width: `${sessionFontSize - 2}px`,
                              height: `${sessionFontSize - 2}px`,
                            }}
                          />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleArchiveSession(session.id)}
                          className="p-0"
                          style={{
                            width: `${sessionFontSize + 6}px`,
                            height: `${sessionFontSize + 6}px`,
                          }}
                          data-testid={`archive-session-${session.id}`}
                          title="Archive session"
                        >
                          <Archive
                            style={{
                              width: `${sessionFontSize - 2}px`,
                              height: `${sessionFontSize - 2}px`,
                            }}
                          />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleDeleteSession(session)}
                          className="p-0 text-destructive hover:text-destructive"
                          style={{
                            width: `${sessionFontSize + 6}px`,
                            height: `${sessionFontSize + 6}px`,
                          }}
                          data-testid={`delete-session-${session.id}`}
                          title="Delete session"
                        >
                          <Trash2
                            style={{
                              width: `${sessionFontSize - 2}px`,
                              height: `${sessionFontSize - 2}px`,
                            }}
                          />
                        </Button>
                      </div>
                    )}

                    {!isMultiselectMode && session.isArchived && (
                      <div className="flex gap-0.5" onClick={(e) => e.stopPropagation()}>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleUnarchiveSession(session.id)}
                          className="p-0"
                          style={{
                            width: `${sessionFontSize + 6}px`,
                            height: `${sessionFontSize + 6}px`,
                          }}
                          title="Restore session"
                        >
                          <ArchiveRestore
                            style={{
                              width: `${sessionFontSize - 2}px`,
                              height: `${sessionFontSize - 2}px`,
                            }}
                          />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleDeleteSession(session)}
                          className="p-0 text-destructive hover:text-destructive"
                          style={{
                            width: `${sessionFontSize + 6}px`,
                            height: `${sessionFontSize + 6}px`,
                          }}
                          data-testid={`delete-archived-session-${session.id}`}
                          title="Delete session"
                        >
                          <Trash2
                            style={{
                              width: `${sessionFontSize - 2}px`,
                              height: `${sessionFontSize - 2}px`,
                            }}
                          />
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}

            {displayedSessions.length === 0 && (
              <div className="text-center py-8 text-muted-foreground">
                <MessageSquare className="w-12 h-12 mx-auto mb-2 opacity-50" />
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

          {/* Delete Session Confirmation Dialog */}
          <DeleteSessionDialog
            open={isDeleteDialogOpen}
            onOpenChange={setIsDeleteDialogOpen}
            session={sessionToDelete}
            onConfirm={confirmDeleteSession}
          />

          {/* Delete All Archived Sessions Confirmation Dialog */}
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
