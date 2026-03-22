import { useMemo } from 'react';
import { toHistoryName } from '../components/chat-view-utils';
import type {
  HistoryListItem,
  HistoryStatusFilter,
  HistoryTimeFilter,
} from '../components/history-types';
import type { SessionState } from '../stores/types';

interface UseHistoryPanelDataInput {
  sessions: SessionState[];
  searchQuery: string;
  statusFilter: HistoryStatusFilter;
  timeFilter: HistoryTimeFilter;
}

interface UseHistoryPanelDataResult {
  items: HistoryListItem[];
  totalItemCount: number;
}

function toSafeHistoryName(session: SessionState): string {
  const nextName = toHistoryName(session).trim();
  return nextName.length > 0 ? nextName : 'Chat ohne Titel';
}

function matchesSearch(session: HistoryListItem, searchQuery: string): boolean {
  const terms = searchQuery.trim().toLowerCase().split(/\s+/).filter(Boolean);

  if (terms.length === 0) {
    return true;
  }

  const source = `${session.name} ${session.preview} ${session.model}`.toLowerCase();
  return terms.every((term) => source.includes(term));
}

function matchesStatus(session: HistoryListItem, statusFilter: HistoryStatusFilter): boolean {
  if (statusFilter === 'all') return true;
  if (statusFilter === 'running') return session.processStatus === 'running';
  if (statusFilter === 'error') return session.processStatus === 'error';
  return session.processStatus === 'stopped' || session.processStatus === 'idle';
}

function matchesTime(session: HistoryListItem, timeFilter: HistoryTimeFilter): boolean {
  if (timeFilter === 'all') return true;

  const updatedAtMs = Date.parse(session.updatedAt);
  if (Number.isNaN(updatedAtMs)) return false;

  const now = Date.now();
  if (timeFilter === 'today') {
    const today = new Date();
    const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime();
    return updatedAtMs >= todayStart;
  }

  const dayLimit = timeFilter === '7d' ? 7 : 30;
  return updatedAtMs >= now - dayLimit * 24 * 60 * 60 * 1000;
}

export function useHistoryPanelData({
  sessions,
  searchQuery,
  statusFilter,
  timeFilter,
}: UseHistoryPanelDataInput): UseHistoryPanelDataResult {
  return useMemo(() => {
    const mappedItems: HistoryListItem[] = sessions.map((session) => ({
      id: session.id,
      name: toSafeHistoryName(session),
      preview: session.preview,
      updatedAt: session.updatedAt,
      messageCount: session.messageCount,
      model: session.model,
      processStatus: session.processStatus,
    }));

    const filteredItems = mappedItems
      .filter((session) => matchesSearch(session, searchQuery))
      .filter((session) => matchesStatus(session, statusFilter))
      .filter((session) => matchesTime(session, timeFilter))
      .sort((a, b) => Date.parse(b.updatedAt) - Date.parse(a.updatedAt));

    return {
      items: filteredItems,
      totalItemCount: mappedItems.length,
    };
  }, [searchQuery, sessions, statusFilter, timeFilter]);
}
