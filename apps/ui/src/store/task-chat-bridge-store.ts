/**
 * Task-Chat Bridge Store
 *
 * Manages the state for sending a task to the AI agent chat.
 * When a user clicks "Send to Agent" on a task, this store holds:
 *   - the active task context (title, description, id)
 *   - a pending message to inject into the chat input
 *
 * The agent-view reads this store and injects the message when ready.
 */

import { create } from 'zustand';

export interface TaskChatContext {
  /** Task ID (file-based filename or Supabase UUID) */
  taskId: string;
  /** Task title */
  title: string;
  /** Task description (may be empty) */
  description: string;
  /** Optional detailed summary / body */
  summary?: string;
  /** Source type: 'file' for file-based tasks, 'supabase' for Supabase tasks */
  source: 'file' | 'supabase';
  /** Timestamp when the task was sent to chat */
  sentAt: number;
}

interface TaskChatBridgeState {
  /** The task context currently active in the chat (shown as badge) */
  activeTaskContext: TaskChatContext | null;
  /** Pending message text to inject into the chat input */
  pendingTaskMessage: string | null;
  /** Whether we should navigate to the agent view */
  shouldNavigateToAgent: boolean;
}

interface TaskChatBridgeActions {
  /** Send a task to the agent chat. Sets context, pending message, and navigation flag. */
  sendTaskToAgent: (context: TaskChatContext) => void;
  /** Consume the pending message (called by agent-view after injecting it). */
  consumePendingMessage: () => string | null;
  /** Clear the navigation flag (called after navigating). */
  clearNavigationFlag: () => void;
  /** Dismiss the active task context badge. */
  dismissTaskContext: () => void;
  /** Full reset. */
  reset: () => void;
}

type TaskChatBridgeStore = TaskChatBridgeState & TaskChatBridgeActions;

function buildTaskMessage(ctx: TaskChatContext): string {
  const parts: string[] = [];
  parts.push(`## Task: ${ctx.title}`);
  parts.push('');
  if (ctx.description) {
    parts.push(ctx.description);
    parts.push('');
  }
  if (ctx.summary) {
    parts.push(ctx.summary);
    parts.push('');
  }
  parts.push('---');
  parts.push('Bitte implementiere diesen Task.');
  return parts.join('\n');
}

export const useTaskChatBridgeStore = create<TaskChatBridgeStore>((set, get) => ({
  // State
  activeTaskContext: null,
  pendingTaskMessage: null,
  shouldNavigateToAgent: false,

  // Actions
  sendTaskToAgent: (context) => {
    const message = buildTaskMessage(context);
    set({
      activeTaskContext: context,
      pendingTaskMessage: message,
      shouldNavigateToAgent: true,
    });
  },

  consumePendingMessage: () => {
    const { pendingTaskMessage } = get();
    if (pendingTaskMessage) {
      set({ pendingTaskMessage: null });
    }
    return pendingTaskMessage;
  },

  clearNavigationFlag: () => {
    set({ shouldNavigateToAgent: false });
  },

  dismissTaskContext: () => {
    set({ activeTaskContext: null });
  },

  reset: () => {
    set({
      activeTaskContext: null,
      pendingTaskMessage: null,
      shouldNavigateToAgent: false,
    });
  },
}));
