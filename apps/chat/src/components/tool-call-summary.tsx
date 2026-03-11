import { AlertTriangle, CheckCircle2, Clock3, LoaderCircle, Wrench } from 'lucide-react';
import type { ToolCallGroupData, ToolCallStatus } from '../services/tool-call-utils';
import { cn } from '@/lib/utils';

interface ToolCallSummaryProps {
  group: ToolCallGroupData;
  expanded: boolean;
}

function formatDuration(durationMs?: number): string {
  if (!durationMs || durationMs <= 0) return '';
  return `${(durationMs / 1000).toFixed(1)}s`;
}

function getStatusLabel(status: ToolCallStatus): string {
  if (status === 'running') return 'läuft';
  if (status === 'ok') return 'ok';
  if (status === 'error') return 'Fehler';
  return 'Timeout';
}

function getStatusIcon(status: ToolCallStatus) {
  if (status === 'running') return LoaderCircle;
  if (status === 'ok') return CheckCircle2;
  if (status === 'error') return AlertTriangle;
  return Clock3;
}

function getStatusClass(status: ToolCallStatus): string {
  if (status === 'running') return 'border-amber-400/40 bg-amber-500/10 text-amber-700';
  if (status === 'ok') return 'border-emerald-400/40 bg-emerald-500/10 text-emerald-700';
  if (status === 'error') return 'border-red-400/40 bg-red-500/10 text-red-700';
  return 'border-orange-400/40 bg-orange-500/10 text-orange-700';
}

export function ToolCallSummary({ group, expanded }: ToolCallSummaryProps) {
  const StatusIcon = getStatusIcon(group.status);
  const duration = formatDuration(group.durationMs);
  const count = group.steps.length;
  const title = count === 1 ? '1 Tool-Schritt' : `${count} Tool-Schritte`;

  return (
    <div className="flex w-full items-center gap-2 text-xs">
      <Wrench className="h-3.5 w-3.5 text-muted-foreground" />
      <span className="font-medium text-foreground">{expanded ? 'Tool-Details' : title}</span>
      <span
        className={cn('rounded-full border px-2 py-0.5 font-medium', getStatusClass(group.status))}
      >
        <StatusIcon
          className={cn('mr-1 inline h-3 w-3', group.status === 'running' && 'animate-spin')}
        />
        {getStatusLabel(group.status)}
      </span>
      {duration ? <span className="text-muted-foreground">Dauer {duration}</span> : null}
    </div>
  );
}
