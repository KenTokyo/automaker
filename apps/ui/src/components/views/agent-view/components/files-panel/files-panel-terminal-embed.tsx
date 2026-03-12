/**
 * FilesPanelTerminalEmbed - Lazy-loaded wrapper for the TerminalView
 * embedded inside the files panel split area.
 *
 * Includes a compact action bar and an error boundary so crashes
 * show a friendly message instead of breaking the files panel.
 */

import { lazy, memo, Suspense, useCallback, Component } from 'react';
import type { ErrorInfo, ReactNode } from 'react';
import { AlertCircle, RefreshCw } from 'lucide-react';
import { Spinner } from '@/components/ui/spinner';
import { useAppStore } from '@/store/app-store';
import { FilesPanelTerminalActions } from './files-panel-terminal-actions';
import type { RightPanelMode } from '@/store/types/ui-types';

const LazyTerminalView = lazy(async () => {
  const module = await import('@/components/views/terminal-view');
  return { default: module.TerminalView };
});

/** Lightweight error boundary for the embedded terminal. */
class EmbeddedTerminalErrorBoundary extends Component<
  { children: ReactNode; onReset?: () => void },
  { hasError: boolean; message: string }
> {
  constructor(props: { children: ReactNode; onReset?: () => void }) {
    super(props);
    this.state = { hasError: false, message: '' };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, message: error.message || 'Unbekannter Fehler' };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('[EmbeddedTerminal] crash:', error, info.componentStack);
  }

  handleReset = () => {
    this.setState({ hasError: false, message: '' });
    this.props.onReset?.();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex h-full flex-col items-center justify-center gap-2 bg-background px-4 text-center">
          <AlertCircle className="h-5 w-5 text-destructive" />
          <p className="text-xs font-medium text-foreground">Terminal abgestuerzt</p>
          <p className="max-w-[200px] text-[11px] text-muted-foreground">{this.state.message}</p>
          <button
            type="button"
            className="mt-1 flex items-center gap-1 rounded px-2 py-1 text-[11px] text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
            onClick={this.handleReset}
          >
            <RefreshCw className="h-3 w-3" />
            Neu starten
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

export const FilesPanelTerminalEmbed = memo(function FilesPanelTerminalEmbed() {
  const setRightPanelMode = useAppStore((s) => s.setRightPanelMode);

  const handleOpenInTab = useCallback(() => {
    setRightPanelMode('terminal' as RightPanelMode);
  }, [setRightPanelMode]);

  return (
    <div className="flex h-full w-full flex-col overflow-hidden">
      <FilesPanelTerminalActions onOpenInTab={handleOpenInTab} />
      <div className="min-h-0 flex-1 overflow-hidden">
        <EmbeddedTerminalErrorBoundary>
          <Suspense
            fallback={
              <div className="flex h-full items-center justify-center bg-background">
                <Spinner size="sm" />
                <span className="ml-2 text-xs text-muted-foreground">Terminal wird geladen...</span>
              </div>
            }
          >
            <LazyTerminalView />
          </Suspense>
        </EmbeddedTerminalErrorBoundary>
      </div>
    </div>
  );
});
