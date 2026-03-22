import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface DashboardLoadingProps {
  phase: string;
  onCancel?: () => void;
}

export function DashboardLoading({ phase, onCancel }: DashboardLoadingProps) {
  return (
    <div
      className="flex flex-col items-center justify-center gap-4 px-6 py-12 text-center"
      aria-live="polite"
    >
      <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      <div className="space-y-1">
        <p className="text-sm font-medium">Übersicht wird erstellt…</p>
        {phase ? <p className="animate-pulse text-xs text-muted-foreground">{phase}</p> : null}
      </div>
      {onCancel ? (
        <Button variant="outline" size="sm" onClick={onCancel} className="gap-1.5">
          Abbrechen
        </Button>
      ) : null}
    </div>
  );
}
