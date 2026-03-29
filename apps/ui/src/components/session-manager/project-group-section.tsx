import { useMemo } from 'react';
import { ChevronRight, ChevronUp, FolderOpen, Folder, Plus } from 'lucide-react';
import { cn } from '@/lib/utils';
import { buildProjectDisplayEntries, type ProjectGroup } from '@/hooks/use-project-grouping';
import type { SessionDisplayEntry } from '@/hooks/use-session-grouping';

const INITIAL_VISIBLE = 3;
const LOAD_MORE_COUNT = 5;

interface ProjectGroupSectionProps {
  group: ProjectGroup;
  expandedRunIds: Record<string, boolean>;
  runningSessions: Set<string>;
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
  runningSessions,
  isExpanded,
  onToggleExpanded,
  visibleCount,
  onShowMore,
  onShowLess,
  renderDisplayEntry,
  onNewSession,
}: ProjectGroupSectionProps) {
  const visibleSessions = useMemo(() => {
    const byId = new Map(group.allSessions.map((session) => [session.id, session]));
    const visibleIds = new Set<string>();

    // Step 1: Select the first N *parent* sessions (sessions without parentSessionId).
    // visibleCount controls how many parents we show, NOT total sessions.
    let parentsSeen = 0;
    for (const session of group.allSessions) {
      if (session.parentSessionId) continue; // Skip children in this pass
      parentsSeen++;
      if (parentsSeen > visibleCount) break;
      visibleIds.add(session.id);
    }

    // Step 2: For each visible parent, include ALL its children automatically.
    // Children don't count towards the limit – they belong to their parent.
    for (const session of group.allSessions) {
      if (!session.parentSessionId) continue;
      // Walk up the parent chain; if any ancestor is visible, include this child
      let ancestorId: string | undefined | null = session.parentSessionId;
      while (ancestorId) {
        if (visibleIds.has(ancestorId)) {
          visibleIds.add(session.id);
          break;
        }
        const ancestor = byId.get(ancestorId);
        if (!ancestor) break;
        ancestorId = ancestor.parentSessionId;
      }
    }

    // Step 3: Keep currently running sessions visible (even outside the limit)
    // so sub-agent rows don't disappear mid-run.
    for (const session of group.allSessions) {
      if (!runningSessions.has(session.id)) continue;
      visibleIds.add(session.id);
      // Also ensure parent chain is visible for running children
      let parentId = session.parentSessionId;
      while (parentId) {
        const parentSession = byId.get(parentId);
        if (!parentSession) break;
        visibleIds.add(parentSession.id);
        parentId = parentSession.parentSessionId;
      }
    }

    return group.allSessions.filter((session) => visibleIds.has(session.id));
  }, [group.allSessions, visibleCount, runningSessions]);

  const displayEntries = useMemo(
    () => buildProjectDisplayEntries(visibleSessions, expandedRunIds),
    [visibleSessions, expandedRunIds]
  );

  // "Show more" logic is based on parent count, NOT total session count
  const hasMore = visibleCount < group.parentCount;
  const remainingCount = group.parentCount - visibleCount;
  const isExpansionActive = visibleCount > INITIAL_VISIBLE;

  return (
    <div className="mb-1">
      {/* Project header - clickable tree node */}
      <button
        className={cn(
          'flex w-full items-center gap-1.5 rounded-lg px-2 py-1.5 text-left',
          'transition-colors duration-150 hover:bg-accent/60',
          'group/project-header cursor-pointer select-none'
        )}
        onClick={onToggleExpanded}
      >
        <ChevronRight
          className={cn(
            'h-3.5 w-3.5 shrink-0 text-muted-foreground transition-transform duration-200',
            isExpanded && 'rotate-90'
          )}
        />
        {isExpanded ? (
          <FolderOpen className="h-4.5 w-4.5 shrink-0 text-yellow-400 drop-shadow-[0_0_3px_rgba(250,204,21,0.4)]" />
        ) : (
          <Folder className="h-4.5 w-4.5 shrink-0 text-yellow-400 drop-shadow-[0_0_3px_rgba(250,204,21,0.4)]" />
        )}
        <span className="min-w-0 flex-1 truncate text-xs font-bold text-foreground">
          {group.projectName}
        </span>
        <span className="shrink-0 rounded-full bg-muted px-1.5 py-0.5 text-[10px] tabular-nums text-muted-foreground">
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
              'shrink-0 rounded-md p-1',
              'text-emerald-400 hover:text-emerald-300 hover:bg-emerald-500/20',
              'opacity-100',
              'transition-all duration-150 cursor-pointer'
            )}
            title={`Neuer Chat in ${group.projectName}`}
          >
            <Plus className="h-4 w-4" />
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
