import { memo, useState } from 'react';
import {
  Wrench,
  ChevronDown,
  FileSearch,
  Terminal,
  FileEdit,
  FolderSearch,
  Globe,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { ToolUse } from '@/types/electron';

interface ToolCallGroupProps {
  toolCalls: ToolUse[];
}

/** Map tool names to descriptive icons */
function getToolIcon(toolName: string) {
  const name = toolName.toLowerCase();
  if (name === 'glob' || name === 'find') return FolderSearch;
  if (name === 'grep' || name === 'search' || name === 'read') return FileSearch;
  if (name === 'bash' || name === 'execute' || name === 'run') return Terminal;
  if (name === 'edit' || name === 'write' || name === 'notebookedit') return FileEdit;
  if (name === 'webfetch' || name === 'websearch') return Globe;
  return Wrench;
}

/** Extract a short summary from tool input for display */
function getToolSummary(toolName: string, input: unknown): string | null {
  if (!input || typeof input !== 'object') return null;
  const obj = input as Record<string, unknown>;

  // Common patterns across tool types
  if (obj.file_path && typeof obj.file_path === 'string') {
    // Show just filename, not full path
    const parts = (obj.file_path as string).replace(/\\/g, '/').split('/');
    return parts[parts.length - 1];
  }
  if (obj.pattern && typeof obj.pattern === 'string') return obj.pattern as string;
  if (obj.command && typeof obj.command === 'string') {
    const cmd = obj.command as string;
    return cmd.length > 60 ? cmd.slice(0, 57) + '...' : cmd;
  }
  if (obj.query && typeof obj.query === 'string') {
    const q = obj.query as string;
    return q.length > 60 ? q.slice(0, 57) + '...' : q;
  }
  if (obj.url && typeof obj.url === 'string') {
    const u = obj.url as string;
    return u.length > 60 ? u.slice(0, 57) + '...' : u;
  }
  if (obj.path && typeof obj.path === 'string') {
    const parts = (obj.path as string).replace(/\\/g, '/').split('/');
    return parts[parts.length - 1];
  }
  return null;
}

export const ToolCallGroup = memo(function ToolCallGroup({ toolCalls }: ToolCallGroupProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  if (!toolCalls || toolCalls.length === 0) return null;

  return (
    <div className="max-w-4xl ml-13">
      <button
        type="button"
        onClick={() => setIsExpanded((prev) => !prev)}
        className={cn(
          'flex items-center gap-2 w-full px-3 py-2 rounded-lg text-xs',
          'bg-muted/50 hover:bg-muted/80 border border-border/50',
          'transition-colors cursor-pointer select-none',
          'text-muted-foreground hover:text-foreground'
        )}
      >
        <Wrench className="w-3.5 h-3.5 shrink-0" />
        <span className="font-medium">
          {toolCalls.length} tool call{toolCalls.length !== 1 ? 's' : ''}
        </span>
        <ChevronDown
          className={cn(
            'w-3.5 h-3.5 ml-auto shrink-0 transition-transform duration-200',
            isExpanded && 'rotate-180'
          )}
        />
      </button>

      {isExpanded && (
        <div className="mt-1 rounded-lg border border-border/50 bg-muted/30 overflow-hidden">
          {toolCalls.map((tool, index) => {
            const Icon = getToolIcon(tool.name);
            const summary = getToolSummary(tool.name, tool.input);

            return (
              <div
                key={`${tool.name}-${index}`}
                className={cn(
                  'flex items-center gap-2 px-3 py-1.5 text-xs',
                  index < toolCalls.length - 1 && 'border-b border-border/30'
                )}
              >
                <Icon className="w-3 h-3 shrink-0 text-muted-foreground" />
                <span className="font-mono font-medium text-foreground/80">{tool.name}</span>
                {summary && (
                  <span className="text-muted-foreground truncate ml-1" title={summary}>
                    {summary}
                  </span>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
});
