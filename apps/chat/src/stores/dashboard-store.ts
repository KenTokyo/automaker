import { create } from 'zustand';
import type { DashboardMode, DashboardOverviewData, DashboardTimeRange } from './dashboard-types';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface DashboardTabStatus {
  exists: boolean;
  generatedAt?: string;
}

export interface DashboardStoreState {
  /** Aktuell ausgewählter Zeitraum */
  activeTimeRange: DashboardTimeRange;
  /** Cache der Overviews pro Zeitraum */
  overviewCache: Partial<Record<DashboardTimeRange, DashboardOverviewData | null>>;
  /** Status je Tab vom Server */
  tabStatus: Partial<Record<DashboardTimeRange, DashboardTabStatus>>;
  /** Lädt gerade den aktiven Tab */
  isLoading: boolean;
  /** KI generiert gerade eine Übersicht */
  isGenerating: boolean;
  /** Live-Text zum Fortschritt */
  generatingProgress: string;
  /** Letzte Fehlermeldung */
  error: string | null;
  /** Gewähltes Modell nur für Dashboard-Generierung */
  modelOverride: 'sonnet' | 'haiku' | 'opus';
  /** Letzter genutzter Modus */
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

const TIME_RANGE_STORAGE_KEY = 'automaker:dashboard:time-range';
const MODEL_OVERRIDE_STORAGE_KEY = 'automaker:dashboard:model-override';
const LAST_MODE_STORAGE_KEY = 'automaker:dashboard:last-mode';

function loadTimeRange(): DashboardTimeRange {
  try {
    const raw = localStorage.getItem(TIME_RANGE_STORAGE_KEY);
    if (raw === '12h' || raw === '24h' || raw === '4d' || raw === '1w') return raw;
  } catch {
    // ignore
  }
  return '24h';
}

function saveTimeRange(range: DashboardTimeRange): void {
  try {
    localStorage.setItem(TIME_RANGE_STORAGE_KEY, range);
  } catch {
    // ignore
  }
}

function loadModelOverride(): 'sonnet' | 'haiku' | 'opus' {
  try {
    const raw = localStorage.getItem(MODEL_OVERRIDE_STORAGE_KEY);
    if (raw === 'sonnet' || raw === 'haiku' || raw === 'opus') return raw;
  } catch {
    // ignore
  }
  return 'sonnet';
}

function saveModelOverride(model: 'sonnet' | 'haiku' | 'opus'): void {
  try {
    localStorage.setItem(MODEL_OVERRIDE_STORAGE_KEY, model);
  } catch {
    // ignore
  }
}

function loadLastMode(): DashboardMode {
  try {
    const raw = localStorage.getItem(LAST_MODE_STORAGE_KEY);
    if (raw === 'standard' || raw === 'simplify' || raw === 'detail') return raw;
  } catch {
    // ignore
  }
  return 'standard';
}

function saveLastMode(mode: DashboardMode): void {
  try {
    localStorage.setItem(LAST_MODE_STORAGE_KEY, mode);
  } catch {
    // ignore
  }
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
    saveTimeRange(range);
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
    saveModelOverride(model);
    set({ modelOverride: model });
  },

  setLastUsedMode: (mode) => {
    saveLastMode(mode);
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
