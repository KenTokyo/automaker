/**
 * Dashboard Export Utilities
 *
 * Converts DashboardOverviewData to formatted Markdown and generates filenames.
 */

import {
  DASHBOARD_TIME_RANGES,
  type DashboardImprovement,
  type DashboardMode,
  type DashboardOverviewData,
  type DashboardSecurityItem,
} from '@automaker/types';

// ---------------------------------------------------------------------------
// Helpers (re-used from dashboard-cards, but kept local to avoid circular deps)
// ---------------------------------------------------------------------------

function modeLabel(mode: DashboardMode): string {
  if (mode === 'simplify') return 'Vereinfacht';
  if (mode === 'detail') return 'Mehr Details';
  return 'Standard';
}

function modelLabel(model: string): string {
  const normalized = model.trim().toLowerCase();
  if (normalized.includes('sonnet')) return 'Sonnet';
  if (normalized.includes('haiku')) return 'Haiku';
  if (normalized.includes('opus')) return 'Opus';
  return model;
}

function formatNumber(n: number): string {
  if (n >= 1000) return `${(n / 1000).toFixed(1)}k`;
  return String(n);
}

// ---------------------------------------------------------------------------
// Priority / severity labels
// ---------------------------------------------------------------------------

const PRIORITY_LABELS: Record<DashboardImprovement['priority'], string> = {
  high: 'Hoch',
  medium: 'Mittel',
  low: 'Niedrig',
};

const SEVERITY_LABELS: Record<DashboardSecurityItem['severity'], string> = {
  critical: 'Kritisch',
  warning: 'Warnung',
  info: 'Info',
};

// ---------------------------------------------------------------------------
// overviewToMarkdown
// ---------------------------------------------------------------------------

/** Convert a full DashboardOverviewData object to a formatted Markdown string. */
export function overviewToMarkdown(data: DashboardOverviewData): string {
  const timeRangeLabel =
    DASHBOARD_TIME_RANGES.find((r) => r.id === data.timeRange)?.label ?? data.timeRange;

  const generatedAt = new Date(data.generatedAt).toLocaleString('de-DE', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  const lines: string[] = [];

  // Title
  lines.push(`# Projekt-Übersicht (${timeRangeLabel})`);
  lines.push('');
  lines.push(
    `> Modus: ${modeLabel(data.mode)} · Modell: ${modelLabel(data.model)} · ${generatedAt}`
  );
  lines.push('');

  // Summary
  lines.push('## Zusammenfassung');
  lines.push('');
  lines.push(data.summary);
  lines.push('');

  // Stats
  lines.push('## Statistiken');
  lines.push('');
  lines.push(`| Dateien | Commits | Zeilen + | Zeilen − |`);
  lines.push(`|---------|---------|----------|----------|`);
  lines.push(
    `| ${formatNumber(data.stats.filesChanged)} | ${formatNumber(data.stats.commits)} | ${formatNumber(data.stats.linesAdded)} | ${formatNumber(data.stats.linesRemoved)} |`
  );
  lines.push('');

  // Sections
  if (data.sections.length > 0) {
    for (const section of data.sections) {
      lines.push(`## ${section.title}`);
      lines.push('');
      for (const item of section.items) {
        const filePart = item.file ? ` *(${item.file})*` : '';
        lines.push(`- ${item.text}${filePart}`);
      }
      lines.push('');
    }
  }

  // Improvements
  if (data.improvements.length > 0) {
    lines.push('## Verbesserungen');
    lines.push('');
    for (const imp of data.improvements) {
      lines.push(`### ${imp.title} [${PRIORITY_LABELS[imp.priority]}]`);
      lines.push('');
      lines.push(imp.description);
      lines.push('');
    }
  }

  // Security
  if (data.security.length > 0) {
    lines.push('## Sicherheit');
    lines.push('');
    for (const sec of data.security) {
      lines.push(`### ${sec.title} [${SEVERITY_LABELS[sec.severity]}]`);
      lines.push('');
      lines.push(sec.description);
      lines.push('');
    }
  } else {
    lines.push('## Sicherheit');
    lines.push('');
    lines.push('Keine Sicherheitsprobleme erkannt.');
    lines.push('');
  }

  // Metadata
  lines.push('---');
  lines.push('');
  lines.push(
    `*${data.metadata.filesAnalysed} Dateien analysiert · ${(data.metadata.durationMs / 1000).toFixed(1)}s` +
      (data.metadata.gitAvailable ? ' · Git' : '') +
      ` · ${modelLabel(data.model)}` +
      (data.metadata.truncated ? ' · Daten gekürzt' : '') +
      '*'
  );
  lines.push('');

  return lines.join('\n');
}

// ---------------------------------------------------------------------------
// getOverviewFileName
// ---------------------------------------------------------------------------

/** Generate a safe filename like `overview-24h-2026-03-12.md`. */
export function getOverviewFileName(data: DashboardOverviewData): string {
  const date = new Date(data.generatedAt);
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const dd = String(date.getDate()).padStart(2, '0');
  return `overview-${data.timeRange}-${yyyy}-${mm}-${dd}.md`;
}
