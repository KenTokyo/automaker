/**
 * Utility functions for completed task cards.
 *
 * Provides status colors, effort labels, tag display helpers,
 * and relative time formatting for the Done tab.
 */

import type { CompletedTaskStatus, CompletedTaskEffort } from '@automaker/types';

// ---------------------------------------------------------------------------
// Status → Color classes
// ---------------------------------------------------------------------------

const STATUS_COLOR_MAP: Record<CompletedTaskStatus, string> = {
  success: 'text-emerald-500 bg-emerald-500/10 border-emerald-500/30',
  partial: 'text-amber-500 bg-amber-500/10 border-amber-500/30',
  failed: 'text-red-500 bg-red-500/10 border-red-500/30',
};

export function getStatusColor(status: CompletedTaskStatus): string {
  return STATUS_COLOR_MAP[status] ?? 'text-muted-foreground bg-muted/50 border-muted';
}

// ---------------------------------------------------------------------------
// Status → Dot color (for inline status indicator)
// ---------------------------------------------------------------------------

const STATUS_DOT_COLOR_MAP: Record<CompletedTaskStatus, string> = {
  success: 'bg-emerald-500',
  partial: 'bg-amber-500',
  failed: 'bg-red-500',
};

export function getStatusDotColor(status: CompletedTaskStatus): string {
  return STATUS_DOT_COLOR_MAP[status] ?? 'bg-muted-foreground';
}

// ---------------------------------------------------------------------------
// Status → Label
// ---------------------------------------------------------------------------

const STATUS_LABEL_MAP: Record<CompletedTaskStatus, string> = {
  success: 'Erfolgreich',
  partial: 'Teilweise',
  failed: 'Fehlgeschlagen',
};

export function getStatusLabel(status: CompletedTaskStatus): string {
  return STATUS_LABEL_MAP[status] ?? status;
}

// ---------------------------------------------------------------------------
// Effort → Label + Color
// ---------------------------------------------------------------------------

const EFFORT_LABEL_MAP: Record<string, string> = {
  S: 'S',
  M: 'M',
  L: 'L',
  XL: 'XL',
};

export function getEffortLabel(effort: '' | CompletedTaskEffort): string {
  if (!effort) return '';
  return EFFORT_LABEL_MAP[effort] ?? effort;
}

const EFFORT_COLOR_MAP: Record<string, string> = {
  S: 'text-sky-500 bg-sky-500/10 border-sky-500/30',
  M: 'text-violet-500 bg-violet-500/10 border-violet-500/30',
  L: 'text-orange-500 bg-orange-500/10 border-orange-500/30',
  XL: 'text-red-500 bg-red-500/10 border-red-500/30',
};

export function getEffortColor(effort: '' | CompletedTaskEffort): string {
  if (!effort) return '';
  return EFFORT_COLOR_MAP[effort] ?? 'text-muted-foreground bg-muted/50 border-muted';
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
