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
const AUTO_CONDENSE_ENABLED_KEY = 'automaker:auto-condense-enabled';
const AUTO_CONDENSE_THRESHOLD_KEY = 'automaker:auto-condense-threshold-percent';
const AUTO_CONDENSE_ENABLED_PER_MODEL_KEY = 'automaker:auto-condense-enabled-per-model';
const AUTO_CONDENSE_THRESHOLD_PER_MODEL_KEY = 'automaker:auto-condense-threshold-per-model';
const CONTEXT_WINDOW_OVERRIDE_PER_MODEL_KEY = 'automaker:context-window-override-per-model';

/**
 * Default time limit in seconds (450 = 7.5 minutes)
 */
const DEFAULT_TIME_LIMIT = 450;
const DEFAULT_AUTO_CONDENSE_THRESHOLD_PERCENT = 80;

/**
 * Per-model time limit map: { [modelId]: seconds }
 */
type ModelTimeLimitMap = Record<string, number>;
type ModelAutoCondenseEnabledMap = Record<string, boolean>;
type ModelAutoCondenseThresholdMap = Record<string, number>;
type ModelContextWindowOverrideMap = Record<string, number>;

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
  // Whether automatic context condense is enabled for the current model
  autoCondenseEnabled: boolean;
  // Threshold in percent (0-100) for automatic context condense
  autoCondenseThresholdPercent: number;
  // Per-model auto-condense enabled map
  modelAutoCondenseEnabled: ModelAutoCondenseEnabledMap;
  // Per-model auto-condense threshold map
  modelAutoCondenseThresholds: ModelAutoCondenseThresholdMap;
  // Optional manual context window override for current model (tokens)
  contextWindowOverrideTokens: number | null;
  // Per-model manual context window override map
  modelContextWindowOverrides: ModelContextWindowOverrideMap;

  // Actions
  setTimeLimit: (seconds: number) => void;
  setEnabled: (enabled: boolean) => void;
  setAutoCondenseEnabled: (enabled: boolean) => void;
  setAutoCondenseThresholdPercent: (percent: number) => void;
  setContextWindowOverrideTokens: (tokens: number | null) => void;
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
  isContextThresholdExceeded: (usagePercent: number) => boolean;
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

function loadAutoCondenseEnabled(): boolean {
  const stored = getItem(AUTO_CONDENSE_ENABLED_KEY);
  if (stored !== null) {
    return stored === 'true';
  }
  return true;
}

function loadAutoCondenseThresholdPercent(): number {
  const stored = getItem(AUTO_CONDENSE_THRESHOLD_KEY);
  if (stored) {
    const parsed = parseInt(stored, 10);
    if (!isNaN(parsed) && parsed >= 50 && parsed <= 95) {
      return parsed;
    }
  }
  return DEFAULT_AUTO_CONDENSE_THRESHOLD_PERCENT;
}

function loadModelAutoCondenseEnabled(): ModelAutoCondenseEnabledMap {
  const stored = getJSON<ModelAutoCondenseEnabledMap>(AUTO_CONDENSE_ENABLED_PER_MODEL_KEY);
  return stored ?? {};
}

function loadModelAutoCondenseThresholds(): ModelAutoCondenseThresholdMap {
  const stored = getJSON<ModelAutoCondenseThresholdMap>(AUTO_CONDENSE_THRESHOLD_PER_MODEL_KEY);
  return stored ?? {};
}

