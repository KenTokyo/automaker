import { useMemo, useState } from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';
import type { HistoryListItem } from './history-types';
import { HistoryItem } from './history-item';

interface HistoryListProps {
  items: HistoryListItem[];
  currentSessionId: string | null;
  searchQuery: string;
  onSelectSession: (sessionId: string) => void;
  onRenameSession: (sessionId: string, nextName: string) => Promise<boolean>;
  onArchiveSession: (sessionId: string) => Promise<boolean>;
  onDeleteSession: (sessionId: string) => Promise<boolean>;
}

type GroupKey = 'today' | 'yesterday' | 'week' | 'older';

interface GroupDefinition {
  key: GroupKey;
  label: string;
}

interface GroupEntry extends GroupDefinition {
  items: HistoryListItem[];
}

const GROUP_ORDER: GroupDefinition[] = [
  { key: 'today', label: 'Heute' },
  { key: 'yesterday', label: 'Gestern' },
  { key: 'week', label: 'Diese Woche' },
  { key: 'older', label: 'Älter' },
];

function startOfToday(): number {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
}

function toGroupKey(updatedAt: string, todayStartMs: number): GroupKey {
  const time = Date.parse(updatedAt);
  if (Number.isNaN(time)) return 'older';

  const diffDays = Math.floor((todayStartMs - time) / (24 * 60 * 60 * 1000));
  if (diffDays <= 0) return 'today';
  if (diffDays === 1) return 'yesterday';
  if (diffDays <= 6) return 'week';
  return 'older';
}

export function HistoryList({
  items,
  currentSessionId,
  searchQuery,
  onSelectSession,
  onRenameSession,
  onArchiveSession,
  onDeleteSession,
}: HistoryListProps) {
  const [collapsedGroups, setCollapsedGroups] = useState<Record<GroupKey, boolean>>({
    today: false,
    yesterday: false,
    week: false,
    older: false,
  });

  const groupedItems = useMemo<GroupEntry[]>(() => {
    const todayStartMs = startOfToday();
    const sortedItems = [...items].sort(
      (a, b) => Date.parse(b.updatedAt) - Date.parse(a.updatedAt)
    );
    const grouped = new Map<GroupKey, HistoryListItem[]>();

    for (const item of sortedItems) {
      const groupKey = toGroupKey(item.updatedAt, todayStartMs);
      const existing = grouped.get(groupKey) ?? [];
      existing.push(item);
      grouped.set(groupKey, existing);
    }

    return GROUP_ORDER.map((group) => ({
      ...group,
      items: grouped.get(group.key) ?? [],
    })).filter((group) => group.items.length > 0);
  }, [items]);

  return (
    <div className="space-y-3 p-2">
      {groupedItems.map((group) => {
        const collapsed = collapsedGroups[group.key] ?? false;

        return (
          <section key={group.key} className="space-y-1.5">
            <button
              type="button"
              className="flex w-full items-center justify-between rounded px-1 py-1 text-left text-xs text-muted-foreground hover:bg-muted/40"
              onClick={() =>
                setCollapsedGroups((current) => ({
                  ...current,
                  [group.key]: !collapsed,
                }))
              }
            >
              <span className="inline-flex items-center gap-1.5 font-medium">
                {collapsed ? (
                  <ChevronRight className="h-3.5 w-3.5" />
                ) : (
                  <ChevronDown className="h-3.5 w-3.5" />
                )}
                {group.label}
              </span>
              <span>{group.items.length}</span>
            </button>

            {!collapsed ? (
              <div className="space-y-1">
                {group.items.map((item) => (
                  <div
                    key={item.id}
                    style={{ contentVisibility: 'auto', containIntrinsicSize: '80px' }}
                  >
                    <HistoryItem
                      item={item}
                      isActive={item.id === currentSessionId}
                      searchQuery={searchQuery}
                      onSelect={onSelectSession}
                      onRename={onRenameSession}
                      onArchive={onArchiveSession}
                      onDelete={onDeleteSession}
                    />
                  </div>
                ))}
              </div>
            ) : null}
          </section>
        );
      })}
    </div>
  );
}
