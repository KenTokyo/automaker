/**
 * CompletedTasksPanel - Left sidebar panel for the "Fertig" (Done) tab.
 *
 * Groups completed tasks by project (like the Sessions tab) with collapsible
 * tree nodes. Each project shows 3 tasks initially, with "show more" loading
 * 10 at a time. Includes a per-project cleanup button that trims tasks > 20.
 *
 * Default: "Alle Projekte" mode — loads completed tasks from ALL
 * registered projects simultaneously so tasks are always visible
 * regardless of which project is currently active.
 */

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  AArrowDown,
  AArrowUp,
  AlertCircle,
  ArrowUpFromLine,
  CheckCircle2,
  CheckSquare,
  Loader2,
  RefreshCw,
  SearchX,
  Trash2,
  X,
} from 'lucide-react';
import { useShallow } from 'zustand/react/shallow';
import type {
  CompletedTask,
  CompletedTaskSortField,
  CompletedTaskSortOrder,
  CompletedTaskStatus,
  CompletedTaskEffort,
} from '@automaker/types';
import { useAppStore } from '@/store/app-store';
import {
  useCompletedTasks,
  deleteCompletedTask,
  bulkDeleteCompletedTasks,
} from '@/hooks/use-completed-tasks';
import { isSupabaseConfigured } from '@/lib/supabase';
import { useSupabaseAuthStore } from '@/store/supabase-auth-store';
import { useTasksSource } from '@/hooks/use-tasks-source';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { cn } from '@/lib/utils';
import { CompletedTasksSearch } from './completed-tasks-search';
import { CompletedTasksFilterBar } from './completed-tasks-filter-bar';
import { CompletedTaskPushDialog } from './completed-task-push-dialog';
import { HistoryViewerPanel } from './history-viewer-panel';
import { getStatusLabel } from './completed-task-utils';
import {
  CompletedTaskProjectGroup,
  INITIAL_VISIBLE,
  LOAD_MORE_COUNT,
  MAX_TASKS_KEEP,
} from './completed-task-project-group';

// ---------------------------------------------------------------------------
// Client-side sort helper
// ---------------------------------------------------------------------------

const EFFORT_ORDER: Record<string, number> = { S: 1, M: 2, L: 3, XL: 4 };

function sortTasks(
  tasks: CompletedTask[],
  field: CompletedTaskSortField,
  order: CompletedTaskSortOrder
): CompletedTask[] {
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
      case 'effort':
        cmp = (EFFORT_ORDER[a.effort] || 0) - (EFFORT_ORDER[b.effort] || 0);
        break;
    }
    return order === 'asc' ? cmp : -cmp;
  });
  return sorted;
}

// ---------------------------------------------------------------------------
// Client-side filter helper (supplements server-side filter)
// ---------------------------------------------------------------------------

