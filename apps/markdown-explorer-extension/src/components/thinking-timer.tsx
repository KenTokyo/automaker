import { useEffect, useMemo, useState } from 'react';
import type { ThinkingBlockData } from '../services/thinking-utils';

interface ThinkingTimerProps {
  block: ThinkingBlockData;
}

function parseIso(value: string | undefined): number {
  if (!value) return Number.NaN;
  const parsed = Date.parse(value);
  return Number.isNaN(parsed) ? Number.NaN : parsed;
}

function toElapsedSeconds(block: ThinkingBlockData, nowMs: number): number {
  if (typeof block.durationMs === 'number' && block.durationMs >= 0) {
    return Math.max(1, Math.round(block.durationMs / 1000));
  }

  const startedAtMs = parseIso(block.startedAt);
  if (Number.isNaN(startedAtMs)) return 1;

  const fallbackFinishedMs = block.finishedAt ? parseIso(block.finishedAt) : Number.NaN;
  const effectiveNow = Number.isNaN(fallbackFinishedMs) ? nowMs : fallbackFinishedMs;
  const rawSeconds = Math.floor((effectiveNow - startedAtMs) / 1000);
  return Math.max(1, rawSeconds);
}

function formatDuration(seconds: number): string {
  if (seconds < 60) {
    return `${seconds}s`;
  }

  const minutes = Math.floor(seconds / 60);
  const rest = seconds % 60;
  return `${minutes}:${String(rest).padStart(2, '0')}`;
}

export function ThinkingTimer({ block }: ThinkingTimerProps) {
  const [nowMs, setNowMs] = useState(Date.now());
  const isRunning = block.status === 'start' || block.status === 'running';

  useEffect(() => {
    if (!isRunning) return;

    const interval = window.setInterval(() => {
      setNowMs(Date.now());
    }, 1000);

    return () => {
      window.clearInterval(interval);
    };
  }, [isRunning]);

  const elapsed = useMemo(() => {
    return toElapsedSeconds(block, nowMs);
  }, [block, nowMs]);

  return (
    <span className="font-mono text-[11px] text-muted-foreground" aria-label="Dauer">
      {formatDuration(elapsed)}
    </span>
  );
}
