import {
  ChevronDown,
  ChevronRight,
  FileSearch,
  FolderSearch,
  Globe,
  Terminal,
  Wrench,
} from 'lucide-react';
import { useMemo, useState } from 'react';
import type { ToolUse } from '@/types/electron';
import { cn } from '@/lib/utils';

interface MessageToolUseProps {
  toolCalls: ToolUse[];
  durationSeconds?: number;
}

function getToolIcon(name: string) {
  const normalized = name.toLowerCase();
  if (normalized === 'glob' || normalized === 'find') return FolderSearch;
  if (normalized === 'grep' || normalized === 'search' || normalized === 'read') return FileSearch;
  if (normalized === 'bash' || normalized === 'run' || normalized === 'execute') return Terminal;
  if (normalized === 'websearch' || normalized === 'webfetch') return Globe;
  return Wrench;
}

function getShortSummary(input: unknown): string {
  if (!input || typeof input !== 'object') {
    return 'Keine Details';
  }

  const value = input as Record<string, unknown>;
  const candidate =
    (typeof value.command === 'string' && value.command) ||
    (typeof value.pattern === 'string' && value.pattern) ||
    (typeof value.path === 'string' && value.path) ||
    (typeof value.url === 'string' && value.url) ||
    (typeof value.q === 'string' && value.q) ||
    '';

  if (!candidate) {
    return 'Details anzeigen';
  }

  return candidate.length > 90 ? `${candidate.slice(0, 87)}...` : candidate;
}

function formatDuration(seconds?: number): string {
  if (!Number.isFinite(seconds) || !seconds || seconds < 0) {
    return '';
  }
  return ` · ${seconds.toFixed(1)}s`;
}

export function MessageToolUse({ toolCalls, durationSeconds }: MessageToolUseProps) {
  const [open, setOpen] = useState(false);

  const totalLabel = useMemo(() => {
    if (toolCalls.length === 1) {
      return '1 Tool-Aufruf';
    }
    return `${toolCalls.length} Tool-Aufrufe`;
  }, [toolCalls.length]);

  if (toolCalls.length === 0) {
    return null;
  }

  return (
    <div className="max-w-4xl rounded-xl border border-muted bg-muted/20 px-3 py-2">
      <button
        type="button"
        className="flex w-full items-center gap-2 text-left text-xs text-muted-foreground"
        onClick={() => setOpen((value) => !value)}
      >
        {open ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
        <Wrench className="h-3.5 w-3.5" />
        <span className="font-medium text-foreground">
          {totalLabel}
          {formatDuration(durationSeconds)}
        </span>
      </button>

      {open && (
        <div className="mt-2 space-y-2">
          {toolCalls.map((tool, index) => {
            const ToolIcon = getToolIcon(tool.name);
            const prettyInput = JSON.stringify(tool.input, null, 2) ?? '';
            return (
              <div
                key={`${tool.name}-${index}`}
                className={cn(
                  'rounded-lg border border-muted bg-card/70 p-2',
                  index < toolCalls.length - 1 && 'mb-2'
                )}
              >
                <div className="mb-1 flex items-center gap-2">
                  <ToolIcon className="h-3.5 w-3.5 text-muted-foreground" />
                  <span className="font-mono text-xs font-medium text-foreground">{tool.name}</span>
                </div>
                <p className="mb-2 text-xs text-muted-foreground">{getShortSummary(tool.input)}</p>
                <pre className="max-h-48 overflow-auto rounded border border-muted bg-muted/30 p-2 text-[11px] text-muted-foreground">
                  {prettyInput}
                </pre>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
