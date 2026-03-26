/**
 * TasksPanel - Left sidebar panel for the "Tasks" tab.
 *
 * Full card layout with search, tag/status/priority filters,
 * and sorting by date, title, priority, or status.
 *
 * Uses the unified `useTasksSource` hook that auto-selects between
 * Supabase (DB) and file-based task storage. When Supabase is active
 * and a matching project exists, tasks come from the database. Otherwise,
 * the classic file-based multi-project mode is used as fallback.
 */

import { useCallback, useMemo, useState } from 'react';
import {
  AArrowDown,
  AArrowUp,
  AlertCircle,
  ArrowUpFromLine,
  CheckSquare,
  Database,
  FolderOpen,
  HardDrive,
  LayoutGrid,
  Loader2,
  Plus,
  RefreshCw,
  SearchX,
} from 'lucide-react';
import { useShallow } from 'zustand/react/shallow';
import type {
  Task,
  TaskSortField,
  TaskSortOrder,
  TaskStatus,
  TaskPriority,
} from '@automaker/types';
import { useAppStore } from '@/store/app-store';
import { useTaskChatBridgeStore } from '@/store/task-chat-bridge-store';
import { useTasksSource, type TaskCreateInput } from '@/hooks/use-tasks-source';
import { useTaskAttachments } from '@/hooks/use-task-attachments';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { cn } from '@/lib/utils';
import { isSupabaseConfigured } from '@/lib/supabase';
import { TaskCard } from './task-card';
import { CompletedTasksSearch } from './completed-tasks-search';
import { TasksFilterBar } from './tasks-filter-bar';
import { TaskCreateDialog, type CreateTaskData } from './task-create-dialog';
import { KanbanFullscreenDialog } from './kanban-fullscreen-dialog';
import { TaskMigrationDialog } from './task-migration-dialog';
import { TaskNotificationsPopover } from './task-notifications-popover';
import { getTaskPriorityOrder, getTaskStatusOrder } from './task-utils';
import { useSupabaseAuthStore } from '@/store/supabase-auth-store';

// ---------------------------------------------------------------------------
// Client-side sort helper
// ---------------------------------------------------------------------------

function sortTasks(tasks: Task[], field: TaskSortField, order: TaskSortOrder): Task[] {
  const sorted = [...tasks];
  sorted.sort((a, b) => {
    let cmp = 0;
    switch (field) {
      case 'date':
        cmp = a.date.localeCompare(b.date);
        break;
      case 'title':
        cmp = a.title.localeCompare(b.title, 'de');
        break;
      case 'priority':
        cmp = getTaskPriorityOrder(a.priority) - getTaskPriorityOrder(b.priority);
        break;
      case 'status':
        cmp = getTaskStatusOrder(a.status) - getTaskStatusOrder(b.status);
        break;
    }
    return order === 'asc' ? cmp : -cmp;
  });
  return sorted;
}

// ---------------------------------------------------------------------------
// Client-side filter helper
// ---------------------------------------------------------------------------

function filterTasksLocal(
  tasks: Task[],
  search: string | undefined,
  tags: string[] | undefined,
  status: TaskStatus[] | undefined,
  priority: TaskPriority[] | undefined,
  projectFilter: string | null
): Task[] {
  let result = tasks;

  // Project filter (client-side, applied to multi-project results)
  if (projectFilter) {
    result = result.filter((t) => t.projectPath === projectFilter);
  }

  if (tags && tags.length > 0) {
    result = result.filter((t) => t.tags.some((tag) => tags.includes(tag)));
  }

  if (status && status.length > 0) {
    result = result.filter((t) => status.includes(t.status));
  }

  if (priority && priority.length > 0) {
    result = result.filter((t) => priority.includes(t.priority));
  }

  if (search && search.trim()) {
    const q = search.trim().toLowerCase();
    result = result.filter(
      (t) =>
        t.title.toLowerCase().includes(q) ||
        t.description.toLowerCase().includes(q) ||
        (t.summary && t.summary.toLowerCase().includes(q))
    );
  }

  return result;
}

// ---------------------------------------------------------------------------
// Project filter constants
// ---------------------------------------------------------------------------

const ALL_PROJECTS_VALUE = '__all__';

// ---------------------------------------------------------------------------
// Main panel
// ---------------------------------------------------------------------------

interface TasksPanelProps {
  projectPath: string;
}

