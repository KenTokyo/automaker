/**
 * HistoryViewerPanel - Slide-over panel for viewing history markdown files.
 *
 * Opens from the right side when a history file link is clicked in a
 * completed task card. Renders the markdown content using the existing
 * Markdown component.
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { AlertCircle, Loader2, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Markdown } from '@/components/ui/markdown';
import { apiFetch } from '@/lib/api-fetch';
import { cn } from '@/lib/utils';

interface HistoryViewerPanelProps {
  filePath: string | null;
  projectPath: string;
  onClose: () => void;
}

interface FileState {
  content: string | null;
  fileName: string | null;
  loading: boolean;
  error: string | null;
}

export function HistoryViewerPanel({ filePath, projectPath, onClose }: HistoryViewerPanelProps) {
  const [state, setState] = useState<FileState>({
    content: null,
    fileName: null,
    loading: false,
    error: null,
  });
  const abortRef = useRef<AbortController | null>(null);

  const fetchContent = useCallback(
    async (file: string) => {
      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;

      setState({ content: null, fileName: null, loading: true, error: null });

      try {
        const params = new URLSearchParams({
          projectPath,
          file,
        });
        const response = await apiFetch(
          `/api/completed-tasks/history-file?${params.toString()}`,
          'GET',
          { signal: controller.signal }
        );

        if (!response.ok) {
          const data = (await response.json().catch(() => ({}))) as { error?: string };
          throw new Error(data.error ?? `Server error: ${response.status}`);
        }

        const data = (await response.json()) as { content: string; fileName: string };
        if (!controller.signal.aborted) {
          setState({
            content: data.content,
            fileName: data.fileName,
            loading: false,
            error: null,
          });
        }
      } catch (err: unknown) {
        if (err instanceof DOMException && err.name === 'AbortError') return;
        const message = err instanceof Error ? err.message : 'Unbekannter Fehler';
        if (!controller.signal.aborted) {
          setState({ content: null, fileName: null, loading: false, error: message });
        }
      }
    },
    [projectPath]
  );

  useEffect(() => {
    if (filePath) {
      void fetchContent(filePath);
    }
    return () => {
      abortRef.current?.abort();
    };
  }, [filePath, fetchContent]);

  // Close on Escape
  useEffect(() => {
    if (!filePath) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [filePath, onClose]);

  if (!filePath) return null;

  return (
    <>
      {/* Overlay */}
      <div className="fixed inset-0 z-40 bg-black/20" onClick={onClose} />

      {/* Panel */}
      <div
        className={cn(
          'fixed right-0 top-0 z-50 flex h-full w-[480px] max-w-[90vw] flex-col',
          'border-l border-border bg-background shadow-xl',
          'animate-in slide-in-from-right duration-200'
        )}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <span className="min-w-0 truncate text-sm font-medium">
            {state.fileName ?? filePath.split('/').pop() ?? 'History'}
          </span>
          <Button
            variant="ghost"
            size="sm"
            className="h-6 w-6 shrink-0 p-0"
            onClick={onClose}
            title="Schließen"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* Content */}
        <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4">
          {state.loading && (
            <div className="flex flex-col items-center justify-center gap-3 py-12">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              <p className="text-xs text-muted-foreground">Datei wird geladen…</p>
            </div>
          )}

          {state.error && (
            <div className="flex flex-col items-center justify-center gap-3 py-12 text-center">
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-destructive/10">
                <AlertCircle className="h-4 w-4 text-destructive" />
              </div>
              <p className="max-w-[280px] text-xs text-muted-foreground">{state.error}</p>
              <Button variant="outline" size="sm" onClick={onClose} className="border-muted">
                Schließen
              </Button>
            </div>
          )}

          {state.content !== null && <Markdown>{state.content}</Markdown>}
        </div>
      </div>
    </>
  );
}
