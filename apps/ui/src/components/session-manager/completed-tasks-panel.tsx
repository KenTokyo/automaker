/**
 * CompletedTasksPanel - Left sidebar panel for the "Fertig" (Done) tab.
 *
 * Full card layout with project filter, search, tag/status/effort filters,
 * and sorting by date, title, or effort.
 *
 * Default: "Alle Projekte" mode — loads completed tasks from ALL
 * registered projects simultaneously so tasks are always visible
 * regardless of which project is currently active.
 */

import { useCallback, useMemo, useState } from 'react';
import {
  AArrowDown,
  AArrowUp,
  AlertCircle,
  CheckCircle2,
  FolderOpen,
  Loader2,
  RefreshCw,
  SearchX,
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
import { useCompletedTasks, deleteCompletedTask } from '@/hooks/use-completed-tasks';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { cn } from '@/lib/utils';
import { CompletedTaskCard } from './completed-task-card';
import { CompletedTasksSearch } from './completed-tasks-search';
import { CompletedTasksFilterBar } from './completed-tasks-filter-bar';
import { HistoryViewerPanel } from './history-viewer-panel';
import { getStatusLabel } from './completed-task-utils';

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
  effort: CompletedTaskEffort[] | undefined,
  projectFilter: string | null
): CompletedTask[] {
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
// Project filter constants
// ---------------------------------------------------------------------------

const ALL_PROJECTS_VALUE = '__all__';

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
  // Project filter: null = all projects
  const [projectFilter, setProjectFilter] = useState<string | null>(null);

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

  // Apply local filtering + sorting
  const filteredTasks = useMemo(() => {
    const filtered = filterTasksLocal(
      tasks,
      filter.search,
      filter.tags,
      filter.status,
      filter.effort,
      projectFilter
    );
    return sortTasks(filtered, sortField, sortOrder);
  }, [tasks, filter, sortField, sortOrder, projectFilter]);

  const hasActiveFilters = !!(
    filter.search ||
    filter.tags?.length ||
    filter.status?.length ||
    filter.effort?.length ||
    projectFilter
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
      // In multi-project mode, find the task to get its projectPath
      const task = tasks.find((t) => t.filename === filename);
      const deletePath = task?.projectPath || projectPath;
      const success = await deleteCompletedTask(filename, deletePath);
      if (success) {
        removeFromStore(filename);
      }
    },
    [tasks, projectPath, removeFromStore]
  );

  const handleClearFilters = useCallback(() => {
    setFilter({});
    setProjectFilter(null);
  }, [setFilter]);

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

      {/* Project filter (only show if multiple projects have tasks) */}
      {projectsInTasks.length > 1 && (
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

      {/* Task cards or empty filter result */}
      {filteredTasks.length === 0 && hasActiveFilters ? (
        <NoResultsState onClearFilters={handleClearFilters} />
      ) : (
        <div className="min-h-0 flex-1 space-y-2 overflow-y-auto px-2 py-2">
          {filteredTasks.map((task) => (
            <CompletedTaskCard
              key={`${task.projectPath || ''}:${task.filename}`}
              task={task}
              fontSize={sessionFontSize}
              onDelete={(fn) => void handleDelete(fn)}
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
