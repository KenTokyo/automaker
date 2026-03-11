import { AlertCircle, CheckCircle2, ChevronDown, ChevronRight, Clock3, LoaderCircle } from 'lucide-react';
import { useMemo, useState } from 'react';
import { cn } from '@/lib/utils';
import { getToolDurationMs, isTimedOut, type ToolCallStatus, type ToolCallStep } from '../services/tool-call-utils';

interface ToolCallItemProps {
  step: ToolCallStep;
  nowMs: number;
}

function toText(value: unknown): string {
  if (!value || typeof value !== 'object') return 'Keine Parameter';

  const record = value as Record<string, unknown>;
  const quickValue =
    (typeof record.command === 'string' && record.command) ||
    (typeof record.pattern === 'string' && record.pattern) ||
    (typeof record.path === 'string' && record.path) ||
    (typeof record.url === 'string' && record.url) ||
    (typeof record.q === 'string' && record.q) ||
    (typeof record.query === 'string' && record.query) ||
    '';

  if (!quickValue) {
    return 'Details anzeigen';
  }

  return quickValue.length > 90 ? `${quickValue.slice(0, 87)}...` : quickValue;
}

function prettyJson(value: unknown): string {
  if (value === undefined) return 'Keine Parameter';
  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return 'Parameter konnten nicht angezeigt werden.';
  }
}

function getStatus(step: ToolCallStep, nowMs: number): ToolCallStatus {
  if (step.status !== 'running') return step.status;
  return isTimedOut(step.startedAt, nowMs) ? 'timeout' : 'running';
}

function getStatusIcon(status: ToolCallStatus) {
  if (status === 'running') return LoaderCircle;
  if (status === 'ok') return CheckCircle2;
  if (status === 'error') return AlertCircle;
  return Clock3;
}

function getStatusLabel(status: ToolCallStatus): string {
  if (status === 'running') return 'läuft';
  if (status === 'ok') return 'ok';
  if (status === 'error') return 'Fehler';
  return 'Timeout';
}

function getStatusClass(status: ToolCallStatus): string {
  if (status === 'running') return 'border-amber-400/40 bg-amber-500/10 text-amber-700';
  if (status === 'ok') return 'border-emerald-400/40 bg-emerald-500/10 text-emerald-700';
  if (status === 'error') return 'border-red-400/40 bg-red-500/10 text-red-700';
  return 'border-orange-400/40 bg-orange-500/10 text-orange-700';
}

function formatDuration(step: ToolCallStep, status: ToolCallStatus, nowMs: number): string {
  if (typeof step.durationMs === 'number' && step.durationMs >= 0) {
    return `${(step.durationMs / 1000).toFixed(1)}s`;
  }

  if (status === 'running' || status === 'timeout') {
    const elapsed = getToolDurationMs(step.startedAt, new Date(nowMs).toISOString());
    if (elapsed && elapsed > 0) {
      return `${(elapsed / 1000).toFixed(1)}s`;
    }
  }

  return '0.0s';
}

export function ToolCallItem({ step, nowMs }: ToolCallItemProps) {
  const [open, setOpen] = useState(false);

  const status = useMemo(() => getStatus(step, nowMs), [nowMs, step]);
  const StatusIcon = getStatusIcon(status);

  return (
    <div className="rounded-lg border border-muted bg-card/70 p-2">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className="flex w-full items-center gap-2 text-left text-xs"
      >
        {open ? <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" /> : <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />}
        <span className="font-mono text-xs font-medium text-foreground">{step.name}</span>
        <span className={cn('rounded-full border px-2 py-0.5 text-[11px] font-medium', getStatusClass(status))}>
          <StatusIcon className={cn('mr-1 inline h-3 w-3', status === 'running' && 'animate-spin')} />
          {getStatusLabel(status)}
        </span>
        <span className="text-muted-foreground">{formatDuration(step, status, nowMs)}</span>
      </button>

      <p className="mt-1 text-xs text-muted-foreground">{toText(step.input)}</p>

      {status === 'error' && (
        <div className="mt-2 rounded border border-red-400/40 bg-red-500/5 px-2 py-1 text-xs text-red-800">
          <p className="font-medium">Was bedeutet das für mich?</p>
          <p>{step.userImpact || 'Ein Tool-Schritt ist fehlgeschlagen. Das Ergebnis kann unvollständig sein.'}</p>
        </div>
      )}

      {status === 'timeout' && (
        <div className="mt-2 rounded border border-orange-400/40 bg-orange-500/5 px-2 py-1 text-xs text-orange-800">
          Dieser Tool-Schritt dauert sehr lange. Er könnte hängen.
        </div>
      )}

      {open && (
        <div className="mt-2 space-y-2">
          {step.errorMessage ? (
            <div className="rounded border border-red-400/40 bg-red-500/5 px-2 py-1 text-xs text-red-800">
              Technischer Fehler: {step.errorMessage}
            </div>
          ) : null}
          <pre className="max-h-52 overflow-auto whitespace-pre-wrap break-words rounded border border-muted bg-muted/20 p-2 text-[11px] text-muted-foreground">
            {prettyJson(step.input)}
          </pre>
        </div>
      )}
    </div>
  );
}
