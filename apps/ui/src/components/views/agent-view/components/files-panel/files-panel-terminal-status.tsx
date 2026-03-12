/**
 * FilesPanelTerminalStatus - Status overlay shown when the embedded terminal
 * encounters an error or is unavailable.
 *
 * Displays clear, simple messages with a suggested next action.
 */

import { memo } from 'react';
import { AlertCircle, ExternalLink, RefreshCw, WifiOff } from 'lucide-react';

export type TerminalStatusKind = 'error' | 'disconnected';

interface FilesPanelTerminalStatusProps {
  kind: TerminalStatusKind;
  message?: string;
  onRetry?: () => void;
  onOpenInTab?: () => void;
}

export const FilesPanelTerminalStatus = memo(function FilesPanelTerminalStatus({
  kind,
  message,
  onRetry,
  onOpenInTab,
}: FilesPanelTerminalStatusProps) {
  const icon =
    kind === 'disconnected' ? (
      <WifiOff className="h-5 w-5 text-muted-foreground" />
    ) : (
      <AlertCircle className="h-5 w-5 text-destructive" />
    );

  const title =
    kind === 'disconnected'
      ? 'Verbindung unterbrochen'
      : 'Terminal nicht verfuegbar';

  const description =
    message ??
    (kind === 'disconnected'
      ? 'Die Verbindung zum Terminal wurde getrennt.'
      : 'Das Terminal konnte nicht gestartet werden.');

  return (
    <div className="flex h-full flex-col items-center justify-center gap-3 bg-background px-4 text-center">
      {icon}
      <p className="text-xs font-medium text-foreground">{title}</p>
      <p className="max-w-[220px] text-[11px] text-muted-foreground leading-relaxed">
        {description}
      </p>

      <div className="flex items-center gap-2 mt-1">
        {onRetry && (
          <button
            type="button"
            className="flex items-center gap-1 rounded px-2 py-1 text-[11px] text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
            onClick={onRetry}
          >
            <RefreshCw className="h-3 w-3" />
            Neu verbinden
          </button>
        )}
        {onOpenInTab && (
          <button
            type="button"
            className="flex items-center gap-1 rounded px-2 py-1 text-[11px] text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
            onClick={onOpenInTab}
          >
            <ExternalLink className="h-3 w-3" />
            Im grossen Terminal oeffnen
          </button>
        )}
      </div>
    </div>
  );
});
