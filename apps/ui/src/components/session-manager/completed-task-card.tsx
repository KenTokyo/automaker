/**
 * CompletedTaskCard - A single card for a completed task in the Done tab.
 *
 * Displays status dot, title, tags as chips, effort badge,
 * attempt badge (if > 1), provider badge, and relative time.
 */

import { useCallback, useState } from 'react';
import { Loader2, Trash2, Clock } from 'lucide-react';
import type { CompletedTask } from '@automaker/types';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import {
  getStatusColor,
  getStatusDotColor,
  getStatusLabel,
  getEffortLabel,
  getEffortColor,
  formatRelativeTime,
} from './completed-task-utils';

interface CompletedTaskCardProps {
  task: CompletedTask;
  onDelete?: (filename: string) => void;
}

export function CompletedTaskCard({ task, onDelete }: CompletedTaskCardProps) {
  const [deleting, setDeleting] = useState(false);

  const handleDelete = useCallback(() => {
    if (!onDelete || deleting) return;
    setDeleting(true);
    onDelete(task.filename);
  }, [task.filename, onDelete, deleting]);

  return (
    <div
      className={cn(
        'group rounded-lg border border-muted p-3 transition-all duration-150',
        'hover:bg-muted/30 hover:shadow-sm hover:border-muted-foreground/20',
        'cursor-default'
      )}
    >
      {/* Header: Status dot + Title + Delete */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex min-w-0 items-center gap-2">
          <span
            className={cn('h-2 w-2 shrink-0 rounded-full', getStatusDotColor(task.status))}
            title={getStatusLabel(task.status)}
          />
          <span className="min-w-0 truncate text-sm font-medium">{task.title}</span>
        </div>
        {onDelete && (
          <Button
            variant="ghost"
            size="sm"
            className="h-5 w-5 shrink-0 p-0 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100 hover:text-destructive"
            onClick={handleDelete}
            disabled={deleting}
            title="Aufgabe entfernen"
          >
            {deleting ? (
              <Loader2 className="h-3 w-3 animate-spin" />
            ) : (
              <Trash2 className="h-3 w-3" />
            )}
          </Button>
        )}
      </div>

      {/* Badges row: Status, Effort, Attempt, Provider, Tags */}
      <div className="mt-1.5 flex flex-wrap gap-1">
        {/* Status badge */}
        <Badge size="sm" className={cn('gap-1 border', getStatusColor(task.status))}>
          {getStatusLabel(task.status)}
        </Badge>

        {/* Effort badge */}
        {task.effort && (
          <Badge size="sm" className={cn('gap-1 border', getEffortColor(task.effort))}>
            {getEffortLabel(task.effort)}
          </Badge>
        )}

        {/* Attempt badge (only if > 1) */}
        {task.attempt > 1 && (
          <Badge variant="outline" size="sm" title={`Versuch ${task.attempt}`}>
            #{task.attempt}
          </Badge>
        )}

        {/* Provider badge */}
        {task.provider && (
          <Badge variant="outline" size="sm">
            {task.provider}
          </Badge>
        )}

        {/* Tag chips */}
        {task.tags.map((tag) => (
          <Badge key={tag} variant="outline" size="sm">
            {tag}
          </Badge>
        ))}
      </div>

      {/* Description (if present) */}
      {task.description && (
        <p className="mt-1.5 line-clamp-2 text-xs text-muted-foreground">{task.description}</p>
      )}

      {/* Footer: relative time + date */}
      <div className="mt-2 flex items-center gap-1.5 text-[10px] text-muted-foreground">
        <Clock className="h-3 w-3" />
        <span>{formatRelativeTime(task.date)}</span>
        {task.date && <span className="ml-1 opacity-60">({task.date})</span>}
      </div>
    </div>
  );
}
