import { Brain, Cog } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';

export type ThinkingIntensity = 'low' | 'medium' | 'high';

interface ModeTogglesProps {
  thinkingEnabled: boolean;
  thinkingIntensity: ThinkingIntensity;
  onThinkingEnabledChange: (enabled: boolean) => void;
  onThinkingIntensityChange: (intensity: ThinkingIntensity) => void;
  orchestratorEnabled: boolean;
  orchestratorIteration: number;
  orchestratorRunId: null | string;
  onOrchestratorEnabledChange: (enabled: boolean) => void;
  disabled?: boolean;
}

const THINKING_LABELS: Record<ThinkingIntensity, string> = {
  low: 'Niedrig',
  medium: 'Mittel',
  high: 'Hoch',
};

export function ModeToggles({
  thinkingEnabled,
  thinkingIntensity,
  onThinkingEnabledChange,
  onThinkingIntensityChange,
  orchestratorEnabled,
  orchestratorIteration,
  orchestratorRunId,
  onOrchestratorEnabledChange,
  disabled = false,
}: ModeTogglesProps) {
  const runIdLabel = orchestratorRunId ? orchestratorRunId.slice(0, 10) : null;

  return (
    <div className="flex min-w-max items-center gap-1.5">
      <Button
        type="button"
        variant="outline"
        size="sm"
        disabled={disabled}
        onClick={() => onThinkingEnabledChange(!thinkingEnabled)}
        className={cn(
          'h-9 gap-1.5 border-muted px-2.5 text-xs',
          thinkingEnabled && 'border-primary/40 bg-primary/10 text-primary'
        )}
      >
        <Brain className="h-3.5 w-3.5" />
        Thinking
      </Button>

      {thinkingEnabled && (
        <Select
          value={thinkingIntensity}
          onValueChange={(value) => onThinkingIntensityChange(value as ThinkingIntensity)}
          disabled={disabled}
        >
          <SelectTrigger className="h-9 w-[112px] border-muted px-2 text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="low">{THINKING_LABELS.low}</SelectItem>
            <SelectItem value="medium">{THINKING_LABELS.medium}</SelectItem>
            <SelectItem value="high">{THINKING_LABELS.high}</SelectItem>
          </SelectContent>
        </Select>
      )}

      <Button
        type="button"
        variant="outline"
        size="sm"
        disabled={disabled}
        onClick={() => onOrchestratorEnabledChange(!orchestratorEnabled)}
        className={cn(
          'h-9 gap-1.5 border-muted px-2.5 text-xs',
          orchestratorEnabled && 'border-primary/40 bg-primary/10 text-primary'
        )}
      >
        <Cog className="h-3.5 w-3.5" />
        Orchestrator
        {orchestratorEnabled && (
          <span className="rounded-full bg-background/80 px-1.5 py-0.5 text-[10px] font-medium">
            {orchestratorIteration}
          </span>
        )}
      </Button>

      {orchestratorEnabled && runIdLabel && (
        <span
          className="hidden rounded-full border border-muted px-2 py-1 text-[10px] text-muted-foreground sm:inline-flex"
          title={orchestratorRunId ?? undefined}
        >
          Run {runIdLabel}
        </span>
      )}
    </div>
  );
}
