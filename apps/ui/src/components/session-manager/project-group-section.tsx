import { useState, useMemo } from 'react';
import { ChevronRight, FolderOpen, Folder } from 'lucide-react';
import { cn } from '@/lib/utils';
import { buildProjectDisplayEntries, type ProjectGroup } from '@/hooks/use-project-grouping';
import type { SessionDisplayEntry } from '@/hooks/use-session-grouping';

const INITIAL_VISIBLE = 3;
const LOAD_MORE_COUNT = 10;

interface ProjectGroupSectionProps {
  group: ProjectGroup;
  expandedRunIds: Record<string, boolean>;
  isExpanded: boolean;
  onToggleExpanded: () => void;
  visibleCount: number;
  onShowMore: () => void;
  /** Render function for display entries (sessions / orchestrator groups) */
  renderDisplayEntry: (entry: SessionDisplayEntry) => React.ReactNode;
}

export { INITIAL_VISIBLE, LOAD_MORE_COUNT };

export function ProjectGroupSection({
  group,
  expandedRunIds,
  isExpanded,
  onToggleExpanded,
  visibleCount,
  onShowMore,
  renderDisplayEntry,
}: ProjectGroupSectionProps) {
  const visibleSessions = useMemo(
    () => group.allSessions.slice(0, visibleCount),
    [group.allSessions, visibleCount]
  );

  const displayEntries = useMemo(
    () => buildProjectDisplayEntries(visibleSessions, expandedRunIds),
    [visibleSessions, expandedRunIds]
  );

  const hasMore = visibleCount < group.totalCount;
  const remainingCount = group.totalCount - visibleCount;

  return (
    <div className="mb-1">
      {/* Project header - clickable tree node */}
      <button
        className={cn(
          'flex w-full items-center gap-1 rounded-md px-1.5 py-1 text-left',
          'transition-colors duration-150 hover:bg-accent/50',
          'group/project-header cursor-pointer select-none'
        )}
        onClick={onToggleExpanded}
      >
        <ChevronRight
          className={cn(
            'h-3 w-3 shrink-0 text-muted-foreground transition-transform duration-200',
            isExpanded && 'rotate-90'
          )}
        />
        {isExpanded ? (
          <FolderOpen className="h-3 w-3 shrink-0 text-muted-foreground" />
        ) : (
          <Folder className="h-3 w-3 shrink-0 text-muted-foreground" />
        )}
        <span className="min-w-0 flex-1 truncate text-[11px] font-semibold text-foreground/90">
          {group.projectName}
        </span>
        <span className="shrink-0 rounded-full bg-muted px-1.5 py-0.5 text-[9px] tabular-nums text-muted-foreground">
          {group.totalCount}
        </span>
      </button>

      {/* Collapsible session list */}
      <div
        className={cn(
          'grid transition-[grid-template-rows,opacity] duration-200 ease-out',
          isExpanded
            ? 'grid-rows-[1fr] opacity-100'
            : 'grid-rows-[0fr] opacity-0 pointer-events-none'
        )}
      >
        <div className="min-h-0 overflow-hidden">
          <div className="ml-3 space-y-1 border-l border-dashed border-muted-foreground/20 pl-2 pt-1">
            {displayEntries.map((entry) => renderDisplayEntry(entry))}

            {/* Show more button */}
            {hasMore && (
              <button
                className={cn(
                  'flex w-full items-center justify-center gap-1 rounded-md py-1',
                  'text-[10px] text-muted-foreground hover:bg-accent/40 hover:text-foreground',
                  'transition-colors duration-150 cursor-pointer'
                )}
                onClick={(e) => {
                  e.stopPropagation();
                  onShowMore();
                }}
              >
                +{Math.min(LOAD_MORE_COUNT, remainingCount)} weitere anzeigen
                <span className="text-[9px] text-muted-foreground/60">
                  ({remainingCount} verbleibend)
                </span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
