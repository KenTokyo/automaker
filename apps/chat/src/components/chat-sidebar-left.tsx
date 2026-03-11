import { BarChart3, Clock3 } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { SidebarTab } from '../hooks/use-chat-panel-preferences';
import { DashboardPanel } from './dashboard-panel';
import { HistoryPanel } from './history-panel';
import type { HistoryListItem, HistoryStatusFilter, HistoryTimeFilter } from './history-types';

interface ChatSidebarLeftProps {
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
  activeSidebarTab: SidebarTab;
  onSidebarTabChange: (tab: SidebarTab) => void;
}

export function ChatSidebarLeft({
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
  activeSidebarTab,
  onSidebarTabChange,
}: ChatSidebarLeftProps) {
  return (
    <div className="flex h-full min-h-0 flex-col">
      {/* ── Tab switcher ──────────────────────────────────────────────── */}
      <div className="flex items-center border-b border-muted">
        <SidebarTabButton
          active={activeSidebarTab === 'history'}
          icon={<Clock3 className="h-3.5 w-3.5" />}
          label="Verlauf"
          onClick={() => onSidebarTabChange('history')}
        />
        <SidebarTabButton
          active={activeSidebarTab === 'overview'}
          icon={<BarChart3 className="h-3.5 w-3.5" />}
          label="Übersicht"
          onClick={() => onSidebarTabChange('overview')}
        />
      </div>

      {/* ── Panel content ─────────────────────────────────────────────── */}
      <div className="min-h-0 flex-1">
        {activeSidebarTab === 'history' ? (
          <HistoryPanel
            items={items}
            totalItemCount={totalItemCount}
            currentSessionId={currentSessionId}
            searchQuery={searchQuery}
            statusFilter={statusFilter}
            timeFilter={timeFilter}
            onSearchQueryChange={onSearchQueryChange}
            onStatusFilterChange={onStatusFilterChange}
            onTimeFilterChange={onTimeFilterChange}
            onSelectSession={onSelectSession}
            onCreateSession={onCreateSession}
            onRenameSession={onRenameSession}
            onArchiveSession={onArchiveSession}
            onDeleteSession={onDeleteSession}
            onClose={onClose}
          />
        ) : (
          <DashboardPanel onClose={onClose} />
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Tab button
// ---------------------------------------------------------------------------

function SidebarTabButton({
  active,
  icon,
  label,
  onClick,
}: {
  active: boolean;
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      className={cn(
        'flex flex-1 items-center justify-center gap-1.5 px-3 py-2 text-xs transition-colors',
        active
          ? 'border-b-2 border-foreground text-foreground font-medium'
          : 'border-b-2 border-transparent text-muted-foreground hover:text-foreground'
      )}
      onClick={onClick}
    >
      {icon}
      {label}
    </button>
  );
}
