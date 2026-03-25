/**
 * TaskCreateDialog - Dialog for creating or editing a task.
 *
 * Provides form fields for title, description, priority, tags, and markdown body.
 * When editTask is provided, pre-fills fields and shows "Speichern" instead of "Erstellen".
 * Supports CTRL+V paste for image attachments (queued as pending until task is created).
 */

import { useCallback, useEffect, useState } from 'react';
import { X, Paperclip } from 'lucide-react';
import type { Task, TaskPriority, TaskStatus } from '@automaker/types';
import { TASK_PRIORITIES, TASK_STATUSES } from '@automaker/types';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import {
  getTaskPriorityLabel,
  getTaskPriorityDotColor,
  getTaskStatusLabel,
  getTaskStatusDotColor,
} from './task-utils';
import { usePendingAttachments } from '@/hooks/use-task-attachments';
import type { PendingAttachment } from '@/hooks/use-task-attachments';
import { PendingAttachmentPreview } from './task-attachment-preview';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface CreateTaskData {
  title: string;
  description: string;
  priority: TaskPriority;
  status: TaskStatus;
  tags: string[];
  summary: string;
  /** Files queued for upload after task creation. */
  pendingAttachments?: PendingAttachment[];
}

interface TaskCreateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (data: CreateTaskData) => void;
  editTask?: Task;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function TaskCreateDialog({ open, onOpenChange, onSave, editTask }: TaskCreateDialogProps) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState<TaskPriority>('');
  const [status, setStatus] = useState<TaskStatus>('open');
  const [tagsInput, setTagsInput] = useState('');
  const [summary, setSummary] = useState('');
  const { pending, addFiles, removeFile, clear: clearPending } = usePendingAttachments();

  const isEditMode = !!editTask;

  // Reset form when dialog opens or editTask changes
  useEffect(() => {
    if (open) {
      if (editTask) {
        setTitle(editTask.title);
        setDescription(editTask.description);
        setPriority(editTask.priority);
        setStatus(editTask.status);
        setTagsInput(editTask.tags.join(', '));
        setSummary(editTask.summary);
      } else {
        setTitle('');
        setDescription('');
        setPriority('');
        setStatus('open');
        setTagsInput('');
        setSummary('');
      }
      clearPending();
    }
  }, [open, editTask, clearPending]);

  // CTRL+V paste handler for images
  const handlePaste = useCallback(
    (e: React.ClipboardEvent) => {
      const items = e.clipboardData?.items;
      if (!items) return;

      const files: File[] = [];
      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        if (item.kind === 'file') {
          const file = item.getAsFile();
          if (file) files.push(file);
        }
      }

      if (files.length > 0) {
        // Only prevent default if we found files to avoid blocking text paste
        e.preventDefault();
        addFiles(files);
      }
    },
    [addFiles]
  );

  // File input handler for manual file selection
  const handleFileSelect = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = e.target.files;
      if (files && files.length > 0) {
        addFiles(Array.from(files));
      }
      // Reset the input so the same file can be selected again
      e.target.value = '';
    },
    [addFiles]
  );

  const handleSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      if (!title.trim()) return;

      const tags = tagsInput
        .split(',')
        .map((t) => t.trim())
        .filter((t) => t.length > 0);

      onSave({
        title: title.trim(),
        description: description.trim(),
        priority,
        status,
        tags,
        summary: summary.trim(),
        pendingAttachments: pending.length > 0 ? pending : undefined,
      });
      onOpenChange(false);
    },
    [title, description, priority, status, tagsInput, summary, pending, onSave, onOpenChange]
  );

  const handleRemoveTag = useCallback(
    (tagToRemove: string) => {
      const tags = tagsInput
        .split(',')
        .map((t) => t.trim())
        .filter((t) => t.length > 0 && t !== tagToRemove);
      setTagsInput(tags.join(', '));
    },
    [tagsInput]
  );

  const parsedTags = tagsInput
    .split(',')
    .map((t) => t.trim())
    .filter((t) => t.length > 0);

  // Filter priorities to only show actual priorities (exclude empty string)
  const filteredPriorities = TASK_PRIORITIES.filter((p: TaskPriority) => p !== '');

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{isEditMode ? 'Task bearbeiten' : 'Neuer Task'}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4" onPaste={handlePaste}>
          {/* Title */}
          <div className="space-y-1.5">
            <label htmlFor="task-title" className="text-xs font-medium text-muted-foreground">
              Titel *
            </label>
            <Input
              id="task-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Was muss getan werden?"
              autoFocus
              required
            />
          </div>

          {/* Description */}
          <div className="space-y-1.5">
            <label htmlFor="task-description" className="text-xs font-medium text-muted-foreground">
              Kurzbeschreibung
            </label>
            <Input
              id="task-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Kurze Beschreibung (optional)"
            />
          </div>

          {/* Status (only in edit mode) */}
          {isEditMode && (
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">Status</label>
              <div className="flex flex-wrap gap-1.5">
                {TASK_STATUSES.map((s: TaskStatus) => (
                  <button
                    key={s}
                    type="button"
                    className={cn(
                      'flex items-center gap-1.5 rounded-md border px-2.5 py-1.5 text-xs transition-colors',
                      status === s
                        ? 'border-sky-500 bg-sky-500/10 text-sky-600'
                        : 'border-muted hover:bg-muted/50'
                    )}
                    onClick={() => setStatus(s)}
                  >
                    <span className={cn('h-2 w-2 rounded-full', getTaskStatusDotColor(s))} />
                    {getTaskStatusLabel(s)}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Priority */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">Prioritaet</label>
            <div className="flex flex-wrap gap-1.5">
              <button
                type="button"
                className={cn(
                  'rounded-md border px-2.5 py-1.5 text-xs transition-colors',
                  priority === ''
                    ? 'border-sky-500 bg-sky-500/10 text-sky-600'
                    : 'border-muted hover:bg-muted/50'
                )}
                onClick={() => setPriority('')}
              >
                Keine
              </button>
              {filteredPriorities.map((p: TaskPriority) => (
                <button
                  key={p}
                  type="button"
                  className={cn(
                    'flex items-center gap-1.5 rounded-md border px-2.5 py-1.5 text-xs transition-colors',
                    priority === p
                      ? 'border-sky-500 bg-sky-500/10 text-sky-600'
                      : 'border-muted hover:bg-muted/50'
                  )}
                  onClick={() => setPriority(p)}
                >
                  <span className={cn('h-2 w-2 rounded-full', getTaskPriorityDotColor(p))} />
                  {p}
                </button>
              ))}
            </div>
          </div>

          {/* Tags */}
          <div className="space-y-1.5">
            <label htmlFor="task-tags" className="text-xs font-medium text-muted-foreground">
              Tags (kommagetrennt)
            </label>
            <Input
              id="task-tags"
              value={tagsInput}
              onChange={(e) => setTagsInput(e.target.value)}
              placeholder="z.B. feature, bugfix, ui"
            />
            {parsedTags.length > 0 && (
              <div className="mt-1.5 flex flex-wrap gap-1">
                {parsedTags.map((tag) => (
                  <Badge
                    key={tag}
                    variant="outline"
                    size="sm"
                    className="cursor-pointer gap-1 hover:bg-muted/50"
                    onClick={() => handleRemoveTag(tag)}
                    title="Klicken zum Entfernen"
                  >
                    {tag}
                    <X className="h-2.5 w-2.5" />
                  </Badge>
                ))}
              </div>
            )}
          </div>

          {/* Markdown Body / Summary */}
          <div className="space-y-1.5">
            <label htmlFor="task-summary" className="text-xs font-medium text-muted-foreground">
              Details (Markdown)
            </label>
            <Textarea
              id="task-summary"
              value={summary}
              onChange={(e) => setSummary(e.target.value)}
              placeholder="Detaillierte Beschreibung, Akzeptanzkriterien, Notizen..."
              rows={4}
              className="resize-y"
            />
          </div>

          {/* Pending Attachments Preview */}
          {!isEditMode && pending.length > 0 && (
            <div className="space-y-1.5">
              <PendingAttachmentPreview pending={pending} onRemove={removeFile} />
            </div>
          )}

          {/* Attach file button + paste hint */}
          {!isEditMode && (
            <div className="flex items-center gap-2">
              <label
                className={cn(
                  'inline-flex cursor-pointer items-center gap-1.5 rounded-md px-2.5 py-1.5',
                  'border border-white/5 bg-zinc-900/60 text-xs text-zinc-400',
                  'transition-colors hover:bg-zinc-800/80 hover:text-cyan-400'
                )}
              >
                <Paperclip className="h-3 w-3" />
                Datei anhaengen
                <input
                  type="file"
                  multiple
                  className="hidden"
                  onChange={handleFileSelect}
                  accept="image/*,.pdf,.doc,.docx,.txt,.md,.json,.csv,.zip"
                />
              </label>
              <span className="text-[10px] text-zinc-600">oder STRG+V zum Einfuegen</span>
            </div>
          )}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Abbrechen
            </Button>
            <Button type="submit" disabled={!title.trim()}>
              {isEditMode ? 'Speichern' : 'Erstellen'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
