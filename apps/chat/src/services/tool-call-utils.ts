import type { ToolUse } from '@/types/electron';

export const TOOL_TIMEOUT_MS = 45_000;

export type ToolCallStatus = 'running' | 'ok' | 'error' | 'timeout';

export interface ToolCallStep {
  id: string;
  name: string;
  input: unknown;
  status: ToolCallStatus;
  startedAt: string;
  finishedAt?: string;
  durationMs?: number;
  errorMessage?: string;
  userImpact?: string;
  order: number;
}

export interface ToolCallResultData {
  preview: string;
  fullText: string;
  json: unknown | null;
  isJson: boolean;
}

export interface ToolCallGroupData {
  id: string;
  messageId?: string;
  status: ToolCallStatus;
  startedAt: string;
  finishedAt?: string;
  durationMs?: number;
  steps: ToolCallStep[];
  result?: ToolCallResultData;
  errorMessage?: string;
  userImpact?: string;
}

function parseIso(value: string | undefined): number {
  if (!value) return Number.NaN;
  const parsed = Date.parse(value);
  return Number.isNaN(parsed) ? Number.NaN : parsed;
}

function toIso(value: string | undefined, fallback: string): string {
  const parsed = parseIso(value);
  if (Number.isNaN(parsed)) return fallback;
  return new Date(parsed).toISOString();
}

function clampText(value: string, maxLength: number): string {
  if (value.length <= maxLength) return value;
  return `${value.slice(0, maxLength - 3)}...`;
}

export function nowIso(): string {
  return new Date().toISOString();
}

export function getToolDurationMs(startedAt: string, finishedAt?: string): number | undefined {
  const started = parseIso(startedAt);
  const finished = parseIso(finishedAt);
  if (Number.isNaN(started) || Number.isNaN(finished)) return undefined;
  if (finished < started) return undefined;
  return finished - started;
}

export function isTimedOut(startedAt: string, nowMs = Date.now(), timeoutMs = TOOL_TIMEOUT_MS): boolean {
  const started = parseIso(startedAt);
  if (Number.isNaN(started)) return false;
  return nowMs - started >= timeoutMs;
}

export function buildResultData(content: string): ToolCallResultData | undefined {
  const fullText = content.trim();
  if (!fullText) return undefined;

  let parsedJson: unknown | null = null;
  try {
    parsedJson = JSON.parse(fullText) as unknown;
  } catch {
    parsedJson = null;
  }

  if (parsedJson !== null) {
    const pretty = JSON.stringify(parsedJson, null, 2);
    return {
      preview: clampText(pretty, 280),
      fullText: clampText(pretty, 6000),
      json: parsedJson,
      isJson: true,
    };
  }

  const firstBlock = fullText.split('\n').slice(0, 6).join('\n');
  return {
    preview: clampText(firstBlock, 280),
    fullText: clampText(fullText, 6000),
    json: null,
    isJson: false,
  };
}

export function sortToolSteps(steps: ToolCallStep[]): ToolCallStep[] {
  return [...steps].sort((left, right) => {
    const leftTime = parseIso(left.startedAt);
    const rightTime = parseIso(right.startedAt);

    if (Number.isNaN(leftTime) && Number.isNaN(rightTime)) {
      return left.order - right.order;
    }

    if (Number.isNaN(leftTime)) return 1;
    if (Number.isNaN(rightTime)) return -1;
    if (leftTime === rightTime) return left.order - right.order;
    return leftTime - rightTime;
  });
}

function getGroupStatus(steps: ToolCallStep[], fallback: ToolCallStatus): ToolCallStatus {
  if (steps.some((step) => step.status === 'error')) return 'error';
  if (steps.some((step) => step.status === 'timeout')) return 'timeout';
  if (steps.some((step) => step.status === 'running')) return 'running';
  if (steps.length === 0) return fallback;
  return 'ok';
}

export function createToolCallGroup(params: {
  id: string;
  messageId?: string;
  steps: ToolCallStep[];
  status?: ToolCallStatus;
  finishedAt?: string;
  result?: ToolCallResultData;
  errorMessage?: string;
  userImpact?: string;
}): ToolCallGroupData {
  const sortedSteps = sortToolSteps(params.steps);
  const fallbackStartedAt = nowIso();
  const startedAt =
    sortedSteps.length > 0
      ? toIso(sortedSteps[0]?.startedAt, fallbackStartedAt)
      : fallbackStartedAt;
  const finishedAt = params.finishedAt
    ? toIso(params.finishedAt, params.finishedAt)
    : sortedSteps.length > 0
      ? sortedSteps[sortedSteps.length - 1]?.finishedAt
      : undefined;

  return {
    id: params.id,
    messageId: params.messageId,
    status: getGroupStatus(sortedSteps, params.status ?? 'ok'),
    startedAt,
    finishedAt,
    durationMs: finishedAt ? getToolDurationMs(startedAt, finishedAt) : undefined,
    steps: sortedSteps,
    result: params.result,
    errorMessage: params.errorMessage,
    userImpact: params.userImpact,
  };
}

export function finalizeRunningSteps(
  steps: ToolCallStep[],
  status: Extract<ToolCallStatus, 'ok' | 'error'>,
  finishedAt: string,
  errorMessage?: string,
  userImpact?: string
): ToolCallStep[] {
  return steps.map((step) => {
    const nextFinishedAt = toIso(finishedAt, nowIso());
    return {
      ...step,
      status,
      finishedAt: nextFinishedAt,
      durationMs: getToolDurationMs(step.startedAt, nextFinishedAt),
      errorMessage: status === 'error' ? errorMessage : step.errorMessage,
      userImpact: status === 'error' ? userImpact : step.userImpact,
    };
  });
}

