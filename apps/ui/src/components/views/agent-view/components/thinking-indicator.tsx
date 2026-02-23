import { Bot } from 'lucide-react';
import { Spinner } from '@/components/ui/spinner';

export function ThinkingIndicator() {
  return (
    <div className="flex gap-4 max-w-4xl">
      <div className="w-9 h-9 rounded-xl bg-secondary ring-1 ring-border flex items-center justify-center shrink-0 shadow-sm">
        <Bot className="w-4 h-4 text-foreground/80" />
      </div>
      <div className="bg-card border border-border rounded-2xl px-4 py-3 shadow-sm">
        <div className="flex items-center gap-3">
          <Spinner size="sm" />
          <span className="text-sm text-muted-foreground">Thinking...</span>
        </div>
      </div>
    </div>
  );
}
