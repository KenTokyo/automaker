/**
 * TaskSendToAgent - "An Agent senden" button with a small dropdown.
 *
 * Two options:
 *   1. "Mit Standard-Modell starten" (quick 1-click)
 *   2. "Modell waehlen..." (opens inline model picker)
 *
 * On click the bridge store is updated, which triggers navigation to agent-view
 * and injects the task content as a message.
 */

import { useCallback, useState } from 'react';
import { Rocket, Zap, ChevronDown, Cpu } from 'lucide-react';
import type { Task } from '@automaker/types';
import type { SupabaseTask } from '@/hooks/use-supabase-tasks';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { useTaskChatBridgeStore, type TaskChatContext } from '@/store/task-chat-bridge-store';
import { useAppStore } from '@/store/app-store';
import { AgentModelSelector } from '@/components/views/agent-view/shared/agent-model-selector';
import type { PhaseModelEntry } from '@automaker/types';
import { cn } from '@/lib/utils';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function fileTaskToContext(task: Task): TaskChatContext {
  return {
    taskId: task.filename,
    title: task.title,
    description: task.description,
    summary: task.summary || undefined,
    source: 'file',
    projectPath: task.projectPath,
    sentAt: Date.now(),
  };
}

function supabaseTaskToContext(task: SupabaseTask): TaskChatContext {
  return {
    taskId: task.id,
    title: task.title,
    description: task.description,
    summary: task.summary || undefined,
    source: 'supabase',
    projectId: task.projectId,
    sentAt: Date.now(),
  };
}

// ---------------------------------------------------------------------------
// File-based Task variant
// ---------------------------------------------------------------------------

interface TaskSendToAgentProps {
  task: Task;
}

