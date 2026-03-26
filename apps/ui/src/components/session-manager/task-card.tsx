/**
 * TaskCard - A single card for a task in the Tasks tab.
 *
 * Displays checkbox, priority dot, title, status/priority/tag badges,
 * description preview, and action buttons (status cycle, copy, edit, delete).
 */

import { useCallback, useState } from 'react';
import {
  Loader2,
  Trash2,
  Clock,
  Copy,
  Check,
  Pencil,
  ChevronDown,
  ChevronUp,
  Circle,
  CheckCircle2,
  PlayCircle,
} from 'lucide-react';
import type { Task, TaskStatus, TaskPriority } from '@automaker/types';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import {
  useTaskChatBridgeStore,
  getTaskExecutionKey,
  type TaskExecutionState,
} from '@/store/task-chat-bridge-store';
import {
  getTaskStatusColor,
  getTaskStatusDotColor,
  getTaskStatusLabel,
  getTaskPriorityColor,
  getTaskPriorityDotColor,
  getTaskPriorityShortLabel,
  formatRelativeTime,
} from './task-utils';
import { TaskSendToAgent } from './task-send-to-agent';

// ---------------------------------------------------------------------------
// Status cycle helper
// ---------------------------------------------------------------------------

const STATUS_CYCLE: TaskStatus[] = ['open', 'in_progress', 'done'];

function getNextStatus(current: TaskStatus): TaskStatus {
  const idx = STATUS_CYCLE.indexOf(current);
  return STATUS_CYCLE[(idx + 1) % STATUS_CYCLE.length];
}

function getStatusIcon(status: TaskStatus) {
  switch (status) {
    case 'done':
      return CheckCircle2;
    case 'in_progress':
      return PlayCircle;
    default:
      return Circle;
  }
}

function getExecutionBadgeConfig(
  executionState: TaskExecutionState | null
): { label: string; className: string } | null {
  if (!executionState) return null;

  switch (executionState.state) {
    case 'starting':
      return {
        label: 'Gestartet',
        className: 'border-sky-500/30 bg-sky-500/10 text-sky-400',
      };
    case 'running':
      return {
        label: 'Läuft',
        className: 'border-amber-500/30 bg-amber-500/10 text-amber-400',
      };
    case 'completed':
      return {
        label: 'Fertig',
        className: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-400',
      };
    case 'failed':
      return {
        label: 'Fehlgeschlagen',
        className: 'border-rose-500/30 bg-rose-500/10 text-rose-400',
      };
    default:
      return null;
  }
}

// ---------------------------------------------------------------------------
// Clipboard helper - builds full-context text for pasting into chat
// ---------------------------------------------------------------------------

