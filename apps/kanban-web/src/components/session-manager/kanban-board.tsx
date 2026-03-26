/**
 * KanbanBoard - Three-column Kanban board for Supabase tasks.
 *
 * Columns: "To Do", "In Progress", "Completed".
 * Each column shows tasks filtered by status with a count badge.
 * Floating FAB + bottom drawer for task creation.
 */

import { useCallback, useMemo, useState } from 'react';
import {
  CircleDot,
  Loader2,
  Play,
  CheckCircle2,
  Plus,
  AlertCircle,
  RefreshCw,
  Inbox,
} from 'lucide-react';
import type { SupabaseTask, UpdateTaskInput, CreateTaskInput } from '@ui/hooks/use-supabase-tasks';
import { Button } from '@ui/components/ui/button';
import { cn } from '@ui/lib/utils';
import { KanbanTaskCard } from './kanban-task-card';
import { KanbanTaskDrawer } from './kanban-task-drawer';

// ---------------------------------------------------------------------------
// Column definitions
// ---------------------------------------------------------------------------

type KanbanStatus = 'todo' | 'in_progress' | 'completed';

interface ColumnDef {
  status: KanbanStatus;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  headerColor: string;
  dotColor: string;
  countBg: string;
}

const COLUMNS: ColumnDef[] = [
  {
    status: 'todo',
    label: 'To Do',
    icon: CircleDot,
    headerColor: 'text-cyan-400',
    dotColor: 'bg-cyan-500',
    countBg: 'bg-cyan-500/15 text-cyan-400',
  },
  {
    status: 'in_progress',
    label: 'In Progress',
    icon: Play,
    headerColor: 'text-orange-400',
    dotColor: 'bg-orange-500',
    countBg: 'bg-orange-500/15 text-orange-400',
  },
  {
    status: 'completed',
    label: 'Completed',
    icon: CheckCircle2,
    headerColor: 'text-emerald-400',
    dotColor: 'bg-emerald-500',
    countBg: 'bg-emerald-500/15 text-emerald-400',
  },
];

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface KanbanBoardProps {
  tasks: SupabaseTask[];
  loading: boolean;
  error: string | null;
  projectId: string | null;
  onUpdateTask: (id: string, updates: UpdateTaskInput) => Promise<SupabaseTask | null>;
  onDeleteTask: (id: string) => Promise<boolean>;
  onCreateTask: (input: CreateTaskInput) => Promise<SupabaseTask | null>;
  onRefetch: () => Promise<void>;
  onEditTask?: (task: SupabaseTask) => void;
  showSendToAgent?: boolean;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function KanbanBoard({
  tasks,
  loading,
  error,
  projectId,
  onUpdateTask,
  onDeleteTask,
  onCreateTask,
  onRefetch,
  onEditTask,
  showSendToAgent = true,
}: KanbanBoardProps) {
  const [drawerOpen, setDrawerOpen] = useState(false);

  // Group tasks by status
  const grouped = useMemo(() => {
    const map: Record<KanbanStatus, SupabaseTask[]> = {
      todo: [],
      in_progress: [],
      completed: [],
    };
    for (const task of tasks) {
      if (task.status === 'todo' || task.status === 'in_progress' || task.status === 'completed') {
        map[task.status].push(task);
      }
    }
    return map;
  }, [tasks]);

  const openDrawer = useCallback(() => {
    setDrawerOpen(true);
  }, []);

  // Full-page loading
  if (loading && tasks.length === 0) {
    return (
      <div className="flex h-full items-center justify-center bg-zinc-950">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-zinc-600" />
          <p className="text-sm text-zinc-500">Tasks werden geladen...</p>
        </div>
      </div>
    );
  }

  // Full-page error
  if (error && tasks.length === 0) {
    return (
      <div className="flex h-full items-center justify-center bg-zinc-950">
        <div className="flex flex-col items-center gap-3 text-center">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-rose-500/10">
            <AlertCircle className="h-5 w-5 text-rose-400" />
          </div>
          <p className="text-sm font-medium text-zinc-300">Fehler beim Laden</p>
          <p className="max-w-xs text-xs text-zinc-500">{error}</p>
          <Button
            variant="outline"
            size="sm"
            onClick={() => void onRefetch()}
            className="gap-1.5 border-white/5 bg-zinc-900 text-zinc-300 hover:bg-white/5"
          >
            <RefreshCw className="h-3 w-3" />
            Erneut laden
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="relative flex h-full min-h-0 flex-col bg-zinc-950">
      {/* Inline error banner */}
      {error && tasks.length > 0 && (
        <div className="mx-4 mb-2 flex items-center justify-between gap-2 rounded-md border border-rose-500/20 bg-rose-500/5 px-3 py-1.5">
          <p className="text-xs text-zinc-400">{error}</p>
          <Button
            size="sm"
            variant="outline"
            onClick={() => void onRefetch()}
            className="h-6 text-xs border-white/5 bg-zinc-900 text-zinc-300 hover:bg-white/5"
          >
            Erneut laden
          </Button>
        </div>
      )}

      {/* Columns grid */}
      <div className="grid min-h-0 flex-1 gap-4 p-4 md:grid-cols-3">
        {COLUMNS.map((col) => (
          <KanbanColumn
            key={col.status}
            column={col}
            tasks={grouped[col.status]}
            loading={loading}
            onDeleteTask={onDeleteTask}
            onEditTask={onEditTask}
            showSendToAgent={showSendToAgent}
            onAddClick={() => openDrawer()}
          />
        ))}
      </div>

      {/* Floating FAB */}
      <button
        onClick={() => openDrawer()}
        className={cn(
          'absolute bottom-14 right-6 z-30',
          'flex h-12 w-12 items-center justify-center rounded-full',
          'bg-cyan-600 text-white shadow-lg shadow-cyan-500/20',
          'transition-all duration-200 hover:bg-cyan-500 hover:shadow-cyan-500/30 hover:scale-105',
          'active:scale-95'
        )}
        title="Neuen Task erstellen"
      >
        <Plus className="h-5 w-5" />
      </button>

      {/* Footer stats */}
      <div className="border-t border-white/5 px-4 py-2">
        <p className="text-xs text-zinc-500">
          {tasks.length} Tasks insgesamt
          {' -- '}
          {grouped.todo.length} offen
          {' -- '}
          {grouped.in_progress.length} in Arbeit
          {' -- '}
          {grouped.completed.length} erledigt
          {loading && <Loader2 className="ml-2 inline-block h-3 w-3 animate-spin text-zinc-600" />}
        </p>
      </div>

      {/* Task creation drawer */}
      <KanbanTaskDrawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        onCreateTask={onCreateTask}
        projectId={projectId}
      />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Single Column (simplified - no inline quick-add)
// ---------------------------------------------------------------------------

interface KanbanColumnProps {
  column: ColumnDef;
  tasks: SupabaseTask[];
  loading: boolean;
  onDeleteTask: (id: string) => Promise<boolean>;
  onEditTask?: (task: SupabaseTask) => void;
  showSendToAgent?: boolean;
  onAddClick: () => void;
}

function KanbanColumn({
  column,
  tasks,
  loading,
  onDeleteTask,
  onEditTask,
  showSendToAgent = true,
  onAddClick,
}: KanbanColumnProps) {
  const Icon = column.icon;

  return (
    <div className="flex min-h-0 flex-col rounded-xl border border-white/5 bg-zinc-900/50">
      {/* Column header */}
      <div className="flex items-center justify-between border-b border-white/5 px-3 py-2.5">
        <div className="flex items-center gap-2">
          <span className={cn('h-2 w-2 rounded-full', column.dotColor)} />
          <Icon className={cn('h-4 w-4', column.headerColor)} />
          <span className="text-sm font-semibold text-zinc-300">{column.label}</span>
          <span
            className={cn(
              'ml-1 inline-flex h-5 min-w-[20px] items-center justify-center rounded-full px-1.5 text-[10px] font-semibold',
              column.countBg
            )}
          >
            {tasks.length}
          </span>
        </div>
        <Button
          variant="ghost"
          size="sm"
          className="h-6 w-6 p-0 text-zinc-600 hover:text-cyan-400 hover:bg-cyan-500/10"
          onClick={onAddClick}
          title="Neuen Task hinzufügen"
        >
          <Plus className="h-3.5 w-3.5" />
        </Button>
      </div>

      {/* Task cards list */}
      <div className="min-h-0 flex-1 space-y-2 overflow-y-auto p-2">
        {tasks.length === 0 && !loading ? (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <Inbox className="mb-2 h-6 w-6 text-zinc-700" />
            <p className="text-xs text-zinc-600">Keine Tasks</p>
          </div>
        ) : (
          tasks.map((task) => (
            <KanbanTaskCard
              key={task.id}
              task={task}
              onDeleteTask={onDeleteTask}
              onEditTask={onEditTask}
              showSendToAgent={showSendToAgent}
            />
          ))
        )}
      </div>
    </div>
  );
}
