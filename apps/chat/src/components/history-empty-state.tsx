import { Button } from '@/components/ui/button';

interface HistoryEmptyStateProps {
  mode: 'no-sessions' | 'no-results';
  onCreateSession: () => void;
}

export function HistoryEmptyState({ mode, onCreateSession }: HistoryEmptyStateProps) {
  if (mode === 'no-results') {
    return (
      <div className="rounded-md border border-dashed border-muted p-4 text-center">
        <p className="text-sm font-medium text-foreground">Kein Chat passt zu deiner Suche.</p>
        <p className="mt-1 text-xs text-muted-foreground">
          Tipp: Nimm weniger Suchwörter oder setze die Filter zurück.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-md border border-dashed border-muted p-4 text-center">
      <p className="text-sm font-medium text-foreground">Noch kein Chat vorhanden.</p>
      <p className="mt-1 text-xs text-muted-foreground">
        Starte mit einem neuen Chat, dann erscheint er hier im Verlauf.
      </p>
      <Button
        type="button"
        variant="outline"
        className="mt-3 h-8 border-muted text-xs"
        onClick={onCreateSession}
      >
        Neuen Chat starten
      </Button>
    </div>
  );
}