export function TasksPanel({ projectPath }: TasksPanelProps) {
  const { filter, sortField, sortOrder } = useAppStore(
    useShallow((s) => ({
      filter: s.tasksFilter,
      sortField: s.tasksSortField,
      sortOrder: s.tasksSortOrder,
    }))
  );

  const projects = useAppStore((s) => s.projects);
  const setFilter = useAppStore((s) => s.setTasksFilter);
  const setSortField = useAppStore((s) => s.setTasksSortField);
  const setSortOrder = useAppStore((s) => s.setTasksSortOrder);
  const sessionFontSize = useAppStore((s) => s.sessionFontSize);
  const setSessionFontSize = useAppStore((s) => s.setSessionFontSize);
  const taskExecutionStates = useTaskChatBridgeStore((s) => s.taskExecutionStates);

  const [projectFilter, setProjectFilter] = useState<string | null>(null);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [kanbanOpen, setKanbanOpen] = useState(false);
  const [migrationOpen, setMigrationOpen] = useState(false);

  // Supabase auth for migration
  const supabaseUser = useSupabaseAuthStore((s) => s.user);

  // Unified data source (auto-selects Supabase or file-based)
  const {
    source,
    tasks,
    loading,
    error,
    refetch,
    handleCreate: sourceCreate,
    handleUpdate: sourceUpdate,
    handleDelete: sourceDelete,
    supabaseProjectId,
  } = useTasksSource(projectPath);

  // Attachment upload support (only active when Supabase source)
  const { uploadPendingAttachments } = useTaskAttachments(null);

  const currentProjectName = useMemo(() => {
    const proj = projects.find((p) => p.path === projectPath);
    return proj?.name ?? 'Projekt';
  }, [projects, projectPath]);

  const taskExecutionSummary = useMemo(() => {
    const values = Object.values(taskExecutionStates);
    if (values.length === 0) return null;

    const summary = {
      starting: 0,
      running: 0,
      completed: 0,
      failed: 0,
    };

    for (const state of values) {
      if (state.state === 'starting') summary.starting += 1;
      if (state.state === 'running') summary.running += 1;
      if (state.state === 'completed') summary.completed += 1;
      if (state.state === 'failed') summary.failed += 1;
    }

    if (
      summary.starting === 0 &&
      summary.running === 0 &&
      summary.completed === 0 &&
      summary.failed === 0
    ) {
      return null;
    }

    return summary;
  }, [taskExecutionStates]);

  // Extract unique project names from loaded tasks for the filter dropdown
  const projectsInTasks = useMemo(() => {
    const map = new Map<string, string>();
    for (const t of tasks) {
      if (t.projectPath && t.projectName) {
        map.set(t.projectPath, t.projectName);
      }
    }
    return Array.from(map.entries()).sort((a, b) => a[1].localeCompare(b[1], 'de'));
  }, [tasks]);

  // Extract unique tags from all tasks for the filter dropdown
  const availableTags = useMemo(() => {
    const tagSet = new Set<string>();
    for (const t of tasks) {
      for (const tag of t.tags) {
        tagSet.add(tag);
      }
    }
    return Array.from(tagSet).sort((a, b) => a.localeCompare(b, 'de'));
  }, [tasks]);

  // Apply local filtering + sorting
  const filteredTasks = useMemo(() => {
    const filtered = filterTasksLocal(
      tasks,
      filter.search,
      filter.tags,
      filter.status,
      filter.priority,
      projectFilter
    );
    return sortTasks(filtered, sortField, sortOrder);
  }, [tasks, filter, sortField, sortOrder, projectFilter]);

  const hasActiveFilters = !!(
    filter.search ||
    filter.tags?.length ||
    filter.status?.length ||
    filter.priority?.length ||
    projectFilter
  );

  // Stats summary for footer
  const statsLine = useMemo(() => {
    if (tasks.length === 0) return '';
    const statusCounts: Record<string, number> = {};
    for (const t of tasks) {
      statusCounts[t.status] = (statusCounts[t.status] || 0) + 1;
    }
    const parts: string[] = [];
    if (statusCounts['open']) parts.push(`${statusCounts['open']} offen`);
    if (statusCounts['in_progress']) parts.push(`${statusCounts['in_progress']} in Arbeit`);
    if (statusCounts['done']) parts.push(`${statusCounts['done']} erledigt`);
    return `${tasks.length} Tasks -- ${parts.join(' -- ')}`;
  }, [tasks]);

  // Handlers
  const handleSearchChange = useCallback(
    (search: string) => {
      setFilter({ ...filter, search: search || undefined });
    },
    [filter, setFilter]
  );

  const handleSortChange = useCallback(
    (field: TaskSortField, order: TaskSortOrder) => {
      setSortField(field);
      setSortOrder(order);
    },
    [setSortField, setSortOrder]
  );

  const handleDelete = useCallback(
    async (taskId: string) => {
      await sourceDelete(taskId);
    },
    [sourceDelete]
  );

  const handleUpdate = useCallback(
    async (taskId: string, updates: Partial<Task>) => {
      await sourceUpdate(taskId, updates);
    },
    [sourceUpdate]
  );

  const handleCreate = useCallback(
    async (data: CreateTaskData) => {
      const input: TaskCreateInput = {
        title: data.title,
        description: data.description,
        priority: data.priority,
        status: data.status,
        tags: data.tags,
        summary: data.summary,
      };
      const taskId = await sourceCreate(input);

      // Upload pending attachments after task creation (Supabase only)
      if (taskId && data.pendingAttachments && data.pendingAttachments.length > 0) {
        void uploadPendingAttachments(taskId, data.pendingAttachments);
      }
    },
    [sourceCreate, uploadPendingAttachments]
  );

  const handleEdit = useCallback((task: Task) => {
    setEditingTask(task);
    setCreateDialogOpen(true);
  }, []);

  const handleSaveEdit = useCallback(
    async (data: CreateTaskData) => {
      if (!editingTask) return;
      await handleUpdate(editingTask.filename, {
        title: data.title,
        description: data.description,
        priority: data.priority,
        status: data.status,
        tags: data.tags,
        summary: data.summary,
      });
      setEditingTask(null);
    },
    [editingTask, handleUpdate]
  );

  const handleDialogClose = useCallback((open: boolean) => {
    if (!open) {
      setEditingTask(null);
    }
    setCreateDialogOpen(open);
  }, []);

  const handleClearFilters = useCallback(() => {
    setFilter({});
    setProjectFilter(null);
  }, [setFilter]);

  // Determine body content
  const isEmptyLoading = loading && tasks.length === 0;
  const isEmptyError = error && tasks.length === 0;
  const isEmpty = tasks.length === 0 && !isEmptyLoading && !isEmptyError;

  return (
    <div className="flex h-full min-h-0 flex-col">
      {/* Header - always visible */}
      <div className="flex items-center justify-between border-b border-muted px-3 py-2">
        <div className="flex items-center gap-1.5">
          <h3 className="text-xs font-semibold text-muted-foreground">
            Tasks{tasks.length > 0 ? ` (${filteredTasks.length})` : ''}
          </h3>
          <DataSourceBadge source={source} />
        </div>
        <div className="flex items-center gap-1">
          {isSupabaseConfigured() && supabaseProjectId && (
            <>
              <TaskNotificationsPopover projectId={supabaseProjectId} />
              <Button
                variant="ghost"
                size="sm"
                className="h-6 w-6 p-0"
                onClick={() => setKanbanOpen(true)}
                title="Kanban Board oeffnen"
              >
                <LayoutGrid className="h-3 w-3" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="h-6 w-6 p-0 text-violet-400 hover:bg-violet-500/10 hover:text-violet-300"
                onClick={() => setMigrationOpen(true)}
                title="Lokale Tasks nach Supabase migrieren"
              >
                <ArrowUpFromLine className="h-3 w-3" />
              </Button>
            </>
          )}
          <Button
            variant="ghost"
            size="sm"
            className="h-6 w-6 p-0"
            onClick={() => {
              setEditingTask(null);
              setCreateDialogOpen(true);
            }}
            title="Neuer Task"
          >
            <Plus className="h-3 w-3" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className={cn(
              'h-6 w-6 p-0',
              supabaseProjectId && 'text-cyan-400 hover:bg-cyan-500/10 hover:text-cyan-300'
            )}
            onClick={() => void refetch()}
            title="Aktualisieren"
          >
            <RefreshCw className={cn('h-3 w-3', loading && 'animate-spin')} />
          </Button>
        </div>
      </div>

      {taskExecutionSummary && (
        <div className="flex flex-wrap items-center gap-1.5 border-b border-muted bg-muted/20 px-3 py-1.5">
          <span className="text-[10px] text-muted-foreground">Agent-Status:</span>
          {taskExecutionSummary.starting > 0 && (
            <span className="rounded-full border border-sky-500/30 bg-sky-500/10 px-1.5 py-0.5 text-[10px] text-sky-400">
              Gestartet {taskExecutionSummary.starting}
            </span>
          )}
          {taskExecutionSummary.running > 0 && (
            <span className="rounded-full border border-amber-500/30 bg-amber-500/10 px-1.5 py-0.5 text-[10px] text-amber-400">
              Läuft {taskExecutionSummary.running}
            </span>
          )}
          {taskExecutionSummary.completed > 0 && (
            <span className="rounded-full border border-emerald-500/30 bg-emerald-500/10 px-1.5 py-0.5 text-[10px] text-emerald-400">
              Fertig {taskExecutionSummary.completed}
            </span>
          )}
          {taskExecutionSummary.failed > 0 && (
            <span className="rounded-full border border-rose-500/30 bg-rose-500/10 px-1.5 py-0.5 text-[10px] text-rose-400">
              Fehlgeschlagen {taskExecutionSummary.failed}
            </span>
          )}
        </div>
      )}

      {/* Loading state */}
      {isEmptyLoading && <LoadingState />}

      {/* Error state */}
      {isEmptyError && <ErrorState message={error} onRetry={() => void refetch()} />}

      {/* Empty state */}
      {isEmpty && (
        <EmptyState
          source={source}
          onCreate={() => {
            setEditingTask(null);
            setCreateDialogOpen(true);
          }}
          dialogOpen={createDialogOpen}
          onDialogClose={handleDialogClose}
          onSave={handleCreate}
        />
      )}

      {/* Body content - only when tasks exist */}
      {tasks.length > 0 && (
        <>
          {/* Project filter (only show if file source with multiple projects) */}
          {source === 'file' && projectsInTasks.length > 1 && (
            <div className="border-b border-muted px-3 py-1.5">
              <div className="flex items-center gap-1.5">
                <FolderOpen className="h-3 w-3 shrink-0 text-muted-foreground" />
                <select
                  className="min-w-0 flex-1 truncate rounded-md border border-muted bg-transparent px-1.5 py-0.5 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
                  value={projectFilter || ALL_PROJECTS_VALUE}
                  onChange={(e) =>
                    setProjectFilter(e.target.value === ALL_PROJECTS_VALUE ? null : e.target.value)
                  }
                >
                  <option value={ALL_PROJECTS_VALUE}>Alle Projekte ({tasks.length})</option>
                  {projectsInTasks.map(([path, name]) => {
                    const count = tasks.filter((t) => t.projectPath === path).length;
                    return (
                      <option key={path} value={path}>
                        {name} ({count})
                      </option>
                    );
                  })}
                </select>
              </div>
            </div>
          )}

          {/* Search + Filter bar */}
          <div className="space-y-2 border-b border-muted px-3 py-2">
            <CompletedTasksSearch value={filter.search ?? ''} onChange={handleSearchChange} />
            <TasksFilterBar
              filter={filter}
              onFilterChange={setFilter}
              sortField={sortField}
              sortOrder={sortOrder}
              onSortChange={handleSortChange}
              availableTags={availableTags}
            />
          </div>

          <div className="border-b border-muted px-3 py-1.5">
            <div className="flex items-center gap-1.5">
              <AArrowDown className="h-3 w-3 shrink-0 text-muted-foreground" />
              <Slider
                value={[sessionFontSize]}
                onValueChange={([value]) => setSessionFontSize(value)}
                min={10}
                max={18}
                step={1}
                className="flex-1"
                aria-label="Schriftgroesse fuer Tasks"
              />
              <AArrowUp className="h-4 w-4 shrink-0 text-muted-foreground" />
              <span className="w-7 text-right text-xs tabular-nums text-muted-foreground">
                {sessionFontSize}
              </span>
            </div>
          </div>

          {/* Error banner (inline, when we have data but also an error) */}
          {error && (
            <div className="mx-3 mt-2 flex items-center justify-between gap-2 rounded-md border border-muted bg-destructive/5 px-2 py-1.5">
              <p className="text-xs text-muted-foreground">{error}</p>
              <Button
                size="sm"
                variant="outline"
                onClick={() => void refetch()}
                className="h-6 border-muted text-xs"
              >
                Erneut laden
              </Button>
            </div>
          )}

          {/* Task cards or empty filter result */}
          {filteredTasks.length === 0 && hasActiveFilters ? (
            <NoResultsState onClearFilters={handleClearFilters} />
          ) : (
            <div className="min-h-0 flex-1 space-y-2 overflow-y-auto px-2 py-2">
              {filteredTasks.map((task) => (
                <TaskCard
                  key={`${task.projectPath || ''}:${task.filename}`}
                  task={task}
                  fontSize={sessionFontSize}
                  onUpdate={(fn, updates) => void handleUpdate(fn, updates)}
                  onDelete={(fn) => void handleDelete(fn)}
                  onEdit={handleEdit}
                />
              ))}
            </div>
          )}

          {/* Stats footer */}
          {statsLine && (
            <div className="border-t border-muted px-3 py-1.5">
              <p className="text-[10px] text-muted-foreground">{statsLine}</p>
            </div>
          )}
        </>
      )}

      {/* Create/Edit Dialog */}
      <TaskCreateDialog
        open={createDialogOpen}
        onOpenChange={handleDialogClose}
        onSave={editingTask ? handleSaveEdit : handleCreate}
        editTask={editingTask ?? undefined}
      />

      {/* Kanban Fullscreen Dialog */}
      {isSupabaseConfigured() && supabaseProjectId && (
        <KanbanFullscreenDialog
          open={kanbanOpen}
          onOpenChange={setKanbanOpen}
          projectId={supabaseProjectId}
          projectName={currentProjectName}
        />
      )}

      {/* Migration Dialog */}
      {isSupabaseConfigured() && supabaseProjectId && supabaseUser && (
        <TaskMigrationDialog
          open={migrationOpen}
          onOpenChange={setMigrationOpen}
          projectPath={projectPath}
          supabaseProjectId={supabaseProjectId}
          userId={supabaseUser.id}
          onComplete={() => void refetch()}
        />
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Data source badge
// ---------------------------------------------------------------------------

function DataSourceBadge({ source }: { source: 'supabase' | 'file' }) {
  if (source === 'supabase') {
    return (
      <span
        className="inline-flex items-center gap-1 rounded-full bg-cyan-500/10 px-1.5 py-0.5 text-[9px] font-medium text-cyan-400"
        title="Datenquelle: Supabase Datenbank"
      >
        <Database className="h-2.5 w-2.5" />
        DB
      </span>
    );
  }
  return (
    <span
      className="inline-flex items-center gap-1 rounded-full bg-zinc-500/10 px-1.5 py-0.5 text-[9px] font-medium text-zinc-500"
      title="Datenquelle: Lokale Dateien"
    >
      <HardDrive className="h-2.5 w-2.5" />
      Lokal
    </span>
  );
}

// ---------------------------------------------------------------------------
// State components
// ---------------------------------------------------------------------------

function LoadingState() {
  return (
    <div className="flex flex-col items-center justify-center gap-3 px-4 py-12 text-center">
      <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      <p className="text-xs text-muted-foreground">Tasks werden geladen...</p>
    </div>
  );
}

function ErrorState({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 px-4 py-12 text-center">
      <div className="flex h-9 w-9 items-center justify-center rounded-full bg-destructive/10">
        <AlertCircle className="h-4 w-4 text-destructive" />
      </div>
      <div className="space-y-1">
        <p className="text-sm font-medium">Fehler beim Laden</p>
        <p className="max-w-[200px] text-xs text-muted-foreground">{message}</p>
      </div>
      <Button variant="outline" size="sm" onClick={onRetry} className="gap-1.5 border-muted">
        <RefreshCw className="h-3 w-3" />
        Erneut laden
      </Button>
    </div>
  );
}

interface EmptyStateProps {
  source: 'supabase' | 'file';
  onCreate: () => void;
  dialogOpen: boolean;
  onDialogClose: (open: boolean) => void;
  onSave: (data: CreateTaskData) => void;
}

function EmptyState({ source, onCreate, dialogOpen, onDialogClose, onSave }: EmptyStateProps) {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-3 px-4 py-12 text-center">
      <CheckSquare className="h-10 w-10 text-muted-foreground/40" />
      <div className="space-y-1">
        <p className="text-sm font-medium text-muted-foreground">Noch keine Tasks</p>
        <p className="max-w-[200px] text-xs text-muted-foreground">
          Erstelle deinen ersten Task, um loszulegen.
        </p>
      </div>
      <DataSourceBadge source={source} />
      <Button variant="outline" size="sm" onClick={onCreate} className="gap-1.5 border-muted">
        <Plus className="h-3 w-3" />
        Neuer Task
      </Button>
      <TaskCreateDialog open={dialogOpen} onOpenChange={onDialogClose} onSave={onSave} />
    </div>
  );
}

function NoResultsState({ onClearFilters }: { onClearFilters: () => void }) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-3 px-4 py-12 text-center">
      <SearchX className="h-8 w-8 text-muted-foreground/40" />
      <div className="space-y-1">
        <p className="text-sm font-medium text-muted-foreground">Keine Tasks gefunden</p>
        <p className="max-w-[200px] text-xs text-muted-foreground">
          Versuche andere Suchbegriffe oder Filter.
        </p>
      </div>
      <Button variant="outline" size="sm" onClick={onClearFilters} className="gap-1.5 border-muted">
        Filter zuruecksetzen
      </Button>
    </div>
  );
}
