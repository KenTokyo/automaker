/**
 * CompletedTaskCard - A single card for a completed task in the Done tab.
 *
 * Displays status dot, title, tags as chips, effort badge,
 * attempt badge (if > 1), provider badge, relative time,
 * expandable file list, and a copy button for full context.
 */

import { useCallback, useState } from 'react';
import {
  Loader2,
  Trash2,
  Clock,
  ChevronDown,
  ChevronUp,
  ChevronRight,
  Copy,
  Check,
  FileText,
} from 'lucide-react';
import type { CompletedTask } from '@automaker/types';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Markdown } from '@/components/ui/markdown';
import { cn } from '@/lib/utils';
import {
  getStatusColor,
  getStatusDotColor,
  getStatusLabel,
  getEffortLabel,
  getEffortColor,
  formatRelativeTime,
} from './completed-task-utils';

// ---------------------------------------------------------------------------
// Clipboard helper — builds full-context text for pasting into chat
// ---------------------------------------------------------------------------

function buildCopyText(task: CompletedTask): string {
  const parts: string[] = [];
  parts.push(`## ${task.title}`);
  if (task.description) parts.push(task.description);
  parts.push('');
  parts.push(`- **Status:** ${task.status}`);
  if (task.effort) parts.push(`- **Effort:** ${task.effort}`);
  if (task.attempt > 1) parts.push(`- **Versuch:** ${task.attempt}`);
  if (task.provider) parts.push(`- **Provider:** ${task.provider}`);
  if (task.tags.length > 0) parts.push(`- **Tags:** ${task.tags.join(', ')}`);
  parts.push(`- **Datum:** ${task.date}`);

  // Completed-task file path
  const completedPath = task.projectPath
    ? `${task.projectPath}/.completed/${task.filename}`
    : `.completed/${task.filename}`;
  parts.push(`- **Task-Datei:** ${completedPath}`);

  // Associated files
  if (task.files.length > 0) {
    parts.push('');
    parts.push('### Dateien');
    for (const f of task.files) {
      parts.push(`- ${f}`);
    }
  }

  // Summary body
  if (task.summary) {
    parts.push('');
    parts.push('### Zusammenfassung');
    parts.push(task.summary);
  }

  return parts.join('\n');
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

interface CompletedTaskCardProps {
  task: CompletedTask;
  onDelete?: (filename: string) => void;
  fontSize?: number;
}

export function CompletedTaskCard({ task, onDelete, fontSize = 14 }: CompletedTaskCardProps) {
  const [deleting, setDeleting] = useState(false);
  const [filesExpanded, setFilesExpanded] = useState(false);
  const [contentExpanded, setContentExpanded] = useState(false);
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

  const hasFiles = task.files.length > 0;
  const hasContent = !!(task.description?.trim() || task.summary?.trim());
  const titleSize = Math.max(11, fontSize);
  const bodySize = Math.max(10, fontSize - 2);
  const metaSize = Math.max(9, fontSize - 4);

  return (
    <div
      className={cn(
        'group rounded-lg border border-muted p-3 transition-all duration-150',
        'hover:bg-muted/30 hover:shadow-sm hover:border-muted-foreground/20',
        'cursor-default'
      )}
    >
      {/* Header: Status dot + Title + Actions */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex min-w-0 items-center gap-2">
          <span
            className={cn('h-2 w-2 shrink-0 rounded-full', getStatusDotColor(task.status))}
            title={getStatusLabel(task.status)}
          />
          <span
            className="min-w-0 truncate text-sm font-medium"
            style={{ fontSize: `${titleSize}px` }}
          >
            {task.title}
          </span>
        </div>
        <div className="flex shrink-0 items-center gap-0.5">
          {/* Content preview toggle */}
          {hasContent && (
            <Button
              variant="ghost"
              size="sm"
              className="h-5 w-5 p-0 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100 hover:text-foreground"
              onClick={() => setContentExpanded((v) => !v)}
              title={contentExpanded ? 'Inhalt einklappen' : 'Inhalt anzeigen'}
            >
              {contentExpanded ? (
                <ChevronUp className="h-3 w-3" />
              ) : (
                <ChevronDown className="h-3 w-3" />
              )}
            </Button>
          )}
          {/* Copy button */}
          <Button
            variant="ghost"
            size="sm"
            className="h-5 w-5 p-0 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100 hover:text-foreground"
            onClick={() => void handleCopy()}
            title="Task + Dateien kopieren"
          >
            {copied ? <Check className="h-3 w-3 text-emerald-500" /> : <Copy className="h-3 w-3" />}
          </Button>
          {/* Delete button */}
          {onDelete && (
            <Button
              variant="ghost"
              size="sm"
              className="h-5 w-5 p-0 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100 hover:text-destructive"
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
      </div>

      {/* Badges row: Status, Effort, Attempt, Provider, Tags */}
      <div className="mt-1.5 flex flex-wrap gap-1" style={{ fontSize: `${metaSize}px` }}>
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

        {/* Files count badge (clickable to expand) */}
        {hasFiles && (
          <Badge
            variant="outline"
            size="sm"
            className="cursor-pointer gap-0.5 hover:bg-muted/50"
            onClick={() => setFilesExpanded((v) => !v)}
            title={filesExpanded ? 'Dateien einklappen' : 'Dateien anzeigen'}
          >
            <FileText className="h-2.5 w-2.5" />
            {task.files.length}
            <ChevronRight
              className={cn(
                'h-2.5 w-2.5 transition-transform duration-150',
                filesExpanded && 'rotate-90'
              )}
            />
          </Badge>
        )}
      </div>

      {/* Description (if present) */}
      {task.description && !contentExpanded && (
        <p
          className="mt-1.5 line-clamp-2 text-xs text-muted-foreground"
          style={{ fontSize: `${bodySize}px` }}
        >
          {task.description}
        </p>
      )}

      {/* Expandable markdown preview */}
      {contentExpanded && hasContent && (
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
                Inhalt
              </p>
              <div style={{ fontSize: `${bodySize}px` }}>
                <Markdown className="text-xs [&_p]:my-1 [&_pre]:my-1 [&_ul]:my-1 [&_ul]:list-disc [&_ul]:pl-6 [&_ol]:my-1 [&_ol]:list-decimal [&_ol]:pl-6 [&_li]:my-0.5">
                  {task.summary}
                </Markdown>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Expandable file list */}
      {hasFiles && filesExpanded && (
        <div className="mt-2 rounded-md border border-muted bg-muted/20 p-2">
          <p
            className="mb-1 text-[10px] font-medium text-muted-foreground"
            style={{ fontSize: `${metaSize}px` }}
          >
            Betroffene Dateien ({task.files.length})
          </p>
          <ul className="space-y-0.5">
            {task.files.map((file) => (
              <li key={file} className="group/file flex items-center gap-1">
                <FileText className="h-2.5 w-2.5 shrink-0 text-muted-foreground/60" />
                <span
                  className="min-w-0 flex-1 truncate font-mono text-[10px] text-muted-foreground"
                  style={{ fontSize: `${metaSize}px` }}
                  title={file}
                >
                  {file}
                </span>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-4 w-4 shrink-0 p-0 text-muted-foreground opacity-0 transition-opacity group-hover/file:opacity-100 hover:text-foreground"
                  onClick={() => void navigator.clipboard.writeText(file)}
                  title="Pfad kopieren"
                >
                  <Copy className="h-2.5 w-2.5" />
                </Button>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Completed task file path */}
      <div
        className="mt-1.5 flex items-center gap-1 text-[10px] text-muted-foreground/50"
        style={{ fontSize: `${metaSize}px` }}
      >
        <FileText className="h-2.5 w-2.5" />
        <span
          className="min-w-0 truncate font-mono cursor-pointer hover:text-muted-foreground transition-colors"
          title={`Klicken zum Kopieren: .completed/${task.filename}`}
          onClick={() =>
            void navigator.clipboard.writeText(
              task.projectPath
                ? `${task.projectPath}/.completed/${task.filename}`
                : `.completed/${task.filename}`
            )
          }
        >
          .completed/{task.filename}
        </span>
      </div>

      {/* Footer: project name + relative time + date */}
      <div
        className="mt-1 flex items-center gap-1.5 text-[10px] text-muted-foreground"
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
