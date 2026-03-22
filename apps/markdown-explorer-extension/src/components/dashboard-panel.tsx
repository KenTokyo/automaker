import { useEffect } from 'react';
import { AlertCircle, Loader2, RefreshCw, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useDashboard } from '../hooks/use-dashboard';
import { DASHBOARD_TIME_RANGES, type DashboardMode } from '../stores/dashboard-types';
import { DashboardActionBar } from './dashboard-action-bar';
import { DashboardEmptyState } from './dashboard-empty-state';
import { DashboardLoading } from './dashboard-loading';
import { DashboardModelSelector } from './dashboard-model-selector';
import { DashboardOverviewCards } from './dashboard-overview-cards';
import { DashboardTimeTabs } from './dashboard-time-tabs';

interface DashboardPanelProps {
  onClose: () => void;
}

export function DashboardPanel({ onClose }: DashboardPanelProps) {
  const {
    activeTimeRange,
    isLoading,
    isGenerating,
    generatingProgress,
    error,
    currentData,
    hasDataForTab,
    modelOverride,
    setActiveTimeRange,
    setModelOverride,
    handleGenerate,
    handleCancel,
    handleRetryLoad,
  } = useDashboard();

  const activeLabel =
    DASHBOARD_TIME_RANGES.find((range) => range.id === activeTimeRange)?.label ?? activeTimeRange;

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

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (!(event.ctrlKey && event.shiftKey && event.key.toLowerCase() === 'g')) return;
      if (isGenerating) return;
      event.preventDefault();
      triggerAction('standard');
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isGenerating, handleGenerate]);

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex items-center justify-between border-b border-muted px-3 py-2">
        <div className="flex items-center gap-2">
          <h2 className="text-sm font-semibold">Übersicht</h2>
          <DashboardModelSelector
            value={modelOverride}
            onChange={setModelOverride}
            disabled={isGenerating}
          />
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7 text-muted-foreground hover:text-foreground"
          onClick={onClose}
          aria-label="Übersicht schließen"
          title="Übersicht schließen"
        >
          <X className="h-4 w-4" />
        </Button>
      </div>

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
              <DashboardOverviewCards data={currentData} />
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
        <p className="text-[10px] text-muted-foreground">
          {currentData
            ? `Generiert: ${new Date(currentData.generatedAt).toLocaleString('de-DE')}`
            : `Zeitraum: ${activeLabel}`}
        </p>
      </div>
    </div>
  );
}

function ErrorState({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center gap-4 px-6 py-12 text-center">
      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-destructive/10">
        <AlertCircle className="h-5 w-5 text-destructive" />
      </div>
      <div className="space-y-1">
        <p className="text-sm font-medium">Fehler beim Laden</p>
        <p className="max-w-[220px] text-xs text-muted-foreground">{message}</p>
      </div>
      <Button variant="outline" size="sm" onClick={onRetry} className="gap-1.5 border-muted">
        <RefreshCw className="h-3.5 w-3.5" />
        Erneut laden
      </Button>
    </div>
  );
}

function InlineError({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div className="mx-3 mt-3 flex items-center justify-between gap-2 rounded-md border border-muted bg-destructive/5 px-3 py-2">
      <p className="text-xs text-muted-foreground">{message}</p>
      <Button size="sm" variant="outline" onClick={onRetry} className="h-7 border-muted text-xs">
        Erneut laden
      </Button>
    </div>
  );
}
