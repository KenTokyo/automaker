import { useCallback, useEffect, useMemo, useRef } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { useAppStore } from '@/store/app-store';
import { getHttpApiClient } from '@/lib/http-api-client';
import {
  cancelOverview,
  generateOverview,
  getOverviewStatus,
  loadOverview,
} from '../services/overview-api';
import { useDashboardStore } from '../stores/dashboard-store';
import {
  DASHBOARD_TIME_RANGES,
  type DashboardMode,
  type DashboardOverviewData,
  type DashboardTimeRange,
} from '../stores/dashboard-types';

const INITIAL_PROGRESS_MESSAGE = 'Übersicht wird vorbereitet…';

function getErrorMessage(error: unknown, fallback: string): string {
  if (error instanceof Error && error.message.trim().length > 0) {
    return error.message;
  }
  return fallback;
}

function getHoursByTimeRange(range: DashboardTimeRange): number {
  return DASHBOARD_TIME_RANGES.find((item) => item.id === range)?.hours ?? 24;
}

function isTimeRange(value: unknown): value is DashboardTimeRange {
  return value === '12h' || value === '24h' || value === '4d' || value === '1w';
}

function isMode(value: unknown): value is DashboardMode {
  return value === 'standard' || value === 'simplify' || value === 'detail';
}

function isOverviewPayload(value: unknown): value is { data: DashboardOverviewData } {
  if (!value || typeof value !== 'object') return false;
  const data = (value as { data?: unknown }).data;
  if (!data || typeof data !== 'object') return false;

  const candidate = data as Partial<DashboardOverviewData>;
  return (
    isTimeRange(candidate.timeRange) &&
    typeof candidate.generatedAt === 'string' &&
    typeof candidate.model === 'string' &&
    isMode(candidate.mode)
  );
}

/**
 * Hook für Dashboard-Zustand + Aktionen.
 */
