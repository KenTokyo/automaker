import { AlertCircle, Brain, ChevronDown, ChevronRight, CircleCheckBig, Hand } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { ThinkingBlockData, ThinkingStatus } from '../services/thinking-utils';
import { ThinkingTimer } from './thinking-timer';

interface ThinkingBlockProps {
  block: ThinkingBlockData;
  open: boolean;
  onToggle: () => void;
}

function getStatusLabel(status: ThinkingStatus): string {
  if (status === 'start' || status === 'running') return 'Denkt nach...';
  if (status === 'done') return 'Denken abgeschlossen';
  if (status === 'aborted') return 'Denkphase gestoppt';
  return 'Denkphase mit Fehler beendet';
}

function getStatusClass(status: ThinkingStatus): string {
  if (status === 'start' || status === 'running') {
    return 'border-amber-400/40 bg-amber-500/10 text-amber-700';
  }
  if (status === 'done') {
    return 'border-emerald-400/40 bg-emerald-500/10 text-emerald-700';
  }
  if (status === 'aborted') {
    return 'border-slate-400/40 bg-slate-500/10 text-slate-700';
  }
  return 'border-red-400/40 bg-red-500/10 text-red-700';
}

function getDetailText(block: ThinkingBlockData): string {
  if (typeof block.detailText === 'string' && block.detailText.trim().length > 0) {
    return block.detailText;
  }

  if (block.status === 'aborted') {
    return 'Der Lauf wurde gestoppt. Du kannst direkt eine neue Frage senden.';
  }

  if (block.status === 'error') {
    return 'Die Denkphase hatte einen Fehler. Die Antwort kann unvollständig sein.';
  }

  return 'Die Antwort wird gerade vorbereitet. Du kannst warten oder den Lauf stoppen.';
}

export function ThinkingBlock({ block, open, onToggle }: ThinkingBlockProps) {
  const isRunning = block.status === 'start' || block.status === 'running';

  return (
    <div
      className={cn(
        'max-w-4xl rounded-xl border px-3 py-2',
        block.status === 'error'
          ? 'border-red-400/40 bg-red-500/5'
          : block.status === 'aborted'
            ? 'border-slate-400/40 bg-slate-500/5'
            : 'border-muted bg-muted/20'
      )}
    >
      <button type="button" onClick={onToggle} className="flex w-full items-center gap-2 text-left text-xs">
        {open ? (
          <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
        ) : (
          <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
        )}
        <Brain className={cn('h-3.5 w-3.5 text-muted-foreground', isRunning && 'animate-pulse')} />
        <span className="font-medium text-foreground">{getStatusLabel(block.status)}</span>
        <span className={cn('rounded-full border px-2 py-0.5 text-[11px] font-medium', getStatusClass(block.status))}>
          {block.status === 'done' ? (
            <CircleCheckBig className="mr-1 inline h-3 w-3" />
          ) : block.status === 'aborted' ? (
            <Hand className="mr-1 inline h-3 w-3" />
          ) : block.status === 'error' ? (
            <AlertCircle className="mr-1 inline h-3 w-3" />
          ) : null}
          {block.status === 'start' || block.status === 'running'
            ? 'läuft'
            : block.status === 'done'
              ? 'fertig'
              : block.status === 'aborted'
                ? 'gestoppt'
                : 'Fehler'}
        </span>
        <ThinkingTimer block={block} />
      </button>

      {open ? (
        <div className="mt-2 space-y-2">
          {block.errorMessage ? (
            <div className="rounded border border-red-400/40 bg-red-500/5 px-2 py-1 text-xs text-red-800">
              <span className="font-medium">Fehler: </span>
              {block.errorMessage}
            </div>
          ) : null}
          <p className="whitespace-pre-wrap rounded-lg border border-muted bg-card/70 p-2 text-xs text-muted-foreground">
            {getDetailText(block)}
          </p>
          {block.status === 'error' ? (
            <div className="rounded border border-red-400/40 bg-red-500/5 px-2 py-1 text-xs text-red-800">
              <span className="font-medium">Was bedeutet das für mich? </span>
              Die Antwort kann unvollständig sein. Du kannst die Frage neu senden.
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
