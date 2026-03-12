/**
 * Dashboard Store - Overview/Dashboard state for the right-panel.
 *
 * Adapted from apps/chat/src/stores/dashboard-store.ts.
 * Uses @automaker/types for shared dashboard types.
 */

import { create } from 'zustand';
import type { DashboardMode, DashboardOverviewData, DashboardTimeRange } from '@automaker/types';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface DashboardTabStatus {
  exists: boolean;
  generatedAt?: string;
}

export interface DashboardStoreState {
  activeTimeRange: DashboardTimeRange;
  overviewCache: Partial<Record<DashboardTimeRange, DashboardOverviewData | null>>;
  tabStatus: Partial<Record<DashboardTimeRange, DashboardTabStatus>>;
  isLoading: boolean;
  isGenerating: boolean;
  generatingProgress: string;
  error: string | null;
  modelOverride: 'sonnet' | 'haiku' | 'opus';
  lastUsedMode: DashboardMode;

  // Actions
  setActiveTimeRange: (range: DashboardTimeRange) => void;
  setOverviewData: (timeRange: DashboardTimeRange, data: DashboardOverviewData | null) => void;
  getOverviewData: (timeRange: DashboardTimeRange) => DashboardOverviewData | null | undefined;
  setTabStatus: (timeRange: DashboardTimeRange, status: DashboardTabStatus) => void;
  setTabStatusMap: (statusMap: Partial<Record<DashboardTimeRange, DashboardTabStatus>>) => void;
  setLoading: (isLoading: boolean) => void;
  setGenerating: (isGenerating: boolean, progress?: string) => void;
  setError: (message: string | null) => void;
  clearError: () => void;
  setModelOverride: (model: 'sonnet' | 'haiku' | 'opus') => void;
  setLastUsedMode: (mode: DashboardMode) => void;
  reset: () => void;
}

// ---------------------------------------------------------------------------
// LocalStorage
// ---------------------------------------------------------------------------

const TIME_RANGE_KEY = 'automaker:dashboard:time-range';
const MODEL_KEY = 'automaker:dashboard:model-override';
const MODE_KEY = 'automaker:dashboard:last-mode';

function loadTimeRange(): DashboardTimeRange {
  try {
    const raw = localStorage.getItem(TIME_RANGE_KEY);
    if (raw === '12h' || raw === '24h' || raw === '4d' || raw === '1w') return raw;
  } catch {
    /* ignore */
  }
  return '24h';
}

function loadModelOverride(): 'sonnet' | 'haiku' | 'opus' {
  try {
    const raw = localStorage.getItem(MODEL_KEY);
    if (raw === 'sonnet' || raw === 'haiku' || raw === 'opus') return raw;
  } catch {
    /* ignore */
  }
  return 'sonnet';
}

function loadLastMode(): DashboardMode {
  try {
    const raw = localStorage.getItem(MODE_KEY);
    if (raw === 'standard' || raw === 'simplify' || raw === 'detail') return raw;
  } catch {
    /* ignore */
  }
  return 'standard';
}

// ---------------------------------------------------------------------------
// Store
// ---------------------------------------------------------------------------

export const useDashboardStore = create<DashboardStoreState>()((set, get) => ({
  activeTimeRange: loadTimeRange(),
  overviewCache: {},
  tabStatus: {},
  isLoading: false,
  isGenerating: false,
  generatingProgress: '',
  error: null,
  modelOverride: loadModelOverride(),
  lastUsedMode: loadLastMode(),

  setActiveTimeRange: (range) => {
    try {
      localStorage.setItem(TIME_RANGE_KEY, range);
    } catch {
      /* ignore */
    }
    set({ activeTimeRange: range, error: null });
  },

  setOverviewData: (timeRange, data) =>
    set((state) => ({
      overviewCache: { ...state.overviewCache, [timeRange]: data },
    })),

  getOverviewData: (timeRange) => get().overviewCache[timeRange],

  setTabStatus: (timeRange, status) =>
    set((state) => ({
      tabStatus: { ...state.tabStatus, [timeRange]: status },
    })),

  setTabStatusMap: (statusMap) =>
    set((state) => ({
      tabStatus: { ...state.tabStatus, ...statusMap },
    })),

  setLoading: (isLoading) => set({ isLoading }),

  setGenerating: (isGenerating, progress) =>
    set({
      isGenerating,
      generatingProgress: progress ?? '',
      ...(isGenerating ? { error: null } : {}),
    }),

  setError: (message) => set({ error: message, isGenerating: false }),

  clearError: () => set({ error: null }),

  setModelOverride: (model) => {
    try {
      localStorage.setItem(MODEL_KEY, model);
    } catch {
      /* ignore */
    }
    set({ modelOverride: model });
  },

  setLastUsedMode: (mode) => {
    try {
      localStorage.setItem(MODE_KEY, mode);
    } catch {
      /* ignore */
    }
    set({ lastUsedMode: mode });
  },

  reset: () =>
    set((state) => ({
      overviewCache: {},
      tabStatus: {},
      isLoading: false,
      isGenerating: false,
      generatingProgress: '',
      error: null,
      activeTimeRange: state.activeTimeRange,
      modelOverride: state.modelOverride,
      lastUsedMode: state.lastUsedMode,
    })),
}));
