/**
 * KanbanFullscreenDialog - Fullscreen overlay containing the KanbanBoard.
 *
 * Uses Radix Dialog with a fullscreen content area.
 * Shows project name in the header and a close button.
 */

import { useCallback } from 'react';
import { LayoutGrid, X } from 'lucide-react';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useSupabaseTasks } from '@/hooks/use-supabase-tasks';
import type { SupabaseTask } from '@/hooks/use-supabase-tasks';
import { KanbanBoard } from './kanban-board';

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface KanbanFullscreenDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId: string | null;
  projectName: string;
  onEditTask?: (task: SupabaseTask) => void;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function KanbanFullscreenDialog({
  open,
  onOpenChange,
  projectId,
  projectName,
  onEditTask,
}: KanbanFullscreenDialogProps) {
  const { tasks, loading, error, refetch, createTask, updateTask, deleteTask } = useSupabaseTasks({
    projectId,
  });

  const handleClose = useCallback(() => {
    onOpenChange(false);
  }, [onOpenChange]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        showCloseButton={false}
        className="flex h-[calc(100vh-2rem)] w-[calc(100vw-2rem)] max-w-none flex-col p-0 bg-zinc-950 border-white/5"
      >
        {/* Header */}
        <div className="flex shrink-0 items-center justify-between border-b border-white/5 px-4 py-3">
          <div className="flex items-center gap-2.5">
            <LayoutGrid className="h-5 w-5 text-violet-400" />
            <DialogTitle className="text-base font-semibold text-zinc-200">
              {projectName || 'Kanban Board'}
            </DialogTitle>
            <span className="text-xs text-zinc-500">{tasks.length} Tasks</span>
          </div>

          <Button
            variant="ghost"
            size="sm"
            className="h-8 w-8 p-0 text-zinc-600 hover:text-zinc-300 hover:bg-white/5"
            onClick={handleClose}
            title="Schliessen"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* Board */}
        <div className="min-h-0 flex-1 overflow-hidden">
          <KanbanBoard
            tasks={tasks}
            loading={loading}
            error={error}
            projectId={projectId}
            onUpdateTask={updateTask}
            onDeleteTask={deleteTask}
            onCreateTask={createTask}
            onRefetch={refetch}
            onEditTask={onEditTask}
          />
        </div>
      </DialogContent>
    </Dialog>
  );
}
