import type { PhaseModelEntry } from '@automaker/types';
import { Paperclip, Send, Square } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { ModeToggles, type ThinkingIntensity } from './mode-toggles';
import { ModelSelectorCompact } from './model-selector-compact';

interface ChatInputToolbarProps {
  modelSelection: PhaseModelEntry;
  onModelSelect: (entry: PhaseModelEntry) => void;
  thinkingEnabled: boolean;
  thinkingIntensity: ThinkingIntensity;
  onThinkingEnabledChange: (enabled: boolean) => void;
  onThinkingIntensityChange: (intensity: ThinkingIntensity) => void;
  orchestratorEnabled: boolean;
  orchestratorIteration: number;
  orchestratorRunId: null | string;
  onOrchestratorEnabledChange: (enabled: boolean) => void;
  hasFiles: boolean;
  canSend: boolean;
  isProcessing: boolean;
  isConnected: boolean;
  isStopping: boolean;
  onOpenFileDialog: () => void;
  onSend: () => void;
  onStop: () => void;
}

export function ChatInputToolbar({
  modelSelection,
  onModelSelect,
  thinkingEnabled,
  thinkingIntensity,
  onThinkingEnabledChange,
  onThinkingIntensityChange,
  orchestratorEnabled,
  orchestratorIteration,
  orchestratorRunId,
  onOrchestratorEnabledChange,
  hasFiles,
  canSend,
  isProcessing,
  isConnected,
  isStopping,
  onOpenFileDialog,
  onSend,
  onStop,
}: ChatInputToolbarProps) {
  return (
    <div className="overflow-x-auto pb-0.5 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
      <div className="flex min-w-max items-center gap-1.5">
        <ModelSelectorCompact
          value={modelSelection}
          onChange={onModelSelect}
          disabled={!isConnected}
        />

        <ModeToggles
          thinkingEnabled={thinkingEnabled}
          thinkingIntensity={thinkingIntensity}
          onThinkingEnabledChange={onThinkingEnabledChange}
          onThinkingIntensityChange={onThinkingIntensityChange}
          orchestratorEnabled={orchestratorEnabled}
          orchestratorIteration={orchestratorIteration}
          orchestratorRunId={orchestratorRunId}
          onOrchestratorEnabledChange={onOrchestratorEnabledChange}
          disabled={!isConnected}
        />

        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={!isConnected}
          onClick={onOpenFileDialog}
          className={cn(
            'h-9 gap-1.5 border-muted px-2.5 text-xs',
            hasFiles && 'border-primary/40 bg-primary/10 text-primary'
          )}
          title="Bilder oder Textdateien anhängen"
        >
          <Paperclip className="h-3.5 w-3.5" />
          Bilder
        </Button>

        <div className="mx-1 h-5 w-px bg-muted" />

        {isProcessing && (
          <Button
            type="button"
            variant="destructive"
            size="sm"
            onClick={onStop}
            disabled={!isConnected || isStopping}
            className="h-9 gap-1.5 px-2.5 text-xs"
            data-testid="stop-agent"
          >
            <Square className="h-3.5 w-3.5 fill-current" />
            {isStopping ? 'Stoppt...' : 'Stop'}
          </Button>
        )}

        <Button
          type="button"
          size="sm"
          onClick={onSend}
          disabled={!canSend}
          className="h-9 gap-1.5 px-2.5 text-xs"
          data-testid="send-message"
        >
          <Send className="h-3.5 w-3.5" />
          Senden
        </Button>
      </div>
    </div>
  );
}