function loadModelContextWindowOverrides(): ModelContextWindowOverrideMap {
  const stored = getJSON<ModelContextWindowOverrideMap>(CONTEXT_WINDOW_OVERRIDE_PER_MODEL_KEY);
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

function saveAutoCondenseEnabled(enabled: boolean): void {
  setItem(AUTO_CONDENSE_ENABLED_KEY, enabled.toString());
}

function saveAutoCondenseThresholdPercent(percent: number): void {
  setItem(AUTO_CONDENSE_THRESHOLD_KEY, percent.toString());
}

function saveModelAutoCondenseEnabled(map: ModelAutoCondenseEnabledMap): void {
  setJSON(AUTO_CONDENSE_ENABLED_PER_MODEL_KEY, map);
}

function saveModelAutoCondenseThresholds(map: ModelAutoCondenseThresholdMap): void {
  setJSON(AUTO_CONDENSE_THRESHOLD_PER_MODEL_KEY, map);
}

function saveModelContextWindowOverrides(map: ModelContextWindowOverrideMap): void {
  setJSON(CONTEXT_WINDOW_OVERRIDE_PER_MODEL_KEY, map);
}

export const useTimeLimiterStore = create<TimeLimiterState>((set, get) => ({
  timeLimitSeconds: loadTimeLimit(),
  isEnabled: loadEnabled(),
  accumulatedSeconds: 0,
  processingStartTime: null,
  pendingCopiedContent: null,
  currentModelId: null,
  modelTimeLimits: loadModelTimeLimits(),
  autoCondenseEnabled: loadAutoCondenseEnabled(),
  autoCondenseThresholdPercent: loadAutoCondenseThresholdPercent(),
  modelAutoCondenseEnabled: loadModelAutoCondenseEnabled(),
  modelAutoCondenseThresholds: loadModelAutoCondenseThresholds(),
  contextWindowOverrideTokens: null,
  modelContextWindowOverrides: loadModelContextWindowOverrides(),

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
    const { currentModelId, modelAutoCondenseEnabled } = get();
    if (enabled) {
      // Modes are mutually exclusive: enabling time limiter disables auto-condense.
      let updatedMap = modelAutoCondenseEnabled;
      if (currentModelId) {
        updatedMap = { ...modelAutoCondenseEnabled, [currentModelId]: false };
        saveModelAutoCondenseEnabled(updatedMap);
      }
      set({ isEnabled: true, autoCondenseEnabled: false, modelAutoCondenseEnabled: updatedMap });
      saveAutoCondenseEnabled(false);
      saveEnabled(true);
      return;
    }

    set({ isEnabled: false });
    saveEnabled(enabled);
  },

  setAutoCondenseEnabled: (enabled) => {
    const { currentModelId, modelAutoCondenseEnabled } = get();

    if (currentModelId) {
      const updatedMap = { ...modelAutoCondenseEnabled, [currentModelId]: enabled };
      // Modes are mutually exclusive: enabling auto-condense disables time limiter.
      set({
        autoCondenseEnabled: enabled,
        modelAutoCondenseEnabled: updatedMap,
        isEnabled: enabled ? false : get().isEnabled,
      });
      saveModelAutoCondenseEnabled(updatedMap);
    } else {
      set({ autoCondenseEnabled: enabled, isEnabled: enabled ? false : get().isEnabled });
    }

    if (enabled) {
      saveEnabled(false);
    }
    saveAutoCondenseEnabled(enabled);
  },

  setAutoCondenseThresholdPercent: (percent) => {
    const clamped = Math.max(50, Math.min(95, percent));
    const { currentModelId, modelAutoCondenseThresholds } = get();

    if (currentModelId) {
      const updatedMap = { ...modelAutoCondenseThresholds, [currentModelId]: clamped };
      set({ autoCondenseThresholdPercent: clamped, modelAutoCondenseThresholds: updatedMap });
      saveModelAutoCondenseThresholds(updatedMap);
    } else {
      set({ autoCondenseThresholdPercent: clamped });
    }

    saveAutoCondenseThresholdPercent(clamped);
  },

  setCurrentModel: (modelId) => {
    const {
      currentModelId,
      isEnabled,
      modelTimeLimits,
      modelAutoCondenseEnabled,
      modelAutoCondenseThresholds,
      modelContextWindowOverrides,
    } = get();

    // Skip if already set to this model
    if (currentModelId === modelId) return;

    // Look up stored time limit for this model
    const storedLimit = modelTimeLimits[modelId];
    const timeLimitForModel = storedLimit ?? loadTimeLimit();
    const storedAutoCondenseEnabled = modelAutoCondenseEnabled[modelId];
    const autoCondenseEnabledForModel =
      typeof storedAutoCondenseEnabled === 'boolean'
        ? storedAutoCondenseEnabled
        : loadAutoCondenseEnabled();
    const storedAutoCondenseThreshold = modelAutoCondenseThresholds[modelId];
    const autoCondenseThresholdForModel =
      typeof storedAutoCondenseThreshold === 'number' &&
      storedAutoCondenseThreshold >= 50 &&
      storedAutoCondenseThreshold <= 95
        ? storedAutoCondenseThreshold
        : loadAutoCondenseThresholdPercent();
    const storedContextWindowOverride = modelContextWindowOverrides[modelId];
    const contextWindowOverrideForModel =
      typeof storedContextWindowOverride === 'number' && storedContextWindowOverride > 0
        ? storedContextWindowOverride
        : null;
    const nextTimeLimiterEnabled = autoCondenseEnabledForModel ? false : isEnabled;

    set({
      currentModelId: modelId,
      isEnabled: nextTimeLimiterEnabled,
      timeLimitSeconds: timeLimitForModel,
      autoCondenseEnabled: autoCondenseEnabledForModel,
      autoCondenseThresholdPercent: autoCondenseThresholdForModel,
      contextWindowOverrideTokens: contextWindowOverrideForModel,
    });

    if (!nextTimeLimiterEnabled && isEnabled) {
      saveEnabled(false);
    }
  },

  setContextWindowOverrideTokens: (tokens) => {
    const { currentModelId, modelContextWindowOverrides } = get();
    const normalizedTokens =
      typeof tokens === 'number' && Number.isFinite(tokens) && tokens > 0
        ? Math.round(tokens)
        : null;

    if (!currentModelId) {
      set({ contextWindowOverrideTokens: normalizedTokens });
      return;
    }

    if (normalizedTokens === null) {
      const { [currentModelId]: _, ...restMap } = modelContextWindowOverrides;
      set({ contextWindowOverrideTokens: null, modelContextWindowOverrides: restMap });
      saveModelContextWindowOverrides(restMap);
      return;
    }

    const updatedMap = { ...modelContextWindowOverrides, [currentModelId]: normalizedTokens };
    set({ contextWindowOverrideTokens: normalizedTokens, modelContextWindowOverrides: updatedMap });
    saveModelContextWindowOverrides(updatedMap);
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

  isContextThresholdExceeded: (usagePercent) => {
    const { autoCondenseEnabled, autoCondenseThresholdPercent } = get();
    if (!autoCondenseEnabled) return false;
    if (!Number.isFinite(usagePercent) || usagePercent <= 0) return false;
    return usagePercent >= autoCondenseThresholdPercent;
  },

  setPendingCopiedContent: (content) => {
    set({ pendingCopiedContent: content });
  },

  clearPendingContent: () => {
    set({ pendingCopiedContent: null });
  },
}));
