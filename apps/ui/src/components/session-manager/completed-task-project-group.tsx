/**
 * CompletedTaskProjectGroup - Collapsible project group for the "Fertig" tab.
 *
 * Mirrors the ProjectGroupSection tree node from the Sessions tab but is
 * tailored for CompletedTask items: shows 3 initially, loads 10 more on
 * click, and includes a "cleanup" action to trim tasks > 20 per project.
 */

import { useMemo } from 'react';
import { ChevronRight, FolderOpen, Folder, Trash2 } from 'lucide-react';
import type { CompletedTask } from '@automaker/types';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { CompletedTaskCard } from './completed-task-card';

const INITIAL_VISIBLE = 3;
const LOAD_MORE_COUNT = 10;
const MAX_TASKS_KEEP = 20;

export { INITIAL_VISIBLE, LOAD_MORE_COUNT, MAX_TASKS_KEEP };

interface CompletedTaskProjectGroupProps {
  /** Display name of the project */
  projectName: string;
  /** Full project path */
  projectPath: string;
  /** All tasks for this project, already sorted newest-first */
  tasks: CompletedTask[];
  /** Whether the group is expanded (shows task list) */
  isExpanded: boolean;
  /** Toggle expansion */
  onToggleExpanded: () => void;
  /** How many tasks are currently visible */
  visibleCount: number;
  /** Show more tasks */
  onShowMore: () => void;
  /** Font size for cards */
  fontSize: number;
  /** Delete a single task */
  onDeleteTask: (filename: string) => void;
  /** Bulk-delete old tasks (keep only newest MAX_TASKS_KEEP) */
  onCleanupProject: (projectPath: string, tasksToDelete: string[]) => void;
}

export function CompletedTaskProjectGroup({
  projectName,
  projectPath,
  tasks,
  isExpanded,
  onToggleExpanded,
  visibleCount,
  onShowMore,
  fontSize,
  onDeleteTask,
  onCleanupProject,
}: CompletedTaskProjectGroupProps) {
  const visibleTasks = useMemo(() => tasks.slice(0, visibleCount), [tasks, visibleCount]);
  const hasMore = visibleCount < tasks.length;
  const remainingCount = tasks.length - visibleCount;
  const canCleanup = tasks.length > MAX_TASKS_KEEP;
  const cleanupCount = tasks.length - MAX_TASKS_KEEP;

  const handleCleanup = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!canCleanup) return;
    // Tasks are sorted newest-first, so tasks to delete are from index MAX_TASKS_KEEP onwards
    const tasksToDelete = tasks.slice(MAX_TASKS_KEEP).map((t) => t.filename);
    onCleanupProject(projectPath, tasksToDelete);
  };

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
          {projectName}
        </span>

        {/* Cleanup button (visible on hover, only if > MAX_TASKS_KEEP) */}
        {canCleanup && (
          <Button
            variant="ghost"
            size="sm"
            className="h-5 shrink-0 gap-1 px-1.5 text-[9px] text-muted-foreground opacity-0 transition-opacity group-hover/project-header:opacity-100 hover:text-destructive"
            onClick={handleCleanup}
            title={`${cleanupCount} alte Aufgaben löschen (nur neueste ${MAX_TASKS_KEEP} behalten)`}
          >
            <Trash2 className="h-2.5 w-2.5" />
            {cleanupCount}
          </Button>
        )}

        <span className="shrink-0 rounded-full bg-muted px-1.5 py-0.5 text-[9px] tabular-nums text-muted-foreground">
          {tasks.length}
        </span>
      </button>

      {/* Collapsible task list */}
      <div
        className={cn(
          'grid transition-[grid-template-rows,opacity] duration-200 ease-out',
          isExpanded
            ? 'grid-rows-[1fr] opacity-100'
            : 'grid-rows-[0fr] opacity-0 pointer-events-none'
        )}
      >
        <div className="min-h-0 overflow-hidden">
          <div className="ml-3 space-y-1.5 border-l border-dashed border-muted-foreground/20 pl-2 pt-1">
            {visibleTasks.map((task) => (
              <CompletedTaskCard
                key={`${task.projectPath || ''}:${task.filename}`}
                task={task}
                fontSize={fontSize}
                onDelete={onDeleteTask}
              />
            ))}

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
