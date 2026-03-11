import { CheckCircle2, Cog, Loader2, XCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { OrchestratorRunInfo } from '../services/orchestrator-utils';
import { formatRunId } from '../services/orchestrator-utils';

interface OrchestratorStatusBarProps {
  runInfo: OrchestratorRunInfo;
  isProcessing: boolean;
}

function getStatusLabel(runInfo: OrchestratorRunInfo, isProcessing: boolean): string {
  if (runInfo.isAllComplete) return 'Alle Phasen abgeschlossen';
  if (!isProcessing && runInfo.phases.length === 0) return 'Orchestrator bereit';
  const errorPhase = runInfo.phases.find((p) => p.status === 'error');
  if (errorPhase) return `Phase ${errorPhase.iteration} hat einen Fehler`;
  if (isProcessing) return `Phase ${runInfo.currentIteration} läuft`;
  if (runInfo.completedPhases > 0) return `${runInfo.completedPhases} Phase(n) abgeschlossen`;
  return 'Orchestrator bereit';
}

function getStatusIcon(runInfo: OrchestratorRunInfo, isProcessing: boolean) {
  if (runInfo.isAllComplete) {
    return <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />;
  }
  const hasError = runInfo.phases.some((p) => p.status === 'error');
  if (hasError) {
    return <XCircle className="h-3.5 w-3.5 text-red-500" />;
  }
  if (isProcessing) {
    return <Loader2 className="h-3.5 w-3.5 animate-spin text-primary" />;
  }
  return <Cog className="h-3.5 w-3.5 text-muted-foreground" />;
}

function getProgressPercent(runInfo: OrchestratorRunInfo): number {
  if (runInfo.isAllComplete) return 100;
  if (runInfo.totalPhases === 0) return 0;
  return Math.round((runInfo.completedPhases / Math.max(runInfo.totalPhases, 1)) * 100);
}

export function OrchestratorStatusBar({ runInfo, isProcessing }: OrchestratorStatusBarProps) {
  if (!runInfo.isActive) return null;

  const statusLabel = getStatusLabel(runInfo, isProcessing);
  const statusIcon = getStatusIcon(runInfo, isProcessing);
  const progressPercent = getProgressPercent(runInfo);
  const showProgress = runInfo.totalPhases > 0;

  return (
    <div
      className={cn(
        'flex items-center gap-3 border-b px-4 py-1.5 text-xs',
        runInfo.isAllComplete
          ? 'border-emerald-400/30 bg-emerald-500/5'
          : runInfo.phases.some((p) => p.status === 'error')
            ? 'border-red-400/30 bg-red-500/5'
            : 'border-muted bg-muted/20'
      )}
    >
      {statusIcon}

      <span className="font-medium text-foreground">{statusLabel}</span>

      <span className="text-muted-foreground">
        Iteration {runInfo.currentIteration}
      </span>

      {runInfo.runId && (
        <span
          className="hidden text-muted-foreground/70 sm:inline"
          title={runInfo.runId}
        >
          Run {formatRunId(runInfo.runId)}
        </span>
      )}

      {showProgress && (
        <div className="ml-auto flex items-center gap-2">
          <span className="text-muted-foreground">
            {runInfo.completedPhases}/{runInfo.totalPhases}
          </span>
          <div className="h-1.5 w-16 overflow-hidden rounded-full bg-muted">
            <div
              className={cn(
                'h-full rounded-full transition-all duration-500',
                runInfo.isAllComplete
                  ? 'bg-emerald-500'
                  : runInfo.phases.some((p) => p.status === 'error')
                    ? 'bg-red-500'
                    : 'bg-primary'
              )}
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>
      )}
    </div>
  );
}
