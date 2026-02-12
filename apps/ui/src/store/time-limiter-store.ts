/**
 * Time Limiter Store
 *
 * Manages session time limits to automatically switch to new sessions
 * when the time limit is exceeded, preserving context via copy-all.
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
  // Session start timestamp (ISO string)
  sessionStartTime: string | null;
  // Pending copied content to paste into new session
  pendingCopiedContent: string | null;

  // Actions
  setTimeLimit: (seconds: number) => void;
  setEnabled: (enabled: boolean) => void;
  startSession: () => void;
  getElapsedSeconds: () => number;
  isTimeExceeded: () => boolean;
  setPendingCopiedContent: (content: string | null) => void;
  clearPendingContent: () => void;
}

/**
 * Load time limit from local storage
 */
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

/**
 * Load enabled state from local storage
 */
function loadEnabled(): boolean {
  const stored = getItem(TIME_LIMIT_ENABLED_KEY);
  if (stored !== null) {
    return stored === 'true';
  }
  return true; // Default enabled
}

/**
 * Save time limit to local storage
 */
function saveTimeLimit(seconds: number): void {
  setItem(TIME_LIMIT_KEY, seconds.toString());
}

/**
 * Save enabled state to local storage
 */
function saveEnabled(enabled: boolean): void {
  setItem(TIME_LIMIT_ENABLED_KEY, enabled.toString());
}

export const useTimeLimiterStore = create<TimeLimiterState>((set, get) => ({
  timeLimitSeconds: loadTimeLimit(),
  isEnabled: loadEnabled(),
  sessionStartTime: null,
  pendingCopiedContent: null,

  setTimeLimit: (seconds) => {
    // Clamp to valid range (60s - 3600s / 1min - 60min)
    const clamped = Math.max(60, Math.min(3600, seconds));
    set({ timeLimitSeconds: clamped });
    saveTimeLimit(clamped);
  },

  setEnabled: (enabled) => {
    set({ isEnabled: enabled });
    saveEnabled(enabled);
  },

  startSession: () => {
    set({ sessionStartTime: new Date().toISOString() });
  },

  getElapsedSeconds: () => {
    const { sessionStartTime } = get();
    if (!sessionStartTime) return 0;

    const start = new Date(sessionStartTime).getTime();
    const now = Date.now();
    return Math.floor((now - start) / 1000);
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
