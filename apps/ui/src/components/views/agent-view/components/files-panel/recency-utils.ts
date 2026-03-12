/**
 * Recency utilities for the file explorer.
 * Determines highlight classes and formats dates smartly.
 *
 * Adapted from the VSCode extension's recency highlighting.
 */

import type { FileTreeNode } from '@/store/explorer-store';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type RecencyClass =
  | ''
  | 'recency-10m'
  | 'recency-30m'
  | 'recency-1h'
  | 'recency-2h'
  | 'recency-6h';

const RECENCY_RANK: Record<RecencyClass, number> = {
  'recency-10m': 5,
  'recency-30m': 4,
  'recency-1h': 3,
  'recency-2h': 2,
  'recency-6h': 1,
  '': 0,
};

// ---------------------------------------------------------------------------
// Recency classification
// ---------------------------------------------------------------------------

const MINUTE = 60_000;
const HOUR = 3_600_000;

/**
 * Returns a recency CSS class based on how recently the timestamp was modified.
 * @param timestamp File modification time in ms
 * @param highlightWindowHours Maximum age (in hours) for any highlight. 0 = disabled.
 */
export function getRecencyClass(
  timestamp: number,
  highlightWindowHours: number,
): RecencyClass {
  if (highlightWindowHours <= 0 || !timestamp) return '';

  const age = Date.now() - timestamp;
  if (age < 0) return 'recency-10m'; // Future timestamp = treat as very recent

  if (age <= 10 * MINUTE) return 'recency-10m';
  if (age <= 30 * MINUTE) return 'recency-30m';
  if (age <= 1 * HOUR) return 'recency-1h';
  if (age <= 2 * HOUR) return 'recency-2h';
  if (age <= highlightWindowHours * HOUR) return 'recency-6h';

  return '';
}

/**
 * Returns the strongest recency class among all descendants of a folder node.
 */
export function getFolderRecency(
  node: FileTreeNode,
  highlightWindowHours: number,
): RecencyClass {
  if (highlightWindowHours <= 0) return '';

  let best: RecencyClass = '';
  let bestRank = 0;

  for (const child of node.children) {
    let childClass: RecencyClass;

    if (child.isDirectory) {
      childClass = getFolderRecency(child, highlightWindowHours);
    } else {
      const ts = Math.max(child.modified ?? 0, child.created ?? 0);
      childClass = getRecencyClass(ts, highlightWindowHours);
    }

    const rank = RECENCY_RANK[childClass];
    if (rank > bestRank) {
      bestRank = rank;
      best = childClass;
      if (bestRank === 5) break; // Can't get higher than recency-10m
    }
  }

  return best;
}

// ---------------------------------------------------------------------------
// Smart date formatting
// ---------------------------------------------------------------------------

const WEEKDAYS_DE = ['So', 'Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa'];

/**
 * Formats a timestamp with smart relative display:
 * - Today: "14:35"
 * - Yesterday: "Gestern 14:35"
 * - Within 7 days: "Mo 14:35"
 * - Older: "11.03.2026 14:35"
 */
export function formatSmartDate(timestamp: number): string {
  if (!timestamp) return '';

  const date = new Date(timestamp);
  const now = new Date();

  const hh = String(date.getHours()).padStart(2, '0');
  const mm = String(date.getMinutes()).padStart(2, '0');
  const time = `${hh}:${mm}`;

  // Same day
  if (
    date.getDate() === now.getDate() &&
    date.getMonth() === now.getMonth() &&
    date.getFullYear() === now.getFullYear()
  ) {
    return time;
  }

  // Yesterday
  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  if (
    date.getDate() === yesterday.getDate() &&
    date.getMonth() === yesterday.getMonth() &&
    date.getFullYear() === yesterday.getFullYear()
  ) {
    return `Gestern ${time}`;
  }

  // Within 7 days
  const diffMs = now.getTime() - date.getTime();
  if (diffMs < 7 * 24 * HOUR && diffMs >= 0) {
    return `${WEEKDAYS_DE[date.getDay()]} ${time}`;
  }

  // Full date
  const dd = String(date.getDate()).padStart(2, '0');
  const mo = String(date.getMonth() + 1).padStart(2, '0');
  return `${dd}.${mo}.${date.getFullYear()} ${time}`;
}

// ---------------------------------------------------------------------------
// Inline styles for recency (dark theme)
// ---------------------------------------------------------------------------

interface RecencyFileStyle {
  borderLeft: string;
  background: string;
  dateColor?: string;
  dateFontWeight?: string;
}

interface RecencyFolderStyle {
  background: string;
}

const FILE_STYLES: Record<RecencyClass, RecencyFileStyle | null> = {
  'recency-10m': {
    borderLeft: '3px solid #ff6b35',
    background:
      'linear-gradient(90deg, rgba(255,107,53,0.12) 0%, rgba(255,107,53,0.04) 100%)',
    dateColor: '#ff6b35',
    dateFontWeight: '600',
  },
  'recency-30m': {
    borderLeft: '3px solid #e8a317',
    background:
      'linear-gradient(90deg, rgba(232,163,23,0.10) 0%, rgba(232,163,23,0.03) 100%)',
    dateColor: '#e8a317',
    dateFontWeight: '500',
  },
  'recency-1h': {
    borderLeft: '2px solid rgba(196,167,42,0.70)',
    background:
      'linear-gradient(90deg, rgba(196,167,42,0.07) 0%, rgba(196,167,42,0.02) 100%)',
    dateColor: '#c4a72a',
  },
  'recency-2h': {
    borderLeft: '2px solid rgba(138,154,58,0.40)',
    background: 'rgba(138,154,58,0.05)',
  },
  'recency-6h': {
    borderLeft: '2px solid rgba(96,165,250,0.25)',
    background: 'transparent',
  },
  '': null,
};

const FOLDER_STYLES: Record<RecencyClass, RecencyFolderStyle | null> = {
  'recency-10m': {
    background:
      'linear-gradient(90deg, rgba(255,107,53,0.08) 0%, transparent 100%)',
  },
  'recency-30m': {
    background:
      'linear-gradient(90deg, rgba(232,163,23,0.06) 0%, transparent 100%)',
  },
  'recency-1h': {
    background:
      'linear-gradient(90deg, rgba(196,167,42,0.04) 0%, transparent 100%)',
  },
  'recency-2h': null,
  'recency-6h': null,
  '': null,
};

/** Returns inline style object for a file item based on its recency. */
export function getFileRecencyStyle(
  recency: RecencyClass,
): React.CSSProperties | undefined {
  const style = FILE_STYLES[recency];
  if (!style) return undefined;
  return { borderLeft: style.borderLeft, background: style.background };
}

/** Returns inline style object for a folder item based on its recency. */
export function getFolderRecencyStyle(
  recency: RecencyClass,
): React.CSSProperties | undefined {
  const style = FOLDER_STYLES[recency];
  if (!style) return undefined;
  return { background: style.background };
}

/** Returns the accent color for the modified-date text. */
export function getDateRecencyColor(
  recency: RecencyClass,
): string | undefined {
  return FILE_STYLES[recency]?.dateColor;
}

/** Returns the font weight for the modified-date text. */
export function getDateRecencyFontWeight(
  recency: RecencyClass,
): string | undefined {
  return FILE_STYLES[recency]?.dateFontWeight;
}
