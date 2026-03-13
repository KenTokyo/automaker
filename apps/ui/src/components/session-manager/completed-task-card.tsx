/**
 * CompletedTaskCard - A single card for a completed task in the Done tab.
 *
 * Displays category icon, title, badges, description, relative time,
 * and a hover-visible delete button.
 */

import { useCallback, useState } from 'react';
import { Loader2, Trash2, Clock, FileText, ChevronRight } from 'lucide-react';
import type { CompletedTask } from '@automaker/types';
import { COMPLETED_TASK_BADGE_OPTIONS } from '@automaker/types';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import {
  getCategoryIcon,
  getCategoryColor,
  getCategoryIconColor,
  getCategoryLabel,
  formatRelativeTime,
} from './completed-task-utils';

interface CompletedTaskCardProps {
  task: CompletedTask;
  onDelete?: (taskId: string) => void;
  onHistoryClick?: (historyFile: string) => void;
}

export function CompletedTaskCard({ task, onDelete, onHistoryClick }: CompletedTaskCardProps) {
  const [deleting, setDeleting] = useState(false);

  const Icon = getCategoryIcon(task.category);
  const categoryColor = getCategoryColor(task.category);
  const iconColor = getCategoryIconColor(task.category);

  const handleDelete = useCallback(() => {
    if (!onDelete || deleting) return;
    setDeleting(true);
    onDelete(task.id);
  }, [task.id, onDelete, deleting]);

  return (
    <div
      className={cn(
        'group rounded-lg border border-muted p-3 transition-all duration-150',
        'hover:bg-muted/30 hover:shadow-sm hover:border-muted-foreground/20',
        'cursor-default'
      )}
    >
      {/* Header: Icon + Title + Delete */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex min-w-0 items-center gap-2">
          <Icon className={cn('h-3.5 w-3.5 shrink-0', iconColor)} />
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

      {/* Badges row */}
      <div className="mt-1.5 flex flex-wrap gap-1">
        <Badge size="sm" className={cn('gap-1 border', categoryColor)}>
          {getCategoryLabel(task.category)}
        </Badge>
        {task.badges.map((badge) => (
          <Badge key={badge} variant="outline" size="sm">
            {COMPLETED_TASK_BADGE_OPTIONS[badge] ?? badge}
          </Badge>
        ))}
      </div>

      {/* Description (if present) */}
      {task.description && (
        <p className="mt-1.5 line-clamp-2 text-xs text-muted-foreground">{task.description}</p>
      )}

      {/* Footer: relative time */}
      <div className="mt-2 flex items-center gap-1.5 text-[10px] text-muted-foreground">
        <Clock className="h-3 w-3" />
        <span>{formatRelativeTime(task.completedAt)}</span>
      </div>

      {/* History file link */}
      {task.historyFile && (
        <button
          type="button"
          className="mt-2 flex w-full items-center gap-1.5 border-t border-muted pt-2 text-xs text-muted-foreground transition-colors hover:text-foreground"
          onClick={() => onHistoryClick?.(task.historyFile!)}
          title={task.historyFile}
        >
          <FileText className="h-3 w-3 shrink-0" />
          <span className="min-w-0 truncate">{task.historyFile.split('/').pop()}</span>
          <ChevronRight className="ml-auto h-3 w-3 shrink-0" />
        </button>
      )}
    </div>
  );
}
