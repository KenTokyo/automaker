/**
 * Orchestrator Settings
 *
 * A dropdown component for configuring the orchestrator mode.
 * When enabled, it monitors the last AI message for a trigger keyword and
 * automatically creates a new chat with that message as the prompt.
 */

import { memo, useState, useEffect } from 'react';
import { Repeat, Settings, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';
import {
  useOrchestratorStore,
  type OrchestratorAutoSendStatus,
  type OrchestratorTriggerReason,
} from '@/store/orchestrator-store';

interface OrchestratorSettingsProps {
  disabled?: boolean;
  activeSessionOrchestratorRunId?: string | null;
}

function getTriggerReasonText(reason: OrchestratorTriggerReason): string {
  switch (reason) {
    case 'no-new-assistant-output':
      return 'Keine neue Assistent-Antwort. Deshalb wurde kein neuer Schritt gestartet.';
    case 'keyword-empty':
      return 'Es ist kein Stichwort gesetzt.';
    case 'last-line-empty':
      return 'Die letzte Zeile war leer.';
    case 'exact-match':
      return 'Die letzte Zeile ist genau das Stichwort.';
    case 'keyword-match':
      return 'Das Stichwort wurde in der letzten Zeile gefunden.';
    case 'disabled':
      return 'Der Orchestrator ist aus.';
    default:
      return 'Die letzte Zeile passt nicht zum Stichwort.';
  }
}

function getAutoSendStatusText(status: OrchestratorAutoSendStatus): string {
  if (status === 'waiting') {
    return 'Warte auf neuen Chat...';
  }
  if (status === 'sending') {
    return 'Sende automatisch...';
  }
  return 'Bereit';
}

export const OrchestratorSettings = memo(function OrchestratorSettings({
  disabled,
  activeSessionOrchestratorRunId = null,
}: OrchestratorSettingsProps) {
  const {
    isEnabled,
    triggerKeyword,
    maxIterations,
    currentIteration,
    autoSendEnabled,
    orchestratorRunId,
    autoSendStatus,
    lastTriggerCheck,
    setEnabled,
    setTriggerKeyword,
    setMaxIterations,
    setAutoSendEnabled,
  } = useOrchestratorStore();

  const [isOpen, setIsOpen] = useState(false);
  const [keywordInput, setKeywordInput] = useState(triggerKeyword);
  const [maxInput, setMaxInput] = useState(maxIterations.toString());
  const isSessionInCurrentRun = Boolean(
    orchestratorRunId &&
    activeSessionOrchestratorRunId &&
    orchestratorRunId === activeSessionOrchestratorRunId
  );
  const displayIteration = isSessionInCurrentRun ? currentIteration : 0;
  const showRunId = Boolean(orchestratorRunId && isSessionInCurrentRun);

  // Sync input values with store
  useEffect(() => {
    setKeywordInput(triggerKeyword);
  }, [triggerKeyword]);

  useEffect(() => {
    setMaxInput(maxIterations.toString());
  }, [maxIterations]);

  // Keyword input handlers
  const handleKeywordBlur = () => {
    const trimmed = keywordInput.trim();
    if (trimmed.length > 0) {
      setTriggerKeyword(trimmed);
    } else {
      setKeywordInput(triggerKeyword);
    }
  };

  // Max iterations input handlers
  const handleMaxBlur = () => {
    const parsed = parseInt(maxInput, 10);
    if (!isNaN(parsed) && parsed >= 1 && parsed <= 999) {
      setMaxIterations(parsed);
    } else {
      setMaxInput(maxIterations.toString());
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent, onBlur: () => void) => {
    if (e.key === 'Enter') {
      onBlur();
    }
  };

  return (
    <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          size="icon"
          disabled={disabled}
          className={cn(
            'h-7 rounded-md border-border shrink-0',
            isEnabled
              ? 'w-auto min-w-7 px-1.5 gap-1 bg-emerald-500/10 text-emerald-600 border-emerald-500/40 hover:bg-emerald-500/15'
              : 'w-7',
            autoSendStatus !== 'idle' && 'animate-pulse'
          )}
          title={
            isEnabled
              ? autoSendStatus === 'waiting'
                ? 'Orchestrator: Warte auf neuen Chat...'
                : autoSendStatus === 'sending'
                  ? 'Orchestrator: Sende automatisch...'
                  : `Orchestrator: ${displayIteration}/${maxIterations} Schritte`
              : 'Orchestrator (aus)'
          }
        >
          {autoSendStatus !== 'idle' ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
          ) : (
            <Repeat className="w-3.5 h-3.5" />
          )}
          {isEnabled && (
            <span className="text-[11px] font-medium tabular-nums">
              {displayIteration}/{maxIterations}
            </span>
          )}
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent
        align="start"
        className="w-72 p-0"
        onCloseAutoFocus={(e) => e.preventDefault()}
      >
        {/* Header */}
        <div className="p-3 border-b border-border">
          <div className="flex items-center gap-2 mb-1">
            <Settings className="w-4 h-4" />
            <h4 className="font-medium text-sm">Orchestrator</h4>
          </div>
          <p className="text-xs text-muted-foreground">
            Startet den nächsten Chat automatisch, wenn das Stichwort passt.
          </p>
        </div>

        {/* Settings */}
        <div className="p-3 space-y-4">
          {/* Enable/Disable Toggle */}
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="orchestrator-enabled" className="text-sm font-medium">
                Orchestrator aktiv
              </Label>
              <p className="text-xs text-muted-foreground">Neue Phasen automatisch starten</p>
            </div>
            <Switch id="orchestrator-enabled" checked={isEnabled} onCheckedChange={setEnabled} />
          </div>

          {/* Trigger Keyword Input */}
          <div className="space-y-2">
            <Label htmlFor="orchestrator-keyword" className="text-sm font-medium">
              Stichwort
            </Label>
            <Input
              id="orchestrator-keyword"
              type="text"
              value={keywordInput}
              onChange={(e) => setKeywordInput(e.target.value)}
              onBlur={handleKeywordBlur}
              onKeyDown={(e) => handleKeyDown(e, handleKeywordBlur)}
              disabled={!isEnabled}
              className="h-9 font-mono text-xs"
              placeholder="NEXT_PHASE_READY"
            />
            <p className="text-xs text-muted-foreground">
              Nur die letzte sinnvolle Zeile wird geprüft
            </p>
          </div>

          {/* Max Iterations Input */}
          <div className="space-y-2">
            <Label htmlFor="orchestrator-max" className="text-sm font-medium">
              Max Schritte
            </Label>
            <Input
              id="orchestrator-max"
              type="number"
              min={1}
              max={999}
              value={maxInput}
              onChange={(e) => setMaxInput(e.target.value)}
              onBlur={handleMaxBlur}
              onKeyDown={(e) => handleKeyDown(e, handleMaxBlur)}
              disabled={!isEnabled}
              className="h-9"
            />
            <p className="text-xs text-muted-foreground">
              Nach diesem Limit stoppt die Automatik (1-999).
            </p>
          </div>

          {/* Auto-Send Toggle */}
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="orchestrator-auto-send" className="text-sm font-medium">
                Direkt senden
              </Label>
              <p className="text-xs text-muted-foreground">Neue Phase sofort absenden</p>
            </div>
            <Switch
              id="orchestrator-auto-send"
              checked={autoSendEnabled}
              onCheckedChange={setAutoSendEnabled}
              disabled={!isEnabled}
            />
          </div>

          {/* Current Status */}
          {isEnabled && (displayIteration > 0 || autoSendStatus !== 'idle' || showRunId) && (
            <div className="pt-2 border-t border-border space-y-1.5">
              {displayIteration > 0 && (
                <div className="flex items-center gap-2 text-sm">
                  <Repeat className="w-4 h-4 text-muted-foreground" />
                  <span>
                    Schritt: <strong>{displayIteration}</strong> / {maxIterations}
                  </span>
                </div>
              )}
              <div
                className={cn(
                  'flex items-center gap-2 text-sm',
                  autoSendStatus !== 'idle' && 'text-foreground'
                )}
              >
                {autoSendStatus !== 'idle' ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Repeat className="w-3.5 h-3.5 text-muted-foreground" />
                )}
                <span className="text-xs">{getAutoSendStatusText(autoSendStatus)}</span>
              </div>
              {showRunId && (
                <p
                  className="text-[10px] text-muted-foreground font-mono truncate"
                  title={orchestratorRunId ?? undefined}
                >
                  Lauf-ID: {orchestratorRunId}
                </p>
              )}

              {lastTriggerCheck && (
                <div className="mt-2 rounded-md border border-border bg-muted/30 p-2 space-y-1.5">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-xs font-medium">Letzte Prüfung</p>
                    <span
                      className={cn(
                        'text-[10px] px-1.5 py-0.5 rounded border',
                        lastTriggerCheck.matched
                          ? 'border-emerald-500/30 text-emerald-700 dark:text-emerald-400'
                          : 'border-border text-muted-foreground'
                      )}
                    >
                      {lastTriggerCheck.matched ? 'Treffer' : 'Kein Treffer'}
                    </span>
                  </div>
                  <p className="text-[11px] text-muted-foreground">
                    {new Date(lastTriggerCheck.checkedAt).toLocaleTimeString('de-DE')}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {getTriggerReasonText(lastTriggerCheck.reason)}
                  </p>
                  <p className="text-[11px] font-mono text-muted-foreground break-all">
                    Stichwort: {lastTriggerCheck.keyword || '(leer)'}
                  </p>
                  <p className="text-[11px] font-mono text-muted-foreground break-all">
                    Letzte Zeile: {lastTriggerCheck.lastLine || '(leer)'}
                  </p>
                </div>
              )}

              <div className="mt-2 rounded-md border border-border bg-muted/20 p-2 space-y-1">
                <p className="text-xs font-medium">Schnelltest</p>
                <p className="text-[11px] text-muted-foreground">
                  Nutze diese letzte Zeile für einen kurzen Live-Test:
                </p>
                <p className="text-[11px] font-mono text-muted-foreground break-all">
                  1) NEXT_PHASE_READY -&gt; Treffer
                </p>
                <p className="text-[11px] font-mono text-muted-foreground break-all">
                  2) - NEXT_PHASE_READY. -&gt; Treffer (toleriert)
                </p>
                <p className="text-[11px] font-mono text-muted-foreground break-all">
                  3) PHASE_READY -&gt; Kein Treffer
                </p>
              </div>
            </div>
          )}
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
});
