/**
 * Time Limiter Store
 *
 * Manages session time limits to automatically switch to new sessions
 * when the time limit is exceeded, preserving context via copy-all.
 *
 * The timer only counts time while the agent is actively processing (isProcessing = true).
 * It pauses when the agent finishes and resumes on the next processing cycle.
 *
 * Time limits are model-specific: each model remembers its own time limit.
 * When switching models, the stored time limit for that model is restored automatically.
 */

import { create } from 'zustand';
import { setItem, getItem, getJSON, setJSON } from '@/lib/storage';

// Storage keys
const TIME_LIMIT_KEY = 'automaker:time-limit-seconds';
const TIME_LIMIT_ENABLED_KEY = 'automaker:time-limit-enabled';
const TIME_LIMIT_PER_MODEL_KEY = 'automaker:time-limit-per-model';

/**
 * Default time limit in seconds (450 = 7.5 minutes)
 */
const DEFAULT_TIME_LIMIT = 450;

/**
 * Per-model time limit map: { [modelId]: seconds }
 */
type ModelTimeLimitMap = Record<string, number>;

/**
 * Time limiter store state
 */
interface TimeLimiterState {
  // Time limit in seconds (for the current model)
  timeLimitSeconds: number;
  // Whether time limiter is enabled
  isEnabled: boolean;
  // Cumulative elapsed seconds from previous processing phases
  accumulatedSeconds: number;
  // Timestamp when the current processing phase started (null if not processing)
  processingStartTime: number | null;
  // Pending copied content to paste into new session
  pendingCopiedContent: string | null;
  // Currently active model ID (used to key per-model time limits)
  currentModelId: string | null;
  // Per-model time limit map
  modelTimeLimits: ModelTimeLimitMap;

  // Actions
  setTimeLimit: (seconds: number) => void;
  setEnabled: (enabled: boolean) => void;
  /** Set the current model - restores the model's stored time limit */
  setCurrentModel: (modelId: string) => void;
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

function loadModelTimeLimits(): ModelTimeLimitMap {
  const stored = getJSON<ModelTimeLimitMap>(TIME_LIMIT_PER_MODEL_KEY);
  return stored ?? {};
}

function saveTimeLimit(seconds: number): void {
  setItem(TIME_LIMIT_KEY, seconds.toString());
}

function saveEnabled(enabled: boolean): void {
  setItem(TIME_LIMIT_ENABLED_KEY, enabled.toString());
}

function saveModelTimeLimits(map: ModelTimeLimitMap): void {
  setJSON(TIME_LIMIT_PER_MODEL_KEY, map);
}

export const useTimeLimiterStore = create<TimeLimiterState>((set, get) => ({
  timeLimitSeconds: loadTimeLimit(),
  isEnabled: loadEnabled(),
  accumulatedSeconds: 0,
  processingStartTime: null,
  pendingCopiedContent: null,
  currentModelId: null,
  modelTimeLimits: loadModelTimeLimits(),

  setTimeLimit: (seconds) => {
    const clamped = Math.max(60, Math.min(3600, seconds));
    const { currentModelId, modelTimeLimits } = get();

    // Save to per-model map if a model is active
    if (currentModelId) {
      const updatedMap = { ...modelTimeLimits, [currentModelId]: clamped };
      set({ timeLimitSeconds: clamped, modelTimeLimits: updatedMap });
      saveModelTimeLimits(updatedMap);
    } else {
      set({ timeLimitSeconds: clamped });
    }

    // Also save as global fallback
    saveTimeLimit(clamped);
  },

  setEnabled: (enabled) => {
    set({ isEnabled: enabled });
    saveEnabled(enabled);
  },

  setCurrentModel: (modelId) => {
    const { currentModelId, modelTimeLimits } = get();

    // Skip if already set to this model
    if (currentModelId === modelId) return;

    // Look up stored time limit for this model
    const storedLimit = modelTimeLimits[modelId];
    const timeLimitForModel = storedLimit ?? loadTimeLimit();

    set({
      currentModelId: modelId,
      timeLimitSeconds: timeLimitForModel,
    });
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