export function useDashboard() {
  const {
    activeTimeRange,
    isLoading,
    isGenerating,
    generatingProgress,
    error,
    overviewCache,
    tabStatus,
    modelOverride,
    lastUsedMode,
    setActiveTimeRange,
    setModelOverride,
    setLastUsedMode,
  } = useDashboardStore(
    useShallow((s) => ({
      activeTimeRange: s.activeTimeRange,
      isLoading: s.isLoading,
      isGenerating: s.isGenerating,
      generatingProgress: s.generatingProgress,
      error: s.error,
      overviewCache: s.overviewCache,
      tabStatus: s.tabStatus,
      modelOverride: s.modelOverride,
      lastUsedMode: s.lastUsedMode,
      setActiveTimeRange: s.setActiveTimeRange,
      setModelOverride: s.setModelOverride,
      setLastUsedMode: s.setLastUsedMode,
    }))
  );

  const currentProjectPath = useAppStore((state) => state.currentProject?.path ?? null);
  const requestIdRef = useRef(0);
  const generationIdRef = useRef(0);
  const projectPathRef = useRef<string | null>(null);

  const currentData: DashboardOverviewData | null | undefined = overviewCache[activeTimeRange];

  const loadTabData = useCallback(
    async (timeRange: DashboardTimeRange, forceReload = false) => {
      if (!currentProjectPath) return;

      const state = useDashboardStore.getState();
      const cached = state.getOverviewData(timeRange);
      if (!forceReload && cached !== undefined) return;

      const requestId = ++requestIdRef.current;
      state.clearError();
      state.setLoading(true);

      try {
        const loaded = await loadOverview(currentProjectPath, timeRange);
        if (requestId !== requestIdRef.current) return;

        state.setOverviewData(timeRange, loaded);
        state.setTabStatus(timeRange, {
          exists: loaded !== null,
          generatedAt: loaded?.generatedAt,
        });
      } catch (error) {
        if (requestId !== requestIdRef.current) return;
        state.setError(getErrorMessage(error, 'Übersicht konnte nicht geladen werden.'));
      } finally {
        if (requestId === requestIdRef.current) {
          state.setLoading(false);
        }
      }
    },
    [currentProjectPath]
  );

  const refreshStatus = useCallback(async () => {
    if (!currentProjectPath) return;

    try {
      const status = await getOverviewStatus(currentProjectPath);
      useDashboardStore.getState().setTabStatusMap(status);
    } catch {
      // Status ist optional. Nutzer kann trotzdem generieren.
    }
  }, [currentProjectPath]);

  const handleGenerate = useCallback(
    async (mode: DashboardMode = 'standard') => {
      if (!currentProjectPath) {
        useDashboardStore.getState().setError('Bitte zuerst ein Projekt auswählen.');
        return;
      }

      const state = useDashboardStore.getState();
      const timeRange = state.activeTimeRange;
      const sinceHours = getHoursByTimeRange(timeRange);
      const generationId = generationIdRef.current + 1;
      generationIdRef.current = generationId;

      state.clearError();
      state.setGenerating(true, INITIAL_PROGRESS_MESSAGE);

      try {
        const data = await generateOverview(currentProjectPath, sinceHours, timeRange, {
          mode,
          modelOverride: state.modelOverride,
        });

        if (generationIdRef.current !== generationId) return;

        state.setOverviewData(timeRange, data);
        state.setTabStatus(timeRange, {
          exists: true,
          generatedAt: data.generatedAt,
        });
        state.setLastUsedMode(data.mode ?? mode);
      } catch (error) {
        if (generationIdRef.current !== generationId) return;
        state.setError(getErrorMessage(error, 'Übersicht konnte nicht erstellt werden.'));
      } finally {
        if (generationIdRef.current !== generationId) return;
        state.setGenerating(false);
      }
    },
    [currentProjectPath]
  );

  const handleCancel = useCallback(async () => {
    generationIdRef.current += 1;
    const state = useDashboardStore.getState();
    state.setGenerating(false);
    state.clearError();

    try {
      await cancelOverview();
    } catch {
      // Lokaler Zustand ist schon sauber, daher hier bewusst leer.
    }
  }, []);

  const handleRetryLoad = useCallback(() => {
    void loadTabData(useDashboardStore.getState().activeTimeRange, true);
  }, [loadTabData]);

  useEffect(() => {
    const projectChanged = projectPathRef.current !== currentProjectPath;
    if (projectChanged) {
      projectPathRef.current = currentProjectPath;
      useDashboardStore.getState().reset();
    }

    if (!currentProjectPath) return;
    void refreshStatus();
  }, [currentProjectPath, refreshStatus]);

  useEffect(() => {
    if (!currentProjectPath) return;
    void loadTabData(activeTimeRange);
  }, [activeTimeRange, currentProjectPath, loadTabData]);

  useEffect(() => {
    const api = getHttpApiClient();

    const unsubProgress = api.onOverviewProgress((payload) => {
      const phase = typeof payload?.phase === 'string' ? payload.phase : INITIAL_PROGRESS_MESSAGE;
      const state = useDashboardStore.getState();
      if (!state.isGenerating) return;
      state.setGenerating(true, phase);
    });

    const unsubData = api.onOverviewData((payload) => {
      if (!isOverviewPayload(payload)) return;
      const state = useDashboardStore.getState();
      if (!state.isGenerating) return;

      const data = payload.data;
      state.setOverviewData(data.timeRange, data);
      state.setTabStatus(data.timeRange, {
        exists: true,
        generatedAt: data.generatedAt,
      });
      state.setLastUsedMode(data.mode);
      state.clearError();
    });

    const unsubError = api.onOverviewError((payload) => {
      const message =
        typeof payload?.message === 'string' && payload.message.trim().length > 0
          ? payload.message
          : 'Übersicht konnte nicht erstellt werden.';

      const state = useDashboardStore.getState();
      if (!state.isGenerating) return;
      state.setError(message);
    });

    return () => {
      unsubProgress();
      unsubData();
      unsubError();
    };
  }, []);

  const hasDataForTab = (range: DashboardTimeRange): boolean => {
    return Boolean(overviewCache[range]) || tabStatus[range]?.exists === true;
  };

  const isLoadingCurrentTab = useMemo(() => {
    return isLoading && currentData === undefined;
  }, [currentData, isLoading]);

  return {
    activeTimeRange,
    isLoading: isLoadingCurrentTab,
    isGenerating,
    generatingProgress,
    error,
    currentData,
    modelOverride,
    lastUsedMode,
    hasDataForTab,
    setActiveTimeRange,
    setModelOverride,
    handleGenerate,
    handleCancel,
    handleRetryLoad,
    setLastUsedMode,
  };
}
