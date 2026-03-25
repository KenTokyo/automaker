/**
 * KanbanTaskCard - Compact card for a single task inside a Kanban column.
 *
 * Shows title, priority badge, tags, creation date, and quick status-change buttons.
 * Clicking the card toggles an expanded detail view.
 */

import { useCallback, useState } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  ChevronDown,
  ChevronUp,
  Clock,
  Trash2,
  Loader2,
  Pencil,
} from 'lucide-react';
import type { SupabaseTask, UpdateTaskInput } from '@/hooks/use-supabase-tasks';
import type { TaskStatus } from '@/lib/supabase-types';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { SupabaseTaskSendToAgent } from './task-send-to-agent';
import { useTaskAttachments } from '@/hooks/use-task-attachments';
import { AttachmentCountBadge, TaskAttachmentPreview } from './task-attachment-preview';

// ---------------------------------------------------------------------------
// Status helpers
// ---------------------------------------------------------------------------

const STATUS_ORDER: TaskStatus[] = ['todo', 'in_progress', 'completed'];

function getPrevStatus(current: TaskStatus): TaskStatus | null {
  const idx = STATUS_ORDER.indexOf(current);
  return idx > 0 ? STATUS_ORDER[idx - 1] : null;
}

function getNextStatus(current: TaskStatus): TaskStatus | null {
  const idx = STATUS_ORDER.indexOf(current);
  return idx < STATUS_ORDER.length - 1 ? STATUS_ORDER[idx + 1] : null;
}

const STATUS_LABELS: Record<TaskStatus, string> = {
  todo: 'To Do',
  in_progress: 'In Progress',
  completed: 'Completed',
};

// ---------------------------------------------------------------------------
// Priority helpers
// ---------------------------------------------------------------------------

const PRIORITY_DOT_COLORS: Record<string, string> = {
  P1: 'bg-rose-500',
  P2: 'bg-orange-500',
  P3: 'bg-cyan-500',
  P4: 'bg-zinc-600',
};

const PRIORITY_BADGE_COLORS: Record<string, string> = {
  P1: 'text-rose-400 bg-rose-500/10 border-rose-500/20',
  P2: 'text-orange-400 bg-orange-500/10 border-orange-500/20',
  P3: 'text-cyan-400 bg-cyan-500/10 border-cyan-500/20',
  P4: 'text-zinc-500 bg-zinc-800/50 border-zinc-700/30',
};

