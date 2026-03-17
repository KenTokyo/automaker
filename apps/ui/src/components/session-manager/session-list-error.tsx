/**
 * Session List Error
 *
 * Fehlermeldung für die Session-Liste wenn die Query fehlschlägt.
 * Zeigt eine klare Meldung mit Retry-Button.
 */

import { AlertTriangle, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { getErrorMessage } from '@/lib/utils';

interface SessionListErrorProps {
  error: Error | null;
  onRetry: () => void;
}

/**
 * Zeigt eine kompakte Fehlermeldung an wenn Sessions nicht geladen werden konnten.
 * Der User kann über "Erneut laden" die Query neu starten.
 */
export function SessionListError({ error, onRetry }: SessionListErrorProps) {
  return (
    <div
      className="flex flex-col items-center gap-3 rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-6 text-center"
      data-testid="session-list-error"
    >
      <AlertTriangle className="h-8 w-8 text-destructive/60" />

      <div className="space-y-1">
        <p className="text-sm font-medium text-foreground">Sessions konnten nicht geladen werden</p>
        {error && <p className="text-xs text-muted-foreground">{getErrorMessage(error)}</p>}
      </div>

      <Button size="sm" variant="outline" onClick={onRetry} className="gap-1.5">
        <RefreshCw className="h-3.5 w-3.5" />
        Erneut laden
      </Button>
    </div>
  );
}
