import type { SessionProcessStatus } from '../stores/types';

export type HistoryStatusFilter = 'all' | 'running' | 'stopped' | 'error';
export type HistoryTimeFilter = 'all' | 'today' | '7d' | '30d';

export interface HistoryListItem {
  id: string;
  name: string;
  preview: string;
  updatedAt: string;
  messageCount: number;
  model: string;
  processStatus: SessionProcessStatus;
}