function filterTasksLocal(
  tasks: CompletedTask[],
  search: string | undefined,
  tags: string[] | undefined,
  status: CompletedTaskStatus[] | undefined,
  effort: CompletedTaskEffort[] | undefined
): CompletedTask[] {
  let result = tasks;

  if (tags && tags.length > 0) {
    result = result.filter((t) => t.tags.some((tag) => tags.includes(tag)));
  }

  if (status && status.length > 0) {
    result = result.filter((t) => status.includes(t.status));
  }

  if (effort && effort.length > 0) {
    result = result.filter((t) => t.effort && effort.includes(t.effort as CompletedTaskEffort));
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
// Project grouping helper for completed tasks
// ---------------------------------------------------------------------------

interface CompletedTaskProjectGroup_ {
  projectName: string;
  projectPath: string;
  tasks: CompletedTask[];
  totalCount: number;
}

function groupTasksByProject(tasks: CompletedTask[]): CompletedTaskProjectGroup_[] {
  const byProject = new Map<string, { name: string; tasks: CompletedTask[] }>();

  for (const task of tasks) {
    const key = task.projectPath || '__no_project__';
    const existing = byProject.get(key);
    if (existing) {
      existing.tasks.push(task);
    } else {
      byProject.set(key, {
        name: task.projectName || extractFolderName(key),
        tasks: [task],
      });
    }
  }

  const groups: CompletedTaskProjectGroup_[] = [];
  for (const [projectPath, { name, tasks: projectTasks }] of byProject) {
    // Tasks should already be sorted newest-first from API, but ensure it
    const sorted = [...projectTasks].sort((a, b) => b.date.localeCompare(a.date));
    groups.push({
      projectName: name,
      projectPath,
      tasks: sorted,
      totalCount: sorted.length,
    });
  }

  // Sort groups alphabetically
  groups.sort((a, b) => a.projectName.toLowerCase().localeCompare(b.projectName.toLowerCase()));
  return groups;
}

function extractFolderName(path: string): string {
  if (path === '__no_project__') return 'Unbekannt';
  const normalized = path.replace(/[\\/]+$/, '');
  return normalized.split(/[\\/]/).pop() || path;
}

// ---------------------------------------------------------------------------
// Main panel
// ---------------------------------------------------------------------------

interface CompletedTasksPanelProps {
  projectPath: string;
}

export function CompletedTasksPanel({ projectPath }: CompletedTasksPanelProps) {
  const { tasks, loading, error, filter, sortField, sortOrder } = useAppStore(
    useShallow((s) => ({
      tasks: s.completedTasks,
      loading: s.completedTasksLoading,
      error: s.completedTasksError,
      filter: s.completedTasksFilter,
      sortField: s.completedTasksSortField,
      sortOrder: s.completedTasksSortOrder,
    }))
  );

  const projects = useAppStore((s) => s.projects);
  const setFilter = useAppStore((s) => s.setCompletedTasksFilter);
  const setSortField = useAppStore((s) => s.setCompletedTasksSortField);
  const setSortOrder = useAppStore((s) => s.setCompletedTasksSortOrder);
  const removeFromStore = useAppStore((s) => s.removeCompletedTask);
  const sessionFontSize = useAppStore((s) => s.sessionFontSize);
  const setSessionFontSize = useAppStore((s) => s.setSessionFontSize);

  const [historyFile, setHistoryFile] = useState<string | null>(null);

  // Project tree state: which groups are expanded + visible counts
  const [expandedProjects, setExpandedProjects] = useState<Record<string, boolean>>({});
  const [projectVisibleCounts, setProjectVisibleCounts] = useState<Record<string, number>>({});

  // ── Supabase Push: Selection + Dialog state ──
  const supabaseUser = useSupabaseAuthStore((s) => s.user);
  const { supabaseProjectId } = useTasksSource(projectPath);
  const canPush = isSupabaseConfigured() && !!supabaseProjectId && !!supabaseUser;

  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedTasks, setSelectedTasks] = useState<Set<string>>(new Set());
  const [pushDialogOpen, setPushDialogOpen] = useState(false);
  const [pushTasks, setPushTasks] = useState<CompletedTask[]>([]);

  // Build allProjects list for the hook (always fetch from all)
  const allProjects = useMemo(
    () => projects.map((p) => ({ path: p.path, name: p.name })),
    [projects]
  );

  // Always use multi-project mode — pass null as projectPath when we have projects
  const { refetch } = useCompletedTasks(
    allProjects.length > 0 ? null : projectPath,
    undefined,
    allProjects.length > 0 ? allProjects : undefined
  );

  // Apply local filtering + sorting
  const filteredTasks = useMemo(() => {
    const filtered = filterTasksLocal(
      tasks,
      filter.search,
      filter.tags,
      filter.status,
      filter.effort
    );
    return sortTasks(filtered, sortField, sortOrder);
  }, [tasks, filter, sortField, sortOrder]);

  // Group filtered tasks by project
  const projectGroups = useMemo(() => groupTasksByProject(filteredTasks), [filteredTasks]);

  // Auto-expand current project on first load
  useEffect(() => {
    if (projectGroups.length > 0 && Object.keys(expandedProjects).length === 0) {
      const currentGroup = projectGroups.find((g) => g.projectPath === projectPath);
      if (currentGroup) {
        setExpandedProjects((prev) => ({ ...prev, [currentGroup.projectPath]: true }));
      } else if (projectGroups.length > 0) {
        // Expand the first group if current project has no tasks
        setExpandedProjects((prev) => ({ ...prev, [projectGroups[0].projectPath]: true }));
      }
    }
  }, [projectGroups.length > 0]);

  const hasActiveFilters = !!(
    filter.search ||
    filter.tags?.length ||
    filter.status?.length ||
    filter.effort?.length
  );

  // Stats summary for footer
  const statsLine = useMemo(() => {
    if (tasks.length === 0) return '';
    const counts: Record<string, number> = {};
    for (const t of tasks) {
      counts[t.status] = (counts[t.status] || 0) + 1;
    }
    const parts = Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .map(([st, n]) => `${n} ${getStatusLabel(st as CompletedTaskStatus)}`);
    return `${tasks.length} Aufgaben -- ${parts.join(' -- ')}`;
  }, [tasks]);

  // Handlers
  const handleSearchChange = useCallback(
    (search: string) => {
      setFilter({ ...filter, search: search || undefined });
    },
    [filter, setFilter]
  );

  const handleSortChange = useCallback(
    (field: CompletedTaskSortField, order: CompletedTaskSortOrder) => {
      setSortField(field);
      setSortOrder(order);
    },
    [setSortField, setSortOrder]
  );

  const handleDelete = useCallback(
    async (filename: string) => {
      const task = tasks.find((t) => t.filename === filename);
      const deletePath = task?.projectPath || projectPath;
      const success = await deleteCompletedTask(filename, deletePath);
      if (success) {
        removeFromStore(filename);
      }
    },
    [tasks, projectPath, removeFromStore]
  );

  const handleCleanupProject = useCallback(
    async (cleanupProjectPath: string, tasksToDelete: string[]) => {
      if (tasksToDelete.length === 0) return;
      const deletedCount = await bulkDeleteCompletedTasks(tasksToDelete, cleanupProjectPath);
      if (deletedCount > 0) {
        // Remove from store
        for (const filename of tasksToDelete) {
          removeFromStore(filename);
        }
      }
    },
    [removeFromStore]
  );

  const handleClearFilters = useCallback(() => {
    setFilter({});
  }, [setFilter]);

  const toggleProjectExpanded = useCallback((path: string) => {
    setExpandedProjects((prev) => ({ ...prev, [path]: !prev[path] }));
  }, []);

  const showMoreForProject = useCallback((path: string) => {
    setProjectVisibleCounts((prev) => ({
      ...prev,
      [path]: (prev[path] || INITIAL_VISIBLE) + LOAD_MORE_COUNT,
    }));
  }, []);

  // Count projects that can be cleaned up
  const cleanableProjects = useMemo(() => {
    // Use unfiltered tasks for cleanup (filters shouldn't affect cleanup counts)
    const allGroups = groupTasksByProject(tasks);
    return allGroups.filter((g) => g.totalCount > MAX_TASKS_KEEP);
  }, [tasks]);

  const totalCleanupCount = useMemo(
    () => cleanableProjects.reduce((sum, g) => sum + (g.totalCount - MAX_TASKS_KEEP), 0),
    [cleanableProjects]
  );

  const handleCleanupAll = useCallback(async () => {
    for (const group of cleanableProjects) {
      const tasksToDelete = group.tasks.slice(MAX_TASKS_KEEP).map((t) => t.filename);
      if (tasksToDelete.length > 0) {
        await bulkDeleteCompletedTasks(tasksToDelete, group.projectPath);
        for (const filename of tasksToDelete) {
          removeFromStore(filename);
        }
      }
    }
  }, [cleanableProjects, removeFromStore]);

  // ── Selection handlers ──
  const handleSelectionChange = useCallback((filename: string, selected: boolean) => {
    setSelectedTasks((prev) => {
      const next = new Set(prev);
      if (selected) {
        next.add(filename);
      } else {
        next.delete(filename);
      }
      return next;
    });
  }, []);

  const handleSelectAllInGroup = useCallback(
    (_projectPath: string, filenames: string[], selected: boolean) => {
      setSelectedTasks((prev) => {
        const next = new Set(prev);
        for (const fn of filenames) {
          if (selected) {
            next.add(fn);
          } else {
            next.delete(fn);
          }
        }
        return next;
      });
    },
    []
  );

  const toggleSelectionMode = useCallback(() => {
    setSelectionMode((prev) => {
      if (prev) {
        // Exiting selection mode: clear selection
        setSelectedTasks(new Set());
      }
      return !prev;
    });
  }, []);

  // ── Push handlers ──
  const handlePushSelected = useCallback(() => {
    // Resolve selected filenames to actual task objects
    const selected = filteredTasks.filter((t) => selectedTasks.has(t.filename));
    if (selected.length === 0) return;
    setPushTasks(selected);
    setPushDialogOpen(true);
  }, [filteredTasks, selectedTasks]);

  const handlePushAll = useCallback(() => {
    if (filteredTasks.length === 0) return;
    setPushTasks(filteredTasks);
    setPushDialogOpen(true);
  }, [filteredTasks]);

  const handlePushComplete = useCallback(() => {
    // After push: exit selection mode and clear
    setSelectionMode(false);
    setSelectedTasks(new Set());
  }, []);

  // Full-page loading
  if (loading && tasks.length === 0) {
    return <LoadingState />;
  }

  // Full-page error
  if (error && tasks.length === 0) {
    return <ErrorState message={error} onRetry={() => void refetch()} />;
  }

  // Empty (no tasks at all)
  if (tasks.length === 0) {
    return <EmptyState />;
  }

  return (
    <div className="flex h-full min-h-0 flex-col">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-muted px-3 py-2">
        <h3 className="text-xs font-semibold text-muted-foreground">
          Erledigte Aufgaben ({filteredTasks.length})
        </h3>
        <div className="flex items-center gap-1">
          {/* Push all to Supabase */}
          {canPush && !selectionMode && (
            <Button
              variant="ghost"
              size="sm"
              className="h-6 gap-1 px-1.5 text-[10px] text-muted-foreground hover:text-violet-400"
              onClick={handlePushAll}
              title="Alle erledigten Aufgaben in die Supabase-Datenbank pushen"
            >
              <ArrowUpFromLine className="h-3 w-3" />
              DB
            </Button>
          )}
          {/* Selection mode toggle */}
          {canPush && (
            <Button
              variant="ghost"
              size="sm"
              className={cn('h-6 w-6 p-0', selectionMode && 'text-violet-400 bg-violet-400/10')}
              onClick={toggleSelectionMode}
              title={selectionMode ? 'Auswahl beenden' : 'Aufgaben auswählen zum Pushen'}
            >
              {selectionMode ? <X className="h-3 w-3" /> : <CheckSquare className="h-3 w-3" />}
            </Button>
          )}
          {/* Cleanup all button */}
          {totalCleanupCount > 0 && !selectionMode && (
            <Button
              variant="ghost"
              size="sm"
              className="h-6 gap-1 px-1.5 text-[10px] text-muted-foreground hover:text-destructive"
              onClick={() => void handleCleanupAll()}
              title={`${totalCleanupCount} alte Aufgaben aus ${cleanableProjects.length} Projekt(en) löschen`}
            >
              <Trash2 className="h-3 w-3" />
              {totalCleanupCount}
            </Button>
          )}
          <Button
            variant="ghost"
            size="sm"
            className="h-6 w-6 p-0"
            onClick={() => void refetch()}
            title="Aktualisieren"
          >
            <RefreshCw className={cn('h-3 w-3', loading && 'animate-spin')} />
          </Button>
        </div>
      </div>

      <div className="border-b border-muted bg-muted/20 px-3 py-1.5">
        <p className="text-[10px] text-muted-foreground">
          Hinweis: Diese Liste ist nur die Doku. Der Kanban-Status kommt aus den Supabase-Tasks.
        </p>
      </div>

      {/* Search + Filter bar */}
      <div className="space-y-2 border-b border-muted px-3 py-2">
        <CompletedTasksSearch value={filter.search ?? ''} onChange={handleSearchChange} />
        <CompletedTasksFilterBar
          filter={filter}
          onFilterChange={setFilter}
          sortField={sortField}
          sortOrder={sortOrder}
          onSortChange={handleSortChange}
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
            aria-label="Schriftgröße für erledigte Aufgaben"
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

      {/* Selection action bar */}
      {selectionMode && (
        <div className="flex items-center justify-between border-b border-violet-500/20 bg-violet-500/5 px-3 py-1.5">
          <p className="text-[10px] text-violet-300">{selectedTasks.size} ausgewählt</p>
          <Button
            size="sm"
            disabled={selectedTasks.size === 0}
            className="h-6 gap-1 bg-violet-600 px-2 text-[10px] font-medium text-white hover:bg-violet-500 disabled:opacity-40"
            onClick={handlePushSelected}
          >
            <ArrowUpFromLine className="h-3 w-3" />
            Auswahl pushen
          </Button>
        </div>
      )}

      {/* Project groups or empty filter result */}
      {filteredTasks.length === 0 && hasActiveFilters ? (
        <NoResultsState onClearFilters={handleClearFilters} />
      ) : (
        <div className="min-h-0 flex-1 overflow-y-auto px-2 py-2">
          {projectGroups.map((group) => (
            <CompletedTaskProjectGroup
              key={group.projectPath}
              projectName={group.projectName}
              projectPath={group.projectPath}
              tasks={group.tasks}
              isExpanded={!!expandedProjects[group.projectPath]}
              onToggleExpanded={() => toggleProjectExpanded(group.projectPath)}
              visibleCount={projectVisibleCounts[group.projectPath] || INITIAL_VISIBLE}
              onShowMore={() => showMoreForProject(group.projectPath)}
              fontSize={sessionFontSize}
              onDeleteTask={(fn) => void handleDelete(fn)}
              onCleanupProject={(path, toDelete) => void handleCleanupProject(path, toDelete)}
              selectionMode={selectionMode}
              selectedTasks={selectedTasks}
              onSelectionChange={handleSelectionChange}
              onSelectAllInGroup={handleSelectAllInGroup}
            />
          ))}
        </div>
      )}

      {/* Stats footer */}
      {tasks.length > 0 && statsLine && (
        <div className="border-t border-muted px-3 py-1.5">
          <p className="text-[10px] text-muted-foreground">{statsLine}</p>
        </div>
      )}

      {/* History viewer slide-over */}
      <HistoryViewerPanel
        filePath={historyFile}
        projectPath={projectPath}
        onClose={() => setHistoryFile(null)}
      />

      {/* Push to Supabase dialog */}
      {canPush && (
        <CompletedTaskPushDialog
          open={pushDialogOpen}
          onOpenChange={setPushDialogOpen}
          tasks={pushTasks}
          supabaseProjectId={supabaseProjectId!}
          userId={supabaseUser!.id}
          onComplete={handlePushComplete}
        />
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// State components
// ---------------------------------------------------------------------------

function LoadingState() {
  return (
    <div className="flex flex-col items-center justify-center gap-3 px-4 py-12 text-center">
      <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      <p className="text-xs text-muted-foreground">Erledigte Aufgaben werden geladen...</p>
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

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center gap-3 px-4 py-12 text-center">
      <CheckCircle2 className="h-10 w-10 text-muted-foreground/40" />
      <div className="space-y-1">
        <p className="text-sm font-medium text-muted-foreground">Noch keine erledigten Aufgaben</p>
        <p className="max-w-[200px] text-xs text-muted-foreground">
          Sobald die KI etwas fertigstellt, erscheint es hier.
        </p>
      </div>
    </div>
  );
}

function NoResultsState({ onClearFilters }: { onClearFilters: () => void }) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-3 px-4 py-12 text-center">
      <SearchX className="h-8 w-8 text-muted-foreground/40" />
      <div className="space-y-1">
        <p className="text-sm font-medium text-muted-foreground">Keine Aufgaben gefunden</p>
        <p className="max-w-[200px] text-xs text-muted-foreground">
          Versuche andere Suchbegriffe oder Filter.
        </p>
      </div>
      <Button variant="outline" size="sm" onClick={onClearFilters} className="gap-1.5 border-muted">
        Filter zurücksetzen
      </Button>
    </div>
  );
}
