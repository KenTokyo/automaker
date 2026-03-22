/**
 * Utility functions for task cards.
 *
 * Provides status colors, priority labels, and helpers for the Tasks tab.
 */

import type { TaskStatus, TaskPriority } from '@automaker/types';

// ---------------------------------------------------------------------------
// Status -> Color classes
// ---------------------------------------------------------------------------

const STATUS_COLOR_MAP: Record<TaskStatus, string> = {
  open: 'text-sky-500 bg-sky-500/10 border-sky-500/30',
  in_progress: 'text-amber-500 bg-amber-500/10 border-amber-500/30',
  done: 'text-emerald-500 bg-emerald-500/10 border-emerald-500/30',
};

export function getTaskStatusColor(status: TaskStatus): string {
  return STATUS_COLOR_MAP[status] ?? 'text-muted-foreground bg-muted/50 border-muted';
}

// ---------------------------------------------------------------------------
// Status -> Dot color (for inline status indicator)
// ---------------------------------------------------------------------------

const STATUS_DOT_COLOR_MAP: Record<TaskStatus, string> = {
  open: 'bg-sky-500',
  in_progress: 'bg-amber-500',
  done: 'bg-emerald-500',
};

export function getTaskStatusDotColor(status: TaskStatus): string {
  return STATUS_DOT_COLOR_MAP[status] ?? 'bg-muted-foreground';
}

// ---------------------------------------------------------------------------
// Status -> Label
// ---------------------------------------------------------------------------

const STATUS_LABEL_MAP: Record<TaskStatus, string> = {
  open: 'Offen',
  in_progress: 'In Arbeit',
  done: 'Erledigt',
};

export function getTaskStatusLabel(status: TaskStatus): string {
  return STATUS_LABEL_MAP[status] ?? status;
}

// ---------------------------------------------------------------------------
// Priority -> Color classes
// ---------------------------------------------------------------------------

const PRIORITY_COLOR_MAP: Record<string, string> = {
  P1: 'text-red-500 bg-red-500/10 border-red-500/30',
  P2: 'text-orange-500 bg-orange-500/10 border-orange-500/30',
  P3: 'text-yellow-500 bg-yellow-500/10 border-yellow-500/30',
  P4: 'text-muted-foreground bg-muted/50 border-muted',
};

export function getTaskPriorityColor(priority: TaskPriority): string {
  if (!priority) return '';
  return PRIORITY_COLOR_MAP[priority] ?? 'text-muted-foreground bg-muted/50 border-muted';
}

// ---------------------------------------------------------------------------
// Priority -> Dot color
// ---------------------------------------------------------------------------

const PRIORITY_DOT_COLOR_MAP: Record<string, string> = {
  P1: 'bg-red-500',
  P2: 'bg-orange-500',
  P3: 'bg-yellow-500',
  P4: 'bg-muted-foreground',
};

export function getTaskPriorityDotColor(priority: TaskPriority): string {
  if (!priority) return '';
  return PRIORITY_DOT_COLOR_MAP[priority] ?? 'bg-muted-foreground';
}

// ---------------------------------------------------------------------------
// Priority -> Label
// ---------------------------------------------------------------------------

const PRIORITY_LABEL_MAP: Record<string, string> = {
  P1: 'P1 - Kritisch',
  P2: 'P2 - Hoch',
  P3: 'P3 - Normal',
  P4: 'P4 - Niedrig',
};

export function getTaskPriorityLabel(priority: TaskPriority): string {
  if (!priority) return 'Keine';
  return PRIORITY_LABEL_MAP[priority] ?? priority;
}

// ---------------------------------------------------------------------------
// Priority -> Short Label
// ---------------------------------------------------------------------------

export function getTaskPriorityShortLabel(priority: TaskPriority): string {
  if (!priority) return '-';
  return priority;
}

// ---------------------------------------------------------------------------
// Priority -> Sort order (for sorting)
// ---------------------------------------------------------------------------

const PRIORITY_ORDER: Record<string, number> = {
  P1: 1,
  P2: 2,
  P3: 3,
  P4: 4,
  '': 5, // No priority at the end
};

export function getTaskPriorityOrder(priority: TaskPriority): number {
  return PRIORITY_ORDER[priority] ?? 5;
}

// ---------------------------------------------------------------------------
// Status -> Sort order
// ---------------------------------------------------------------------------

const STATUS_ORDER: Record<TaskStatus, number> = {
  in_progress: 1,
  open: 2,
  done: 3,
};

export function getTaskStatusOrder(status: TaskStatus): number {
  return STATUS_ORDER[status] ?? 2;
}

// ---------------------------------------------------------------------------
// Relative time formatting (German)
// ---------------------------------------------------------------------------

export function formatRelativeTime(dateString: string): string {
  // Support both YYYY-MM-DD and ISO timestamp formats
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
