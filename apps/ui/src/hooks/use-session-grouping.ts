import { useMemo } from 'react';
import type { SessionListItem } from '@/types/electron';

export interface OrchestratorRunGroup {
  runId: string;
  sessions: SessionListItem[];
  leadSession: SessionListItem;
  phaseCount: number;
  isExpanded: boolean;
}

export type SessionDisplayEntry =
  | { type: 'single'; session: SessionListItem }
  | { type: 'orchestrator'; group: OrchestratorRunGroup };

interface UseSessionGroupingOptions {
  sessions: SessionListItem[];
  expandedRunIds: Record<string, boolean>;
}

interface PendingDisplayEntry {
  entry: SessionDisplayEntry;
  sortTime: number;
  firstIndex: number;
}

interface PendingRunGroup {
  runId: string;
  sessions: SessionListItem[];
  firstIndex: number;
}

function getSessionSortTime(session: SessionListItem): number {
  const updatedAt = Date.parse(session.updatedAt);
  if (!Number.isNaN(updatedAt)) return updatedAt;

  const createdAt = Date.parse(session.createdAt);
  if (!Number.isNaN(createdAt)) return createdAt;

  return 0;
}

function getSessionCreatedTime(session: SessionListItem): number {
  const createdAt = Date.parse(session.createdAt);
  if (!Number.isNaN(createdAt)) return createdAt;

  return getSessionSortTime(session);
}

function normalizeRunId(orchestratorRunId: string | undefined): string | null {
  if (!orchestratorRunId) return null;
  const normalized = orchestratorRunId.trim();
  return normalized.length > 0 ? normalized : null;
}

export function buildDisplayEntries(
  sessions: SessionListItem[],
  expandedRunIds: Record<string, boolean>
): SessionDisplayEntry[] {
  const runGroups = new Map<string, PendingRunGroup>();
  const displayEntries: PendingDisplayEntry[] = [];

  sessions.forEach((session, index) => {
    const runId = normalizeRunId(session.orchestratorRunId);
    if (!runId) {
      displayEntries.push({
        entry: { type: 'single', session },
        sortTime: getSessionSortTime(session),
        firstIndex: index,
      });
      return;
    }

    const existingGroup = runGroups.get(runId);
    if (existingGroup) {
      existingGroup.sessions.push(session);
      return;
    }

    runGroups.set(runId, {
      runId,
      sessions: [session],
      firstIndex: index,
    });
  });

  for (const group of runGroups.values()) {
    const groupedSessions = [...group.sessions].sort((a, b) => {
      const byCreatedAt = getSessionCreatedTime(a) - getSessionCreatedTime(b);
      if (byCreatedAt !== 0) return byCreatedAt;

      const byUpdatedAt = getSessionSortTime(a) - getSessionSortTime(b);
      if (byUpdatedAt !== 0) return byUpdatedAt;

      return a.id.localeCompare(b.id);
    });

    const leadSession = groupedSessions[groupedSessions.length - 1];
    displayEntries.push({
      entry: {
        type: 'orchestrator',
        group: {
          runId: group.runId,
          sessions: groupedSessions,
          leadSession,
          phaseCount: groupedSessions.length,
          isExpanded: !!expandedRunIds[group.runId],
        },
      },
      sortTime: getSessionSortTime(leadSession),
      firstIndex: group.firstIndex,
    });
  }

  return displayEntries
    .sort((a, b) => {
      if (a.sortTime !== b.sortTime) return b.sortTime - a.sortTime;
      return a.firstIndex - b.firstIndex;
    })
    .map((item) => item.entry);
}

export function useSessionGrouping({ sessions, expandedRunIds }: UseSessionGroupingOptions) {
  return useMemo(() => buildDisplayEntries(sessions, expandedRunIds), [sessions, expandedRunIds]);
}
