import { getTimeRangeHours, type DashboardTimeRange } from '@automaker/types';

const MINUTE_MS = 60_000;
const HOUR_MS = 60 * MINUTE_MS;
const DAY_MS = 24 * HOUR_MS;

function parseTimestamp(isoDate: string): number | null {
  const timestamp = Date.parse(isoDate);
  return Number.isFinite(timestamp) ? timestamp : null;
}

export function formatOverviewGeneratedRelative(generatedAt: string, nowMs = Date.now()): string {
  const timestamp = parseTimestamp(generatedAt);
  if (timestamp === null) return 'Zeit unbekannt';

  const diffMs = Math.max(0, nowMs - timestamp);

  if (diffMs < MINUTE_MS) return 'gerade eben';

  const diffMinutes = Math.floor(diffMs / MINUTE_MS);
  if (diffMinutes < 60) {
    return `vor ${diffMinutes} Minute${diffMinutes === 1 ? '' : 'n'}`;
  }

  const diffHours = Math.floor(diffMs / HOUR_MS);
  if (diffHours < 24) {
    return `vor ${diffHours} Stunde${diffHours === 1 ? '' : 'n'}`;
  }

  const diffDays = Math.floor(diffMs / DAY_MS);
  if (diffDays < 7) {
    return `vor ${diffDays} Tag${diffDays === 1 ? '' : 'en'}`;
  }

  const diffWeeks = Math.floor(diffDays / 7);
  if (diffWeeks < 5) {
    return `vor ${diffWeeks} Woche${diffWeeks === 1 ? '' : 'n'}`;
  }

  return `am ${new Date(timestamp).toLocaleDateString('de-DE')}`;
}

export function formatOverviewGeneratedAbsolute(generatedAt: string): string {
  const timestamp = parseTimestamp(generatedAt);
  if (timestamp === null) return 'Zeit unbekannt';

  return new Date(timestamp).toLocaleString('de-DE', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function isOverviewExpired(
  generatedAt: string,
  timeRange: DashboardTimeRange,
  nowMs = Date.now()
): boolean {
  const timestamp = parseTimestamp(generatedAt);
  if (timestamp === null) return false;

  const maxAgeMs = getTimeRangeHours(timeRange) * HOUR_MS;
  return nowMs - timestamp >= maxAgeMs;
}
