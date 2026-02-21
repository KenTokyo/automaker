/**
 * Orchestrator Store
 *
 * Manages the orchestrator mode which automatically chains AI conversations.
 * When enabled, it monitors the last AI message for a trigger keyword and
 * automatically creates a new chat with that message as the prompt.
 */

import { create } from 'zustand';
import { setItem, getItem } from '@/lib/storage';

// Storage keys
const ORCHESTRATOR_ENABLED_KEY = 'automaker:orchestrator-enabled';
const ORCHESTRATOR_KEYWORD_KEY = 'automaker:orchestrator-keyword';
const ORCHESTRATOR_MAX_ITERATIONS_KEY = 'automaker:orchestrator-max-iterations';
const ORCHESTRATOR_AUTO_SEND_KEY = 'automaker:orchestrator-auto-send';

const DEFAULT_KEYWORD = 'NEXT_PHASE_READY';
const DEFAULT_MAX_ITERATIONS = 100;

interface OrchestratorMessageWrapper {
  preMessage: string;
  postMessage: string;
}

interface OrchestratorState {
  // Whether orchestrator mode is enabled
  isEnabled: boolean;
  // Keyword to look for in the last AI message
  triggerKeyword: string;
  // Maximum iterations before auto-disable
  maxIterations: number;
  // Current iteration count (resets on enable)
  currentIteration: number;
  // Pending AI message content to send in the new chat
  pendingOrchestratorContent: string | null;
  // Whether to auto-send the content in the new chat
  autoSendEnabled: boolean;

  // Actions
  setEnabled: (enabled: boolean) => void;
  setTriggerKeyword: (keyword: string) => void;
  setMaxIterations: (max: number) => void;
  incrementIteration: () => boolean;
  resetIteration: () => void;
  setPendingContent: (content: string | null) => void;
  clearPendingContent: () => void;
  setAutoSendEnabled: (enabled: boolean) => void;
  shouldTrigger: (lastMessage: string) => boolean;
  /** Returns pre/post messages to wrap user content, or null if orchestrator is disabled */
  getMessageWrapper: () => OrchestratorMessageWrapper | null;
}

function loadEnabled(): boolean {
  const stored = getItem(ORCHESTRATOR_ENABLED_KEY);
  if (stored !== null) {
    return stored === 'true';
  }
  return false; // Default disabled
}

function loadKeyword(): string {
  const stored = getItem(ORCHESTRATOR_KEYWORD_KEY);
  if (stored && stored.trim().length > 0) {
    return stored;
  }
  return DEFAULT_KEYWORD;
}

function loadMaxIterations(): number {
  const stored = getItem(ORCHESTRATOR_MAX_ITERATIONS_KEY);
  if (stored) {
    const parsed = parseInt(stored, 10);
    if (!isNaN(parsed) && parsed >= 1 && parsed <= 999) {
      return parsed;
    }
  }
  return DEFAULT_MAX_ITERATIONS;
}

function loadAutoSend(): boolean {
  const stored = getItem(ORCHESTRATOR_AUTO_SEND_KEY);
  if (stored !== null) {
    return stored === 'true';
  }
  return true; // Default enabled
}

function saveEnabled(enabled: boolean): void {
  setItem(ORCHESTRATOR_ENABLED_KEY, enabled.toString());
}

function saveKeyword(keyword: string): void {
  setItem(ORCHESTRATOR_KEYWORD_KEY, keyword);
}

function saveMaxIterations(max: number): void {
  setItem(ORCHESTRATOR_MAX_ITERATIONS_KEY, max.toString());
}

function saveAutoSend(enabled: boolean): void {
  setItem(ORCHESTRATOR_AUTO_SEND_KEY, enabled.toString());
}

export const useOrchestratorStore = create<OrchestratorState>((set, get) => ({
  isEnabled: loadEnabled(),
  triggerKeyword: loadKeyword(),
  maxIterations: loadMaxIterations(),
  currentIteration: 0,
  pendingOrchestratorContent: null,
  autoSendEnabled: loadAutoSend(),

  setEnabled: (enabled) => {
    set({
      isEnabled: enabled,
      currentIteration: 0, // Reset iteration on toggle
    });
    saveEnabled(enabled);
  },

  setTriggerKeyword: (keyword) => {
    const trimmed = keyword.trim();
    if (trimmed.length === 0) return;
    set({ triggerKeyword: trimmed });
    saveKeyword(trimmed);
  },

  setMaxIterations: (max) => {
    const clamped = Math.max(1, Math.min(999, max));
    set({ maxIterations: clamped });
    saveMaxIterations(clamped);
  },

  incrementIteration: () => {
    const { currentIteration, maxIterations } = get();
    const next = currentIteration + 1;
    if (next >= maxIterations) {
      // Max reached - disable orchestrator
      set({ currentIteration: next, isEnabled: false });
      saveEnabled(false);
      return false; // Signal: max reached
    }
    set({ currentIteration: next });
    return true; // Signal: can continue
  },

  resetIteration: () => {
    set({ currentIteration: 0 });
  },

  setPendingContent: (content) => {
    set({ pendingOrchestratorContent: content });
  },

  clearPendingContent: () => {
    set({ pendingOrchestratorContent: null });
  },

  setAutoSendEnabled: (enabled) => {
    set({ autoSendEnabled: enabled });
    saveAutoSend(enabled);
  },

  shouldTrigger: (lastMessage) => {
    const { isEnabled, triggerKeyword } = get();
    if (!isEnabled) return false;
    return lastMessage.includes(triggerKeyword);
  },

  getMessageWrapper: () => {
    const { isEnabled, currentIteration, maxIterations } = get();
    if (!isEnabled) return null;

    const preMessage = `🔄 ORCHESTRATOR MODE ACTIVE:
- You are working on a multi-phase project
- After completing a phase, check if more phases are pending in the plan
- If another phase is pending:
  * End your response with: NEXT_PHASE_READY
  * Include a summary of what was completed
  * Include context needed for the next phase
  * Specify which phase is next
- If all phases are complete:
  * End your response with: ALL_PHASES_COMPLETE
- Orchestrator run ID: orch-run-${Date.now().toString(36)}
- Current iteration: ${currentIteration + 1}/${maxIterations}
- Do NOT include NEXT_PHASE_READY if no more phases exist`;

    const postMessage = `⚠️ CRITICAL REMINDER - ORCHESTRATOR MODE:
- NEXT_PHASE_READY must ONLY appear at the VERY END of your response
- NEVER place NEXT_PHASE_READY in the middle of your response
- NEVER place NEXT_PHASE_READY anywhere except the absolute last line
- If you have more to say, say it BEFORE NEXT_PHASE_READY
- The ONLY correct position for NEXT_PHASE_READY is at the END
- Current iteration: ${currentIteration + 1}/${maxIterations}`;

    return { preMessage, postMessage };
  },
}));
