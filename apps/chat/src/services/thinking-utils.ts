export type ThinkingStatus = 'start' | 'running' | 'done' | 'aborted' | 'error';

export interface ThinkingBlockData {
  id: string;
  status: ThinkingStatus;
  startedAt: string;
  finishedAt?: string;
  durationMs?: number;
  detailText?: string;
  errorMessage?: string;
}

const MAX_DETAIL_LENGTH = 8000;
const MAX_ERROR_LENGTH = 600;
const MIN_VISIBLE_DURATION_MS = 1000;

function parseIso(value: string | undefined): number {
  if (!value) return Number.NaN;
  const parsed = Date.parse(value);
  return Number.isNaN(parsed) ? Number.NaN : parsed;
}

function clampText(value: string, maxLength: number): string {
  if (value.length <= maxLength) return value;
  return `${value.slice(0, maxLength - 3)}...`;
}

function toIso(value: string | undefined, fallback: string): string {
  const parsed = parseIso(value);
  if (Number.isNaN(parsed)) return fallback;
  return new Date(parsed).toISOString();
}

export function nowIso(): string {
  return new Date().toISOString();
}

export function getThinkingDurationMs(startedAt: string, finishedAt?: string): number | undefined {
  const started = parseIso(startedAt);
  const finished = parseIso(finishedAt);

  if (Number.isNaN(started) || Number.isNaN(finished)) return undefined;
  if (finished < started) return undefined;

  const rawDuration = finished - started;
  return Math.max(MIN_VISIBLE_DURATION_MS, rawDuration);
}

export function createThinkingBlock(params: {
  id: string;
  status: ThinkingStatus;
  startedAt?: string;
  finishedAt?: string;
  detailText?: string;
  errorMessage?: string;
}): ThinkingBlockData {
  const fallbackNow = nowIso();
  const startedAt = toIso(params.startedAt, fallbackNow);
  const finishedAt =
    params.finishedAt && params.status !== 'running' && params.status !== 'start'
      ? toIso(params.finishedAt, params.finishedAt)
      : undefined;

  return {
    id: params.id,
    status: params.status,
    startedAt,
    finishedAt,
    durationMs: finishedAt ? getThinkingDurationMs(startedAt, finishedAt) : undefined,
    detailText:
      typeof params.detailText === 'string' && params.detailText.trim().length > 0
        ? clampText(params.detailText.trim(), MAX_DETAIL_LENGTH)
        : undefined,
    errorMessage:
      typeof params.errorMessage === 'string' && params.errorMessage.trim().length > 0
        ? clampText(params.errorMessage.trim(), MAX_ERROR_LENGTH)
        : undefined,
  };
}

export function finalizeThinkingBlock(
  block: ThinkingBlockData,
  status: Exclude<ThinkingStatus, 'start' | 'running'>,
  params?: {
    finishedAt?: string;
    detailText?: string;
    errorMessage?: string;
  }
): ThinkingBlockData {
  const finishedAt = toIso(params?.finishedAt, nowIso());
  const nextDetail =
    typeof params?.detailText === 'string' && params.detailText.trim().length > 0
      ? params.detailText
      : block.detailText;

  return createThinkingBlock({
    ...block,
    status,
    finishedAt,
    detailText: nextDetail,
    errorMessage: params?.errorMessage ?? block.errorMessage,
  });
}

export function appendThinkingDetail(
  block: ThinkingBlockData,
  detailPart: string | undefined
): ThinkingBlockData {
  if (typeof detailPart !== 'string' || detailPart.trim().length === 0) {
    return block;
  }

  const nextText = [block.detailText, detailPart.trim()].filter(Boolean).join('\n\n');
  return {
    ...block,
    detailText: clampText(nextText, MAX_DETAIL_LENGTH),
  };
}

export function sanitizeThinkingBlock(value: unknown): ThinkingBlockData | undefined {
  if (!value || typeof value !== 'object') return undefined;
  const raw = value as Record<string, unknown>;

  const status: ThinkingStatus =
    raw.status === 'start' ||
    raw.status === 'running' ||
    raw.status === 'done' ||
    raw.status === 'aborted' ||
    raw.status === 'error'
      ? raw.status
      : 'done';

  const id =
    typeof raw.id === 'string' && raw.id.trim().length > 0
      ? raw.id
      : `thinking-${Date.now().toString(36)}`;

  return createThinkingBlock({
    id,
    status,
    startedAt: typeof raw.startedAt === 'string' ? raw.startedAt : undefined,
    finishedAt: typeof raw.finishedAt === 'string' ? raw.finishedAt : undefined,
    detailText: typeof raw.detailText === 'string' ? raw.detailText : undefined,
    errorMessage: typeof raw.errorMessage === 'string' ? raw.errorMessage : undefined,
  });
}
