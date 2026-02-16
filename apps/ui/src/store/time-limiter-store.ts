/**
 * Time Limiter Store
 *
 * Manages session time limits to automatically switch to new sessions
 * when the time limit is exceeded, preserving context via copy-all.
 *
 * The timer only counts time while the agent is actively processing (isProcessing = true).
 * It pauses when the agent finishes and resumes on the next processing cycle.
 */

import { create } from 'zustand';
import { setItem, getItem } from '@/lib/storage';

// Storage keys
const TIME_LIMIT_KEY = 'automaker:time-limit-seconds';
const TIME_LIMIT_ENABLED_KEY = 'automaker:time-limit-enabled';

/**
 * Default time limit in seconds (450 = 7.5 minutes)
 */
const DEFAULT_TIME_LIMIT = 450;

/**
 * Time limiter store state
 */
interface TimeLimiterState {
  // Time limit in seconds
  timeLimitSeconds: number;
  // Whether time limiter is enabled
  isEnabled: boolean;
  // Cumulative elapsed seconds from previous processing phases
  accumulatedSeconds: number;
  // Timestamp when the current processing phase started (null if not processing)
  processingStartTime: number | null;
  // Pending copied content to paste into new session
  pendingCopiedContent: string | null;

  // Actions
  setTimeLimit: (seconds: number) => void;
  setEnabled: (enabled: boolean) => void;
  /** Call when the agent starts processing */
  startProcessing: () => void;
  /** Call when the agent stops processing - accumulates elapsed time */
  stopProcessing: () => void;
  /** Reset timer for a new session */
  resetTimer: () => void;
  /** Get total elapsed seconds (accumulated + current processing phase) */
  getElapsedSeconds: () => number;
  isTimeExceeded: () => boolean;
  setPendingCopiedContent: (content: string | null) => void;
  clearPendingContent: () => void;
}

function loadTimeLimit(): number {
  const stored = getItem(TIME_LIMIT_KEY);
  if (stored) {
    const parsed = parseInt(stored, 10);
    if (!isNaN(parsed) && parsed >= 60 && parsed <= 3600) {
      return parsed;
    }
  }
  return DEFAULT_TIME_LIMIT;
}

function loadEnabled(): boolean {
  const stored = getItem(TIME_LIMIT_ENABLED_KEY);
  if (stored !== null) {
    return stored === 'true';
  }
  return true; // Default enabled
}

function saveTimeLimit(seconds: number): void {
  setItem(TIME_LIMIT_KEY, seconds.toString());
}

function saveEnabled(enabled: boolean): void {
  setItem(TIME_LIMIT_ENABLED_KEY, enabled.toString());
}

export const useTimeLimiterStore = create<TimeLimiterState>((set, get) => ({
  timeLimitSeconds: loadTimeLimit(),
  isEnabled: loadEnabled(),
  accumulatedSeconds: 0,
  processingStartTime: null,
  pendingCopiedContent: null,

  setTimeLimit: (seconds) => {
    const clamped = Math.max(60, Math.min(3600, seconds));
    set({ timeLimitSeconds: clamped });
    saveTimeLimit(clamped);
  },

  setEnabled: (enabled) => {
    set({ isEnabled: enabled });
    saveEnabled(enabled);
  },

  startProcessing: () => {
    const { processingStartTime } = get();
    // Only set if not already processing (idempotent)
    if (processingStartTime === null) {
      set({ processingStartTime: Date.now() });
    }
  },

  stopProcessing: () => {
    const { processingStartTime, accumulatedSeconds } = get();
    if (processingStartTime !== null) {
      const elapsed = Math.floor((Date.now() - processingStartTime) / 1000);
      set({
        accumulatedSeconds: accumulatedSeconds + elapsed,
        processingStartTime: null,
      });
    }
  },

  resetTimer: () => {
    set({
      accumulatedSeconds: 0,
      processingStartTime: null,
    });
  },

  getElapsedSeconds: () => {
    const { accumulatedSeconds, processingStartTime } = get();
    if (processingStartTime === null) {
      return accumulatedSeconds;
    }
    // Add current processing phase time
    const currentPhaseSeconds = Math.floor((Date.now() - processingStartTime) / 1000);
    return accumulatedSeconds + currentPhaseSeconds;
  },

  isTimeExceeded: () => {
    const { isEnabled, timeLimitSeconds, getElapsedSeconds } = get();
    if (!isEnabled) return false;
    return getElapsedSeconds() >= timeLimitSeconds;
  },

  setPendingCopiedContent: (content) => {
    set({ pendingCopiedContent: content });
  },

  clearPendingContent: () => {
    set({ pendingCopiedContent: null });
  },
}));
