/**
 * LeftOverviewPanel - Compact dashboard overview for the left sidebar.
 *
 * Reuses the shared useDashboard hook and dashboard store from Phase 3.
 * Displays the same data as the right-side DashboardPanel but in a
 * narrower, sidebar-friendly layout.
 */

import { AlertCircle, BarChart3, Loader2, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useDashboard } from '@/hooks/use-dashboard';
import { useAppStore } from '@/store/app-store';
import { DASHBOARD_TIME_RANGES, type DashboardMode } from '@automaker/types';
import { DashboardOverviewCards } from '@/components/views/agent-view/components/dashboard-panel/dashboard-cards';
import {
  DashboardActionBar,
  DashboardEmptyState,
  DashboardLoading,
  DashboardTimeTabs,
} from '@/components/views/agent-view/components/dashboard-panel/dashboard-controls';
import {
  formatOverviewGeneratedAbsolute,
  formatOverviewGeneratedRelative,
} from '@/components/views/agent-view/components/dashboard-panel/dashboard-time-utils';

export function LeftOverviewPanel() {
  const {
    activeTimeRange,
    isLoading,
    isGenerating,
    generatingProgress,
    error,
    currentData,
    hasDataForTab,
    setActiveTimeRange,
    handleGenerate,
    handleCancel,
    handleRetryLoad,
  } = useDashboard();

  const currentProjectPath = useAppStore((s) => s.currentProject?.path ?? null);

  const activeLabel =
    DASHBOARD_TIME_RANGES.find((range) => range.id === activeTimeRange)?.label ?? activeTimeRange;
  const generatedRelative = currentData
    ? formatOverviewGeneratedRelative(currentData.generatedAt)
    : null;
  const generatedAbsolute = currentData
    ? formatOverviewGeneratedAbsolute(currentData.generatedAt)
    : null;

  const hasCurrentData = Boolean(currentData);
  const showInitialLoading = isLoading && !hasCurrentData;
  const showGeneratingWithoutData = isGenerating && !hasCurrentData;
  const showStandaloneError = Boolean(
    error && !hasCurrentData && !showInitialLoading && !showGeneratingWithoutData
  );
  const showInlineError = Boolean(error && hasCurrentData);
  const showOverlay = isGenerating && hasCurrentData;
  const errorMessage = error ?? '';

  const triggerAction = (mode: DashboardMode) => {
    void handleGenerate(mode);
  };

  return (
    <div className="flex h-full min-h-0 flex-col">
      <DashboardTimeTabs
        activeTab={activeTimeRange}
        onTabChange={setActiveTimeRange}
        hasData={hasDataForTab}
      />

      <div className="min-h-0 flex-1 overflow-y-auto">
        {showGeneratingWithoutData ? (
          <DashboardLoading phase={generatingProgress} onCancel={handleCancel} />
        ) : showInitialLoading ? (
          <DashboardLoading phase="Gespeicherte Übersicht wird geladen…" />
        ) : showStandaloneError ? (
          <ErrorState message={errorMessage} onRetry={handleRetryLoad} />
        ) : (
          <div className="relative">
            {showInlineError ? (
              <InlineError message={errorMessage} onRetry={handleRetryLoad} />
            ) : null}

            {currentData ? (
              <DashboardOverviewCards data={currentData} projectPath={currentProjectPath} />
            ) : (
              <DashboardEmptyState timeRangeLabel={activeLabel} />
            )}

            {showOverlay ? (
              <div
                className="absolute inset-0 flex items-center justify-center bg-background/70 px-4 backdrop-blur-[1px]"
                aria-live="polite"
              >
                <div className="w-full max-w-xs rounded-md border border-muted bg-background/95 p-3 text-center shadow-sm">
                  <div className="flex items-center justify-center gap-2 text-sm font-medium">
                    <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                    Übersicht wird neu erstellt…
                  </div>
                  {generatingProgress ? (
                    <p className="mt-1 text-xs text-muted-foreground">{generatingProgress}</p>
                  ) : null}
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleCancel}
                    className="mt-3 border-muted"
                  >
                    Abbrechen
                  </Button>
                </div>
              </div>
            ) : null}
          </div>
        )}
      </div>

      <DashboardActionBar
        data={currentData ?? null}
        isGenerating={isGenerating}
        onAction={triggerAction}
      />

      <div className="border-t border-muted px-3 py-1.5">
        <p
          className="text-[10px] text-muted-foreground"
          title={currentData ? `Generiert am ${generatedAbsolute}` : undefined}
        >
          {currentData ? `Generiert: ${generatedRelative}` : `Zeitraum: ${activeLabel}`}
        </p>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Internal helper components
// ---------------------------------------------------------------------------

function ErrorState({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 px-4 py-8 text-center">
      <div className="flex h-9 w-9 items-center justify-center rounded-full bg-destructive/10">
        <AlertCircle className="h-4 w-4 text-destructive" />
      </div>
      <div className="space-y-1">
        <p className="text-sm font-medium">Fehler beim Laden</p>
        <p className="max-w-[200px] text-xs text-muted-foreground">{message}</p>
      </div>
      <Button variant="outline" size="sm" onClick={onRetry} className="gap-1.5 border-muted">
        <RefreshCw className="h-3 w-3" />
        Erneut laden
      </Button>
    </div>
  );
}

function InlineError({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div className="mx-3 mt-2 flex items-center justify-between gap-2 rounded-md border border-muted bg-destructive/5 px-2 py-1.5">
      <p className="text-xs text-muted-foreground">{message}</p>
      <Button size="sm" variant="outline" onClick={onRetry} className="h-6 border-muted text-xs">
        Erneut laden
      </Button>
    </div>
  );
}
