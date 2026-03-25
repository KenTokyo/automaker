import { useMemo } from 'react';
import { ChevronRight, ChevronUp, FolderOpen, Folder, Plus } from 'lucide-react';
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
  onShowLess: () => void;
  /** Render function for display entries (sessions / orchestrator groups) */
  renderDisplayEntry: (entry: SessionDisplayEntry) => React.ReactNode;
  /** Creates a new chat in this project */
  onNewSession?: (projectPath: string) => void;
}

export { INITIAL_VISIBLE, LOAD_MORE_COUNT };

export function ProjectGroupSection({
  group,
  expandedRunIds,
  isExpanded,
  onToggleExpanded,
  visibleCount,
  onShowMore,
  onShowLess,
  renderDisplayEntry,
  onNewSession,
}: ProjectGroupSectionProps) {
  const visibleSessions = useMemo(() => {
    const baseVisible = group.allSessions.slice(0, visibleCount);
    const byId = new Map(group.allSessions.map((session) => [session.id, session]));
    const visibleIds = new Set(baseVisible.map((session) => session.id));

    // If a visible child session exists, ensure all its parents are also visible
    // so we can render a stable parent -> child tree.
    for (const session of baseVisible) {
      let parentId = session.parentSessionId;
      while (parentId) {
        const parentSession = byId.get(parentId);
        if (!parentSession) break;
        visibleIds.add(parentSession.id);
        parentId = parentSession.parentSessionId;
      }
    }

    return group.allSessions.filter((session) => visibleIds.has(session.id));
  }, [group.allSessions, visibleCount]);

  const displayEntries = useMemo(
    () => buildProjectDisplayEntries(visibleSessions, expandedRunIds),
    [visibleSessions, expandedRunIds]
  );

  const hasMore = visibleCount < group.totalCount;
  const remainingCount = group.totalCount - visibleCount;
  const isExpansionActive = visibleCount > INITIAL_VISIBLE;

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
        {onNewSession && (
          <span
            role="button"
            tabIndex={-1}
            onClick={(e) => {
              e.stopPropagation();
              onNewSession(group.projectPath);
            }}
            className={cn(
              'shrink-0 rounded-md p-0.5',
              'text-emerald-500 hover:text-emerald-400 hover:bg-emerald-500/15',
              'opacity-0 group-hover/project-header:opacity-100',
              'transition-all duration-150 cursor-pointer'
            )}
            title={`Neuer Chat in ${group.projectName}`}
          >
            <Plus className="h-3.5 w-3.5" />
          </span>
        )}
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

            {/* Show more / show less controls */}
            {(hasMore || isExpansionActive) && (
              <div className="flex items-center gap-1 pt-0.5">
                {hasMore && (
                  <button
                    className={cn(
                      'flex flex-1 items-center justify-center gap-1 rounded-md py-1',
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
                {isExpansionActive && (
                  <button
                    className={cn(
                      'flex items-center justify-center gap-0.5 rounded-md px-2 py-1',
                      'text-[10px] text-muted-foreground hover:bg-accent/40 hover:text-foreground',
                      'transition-colors duration-150 cursor-pointer',
                      !hasMore && 'flex-1'
                    )}
                    onClick={(e) => {
                      e.stopPropagation();
                      onShowLess();
                    }}
                  >
                    <ChevronUp className="h-3 w-3" />
                    Weniger anzeigen
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
