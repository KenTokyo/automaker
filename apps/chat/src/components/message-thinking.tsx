import { Brain, ChevronDown, ChevronRight } from 'lucide-react';
import { useState } from 'react';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { cn } from '@/lib/utils';

interface MessageThinkingProps {
  elapsedSeconds: number;
  thinkingText?: string;
  isComplete?: boolean;
}

function formatElapsed(seconds: number): string {
  if (seconds < 60) {
    return `${seconds}s`;
  }

  const minutes = Math.floor(seconds / 60);
  const rest = seconds % 60;
  return `${minutes}:${String(rest).padStart(2, '0')}`;
}

export function MessageThinking({
  elapsedSeconds,
  thinkingText,
  isComplete = false,
}: MessageThinkingProps) {
  const [open, setOpen] = useState(false);

  return (
    <div className="max-w-4xl rounded-xl border border-muted bg-card/70 px-3 py-2">
      <Collapsible open={open} onOpenChange={setOpen}>
        <CollapsibleTrigger asChild>
          <button
            type="button"
            className="flex w-full items-center gap-2 text-left text-xs text-muted-foreground"
          >
            {open ? (
              <ChevronDown className="h-3.5 w-3.5" />
            ) : (
              <ChevronRight className="h-3.5 w-3.5" />
            )}
            <Brain className={cn('h-3.5 w-3.5', !isComplete && 'animate-pulse')} />
            <span className="font-medium">
              {isComplete ? 'Denken beendet' : 'Denkt nach'} ({formatElapsed(elapsedSeconds)})
            </span>
          </button>
        </CollapsibleTrigger>

        <CollapsibleContent className="pt-2">
          <p className="whitespace-pre-wrap rounded-lg border border-muted bg-muted/30 p-2 text-xs text-muted-foreground">
            {thinkingText?.trim() ||
              'Die Antwort wird gerade vorbereitet. Du kannst warten oder den Lauf stoppen.'}
          </p>
        </CollapsibleContent>
      </Collapsible>
    </div>
  );
}
