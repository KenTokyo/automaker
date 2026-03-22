import { Clock3, Plus, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { HistoryEmptyState } from './history-empty-state';
import { HistoryFilters } from './history-filters';
import { HistoryList } from './history-list';
import { HistorySearch } from './history-search';
import type { HistoryListItem, HistoryStatusFilter, HistoryTimeFilter } from './history-types';

interface HistoryPanelProps {
  items: HistoryListItem[];
  totalItemCount: number;
  currentSessionId: string | null;
  searchQuery: string;
  statusFilter: HistoryStatusFilter;
  timeFilter: HistoryTimeFilter;
  onSearchQueryChange: (value: string) => void;
  onStatusFilterChange: (value: HistoryStatusFilter) => void;
  onTimeFilterChange: (value: HistoryTimeFilter) => void;
  onSelectSession: (sessionId: string) => void;
  onCreateSession: () => void;
  onRenameSession: (sessionId: string, nextName: string) => Promise<boolean>;
  onArchiveSession: (sessionId: string) => Promise<boolean>;
  onDeleteSession: (sessionId: string) => Promise<boolean>;
  onClose: () => void;
}

export function HistoryPanel({
  items,
  totalItemCount,
  currentSessionId,
  searchQuery,
  statusFilter,
  timeFilter,
  onSearchQueryChange,
  onStatusFilterChange,
  onTimeFilterChange,
  onSelectSession,
  onCreateSession,
  onRenameSession,
  onArchiveSession,
  onDeleteSession,
  onClose,
}: HistoryPanelProps) {
  const emptyMode = totalItemCount === 0 ? 'no-sessions' : items.length === 0 ? 'no-results' : null;

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex items-center justify-between border-b border-muted px-3 py-2">
        <div className="flex items-center gap-2">
          <Clock3 className="h-4 w-4 text-muted-foreground" />
          <h2 className="text-sm font-semibold">Verlauf</h2>
        </div>

        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-muted-foreground hover:text-foreground"
            onClick={onCreateSession}
            aria-label="Neuen Chat starten"
            title="Neuen Chat starten"
          >
            <Plus className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-muted-foreground hover:text-foreground"
            onClick={onClose}
            aria-label="Verlauf schließen"
            title="Verlauf schließen"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className="space-y-3 border-b border-muted px-3 py-3">
        <HistorySearch
          value={searchQuery}
          resultCount={items.length}
          onChange={onSearchQueryChange}
        />
        <HistoryFilters
          statusFilter={statusFilter}
          timeFilter={timeFilter}
          onStatusFilterChange={onStatusFilterChange}
          onTimeFilterChange={onTimeFilterChange}
        />
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto">
        {emptyMode ? (
          <div className="p-3">
            <HistoryEmptyState mode={emptyMode} onCreateSession={onCreateSession} />
          </div>
        ) : (
          <HistoryList
            items={items}
            currentSessionId={currentSessionId}
            searchQuery={searchQuery}
            onSelectSession={onSelectSession}
            onRenameSession={onRenameSession}
            onArchiveSession={onArchiveSession}
            onDeleteSession={onDeleteSession}
          />
        )}
      </div>

      <div className="border-t border-muted px-3 py-2 text-xs text-muted-foreground">
        {items.length} von {totalItemCount} Chats sichtbar
      </div>
    </div>
  );
}
