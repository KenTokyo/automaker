import { ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Spinner } from '@/components/ui/spinner';
import type { OrchestratorRunGroup } from '@/hooks/use-session-grouping';

interface OrchestratorRunHeaderProps {
  group: OrchestratorRunGroup;
  isExpanded: boolean;
  onToggle: () => void;
  runningSessions: Set<string>;
  currentSessionId: string | null;
  isCurrentSessionThinking: boolean;
  sessionFontSize: number;
  isMultiselectMode: boolean;
  selectedSessionCount: number;
  allSessionsSelected: boolean;
}

function formatRelativeTime(isoDate: string): string {
  const timestamp = Date.parse(isoDate);
  if (Number.isNaN(timestamp)) return 'updated recently';

  const diffMs = Math.max(0, Date.now() - timestamp);
  if (diffMs < 60_000) return 'updated just now';

  const diffMinutes = Math.floor(diffMs / 60_000);
  if (diffMinutes < 60) return `updated ${diffMinutes}m ago`;

  const diffHours = Math.floor(diffMinutes / 60);
  if (diffHours < 24) return `updated ${diffHours}h ago`;

  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 7) return `updated ${diffDays}d ago`;

  return `updated ${new Date(timestamp).toLocaleDateString()}`;
}

function truncateRunId(runId: string): string {
  if (runId.length <= 18) return runId;
  return `${runId.slice(0, 8)}...${runId.slice(-6)}`;
}

export function OrchestratorRunHeader({
  group,
  isExpanded,
  onToggle,
  runningSessions,
  currentSessionId,
  isCurrentSessionThinking,
  sessionFontSize,
  isMultiselectMode,
  selectedSessionCount,
  allSessionsSelected,
}: OrchestratorRunHeaderProps) {
  const isCurrentGroup = group.sessions.some((session) => session.id === currentSessionId);
  const isRunning = group.sessions.some(
    (session) =>
      runningSessions.has(session.id) ||
      (currentSessionId === session.id && isCurrentSessionThinking)
  );
  const wasTimeLimited =
    !isRunning && group.sessions.some((session) => session.status === 'time_limited');
  const wasStopped =
    !isRunning && !wasTimeLimited && group.sessions.some((session) => session.status === 'stopped');

  const totalMessages = group.sessions.reduce((sum, session) => sum + session.messageCount, 0);
  const title = group.leadSession.name.trim() || 'Orchestrator Workflow';

  return (
    <button
      type="button"
      onClick={onToggle}
      aria-expanded={isMultiselectMode ? undefined : isExpanded}
      className={cn(
        'group',
        'w-full rounded-lg border border-border/70 border-l-2 border-l-primary/50',
        'bg-muted/30 px-3 py-2 text-left',
        'transition-[background-color,border-color,transform,box-shadow] duration-200 ease-out',
        'hover:-translate-y-[1px] hover:bg-muted/50 hover:shadow-sm active:translate-y-0 active:scale-[0.995]',
        isRunning && 'border-l-amber-500/70 border-amber-500/40 bg-amber-500/5',
        wasTimeLimited && 'border-l-orange-500/70 border-orange-500/40 bg-orange-500/5',
        wasStopped && 'border-l-red-500/70 border-red-500/40 bg-red-500/5',
        isCurrentGroup &&
          !isRunning &&
          !wasStopped &&
          !wasTimeLimited &&
          'border-primary bg-primary/10',
        isMultiselectMode && allSessionsSelected && 'border-primary bg-primary/20'
      )}
      data-testid={`orchestrator-run-${group.runId}`}
    >
      <div className="flex items-start gap-2">
        <div className="pt-0.5 text-muted-foreground">
          <ChevronRight
            className={cn(
              'h-4 w-4 transition-transform duration-200',
              isExpanded && 'rotate-90',
              isMultiselectMode ? 'opacity-70' : 'group-hover:text-foreground'
            )}
          />
        </div>

        <div className="min-w-0 flex-1" style={{ fontSize: `${sessionFontSize}px` }}>
          <div className="mb-1 flex flex-wrap items-center gap-1.5">
            <h3 className="truncate font-medium" style={{ fontSize: 'inherit' }}>
              {title}
            </h3>

            <span
              className={cn(
                'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium',
                isRunning && 'bg-amber-500/10 text-amber-500',
                wasTimeLimited && 'bg-orange-500/10 text-orange-500',
                wasStopped && 'bg-red-500/10 text-red-500',
                !isRunning && !wasStopped && !wasTimeLimited && 'bg-green-500/10 text-green-500'
              )}
            >
              {isRunning && <Spinner size="sm" className="h-3 w-3" />}
              {isRunning
                ? 'Läuft'
                : wasTimeLimited
                  ? 'Zeitlimit'
                  : wasStopped
                    ? 'Gestoppt'
                    : 'Abgeschlossen'}
            </span>

            <span className="inline-flex rounded-full bg-muted px-2 py-0.5 text-[10px] text-muted-foreground">
              {group.phaseCount} {group.phaseCount === 1 ? 'phase' : 'phases'}
            </span>

            {isMultiselectMode && (
              <span className="inline-flex rounded-full bg-primary/10 px-2 py-0.5 text-[10px] text-primary">
                {selectedSessionCount}/{group.phaseCount} selected
              </span>
            )}
          </div>

          <div
            className="flex flex-wrap items-center gap-2 text-muted-foreground"
            style={{ fontSize: `${Math.max(10, sessionFontSize - 4)}px` }}
          >
            <span>{formatRelativeTime(group.leadSession.updatedAt)}</span>
            <span>|</span>
            <span>{totalMessages} messages</span>
            <span>|</span>
            <span className="truncate font-mono" title={group.runId}>
              Run {truncateRunId(group.runId)}
            </span>
          </div>
        </div>
      </div>
    </button>
  );
}
