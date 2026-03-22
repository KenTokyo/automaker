import type { PhaseModelEntry } from '@automaker/types';
import { cn } from '@/lib/utils';
import { formatRunId } from '../services/orchestrator-utils';

interface ChatStatusBarProps {
  modelSelection: PhaseModelEntry;
  isConnected: boolean;
  isProcessing: boolean;
  inputTokens: number;
  outputTokens: number;
  estimatedCost: string;
  errorMessage?: string | null;
  orchestratorEnabled?: boolean;
  orchestratorIteration?: number;
  orchestratorRunId?: string | null;
}

function formatModelName(model: string): string {
  if (!model) return 'Unbekanntes Modell';
  return model.replace(/[-_]/g, ' ').replace(/\b\w/g, (char) => char.toUpperCase());
}

function getThinkingLabel(modelSelection: PhaseModelEntry): string {
  if (modelSelection.reasoningEffort === 'xhigh' || modelSelection.thinkingLevel === 'ultrathink') {
    return 'Ultra';
  }
  if (modelSelection.reasoningEffort === 'high' || modelSelection.thinkingLevel === 'high') {
    return 'Hoch';
  }
  if (modelSelection.reasoningEffort === 'medium' || modelSelection.thinkingLevel === 'medium') {
    return 'Mittel';
  }
  if (modelSelection.reasoningEffort === 'low' || modelSelection.thinkingLevel === 'low') {
    return 'Leicht';
  }
  return 'Normal';
}

export function ChatStatusBar({
  modelSelection,
  isConnected,
  isProcessing,
  inputTokens,
  outputTokens,
  estimatedCost,
  errorMessage,
  orchestratorEnabled,
  orchestratorIteration,
  orchestratorRunId,
}: ChatStatusBarProps) {
  return (
    <footer className="flex flex-wrap items-center gap-x-4 gap-y-1 border-t border-muted bg-card/80 px-3 py-1.5 text-xs text-muted-foreground">
      <span>Modell: {formatModelName(modelSelection.model)}</span>
      <span>Input Tokens: ~{inputTokens}</span>
      <span>Output Tokens: ~{outputTokens}</span>
      <span>Kosten: {estimatedCost}</span>
      <span>Thinking: {getThinkingLabel(modelSelection)}</span>
      {orchestratorEnabled ? (
        <span className="font-medium text-primary">
          Orchestrator #{orchestratorIteration ?? 0}
          {orchestratorRunId ? ` (${formatRunId(orchestratorRunId)})` : ''}
        </span>
      ) : null}
      <span
        className={cn(
          'font-medium',
          isConnected ? 'text-emerald-500' : 'text-amber-500',
          isProcessing && 'text-primary'
        )}
      >
        {isProcessing ? 'Arbeitet gerade' : isConnected ? 'Verbunden' : 'Nicht verbunden'}
      </span>
      {errorMessage ? (
        <span className="truncate text-destructive">Fehler: {errorMessage}</span>
      ) : null}
    </footer>
  );
}
