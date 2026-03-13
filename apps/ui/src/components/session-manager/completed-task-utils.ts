/**
 * Utility functions for completed task cards.
 *
 * Provides category-to-icon mapping, color classes, labels,
 * and relative time formatting for the Done tab.
 */

import type { LucideIcon } from 'lucide-react';
import { Bug, FileCode, FileText, Rocket, Settings, Sparkles, Wrench } from 'lucide-react';
import type { CompletedTaskCategory } from '@automaker/types';

// ---------------------------------------------------------------------------
// Category → Icon
// ---------------------------------------------------------------------------

const CATEGORY_ICON_MAP: Record<CompletedTaskCategory, LucideIcon> = {
  feature: Rocket,
  bugfix: Bug,
  improvement: Sparkles,
  refactor: Wrench,
  config: Settings,
  docs: FileText,
};

export function getCategoryIcon(category: CompletedTaskCategory): LucideIcon {
  return CATEGORY_ICON_MAP[category] ?? FileCode;
}

// ---------------------------------------------------------------------------
// Category → Tailwind color classes (text + bg for badges)
// ---------------------------------------------------------------------------

const CATEGORY_COLOR_MAP: Record<CompletedTaskCategory, string> = {
  feature: 'text-sky-500 bg-sky-500/10 border-sky-500/30',
  bugfix: 'text-red-500 bg-red-500/10 border-red-500/30',
  improvement: 'text-amber-500 bg-amber-500/10 border-amber-500/30',
  refactor: 'text-violet-500 bg-violet-500/10 border-violet-500/30',
  config: 'text-slate-500 bg-slate-500/10 border-slate-500/30',
  docs: 'text-emerald-500 bg-emerald-500/10 border-emerald-500/30',
};

export function getCategoryColor(category: CompletedTaskCategory): string {
  return CATEGORY_COLOR_MAP[category] ?? 'text-muted-foreground bg-muted/50 border-muted';
}

// ---------------------------------------------------------------------------
// Category → Icon-only color (for header icon tint)
// ---------------------------------------------------------------------------

const CATEGORY_ICON_COLOR_MAP: Record<CompletedTaskCategory, string> = {
  feature: 'text-sky-500',
  bugfix: 'text-red-500',
  improvement: 'text-amber-500',
  refactor: 'text-violet-500',
  config: 'text-slate-500',
  docs: 'text-emerald-500',
};

export function getCategoryIconColor(category: CompletedTaskCategory): string {
  return CATEGORY_ICON_COLOR_MAP[category] ?? 'text-muted-foreground';
}

// ---------------------------------------------------------------------------
// Category → Readable label
// ---------------------------------------------------------------------------

const CATEGORY_LABEL_MAP: Record<CompletedTaskCategory, string> = {
  feature: 'Feature',
  bugfix: 'Bug-Fix',
  improvement: 'Verbesserung',
  refactor: 'Refactoring',
  config: 'Konfiguration',
  docs: 'Dokumentation',
};

export function getCategoryLabel(category: CompletedTaskCategory): string {
  return CATEGORY_LABEL_MAP[category] ?? category;
}

// ---------------------------------------------------------------------------
// Relative time formatting (German)
// ---------------------------------------------------------------------------

export function formatRelativeTime(isoString: string): string {
  const diff = Date.now() - new Date(isoString).getTime();
  const minutes = Math.floor(diff / 60_000);
  if (minutes < 1) return 'gerade eben';
  if (minutes < 60) return `vor ${minutes} Min`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `vor ${hours} Std`;
  const days = Math.floor(hours / 24);
  if (days === 1) return 'gestern';
  if (days < 7) return `vor ${days} Tagen`;
  return new Date(isoString).toLocaleDateString('de-DE', {
    day: '2-digit',
    month: '2-digit',
    year: '2-digit',
  });
}
