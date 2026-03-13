/**
 * ProjectOverviewView - Standalone full-page view of the per-project AI overview.
 *
 * Reuses all dashboard-panel sub-components but renders them in a spacious,
 * full-page layout instead of the narrow right-panel.
 */

import { useCallback, useState } from 'react';
import {
  AlertCircle,
  BarChart3,
  Check,
  ClipboardCopy,
  Download,
  Loader2,
  RefreshCw,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useDashboard } from '@/hooks/use-dashboard';
import { useAppStore } from '@/store/app-store';
import { saveOverviewAsFile } from '@/lib/overview-api';
import { isElectron } from '@/lib/electron';
import { isMac } from '@/lib/utils';
import { DASHBOARD_TIME_RANGES, type DashboardMode } from '@automaker/types';
import { DashboardOverviewCards } from '@/components/views/agent-view/components/dashboard-panel/dashboard-cards';
import {
  DashboardActionBar,
  DashboardEmptyState,
  DashboardLoading,
  DashboardModelSelector,
  DashboardTimeTabs,
} from '@/components/views/agent-view/components/dashboard-panel/dashboard-controls';
import {
  overviewToMarkdown,
  getOverviewFileName,
} from '@/components/views/agent-view/components/dashboard-panel/dashboard-export-utils';

export function ProjectOverviewView() {
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

  const currentProjectPath = useAppStore((s) => s.currentProject?.path ?? null);
  const currentProjectName = useAppStore((s) => s.currentProject?.name ?? null);

  const [copyFeedback, setCopyFeedback] = useState(false);
  const [saveFeedback, setSaveFeedback] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');

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

  const handleCopy = useCallback(() => {
    if (!currentData) return;
    const md = overviewToMarkdown(currentData);
    void navigator.clipboard.writeText(md).then(() => {
      setCopyFeedback(true);
      setTimeout(() => setCopyFeedback(false), 2000);
    });
  }, [currentData]);

  const handleSave = useCallback(async () => {
    if (!currentData || !currentProjectPath) return;
    setSaveFeedback('saving');
    try {
      const md = overviewToMarkdown(currentData);
      const fileName = getOverviewFileName(currentData);
      await saveOverviewAsFile(currentProjectPath, md, fileName);
      setSaveFeedback('saved');
      setTimeout(() => setSaveFeedback('idle'), 2000);
    } catch {
      setSaveFeedback('error');
      setTimeout(() => setSaveFeedback('idle'), 3000);
    }
  }, [currentData, currentProjectPath]);

  return (
    <div className="flex flex-1 flex-col h-screen content-bg" data-testid="project-overview-view">
      {/* Header */}
      <header className="shrink-0 border-b border-border bg-glass backdrop-blur-md">
        {isElectron() && (
          <div
            className={`absolute top-0 left-0 right-0 h-6 titlebar-drag-region z-40 pointer-events-none ${isMac ? 'pl-20' : ''}`}
            aria-hidden="true"
          />
        )}
        <div className="px-4 sm:px-8 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3 titlebar-no-drag">
            <div className="w-8 h-8 rounded-lg bg-brand-500/10 flex items-center justify-center">
              <BarChart3 className="w-4 h-4 text-brand-500" />
            </div>
            <div>
              <h1 className="text-lg font-semibold text-foreground">Projekt-Übersicht</h1>
              <p className="text-xs text-muted-foreground">
                {currentProjectName ?? 'Kein Projekt ausgewählt'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 titlebar-no-drag">
            <DashboardModelSelector
              value={modelOverride}
              onChange={setModelOverride}
              disabled={isGenerating}
            />
            <Button
              variant="outline"
              size="sm"
              onClick={handleCopy}
              disabled={!hasCurrentData}
              className="gap-1.5"
              title={hasCurrentData ? 'Als Markdown kopieren' : 'Erstelle zuerst eine Übersicht'}
            >
              {copyFeedback ? (
                <Check className="h-3.5 w-3.5 text-emerald-500" />
              ) : (
                <ClipboardCopy className="h-3.5 w-3.5" />
              )}
              Kopieren
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => void handleSave()}
              disabled={!hasCurrentData || saveFeedback === 'saving'}
              className="gap-1.5"
              title={
                !hasCurrentData
                  ? 'Erstelle zuerst eine Übersicht'
                  : saveFeedback === 'saved'
                    ? 'Gespeichert!'
                    : saveFeedback === 'error'
                      ? 'Fehler beim Speichern'
                      : 'Als Datei speichern'
              }
            >
              {saveFeedback === 'saving' ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : saveFeedback === 'saved' ? (
                <Check className="h-3.5 w-3.5 text-emerald-500" />
              ) : (
                <Download className="h-3.5 w-3.5" />
              )}
              Speichern
            </Button>
          </div>
        </div>
      </header>

      {/* Time range tabs */}
      <div className="shrink-0 border-b border-border bg-background/50">
        <div className="max-w-5xl mx-auto">
          <DashboardTimeTabs
            activeTab={activeTimeRange}
            onTabChange={setActiveTimeRange}
            hasData={hasDataForTab}
          />
        </div>
      </div>

      {/* Main content */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-5xl mx-auto py-6 px-4 sm:px-8">
          {showGeneratingWithoutData ? (
            <DashboardLoading phase={generatingProgress} onCancel={handleCancel} />
          ) : showInitialLoading ? (
            <DashboardLoading phase="Gespeicherte Übersicht wird geladen..." />
          ) : showStandaloneError ? (
            <div className="flex flex-col items-center justify-center gap-4 px-6 py-16 text-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10">
                <AlertCircle className="h-6 w-6 text-destructive" />
              </div>
              <div className="space-y-1">
                <p className="text-sm font-medium">Fehler beim Laden</p>
                <p className="max-w-sm text-xs text-muted-foreground">{errorMessage}</p>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={handleRetryLoad}
                className="gap-1.5 border-muted"
              >
                <RefreshCw className="h-3.5 w-3.5" />
                Erneut laden
              </Button>
            </div>
          ) : (
            <div className="relative">
              {showInlineError ? (
                <div className="mb-4 flex items-center justify-between gap-2 rounded-md border border-muted bg-destructive/5 px-4 py-3">
                  <p className="text-sm text-muted-foreground">{errorMessage}</p>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={handleRetryLoad}
                    className="border-muted"
                  >
                    Erneut laden
                  </Button>
                </div>
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
                  <div className="w-full max-w-sm rounded-lg border border-muted bg-background/95 p-6 text-center shadow-lg">
                    <div className="flex items-center justify-center gap-2 text-sm font-medium">
                      <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                      Übersicht wird neu erstellt...
                    </div>
                    {generatingProgress ? (
                      <p className="mt-2 text-xs text-muted-foreground">{generatingProgress}</p>
                    ) : null}
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleCancel}
                      className="mt-4 border-muted"
                    >
                      Abbrechen
                    </Button>
                  </div>
                </div>
              ) : null}
            </div>
          )}
        </div>
      </div>

      {/* Action bar */}
      <div className="shrink-0 border-t border-border bg-background/80 backdrop-blur-sm">
        <div className="max-w-5xl mx-auto">
          <div className="py-3">
            <DashboardActionBar
              data={currentData ?? null}
              isGenerating={isGenerating}
              onAction={triggerAction}
            />
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="shrink-0 border-t border-muted bg-background/50 px-4 sm:px-8 py-2">
        <div className="max-w-5xl mx-auto">
          <p className="text-[11px] text-muted-foreground">
            {currentData
              ? `Generiert: ${new Date(currentData.generatedAt).toLocaleString('de-DE')}`
              : `Zeitraum: ${activeLabel}`}
          </p>
        </div>
      </div>
    </div>
  );
}