function formatRelativeTime(dateString: string): string {
  const date = new Date(dateString);
  if (isNaN(date.getTime())) return dateString;

  const diff = Date.now() - date.getTime();
  const minutes = Math.floor(diff / 60_000);
  if (minutes < 1) return 'gerade eben';
  if (minutes < 60) return `vor ${minutes} Min`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `vor ${hours} Std`;
  const days = Math.floor(hours / 24);
  if (days === 0) return 'heute';
  if (days === 1) return 'gestern';
  if (days < 7) return `vor ${days} Tagen`;
  return date.toLocaleDateString('de-DE', {
    day: '2-digit',
    month: '2-digit',
    year: '2-digit',
  });
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

interface KanbanTaskCardProps {
  task: SupabaseTask;
  onUpdateTask: (id: string, updates: UpdateTaskInput) => Promise<SupabaseTask | null>;
  onDeleteTask: (id: string) => Promise<boolean>;
  onEditTask?: (task: SupabaseTask) => void;
}

export function KanbanTaskCard({
  task,
  onUpdateTask,
  onDeleteTask,
  onEditTask,
}: KanbanTaskCardProps) {
  const [expanded, setExpanded] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [updating, setUpdating] = useState(false);
  const { attachments } = useTaskAttachments(task.id);
  const attachmentCount = attachments.length;

  const prevStatus = getPrevStatus(task.status);
  const nextStatus = getNextStatus(task.status);

  const handleStatusChange = useCallback(
    async (newStatus: TaskStatus) => {
      if (updating) return;
      setUpdating(true);
      try {
        await onUpdateTask(task.id, { status: newStatus });
      } finally {
        setUpdating(false);
      }
    },
    [task.id, onUpdateTask, updating]
  );

  const handleDelete = useCallback(async () => {
    if (deleting) return;
    setDeleting(true);
    try {
      await onDeleteTask(task.id);
    } finally {
      setDeleting(false);
    }
  }, [task.id, onDeleteTask, deleting]);

  const isCompleted = task.status === 'completed';

  return (
    <div
      className={cn(
        'group rounded-lg border border-white/5 bg-zinc-900/80 p-2.5 transition-all duration-150',
        'hover:border-white/10 hover:bg-zinc-900',
        'cursor-pointer',
        isCompleted && 'opacity-60'
      )}
      onClick={() => setExpanded((v) => !v)}
    >
      {/* Title row */}
      <div className="flex items-start gap-2">
        {/* Priority dot */}
        {task.priority && (
          <span
            className={cn(
              'mt-1 h-2 w-2 shrink-0 rounded-full',
              PRIORITY_DOT_COLORS[task.priority] ?? 'bg-zinc-600'
            )}
            title={`Prioritaet: ${task.priority}`}
          />
        )}

        <span
          className={cn(
            'min-w-0 flex-1 text-sm font-medium leading-tight text-zinc-300',
            isCompleted && 'line-through text-zinc-600'
          )}
        >
          {task.title}
        </span>

        {/* Expand indicator */}
        <span className="shrink-0 text-zinc-600">
          {expanded ? (
            <ChevronUp className="h-3.5 w-3.5" />
          ) : (
            <ChevronDown className="h-3.5 w-3.5" />
          )}
        </span>
      </div>

      {/* Badges: priority + tags */}
      <div className="mt-1.5 flex flex-wrap gap-1">
        {task.priority && (
          <Badge
            size="sm"
            className={cn(
              'gap-0.5 border',
              PRIORITY_BADGE_COLORS[task.priority] ??
                'text-zinc-500 bg-zinc-800/50 border-zinc-700/30'
            )}
          >
            {task.priority}
          </Badge>
        )}
        {task.tags.map((tag) => (
          <Badge
            key={tag}
            variant="outline"
            size="sm"
            className="bg-zinc-800/50 text-zinc-400 border-zinc-700/30"
          >
            {tag}
          </Badge>
        ))}
      </div>

      {/* Date row + attachment count */}
      <div className="mt-1.5 flex items-center gap-1.5 text-[10px] text-zinc-600">
        <div className="flex items-center gap-1">
          <Clock className="h-2.5 w-2.5" />
          <span>{formatRelativeTime(task.createdAt)}</span>
        </div>
        {attachmentCount > 0 && <AttachmentCountBadge count={attachmentCount} />}
      </div>

      {/* Expanded detail view */}
      {expanded && (
        <div
          className="mt-2 space-y-2 border-t border-white/5 pt-2"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Description */}
          {task.description && (
            <p className="text-xs leading-relaxed text-zinc-400">{task.description}</p>
          )}

          {/* Summary / Details */}
          {task.summary && (
            <div className="rounded-md border border-white/5 bg-zinc-800/30 p-2">
              <p className="mb-0.5 text-[10px] font-medium text-zinc-500">Details</p>
              <p className="whitespace-pre-wrap text-xs text-zinc-400">{task.summary}</p>
            </div>
          )}

          {/* Attachments */}
          {attachmentCount > 0 && (
            <div className="space-y-1">
              <p className="text-[10px] font-medium text-zinc-500">Anhaenge</p>
              <TaskAttachmentPreview taskId={task.id} editable />
            </div>
          )}

          {/* Status change + action buttons */}
          <div className="flex items-center justify-between gap-1">
            <div className="flex items-center gap-1">
              {/* Move left (previous status) */}
              {prevStatus && (
                <Button
                  variant="outline"
                  size="sm"
                  className={cn(
                    'h-6 gap-1 px-2 text-[10px] border-white/5 bg-zinc-800/50',
                    prevStatus === 'todo' &&
                      'text-cyan-400 hover:bg-cyan-500/10 hover:border-cyan-500/20',
                    prevStatus === 'in_progress' &&
                      'text-orange-400 hover:bg-orange-500/10 hover:border-orange-500/20'
                  )}
                  onClick={() => void handleStatusChange(prevStatus)}
                  disabled={updating}
                  title={`Verschieben nach ${STATUS_LABELS[prevStatus]}`}
                >
                  <ArrowLeft className="h-3 w-3" />
                  {STATUS_LABELS[prevStatus]}
                </Button>
              )}

              {/* Move right (next status) */}
              {nextStatus && (
                <Button
                  variant="outline"
                  size="sm"
                  className={cn(
                    'h-6 gap-1 px-2 text-[10px] border-white/5 bg-zinc-800/50',
                    nextStatus === 'in_progress' &&
                      'text-orange-400 hover:bg-orange-500/10 hover:border-orange-500/20',
                    nextStatus === 'completed' &&
                      'text-emerald-400 hover:bg-emerald-500/10 hover:border-emerald-500/20'
                  )}
                  onClick={() => void handleStatusChange(nextStatus)}
                  disabled={updating}
                  title={`Verschieben nach ${STATUS_LABELS[nextStatus]}`}
                >
                  {STATUS_LABELS[nextStatus]}
                  <ArrowRight className="h-3 w-3" />
                </Button>
              )}
            </div>

            <div className="flex items-center gap-0.5">
              {/* Send to Agent */}
              <SupabaseTaskSendToAgent
                task={task}
                onStatusChange={(id, status) => {
                  void onUpdateTask(id, { status: status as TaskStatus });
                }}
              />

              {/* Edit */}
              {onEditTask && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 w-6 p-0 text-zinc-600 hover:text-violet-400 hover:bg-violet-500/10"
                  onClick={() => onEditTask(task)}
                  title="Task bearbeiten"
                >
                  <Pencil className="h-3 w-3" />
                </Button>
              )}

              {/* Delete */}
              <Button
                variant="ghost"
                size="sm"
                className="h-6 w-6 p-0 text-zinc-600 hover:text-rose-400 hover:bg-rose-500/10"
                onClick={() => void handleDelete()}
                disabled={deleting}
                title="Task loeschen"
              >
                {deleting ? (
                  <Loader2 className="h-3 w-3 animate-spin" />
                ) : (
                  <Trash2 className="h-3 w-3" />
                )}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
