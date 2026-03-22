/**
 * TasksPanel - Left sidebar panel for the "Tasks" tab.
 *
 * Full card layout with search, tag/status/priority filters,
 * and sorting by date, title, priority, or status.
 *
 * Default: "Alle Projekte" mode - loads tasks from ALL
 * registered projects simultaneously so tasks are always visible
 * regardless of which project is currently active.
 */

import { useCallback, useMemo, useState } from 'react';
import {
  AArrowDown,
  AArrowUp,
  AlertCircle,
  CheckSquare,
  FolderOpen,
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
  TaskFilter,
} from '@automaker/types';
import { useAppStore } from '@/store/app-store';
import { useTasks, createTask, updateTask, deleteTask } from '@/hooks/use-tasks';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { cn } from '@/lib/utils';
import { TaskCard } from './task-card';
import { CompletedTasksSearch } from './completed-tasks-search';
import { TasksFilterBar } from './tasks-filter-bar';
import { TaskCreateDialog, type CreateTaskData } from './task-create-dialog';
import { getTaskPriorityOrder, getTaskStatusOrder } from './task-utils';

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
  const { tasks, loading, error, filter, sortField, sortOrder } = useAppStore(
    useShallow((s) => ({
      tasks: s.tasks,
      loading: s.tasksLoading,
      error: s.tasksError,
      filter: s.tasksFilter,
      sortField: s.tasksSortField,
      sortOrder: s.tasksSortOrder,
    }))
  );

  const projects = useAppStore((s) => s.projects);
  const setFilter = useAppStore((s) => s.setTasksFilter);
  const setSortField = useAppStore((s) => s.setTasksSortField);
  const setSortOrder = useAppStore((s) => s.setTasksSortOrder);
  const removeFromStore = useAppStore((s) => s.removeTask);
  const updateInStore = useAppStore((s) => s.updateTaskInStore);
  const addToStore = useAppStore((s) => s.addTask);
  const sessionFontSize = useAppStore((s) => s.sessionFontSize);
  const setSessionFontSize = useAppStore((s) => s.setSessionFontSize);

  const [projectFilter, setProjectFilter] = useState<string | null>(null);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);

  // Build allProjects list for the hook (always fetch from all)
  const allProjects = useMemo(
    () => projects.map((p) => ({ path: p.path, name: p.name })),
    [projects]
  );

  // Always use multi-project mode - pass null as projectPath when we have projects
  const { refetch } = useTasks(
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
    async (filename: string) => {
      // In multi-project mode, find the task to get its projectPath
      const task = tasks.find((t) => t.filename === filename);
      const deletePath = task?.projectPath || projectPath;
      const success = await deleteTask(filename, deletePath);
      if (success) {
        removeFromStore(filename);
      }
    },
    [tasks, projectPath, removeFromStore]
  );

  const handleUpdate = useCallback(
    async (filename: string, updates: Partial<Task>) => {
      // In multi-project mode, find the task to get its projectPath
      const task = tasks.find((t) => t.filename === filename);
      const updatePath = task?.projectPath || projectPath;
      const updated = await updateTask(filename, updatePath, updates);
      if (updated) {
        updateInStore(filename, updated);
      }
    },
    [tasks, projectPath, updateInStore]
  );

  const handleCreate = useCallback(
    async (data: CreateTaskData) => {
      // Determine which project to create the task in
      const targetPath = projectFilter || projectPath;
      const today = new Date().toISOString().split('T')[0];

      const newTask = await createTask({
        title: data.title,
        description: data.description,
        priority: data.priority,
        status: data.status,
        tags: data.tags,
        summary: data.summary,
        date: today,
        projectPath: targetPath,
      });
      if (newTask) {
        addToStore(newTask);
      }
    },
    [projectFilter, projectPath, addToStore]
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
    return (
      <EmptyState
        onCreate={() => {
          setEditingTask(null);
          setCreateDialogOpen(true);
        }}
        dialogOpen={createDialogOpen}
        onDialogClose={handleDialogClose}
        onSave={handleCreate}
      />
    );
  }

  return (
    <div className="flex h-full min-h-0 flex-col">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-muted px-3 py-2">
        <h3 className="text-xs font-semibold text-muted-foreground">
          Tasks ({filteredTasks.length})
        </h3>
        <div className="flex items-center gap-1">
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
            className="h-6 w-6 p-0"
            onClick={() => void refetch()}
            title="Aktualisieren"
          >
            <RefreshCw className={cn('h-3 w-3', loading && 'animate-spin')} />
          </Button>
        </div>
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
            aria-label="Schriftgröße für Tasks"
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
      {tasks.length > 0 && statsLine && (
        <div className="border-t border-muted px-3 py-1.5">
          <p className="text-[10px] text-muted-foreground">{statsLine}</p>
        </div>
      )}

      {/* Create/Edit Dialog */}
      <TaskCreateDialog
        open={createDialogOpen}
        onOpenChange={handleDialogClose}
        onSave={editingTask ? handleSaveEdit : handleCreate}
        editTask={editingTask ?? undefined}
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
  onCreate: () => void;
  dialogOpen: boolean;
  onDialogClose: (open: boolean) => void;
  onSave: (data: CreateTaskData) => void;
}

function EmptyState({ onCreate, dialogOpen, onDialogClose, onSave }: EmptyStateProps) {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-3 px-4 py-12 text-center">
      <CheckSquare className="h-10 w-10 text-muted-foreground/40" />
      <div className="space-y-1">
        <p className="text-sm font-medium text-muted-foreground">Noch keine Tasks</p>
        <p className="max-w-[200px] text-xs text-muted-foreground">
          Erstelle deinen ersten Task, um loszulegen.
        </p>
      </div>
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