export function createRunningToolStep(tool: ToolUse, order: number): ToolCallStep {
  const startedAt = nowIso();
  return {
    id: `tool-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`,
    name: typeof tool.name === 'string' && tool.name.trim().length > 0 ? tool.name : 'tool',
    input: tool.input,
    status: 'running',
    startedAt,
    order,
  };
}

export function sanitizeToolCallGroup(value: unknown): ToolCallGroupData | undefined {
  if (!value || typeof value !== 'object') return undefined;

  const record = value as Record<string, unknown>;
  const rawSteps = Array.isArray(record.steps) ? record.steps : [];

  const sanitizedSteps: ToolCallStep[] = rawSteps
    .filter((step): step is Record<string, unknown> => !!step && typeof step === 'object')
    .map((step, index) => {
      const startedAt = toIso(typeof step.startedAt === 'string' ? step.startedAt : undefined, nowIso());
      const finishedAt =
        typeof step.finishedAt === 'string' ? toIso(step.finishedAt, step.finishedAt) : undefined;
      const statusValue =
        step.status === 'ok' ||
        step.status === 'error' ||
        step.status === 'timeout' ||
        step.status === 'running'
          ? step.status
          : 'ok';

      return {
        id:
          typeof step.id === 'string' && step.id.trim().length > 0
            ? step.id
            : `tool-restored-${index + 1}`,
        name: typeof step.name === 'string' && step.name.trim().length > 0 ? step.name : 'tool',
        input: step.input,
        status: statusValue,
        startedAt,
        finishedAt,
        durationMs:
          typeof step.durationMs === 'number' && Number.isFinite(step.durationMs) && step.durationMs >= 0
            ? step.durationMs
            : getToolDurationMs(startedAt, finishedAt),
        errorMessage:
          typeof step.errorMessage === 'string' && step.errorMessage.trim().length > 0
            ? clampText(step.errorMessage.trim(), 600)
            : undefined,
        userImpact:
          typeof step.userImpact === 'string' && step.userImpact.trim().length > 0
            ? clampText(step.userImpact.trim(), 320)
            : undefined,
        order:
          typeof step.order === 'number' && Number.isFinite(step.order)
            ? Math.max(0, Math.round(step.order))
            : index,
      };
    });

  if (sanitizedSteps.length === 0) return undefined;

  const resultRecord =
    record.result && typeof record.result === 'object'
      ? (record.result as Record<string, unknown>)
      : null;

  const result = resultRecord
    ? {
        preview:
          typeof resultRecord.preview === 'string'
            ? clampText(resultRecord.preview, 500)
            : '',
        fullText:
          typeof resultRecord.fullText === 'string'
            ? clampText(resultRecord.fullText, 8000)
            : '',
        json: resultRecord.json ?? null,
        isJson: resultRecord.isJson === true,
      }
    : undefined;

  const statusValue =
    record.status === 'running' || record.status === 'ok' || record.status === 'error' || record.status === 'timeout'
      ? record.status
      : 'ok';

  return createToolCallGroup({
    id:
      typeof record.id === 'string' && record.id.trim().length > 0
        ? record.id
        : `tool-group-${Date.now().toString(36)}`,
    messageId: typeof record.messageId === 'string' ? record.messageId : undefined,
    steps: sanitizedSteps,
    status: statusValue,
    finishedAt: typeof record.finishedAt === 'string' ? record.finishedAt : undefined,
    result,
    errorMessage: typeof record.errorMessage === 'string' ? clampText(record.errorMessage, 600) : undefined,
    userImpact: typeof record.userImpact === 'string' ? clampText(record.userImpact, 320) : undefined,
  });
}

export function createLegacyToolCallGroup(params: {
  messageId: string;
  toolCalls: ToolUse[];
  content: string;
  isError?: boolean;
}): ToolCallGroupData | undefined {
  if (!Array.isArray(params.toolCalls) || params.toolCalls.length === 0) {
    return undefined;
  }

  const startedAt = nowIso();
  const status: ToolCallStatus = params.isError ? 'error' : 'ok';
  const steps: ToolCallStep[] = params.toolCalls.map((tool, index) => ({
    id: `legacy-tool-${params.messageId}-${index + 1}`,
    name: typeof tool.name === 'string' && tool.name.trim().length > 0 ? tool.name : 'tool',
    input: tool.input,
    status,
    startedAt,
    finishedAt: startedAt,
    durationMs: 0,
    errorMessage: params.isError ? 'Der Tool-Schritt ist fehlgeschlagen.' : undefined,
    userImpact: params.isError
      ? 'Ein Tool-Schritt hat nicht geklappt. Das Ergebnis kann unvollständig sein.'
      : undefined,
    order: index,
  }));

  return createToolCallGroup({
    id: `legacy-tool-group-${params.messageId}`,
    messageId: params.messageId,
    steps,
    status,
    finishedAt: startedAt,
    result: buildResultData(params.content),
    errorMessage: params.isError ? 'Tool-Schritt fehlgeschlagen' : undefined,
    userImpact: params.isError
      ? 'Ein Tool-Schritt hat nicht geklappt. Das Ergebnis kann unvollständig sein.'
      : undefined,
  });
}