export function TaskSendToAgent({ task }: TaskSendToAgentProps) {
  const [open, setOpen] = useState(false);
  const [showModelPicker, setShowModelPicker] = useState(false);
  const sendTaskToAgent = useTaskChatBridgeStore((s) => s.sendTaskToAgent);
  const setCurrentView = useAppStore((s) => s.setCurrentView);
  const selectedAgentModel = useAppStore((s) => s.selectedAgentModel);
  const setSelectedAgentModel = useAppStore((s) => s.setSelectedAgentModel);

  const handleQuickSend = useCallback(() => {
    const ctx = fileTaskToContext(task);
    sendTaskToAgent(ctx);

    // Navigate to agent view
    setCurrentView('agent');
    setOpen(false);
    setShowModelPicker(false);
  }, [task, sendTaskToAgent, setCurrentView]);

  const handleModelSelect = useCallback(
    (entry: PhaseModelEntry) => {
      setSelectedAgentModel(entry);
      // Now do the same as quick-send but with the selected model
      const ctx = fileTaskToContext(task);
      sendTaskToAgent(ctx);

      setCurrentView('agent');
      setOpen(false);
      setShowModelPicker(false);
    },
    [task, sendTaskToAgent, setCurrentView, setSelectedAgentModel]
  );

  const isDone = task.status === 'done';

  return (
    <Popover
      open={open}
      onOpenChange={(v) => {
        setOpen(v);
        if (!v) setShowModelPicker(false);
      }}
    >
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className={cn(
            'h-5 gap-0.5 px-1 text-cyan-400 opacity-0 transition-opacity group-hover:opacity-100',
            'hover:bg-cyan-500/10 hover:text-cyan-300',
            isDone && 'pointer-events-none'
          )}
          disabled={isDone}
          title="An Agent senden"
        >
          <Rocket className="h-3 w-3" />
          <ChevronDown className="h-2 w-2" />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        className="w-56 border-white/10 bg-zinc-950 p-1.5 shadow-xl"
        align="end"
        sideOffset={6}
      >
        {!showModelPicker ? (
          <div className="flex flex-col gap-0.5">
            {/* Quick send with default model */}
            <button
              type="button"
              className="flex items-center gap-2 rounded-md px-2.5 py-2 text-left text-xs transition-colors hover:bg-cyan-500/10"
              onClick={handleQuickSend}
            >
              <Zap className="h-3.5 w-3.5 text-cyan-400" />
              <div className="min-w-0 flex-1">
                <p className="font-medium text-cyan-300">Sofort starten</p>
                <p className="mt-0.5 truncate text-[10px] text-muted-foreground">
                  {selectedAgentModel.model || 'Standard-Modell'}
                </p>
              </div>
            </button>

            {/* Choose model */}
            <button
              type="button"
              className="flex items-center gap-2 rounded-md px-2.5 py-2 text-left text-xs transition-colors hover:bg-white/5"
              onClick={() => setShowModelPicker(true)}
            >
              <Cpu className="h-3.5 w-3.5 text-muted-foreground" />
              <div className="min-w-0 flex-1">
                <p className="font-medium text-foreground">Modell waehlen...</p>
                <p className="mt-0.5 text-[10px] text-muted-foreground">Anderes Modell verwenden</p>
              </div>
            </button>
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            <p className="px-1 text-[10px] font-medium text-muted-foreground">
              Modell waehlen und starten
            </p>
            <AgentModelSelector value={selectedAgentModel} onChange={handleModelSelect} />
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}

// ---------------------------------------------------------------------------
// Supabase Task variant (for KanbanTaskCard)
// ---------------------------------------------------------------------------

interface SupabaseTaskSendToAgentProps {
  task: SupabaseTask;
}

export function SupabaseTaskSendToAgent({ task }: SupabaseTaskSendToAgentProps) {
  const [open, setOpen] = useState(false);
  const [showModelPicker, setShowModelPicker] = useState(false);
  const sendTaskToAgent = useTaskChatBridgeStore((s) => s.sendTaskToAgent);
  const setCurrentView = useAppStore((s) => s.setCurrentView);
  const selectedAgentModel = useAppStore((s) => s.selectedAgentModel);
  const setSelectedAgentModel = useAppStore((s) => s.setSelectedAgentModel);

  const handleQuickSend = useCallback(() => {
    const ctx = supabaseTaskToContext(task);
    sendTaskToAgent(ctx);

    setCurrentView('agent');
    setOpen(false);
    setShowModelPicker(false);
  }, [task, sendTaskToAgent, setCurrentView]);

  const handleModelSelect = useCallback(
    (entry: PhaseModelEntry) => {
      setSelectedAgentModel(entry);
      const ctx = supabaseTaskToContext(task);
      sendTaskToAgent(ctx);

      setCurrentView('agent');
      setOpen(false);
      setShowModelPicker(false);
    },
    [task, sendTaskToAgent, setCurrentView, setSelectedAgentModel]
  );

  const isCompleted = task.status === 'completed';

  return (
    <Popover
      open={open}
      onOpenChange={(v) => {
        setOpen(v);
        if (!v) setShowModelPicker(false);
      }}
    >
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className={cn(
            'h-5 gap-0.5 px-1 text-cyan-400 opacity-0 transition-opacity group-hover:opacity-100',
            'hover:bg-cyan-500/10 hover:text-cyan-300',
            isCompleted && 'pointer-events-none'
          )}
          disabled={isCompleted}
          title="An Agent senden"
          onClick={(e) => e.stopPropagation()}
        >
          <Rocket className="h-3 w-3" />
          <ChevronDown className="h-2 w-2" />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        className="w-56 border-white/10 bg-zinc-950 p-1.5 shadow-xl"
        align="end"
        sideOffset={6}
        onClick={(e) => e.stopPropagation()}
      >
        {!showModelPicker ? (
          <div className="flex flex-col gap-0.5">
            <button
              type="button"
              className="flex items-center gap-2 rounded-md px-2.5 py-2 text-left text-xs transition-colors hover:bg-cyan-500/10"
              onClick={handleQuickSend}
            >
              <Zap className="h-3.5 w-3.5 text-cyan-400" />
              <div className="min-w-0 flex-1">
                <p className="font-medium text-cyan-300">Sofort starten</p>
                <p className="mt-0.5 truncate text-[10px] text-muted-foreground">
                  {selectedAgentModel.model || 'Standard-Modell'}
                </p>
              </div>
            </button>

            <button
              type="button"
              className="flex items-center gap-2 rounded-md px-2.5 py-2 text-left text-xs transition-colors hover:bg-white/5"
              onClick={() => setShowModelPicker(true)}
            >
              <Cpu className="h-3.5 w-3.5 text-muted-foreground" />
              <div className="min-w-0 flex-1">
                <p className="font-medium text-foreground">Modell waehlen...</p>
                <p className="mt-0.5 text-[10px] text-muted-foreground">Anderes Modell verwenden</p>
              </div>
            </button>
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            <p className="px-1 text-[10px] font-medium text-muted-foreground">
              Modell waehlen und starten
            </p>
            <AgentModelSelector value={selectedAgentModel} onChange={handleModelSelect} />
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}
