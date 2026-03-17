import React, { Component, type ErrorInfo } from 'react';
import { createLogger } from '@automaker/utils/logger';
import { AlertTriangle, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

const logger = createLogger('SessionItemErrorBoundary');

interface Props {
  children: React.ReactNode;
  sessionId: string;
  sessionName?: string;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

/**
 * Error Boundary für einzelne Session-Einträge in der Session-Liste.
 *
 * Wenn ein einzelner Session-Eintrag beim Rendern crasht (z.B. durch kaputte Daten),
 * fängt dieses Boundary den Fehler ab und zeigt eine kleine Fallback-Meldung.
 * Alle anderen Sessions bleiben davon unberührt und funktionieren weiter.
 */
export class SessionItemErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    logger.error('Session-Eintrag konnte nicht angezeigt werden:', {
      sessionId: this.props.sessionId,
      sessionName: this.props.sessionName,
      error: error.message,
      stack: error.stack,
      componentStack: errorInfo.componentStack,
    });
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      return (
        <div
          className={cn(
            'group relative rounded-lg border border-destructive/30 bg-destructive/5',
            'px-3 py-2 text-xs'
          )}
          data-testid={`session-item-error-${this.props.sessionId}`}
        >
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-3.5 w-3.5 shrink-0 text-destructive/70" />
            <span className="flex-1 truncate text-muted-foreground">
              Session konnte nicht angezeigt werden
            </span>
            <Button
              size="sm"
              variant="ghost"
              onClick={this.handleRetry}
              className="h-6 px-1.5 text-xs"
              title="Erneut versuchen"
            >
              <RefreshCw className="h-3 w-3" />
            </Button>
          </div>

          {this.props.sessionName && (
            <p className="mt-0.5 truncate text-muted-foreground/60">{this.props.sessionName}</p>
          )}
        </div>
      );
    }

    return this.props.children;
  }
}
