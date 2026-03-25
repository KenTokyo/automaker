/**
 * Time Limiter & Auto-Condense Settings
 *
 * Two separate collapsible panels:
 * - Time limit mode
 * - Automatic context condense mode
 *
 * Only one mode can be active at the same time.
 */

import { memo, useEffect, useState, type KeyboardEvent } from 'react';
import {
  Timer,
  Settings,
  Clock,
  Cpu,
  Gauge,
  ChevronDown,
  ChevronRight,
  Layers,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { useTimeLimiterStore } from '@/store/time-limiter-store';

const MANUAL_CONTEXT_OPTIONS = [200000, 400000, 600000, 800000] as const;

interface TimeLimiterSettingsProps {
  disabled?: boolean;
  elapsedSeconds?: number;
  estimatedContextTokens?: number;
  /** Effective context window (model value or manual fallback) */
  contextWindowTokens?: number | null;
  /** Native context window reported by the selected model metadata */
  modelContextWindowTokens?: number | null;
  /** Whether model context lookup already finished */
  isModelContextLookupReady?: boolean;
  /** True when context tokens come from provider usage events */
  isContextUsageMeasured?: boolean;
  contextUsagePercent?: number | null;
}

export const TimeLimiterSettings = memo(function TimeLimiterSettings({
  disabled,
  elapsedSeconds = 0,
  estimatedContextTokens = 0,
  contextWindowTokens = null,
  modelContextWindowTokens = null,
  isModelContextLookupReady = false,
  isContextUsageMeasured = false,
  contextUsagePercent = null,
}: TimeLimiterSettingsProps) {
  const {
    timeLimitSeconds,
    isEnabled,
    currentModelId,
    autoCondenseEnabled,
    autoCondenseThresholdPercent,
    contextWindowOverrideTokens,
    setTimeLimit,
    setEnabled,
    setAutoCondenseEnabled,
    setAutoCondenseThresholdPercent,
    setContextWindowOverrideTokens,
  } = useTimeLimiterStore();

  const [isOpen, setIsOpen] = useState(false);
  const [timePanelOpen, setTimePanelOpen] = useState(true);
  const [condensePanelOpen, setCondensePanelOpen] = useState(true);
  const [inputValue, setInputValue] = useState(timeLimitSeconds.toString());
  const [condenseInputValue, setCondenseInputValue] = useState(
    autoCondenseThresholdPercent.toString()
  );
  const [manualContextSelection, setManualContextSelection] = useState(
    contextWindowOverrideTokens ? contextWindowOverrideTokens.toString() : ''
  );

  // Sync input values with store updates (e.g. on model switch)
  useEffect(() => {
    setInputValue(timeLimitSeconds.toString());
  }, [timeLimitSeconds]);

  useEffect(() => {
    setCondenseInputValue(autoCondenseThresholdPercent.toString());
  }, [autoCondenseThresholdPercent]);

  useEffect(() => {
    setManualContextSelection(
      contextWindowOverrideTokens ? contextWindowOverrideTokens.toString() : ''
    );
  }, [contextWindowOverrideTokens]);

  // Auto-condense needs a known context window. If missing, force this mode off.
  useEffect(() => {
    if (!isModelContextLookupReady) return;
    if (autoCondenseEnabled && (!contextWindowTokens || contextWindowTokens <= 0)) {
      setAutoCondenseEnabled(false);
    }
  }, [autoCondenseEnabled, contextWindowTokens, isModelContextLookupReady, setAutoCondenseEnabled]);

  const controlsDisabled = Boolean(disabled);

  const handleInputBlur = () => {
    const parsed = parseInt(inputValue, 10);
    if (!isNaN(parsed) && parsed >= 60 && parsed <= 3600) {
      setTimeLimit(parsed);
    } else {
      setInputValue(timeLimitSeconds.toString());
    }
  };

  const handleCondenseInputBlur = () => {
    const parsed = parseInt(condenseInputValue, 10);
    if (!isNaN(parsed) && parsed >= 50 && parsed <= 95) {
      setAutoCondenseThresholdPercent(parsed);
    } else {
      setCondenseInputValue(autoCondenseThresholdPercent.toString());
    }
  };

  const handleKeyDown = (e: KeyboardEvent, onCommit: () => void) => {
    if (e.key === 'Enter') {
      onCommit();
    }
  };

  const handleAutoCondenseToggle = (enabled: boolean) => {
    if (enabled && (!contextWindowTokens || contextWindowTokens <= 0)) {
      return;
    }
    setAutoCondenseEnabled(enabled);
  };

  const handleManualContextSave = () => {
    const parsed = parseInt(manualContextSelection, 10);
    if (!isNaN(parsed) && parsed > 0) {
      setContextWindowOverrideTokens(parsed);
      return;
    }
    setManualContextSelection(
      contextWindowOverrideTokens ? contextWindowOverrideTokens.toString() : ''
    );
  };

  const handleManualContextReset = () => {
    setContextWindowOverrideTokens(null);
    setManualContextSelection('');
  };

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const formatModelName = (modelId: string): string => {
    return modelId
      .split('-')
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
      .join(' ');
  };

  const formatTokens = (tokens: number): string => {
    return new Intl.NumberFormat('de-DE').format(Math.max(0, Math.round(tokens)));
  };

  const isModelContextMissing =
    typeof modelContextWindowTokens !== 'number' || modelContextWindowTokens <= 0;
  const hasContextWindow = typeof contextWindowTokens === 'number' && contextWindowTokens > 0;
  const isContextLookupPending = !isModelContextLookupReady && !hasContextWindow;
  const showManualContextPanel = isModelContextLookupReady && isModelContextMissing;
  const canEnableAutoCondense = hasContextWindow;
  const autoCondenseSwitchDisabled =
    controlsDisabled || (!canEnableAutoCondense && !autoCondenseEnabled);

  const remainingSeconds = Math.max(0, timeLimitSeconds - elapsedSeconds);
  const isWarning = isEnabled && remainingSeconds < 60 && remainingSeconds > 0;
  const isExpired = isEnabled && remainingSeconds === 0 && elapsedSeconds > 0;
  const roundedContextPercent =
    contextUsagePercent === null ? null : Math.max(0, Math.round(contextUsagePercent));
  const displayContextPercent =
    roundedContextPercent !== null ? roundedContextPercent : estimatedContextTokens <= 0 ? 0 : null;
  const contextPercentLabel = displayContextPercent !== null ? `${displayContextPercent}%` : '--';
  const contextUntilThresholdPercent =
    displayContextPercent !== null
      ? Math.max(0, autoCondenseThresholdPercent - displayContextPercent)
      : null;
  const contextUntilThresholdLabel =
    contextUntilThresholdPercent !== null ? `${contextUntilThresholdPercent}%` : '--';
  const contextThresholdReached =
    displayContextPercent !== null && displayContextPercent >= autoCondenseThresholdPercent;
  const TriggerStatusIcon = isEnabled ? Timer : Gauge;
  const contextTokenPrefix = isContextUsageMeasured ? '' : '~';

  const manualContextStoreValue = contextWindowOverrideTokens
    ? contextWindowOverrideTokens.toString()
    : '';
  const manualContextDirty = manualContextSelection !== manualContextStoreValue;
  const manualContextCurrentLabel =
    contextWindowOverrideTokens && contextWindowOverrideTokens > 0
      ? `${formatTokens(contextWindowOverrideTokens)} Tokens`
      : 'nicht gesetzt';

  return (
    <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          disabled={controlsDisabled}
          data-testid="context-condense-settings-trigger"
          className={cn(
            'h-7 rounded-md border-border shrink-0 min-w-[126px] px-2 gap-1 justify-center',
            autoCondenseEnabled &&
              'bg-emerald-500/10 text-emerald-600 border-emerald-500/40 hover:bg-emerald-500/15',
            isEnabled &&
              !autoCondenseEnabled &&
              'bg-sky-500/10 text-sky-700 dark:text-sky-300 border-sky-500/40 hover:bg-sky-500/15',
            isWarning && 'border-yellow-500/50 text-yellow-600 bg-yellow-500/10 animate-pulse',
            isExpired && 'border-red-500/50 text-red-600 bg-red-500/10 animate-pulse'
          )}
          title={[
            autoCondenseEnabled
              ? 'Automatisch kürzen aktiv'
              : isEnabled
                ? 'Zeitlimit aktiv'
                : 'Auto-Wechsel aus',
            isEnabled
              ? `Zeitlimit: ${formatTime(remainingSeconds)} verbleibend`
              : 'Zeitlimit deaktiviert',
            hasContextWindow
              ? `Kontext ${isContextUsageMeasured ? '(gemessen)' : '(geschätzt)'}: ${roundedContextPercent ?? 0}% (${formatTokens(estimatedContextTokens)} / ${formatTokens(contextWindowTokens ?? 0)} Tokens)`
              : displayContextPercent === 0
                ? 'Kontext: 0% (noch keine Nachricht)'
                : 'Kontext: keine Größe verfügbar',
            contextUntilThresholdPercent !== null
              ? `Bis Schwelle: ${contextUntilThresholdPercent}% (Schwelle ${autoCondenseThresholdPercent}%)`
              : 'Bis Schwelle: --',
            'Klick öffnet die Einstellungen',
          ]
            .filter(Boolean)
            .join(' | ')}
        >
          <TriggerStatusIcon className="w-3.5 h-3.5 shrink-0" />
          <span className="text-[10px] leading-none text-muted-foreground/50">/</span>
          <span className="text-[11px] font-semibold tabular-nums leading-none">
            {contextPercentLabel}
          </span>
          <span className="text-[10px] leading-none text-muted-foreground/50">/</span>
          <span className="text-[11px] font-medium tabular-nums leading-none">
            {contextUntilThresholdLabel}
          </span>
          {isEnabled && (
            <>
              <span className="text-[10px] leading-none text-muted-foreground/50">/</span>
              <span className="text-[11px] font-medium tabular-nums leading-none">
                {formatTime(remainingSeconds)}
              </span>
            </>
          )}
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent
        align="start"
        className="w-[36rem] max-w-[calc(100vw-1rem)] p-0"
        onCloseAutoFocus={(e) => e.preventDefault()}
      >
        <div className="p-3 border-b border-border">
          <div className="flex items-center gap-2 mb-1">
            <Settings className="w-4 h-4" />
            <h4 className="font-medium text-sm">Auto-Wechsel</h4>
          </div>
          <p className="text-xs text-muted-foreground">
            Lege fest, wann automatisch ein neuer Chat mit Zusammenfassung startet.
          </p>
        </div>

        <div className="p-3 space-y-3">
          {currentModelId && (
            <div className="flex items-center gap-2 px-2 py-1.5 rounded-lg border border-border bg-muted/30">
              <Cpu className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
              <span className="text-xs text-muted-foreground">
                Einstellungen für:{' '}
                <strong className="text-foreground">{formatModelName(currentModelId)}</strong>
              </span>
            </div>
          )}

          <div className="flex items-start gap-2 rounded-lg border border-border bg-muted/20 px-2.5 py-2">
            <Layers className="w-3.5 h-3.5 text-muted-foreground mt-0.5 shrink-0" />
            <p className="text-xs text-muted-foreground">
              Es kann immer nur ein Modus aktiv sein: entweder Zeitlimit oder automatisch kürzen.
            </p>
          </div>

          <Collapsible open={timePanelOpen} onOpenChange={setTimePanelOpen}>
            <div
              className={cn(
                'rounded-lg border border-border bg-card px-2.5 py-2',
                isEnabled && 'border-sky-500/50 bg-sky-500/5'
              )}
            >
              <div className="flex items-start gap-2">
                <CollapsibleTrigger asChild>
                  <Button
                    variant="ghost"
                    className="h-auto flex-1 justify-start p-0 hover:bg-transparent"
                  >
                    <div className="w-full text-left">
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <Timer className="w-3.5 h-3.5 text-muted-foreground" />
                          <span className="text-sm font-medium">Zeitlimit</span>
                        </div>
                        {timePanelOpen ? (
                          <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" />
                        ) : (
                          <ChevronRight className="w-3.5 h-3.5 text-muted-foreground" />
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        Bei Ablauf wird automatisch ein neuer Chat gestartet.
                      </p>
                    </div>
                  </Button>
                </CollapsibleTrigger>
                <Switch
                  checked={isEnabled}
                  onCheckedChange={setEnabled}
                  disabled={controlsDisabled}
                  aria-label="Zeitlimit aktivieren"
                />
              </div>

              <CollapsibleContent className="pt-3 space-y-3">
                <div className="space-y-2">
                  <Label htmlFor="time-limit-seconds" className="text-sm font-medium">
                    Zeitlimit (Sekunden)
                  </Label>
                  <div className="flex items-center gap-2">
                    <Input
                      id="time-limit-seconds"
                      type="number"
                      min={60}
                      max={3600}
                      step={30}
                      value={inputValue}
                      onChange={(e) => setInputValue(e.target.value)}
                      onBlur={handleInputBlur}
                      onKeyDown={(e) => handleKeyDown(e, handleInputBlur)}
                      disabled={!isEnabled || controlsDisabled}
                      className="h-9"
                    />
                    <span className="text-xs text-muted-foreground whitespace-nowrap">
                      = {formatTime(parseInt(inputValue, 10) || 0)}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Bereich: 60s (1 Min) bis 3600s (60 Min)
                  </p>
                </div>

                {isEnabled && elapsedSeconds > 0 && (
                  <div className="pt-2 border-t border-border">
                    <div className="flex items-center gap-2 text-sm">
                      <Clock className="w-4 h-4" />
                      <span>
                        Laufzeit: <strong>{formatTime(elapsedSeconds)}</strong>
                      </span>
                    </div>
                    <div
                      className={cn(
                        'flex items-center gap-2 text-sm mt-1',
                        isWarning && 'text-yellow-600',
                        isExpired && 'text-red-600'
                      )}
                    >
                      <Timer className="w-4 h-4" />
                      <span>
                        Verbleibend:{' '}
                        <strong>{isExpired ? 'ABGELAUFEN' : formatTime(remainingSeconds)}</strong>
                      </span>
                    </div>
                  </div>
                )}

                <div className="pt-2 border-t border-border">
                  <Label className="text-xs text-muted-foreground mb-2 block">
                    Zeit-Schnellwerte
                  </Label>
                  <div className="flex flex-wrap gap-1">
                    {[300, 450, 600, 900, 1200].map((seconds) => (
                      <Button
                        key={seconds}
                        variant={timeLimitSeconds === seconds ? 'secondary' : 'outline'}
                        size="sm"
                        className="h-7 text-xs"
                        onClick={() => {
                          setTimeLimit(seconds);
                          setInputValue(seconds.toString());
                        }}
                        disabled={!isEnabled || controlsDisabled}
                      >
                        {formatTime(seconds)}
                      </Button>
                    ))}
                  </div>
                </div>
              </CollapsibleContent>
            </div>
          </Collapsible>

          <Collapsible open={condensePanelOpen} onOpenChange={setCondensePanelOpen}>
            <div
              className={cn(
                'rounded-lg border border-border bg-card px-2.5 py-2',
                autoCondenseEnabled && 'border-emerald-500/50 bg-emerald-500/5'
              )}
            >
              <div className="flex items-start gap-2">
                <CollapsibleTrigger asChild>
                  <Button
                    variant="ghost"
                    className="h-auto flex-1 justify-start p-0 hover:bg-transparent"
                  >
                    <div className="w-full text-left">
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <Gauge className="w-3.5 h-3.5 text-muted-foreground" />
                          <span className="text-sm font-medium">Automatisch kürzen</span>
                        </div>
                        {condensePanelOpen ? (
                          <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" />
                        ) : (
                          <ChevronRight className="w-3.5 h-3.5 text-muted-foreground" />
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        Bei hohem Kontext wird automatisch ein neuer Chat mit Kurzfassung erstellt.
                      </p>
                    </div>
                  </Button>
                </CollapsibleTrigger>
                <Switch
                  checked={autoCondenseEnabled}
                  onCheckedChange={handleAutoCondenseToggle}
                  disabled={autoCondenseSwitchDisabled}
                  aria-label="Automatisch kürzen aktivieren"
                />
              </div>

              <CollapsibleContent className="pt-3 space-y-3">
                <div className="space-y-2">
                  <Label htmlFor="auto-condense-threshold" className="text-sm font-medium">
                    Ab welchem Wert? (%)
                  </Label>
                  <div className="flex items-center gap-2">
                    <Input
                      id="auto-condense-threshold"
                      type="number"
                      min={50}
                      max={95}
                      step={1}
                      value={condenseInputValue}
                      onChange={(e) => setCondenseInputValue(e.target.value)}
                      onBlur={handleCondenseInputBlur}
                      onKeyDown={(e) => handleKeyDown(e, handleCondenseInputBlur)}
                      disabled={!autoCondenseEnabled || !hasContextWindow || controlsDisabled}
                      className="h-9"
                    />
                    <span className="text-xs text-muted-foreground whitespace-nowrap">%</span>
                  </div>
                  <p className="text-xs text-muted-foreground">Bereich: 50% bis 95%</p>
                </div>

                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">Schnellwerte</Label>
                  <div className="flex flex-wrap gap-1">
                    {[70, 80, 85, 90].map((percent) => (
                      <Button
                        key={percent}
                        variant={autoCondenseThresholdPercent === percent ? 'secondary' : 'outline'}
                        size="sm"
                        className="h-7 text-xs"
                        onClick={() => {
                          setAutoCondenseThresholdPercent(percent);
                          setCondenseInputValue(percent.toString());
                        }}
                        disabled={!autoCondenseEnabled || !hasContextWindow || controlsDisabled}
                      >
                        {percent}%
                      </Button>
                    ))}
                  </div>
                </div>

                <div className="rounded-lg border border-border bg-muted/30 px-2.5 py-2 space-y-1.5">
                  <div className="flex items-center gap-2 text-sm">
                    <Gauge className="w-3.5 h-3.5 text-muted-foreground" />
                    <span className="font-medium">Aktueller Kontext</span>
                  </div>
                  {hasContextWindow ? (
                    <>
                      <p className="text-xs text-muted-foreground">
                        {contextTokenPrefix}
                        {formatTokens(estimatedContextTokens)} /{' '}
                        {formatTokens(contextWindowTokens ?? 0)} Tokens
                        {roundedContextPercent !== null ? ` (${roundedContextPercent}%)` : ''}
                      </p>
                      <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
                        <div
                          className={cn(
                            'h-full rounded-full transition-all duration-200',
                            contextThresholdReached ? 'bg-amber-500' : 'bg-primary/70'
                          )}
                          style={{
                            width: `${Math.max(0, Math.min(100, roundedContextPercent ?? 0))}%`,
                          }}
                        />
                      </div>
                      {showManualContextPanel && (
                        <p className="text-[11px] text-muted-foreground">
                          Diese Größe kommt aus deiner manuellen Auswahl.
                        </p>
                      )}
                    </>
                  ) : (
                    <p className="text-xs text-muted-foreground">
                      {isContextLookupPending
                        ? 'Kontextgröße wird gerade geladen.'
                        : 'Für dieses Modell fehlt aktuell die Kontextgröße.'}
                    </p>
                  )}
                </div>

                {showManualContextPanel && (
                  <div className="rounded-lg border border-border bg-muted/20 px-2.5 py-2.5 space-y-2">
                    <Label className="text-sm font-medium">Kontextgröße manuell festlegen</Label>
                    <p className="text-xs text-muted-foreground">
                      Ohne Kontextgröße kann automatisch kürzen nicht arbeiten.
                    </p>

                    <Select
                      value={manualContextSelection || undefined}
                      onValueChange={setManualContextSelection}
                    >
                      <SelectTrigger className="h-8 text-xs">
                        <SelectValue placeholder="Bitte Kontextgröße wählen" />
                      </SelectTrigger>
                      <SelectContent>
                        {MANUAL_CONTEXT_OPTIONS.map((tokens) => (
                          <SelectItem key={tokens} value={tokens.toString()}>
                            {formatTokens(tokens)} Tokens
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>

                    <div className="flex items-center gap-2">
                      <Button
                        size="sm"
                        className="h-7 text-xs"
                        onClick={handleManualContextSave}
                        disabled={
                          !manualContextSelection || !manualContextDirty || controlsDisabled
                        }
                      >
                        Speichern
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-7 text-xs"
                        onClick={handleManualContextReset}
                        disabled={
                          controlsDisabled ||
                          (!contextWindowOverrideTokens && manualContextSelection.length === 0)
                        }
                      >
                        Zurücksetzen
                      </Button>
                    </div>

                    <p className="text-[11px] text-muted-foreground">
                      Aktuell: {manualContextCurrentLabel}. Wird pro Modell gespeichert.
                    </p>
                  </div>
                )}

                {!hasContextWindow && isModelContextLookupReady && (
                  <p className="text-xs text-amber-600 dark:text-amber-400">
                    Automatisch kürzen ist erst aktivierbar, wenn eine Kontextgröße bekannt ist.
                  </p>
                )}
              </CollapsibleContent>
            </div>
          </Collapsible>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
});