function buildCopyText(task: Task): string {
  const parts: string[] = [];
  parts.push(`## Task: ${task.title}`);
  parts.push('');
  parts.push(
    `**Status:** ${getTaskStatusLabel(task.status)} | **Prioritaet:** ${task.priority || 'Keine'} | **Tags:** ${task.tags.length > 0 ? task.tags.join(', ') : '-'}`
  );
  parts.push('');
  if (task.description) {
    parts.push(task.description);
    parts.push('');
  }
  if (task.summary) {
    parts.push(task.summary);
  }
  return parts.join('\n');
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

interface TaskCardProps {
  task: Task;
  onUpdate?: (filename: string, updates: Partial<Task>) => void;
  onDelete?: (filename: string) => void;
  onEdit?: (task: Task) => void;
  fontSize?: number;
}

export function TaskCard({ task, onUpdate, onDelete, onEdit, fontSize = 14 }: TaskCardProps) {
  const [deleting, setDeleting] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleDelete = useCallback(() => {
    if (!onDelete || deleting) return;
    setDeleting(true);
    onDelete(task.filename);
  }, [task.filename, onDelete, deleting]);

  const handleCopy = useCallback(async () => {
    const text = buildCopyText(task);
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback: select-copy not available in some contexts
    }
  }, [task]);

  const handleStatusCycle = useCallback(() => {
    if (!onUpdate) return;
    const nextStatus = getNextStatus(task.status);
    onUpdate(task.filename, { status: nextStatus });
  }, [task.filename, task.status, onUpdate]);

  const handleCheckboxToggle = useCallback(() => {
    if (!onUpdate) return;
    const nextStatus: TaskStatus = task.status === 'done' ? 'open' : 'done';
    onUpdate(task.filename, { status: nextStatus });
  }, [task.filename, task.status, onUpdate]);

  const isDone = task.status === 'done';
  const executionState = useTaskChatBridgeStore(
    (s) =>
      s.taskExecutionStates[
        getTaskExecutionKey({
          taskId: task.filename,
          source: 'file',
        })
      ] ?? null
  );
  const executionBadge = getExecutionBadgeConfig(executionState);
  const hasSummary = !!task.summary;
  const StatusIcon = getStatusIcon(task.status);
  const titleSize = Math.max(11, fontSize);
  const bodySize = Math.max(10, fontSize - 2);
  const metaSize = Math.max(9, fontSize - 4);

  return (
    <div
      className={cn(
        'group rounded-lg border border-muted p-3 transition-all duration-150',
        'hover:bg-muted/30 hover:shadow-sm hover:border-muted-foreground/20',
        'cursor-default',
        isDone && 'opacity-70'
      )}
    >
      {/* Header: Checkbox + Priority Dot + Title + Actions */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex min-w-0 items-center gap-2">
          {/* Checkbox */}
          <button
            type="button"
            className={cn(
              'flex h-4 w-4 shrink-0 items-center justify-center rounded border transition-colors',
              isDone
                ? 'border-emerald-500 bg-emerald-500 text-white'
                : 'border-muted-foreground/40 hover:border-muted-foreground'
            )}
            onClick={handleCheckboxToggle}
            title={isDone ? 'Als offen markieren' : 'Als erledigt markieren'}
          >
            {isDone && <Check className="h-3 w-3" />}
          </button>

          {/* Priority Dot */}
          {task.priority && (
            <span
              className={cn(
                'h-2 w-2 shrink-0 rounded-full',
                getTaskPriorityDotColor(task.priority)
              )}
              title={`Prioritaet: ${task.priority}`}
            />
          )}

          {/* Title */}
          <span
            className={cn(
              'min-w-0 truncate text-sm font-medium',
              isDone && 'line-through text-muted-foreground'
            )}
            style={{ fontSize: `${titleSize}px` }}
          >
            {task.title}
          </span>
        </div>

        {/* Action buttons (visible on hover) */}
        <div className="flex shrink-0 items-center gap-0.5">
          {/* Send to Agent button */}
          <TaskSendToAgent task={task} />

          {/* Status cycle button */}
          <Button
            variant="ghost"
            size="sm"
            className="h-5 w-5 p-0 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100 hover:text-foreground"
            onClick={handleStatusCycle}
            title={`Status: ${getTaskStatusLabel(task.status)} - Klicken zum Aendern`}
          >
            <StatusIcon
              className={cn('h-3 w-3', getTaskStatusDotColor(task.status).replace('bg-', 'text-'))}
            />
          </Button>

          {/* Copy button */}
          <Button
            variant="ghost"
            size="sm"
            className="h-5 w-5 p-0 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100 hover:text-foreground"
            onClick={() => void handleCopy()}
            title="Task kopieren"
          >
            {copied ? <Check className="h-3 w-3 text-emerald-500" /> : <Copy className="h-3 w-3" />}
          </Button>

          {/* Edit button */}
          {onEdit && (
            <Button
              variant="ghost"
              size="sm"
              className="h-5 w-5 p-0 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100 hover:text-foreground"
              onClick={() => onEdit(task)}
              title="Task bearbeiten"
            >
              <Pencil className="h-3 w-3" />
            </Button>
          )}

          {/* Delete button */}
          {onDelete && (
            <Button
              variant="ghost"
              size="sm"
              className="h-5 w-5 p-0 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100 hover:text-destructive"
              onClick={handleDelete}
              disabled={deleting}
              title="Task loeschen"
            >
              {deleting ? (
                <Loader2 className="h-3 w-3 animate-spin" />
              ) : (
                <Trash2 className="h-3 w-3" />
              )}
            </Button>
          )}
        </div>
      </div>

      {/* Badges row: Status, Priority, Tags */}
      <div className="mt-1.5 flex flex-wrap gap-1" style={{ fontSize: `${metaSize}px` }}>
        {/* Status badge */}
        <Badge size="sm" className={cn('gap-1 border', getTaskStatusColor(task.status))}>
          {getTaskStatusLabel(task.status)}
        </Badge>

        {executionBadge && (
          <Badge size="sm" className={cn('gap-1 border', executionBadge.className)}>
            {executionBadge.label}
          </Badge>
        )}

        {/* Priority badge */}
        {task.priority && (
          <Badge size="sm" className={cn('gap-1 border', getTaskPriorityColor(task.priority))}>
            {getTaskPriorityShortLabel(task.priority)}
          </Badge>
        )}

        {/* Tag chips */}
        {task.tags.map((tag: string) => (
          <Badge key={tag} variant="outline" size="sm">
            {tag}
          </Badge>
        ))}

        {/* Expand button (if has summary) */}
        {hasSummary && (
          <Badge
            variant="outline"
            size="sm"
            className="cursor-pointer gap-0.5 hover:bg-muted/50"
            onClick={() => setExpanded((v) => !v)}
            title={expanded ? 'Details einklappen' : 'Details anzeigen'}
          >
            Details
            {expanded ? (
              <ChevronUp className="h-2.5 w-2.5" />
            ) : (
              <ChevronDown className="h-2.5 w-2.5" />
            )}
          </Badge>
        )}
      </div>

      {/* Description preview (line-clamp-2) */}
      {task.description && !expanded && (
        <p
          className="mt-1.5 line-clamp-2 text-xs text-muted-foreground"
          style={{ fontSize: `${bodySize}px` }}
        >
          {task.description}
        </p>
      )}

      {/* Expanded view (full description + summary) */}
      {expanded && (
        <div className="mt-2 space-y-2">
          {task.description && (
            <p className="text-xs text-muted-foreground" style={{ fontSize: `${bodySize}px` }}>
              {task.description}
            </p>
          )}
          {task.summary && (
            <div className="rounded-md border border-muted bg-muted/20 p-2">
              <p
                className="mb-1 text-[10px] font-medium text-muted-foreground"
                style={{ fontSize: `${metaSize}px` }}
              >
                Details
              </p>
              <p
                className="whitespace-pre-wrap text-xs text-muted-foreground"
                style={{ fontSize: `${bodySize}px` }}
              >
                {task.summary}
              </p>
            </div>
          )}
        </div>
      )}

      {executionState?.state === 'failed' && executionState.errorMessage && (
        <p
          className="mt-1.5 rounded-md border border-rose-500/20 bg-rose-500/5 px-2 py-1 text-[10px] text-rose-400"
          style={{ fontSize: `${metaSize}px` }}
        >
          {executionState.errorMessage}
        </p>
      )}

      {/* Footer: project name + relative time + date */}
      <div
        className="mt-1.5 flex items-center gap-1.5 text-[10px] text-muted-foreground"
        style={{ fontSize: `${metaSize}px` }}
      >
        {task.projectName && (
          <>
            <span
              className="max-w-[100px] truncate font-medium text-muted-foreground/80"
              title={task.projectPath}
            >
              {task.projectName}
            </span>
            <span className="opacity-40">|</span>
          </>
        )}
        <Clock className="h-3 w-3" />
        <span>{formatRelativeTime(task.date)}</span>
        {task.date && <span className="ml-1 opacity-60">({task.date})</span>}
      </div>
    </div>
  );
}
