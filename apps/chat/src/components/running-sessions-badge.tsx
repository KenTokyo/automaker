import { useMemo } from 'react';
import { LoaderCircle } from 'lucide-react';
import { useShallow } from 'zustand/react/shallow';
import { cn } from '@/lib/utils';
import { useSessionStore } from '../stores/session-store';
import { getRunningSessions } from '../stores/session-store-helpers';
import type { SessionState } from '../stores/types';

function toShortName(session: SessionState): string {
  const label = session.title?.trim() || session.name;
  return label.length > 24 ? `${label.slice(0, 22)}...` : label;
}

export function RunningSessionsBadge() {
  const sessions = useSessionStore(useShallow((state) => state.sessions));

  const runningSessions = useMemo(() => getRunningSessions(sessions), [sessions]);

  if (runningSessions.length === 0) return null;

  const label =
    runningSessions.length === 1
      ? '1 Agent aktiv'
      : `${runningSessions.length} Agents aktiv`;

  const tooltipLines = runningSessions.map(toShortName).join('\n');

  return (
    <div
      className={cn(
        'flex items-center gap-1.5 rounded-md border px-2 py-1 text-xs',
        'border-sky-500/30 bg-sky-500/10 text-sky-400'
      )}
      title={tooltipLines}
    >
      <LoaderCircle className="h-3 w-3 animate-spin text-sky-500" />
      <span className="whitespace-nowrap font-medium">{label}</span>
    </div>
  );
}
