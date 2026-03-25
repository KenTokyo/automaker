/**
 * TaskContextBadge - Shows a small banner above the chat when a task
 * has been sent to the agent.
 *
 * Displays the task title with an icon and a dismiss button.
 * Clicking the badge navigates back to the tasks panel.
 */

import { useCallback } from 'react';
import { ClipboardList, X } from 'lucide-react';
import { useTaskChatBridgeStore } from '@/store/task-chat-bridge-store';
import { useAppStore } from '@/store/app-store';
import { Button } from '@/components/ui/button';

export function TaskContextBadge() {
  const activeTaskContext = useTaskChatBridgeStore((s) => s.activeTaskContext);
  const dismissTaskContext = useTaskChatBridgeStore((s) => s.dismissTaskContext);
  const setLeftPanelTab = useAppStore((s) => s.setLeftPanelTab);

  const handleNavigateToTasks = useCallback(() => {
    setLeftPanelTab('tasks');
  }, [setLeftPanelTab]);

  if (!activeTaskContext) return null;

  return (
    <div className="flex items-center gap-2 border-b border-white/5 bg-cyan-950/30 px-3 py-1.5">
      <button
        type="button"
        className="flex min-w-0 flex-1 items-center gap-2 text-left transition-colors hover:opacity-80"
        onClick={handleNavigateToTasks}
        title="Zurueck zu Tasks"
      >
        <ClipboardList className="h-3.5 w-3.5 shrink-0 text-cyan-400" />
        <span className="min-w-0 truncate text-xs font-medium text-cyan-300">
          Task: {activeTaskContext.title}
        </span>
      </button>
      <Button
        variant="ghost"
        size="sm"
        className="h-5 w-5 shrink-0 p-0 text-muted-foreground hover:text-foreground"
        onClick={dismissTaskContext}
        title="Task-Kontext entfernen"
      >
        <X className="h-3 w-3" />
      </Button>
    </div>
  );
}
