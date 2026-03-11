import { ChevronDown, ChevronRight } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { cn } from '@/lib/utils';
import {
  isTimedOut,
  type ToolCallGroupData,
  type ToolCallStatus,
} from '../services/tool-call-utils';
import { ToolCallItem } from './tool-call-item';
import { ToolCallResult } from './tool-call-result';
import { ToolCallSummary } from './tool-call-summary';

interface ToolCallGroupProps {
  group: ToolCallGroupData;
}

function getGroupStatus(group: ToolCallGroupData, nowMs: number): ToolCallStatus {
  const hasTimeout = group.steps.some((step) => step.status === 'running' && isTimedOut(step.startedAt, nowMs));
  if (hasTimeout) return 'timeout';
  return group.status;
}

export function ToolCallGroup({ group }: ToolCallGroupProps) {
  const [open, setOpen] = useState(group.status === 'error' || group.status === 'timeout');
  const [nowMs, setNowMs] = useState(Date.now());

  const hasRunningStep = group.steps.some((step) => step.status === 'running');

  useEffect(() => {
    if (!hasRunningStep) return;

    const interval = window.setInterval(() => {
      setNowMs(Date.now());
    }, 1000);

    return () => {
      window.clearInterval(interval);
    };
  }, [hasRunningStep]);

  const effectiveGroup = useMemo(() => {
    const status = getGroupStatus(group, nowMs);
    return {
      ...group,
      status,
    };
  }, [group, nowMs]);

  return (
    <div
      className={cn(
        'max-w-4xl rounded-xl border px-3 py-2',
        effectiveGroup.status === 'error'
          ? 'border-red-400/40 bg-red-500/5'
          : effectiveGroup.status === 'timeout'
            ? 'border-orange-400/40 bg-orange-500/5'
            : 'border-muted bg-muted/20'
      )}
    >
      <button
        type="button"
        className="flex w-full items-center gap-2 text-left"
        onClick={() => setOpen((value) => !value)}
      >
        {open ? (
          <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
        ) : (
          <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
        )}
        <ToolCallSummary group={effectiveGroup} expanded={open} />
      </button>

      {open && (
        <div className="mt-2 space-y-2">
          {effectiveGroup.errorMessage ? (
            <div className="rounded border border-red-400/40 bg-red-500/5 px-2 py-1 text-xs text-red-800">
              {effectiveGroup.errorMessage}
            </div>
          ) : null}

          {effectiveGroup.userImpact ? (
            <div className="rounded border border-red-400/40 bg-red-500/5 px-2 py-1 text-xs text-red-800">
              <span className="font-medium">Was bedeutet das für mich? </span>
              {effectiveGroup.userImpact}
            </div>
          ) : null}

          {effectiveGroup.steps.map((step) => (
            <ToolCallItem key={step.id} step={step} nowMs={nowMs} />
          ))}

          {effectiveGroup.result ? <ToolCallResult result={effectiveGroup.result} /> : null}
        </div>
      )}
    </div>
  );
}
