import React from 'react';
import { Loader2, Bot, Clock } from 'lucide-react';
import type { ActiveSubAgent } from '@/hooks/use-electron-agent';

interface SubAgentIndicatorProps {
  activeSubAgents: ActiveSubAgent[];
}

export function SubAgentIndicator({ activeSubAgents }: SubAgentIndicatorProps) {
  if (activeSubAgents.length === 0) return null;

  return (
    <div className="flex flex-col gap-1.5 px-3 py-2 mx-3 mb-2 rounded-lg bg-amber-500/5 border border-amber-500/20">
      <div className="flex items-center gap-1.5 text-xs font-medium text-amber-400/80">
        <Bot className="h-3 w-3" />
        <span>
          {activeSubAgents.length} Sub-Agent{activeSubAgents.length !== 1 ? 's' : ''} aktiv
        </span>
      </div>
      {activeSubAgents.map((agent) => (
        <div
          key={agent.agentId}
          className="flex items-center gap-2 text-xs text-muted-foreground pl-1"
        >
          <Loader2 className="h-3 w-3 animate-spin text-amber-400/60 shrink-0" />
          <span className="font-medium text-foreground/80 truncate">{agent.agentType}</span>
          {agent.description && (
            <span className="truncate text-muted-foreground/70">{agent.description}</span>
          )}
          <div className="flex items-center gap-1 ml-auto shrink-0 text-muted-foreground/50">
            <Clock className="h-2.5 w-2.5" />
            <span>{formatElapsed(agent.elapsedSeconds)}</span>
          </div>
          {agent.runInBackground && (
            <span className="text-[10px] px-1 py-0.5 rounded bg-blue-500/10 text-blue-400/70 shrink-0">
              BG
            </span>
          )}
        </div>
      ))}
    </div>
  );
}

function formatElapsed(seconds: number): string {
  if (seconds < 60) return `${Math.round(seconds)}s`;
  const mins = Math.floor(seconds / 60);
  const secs = Math.round(seconds % 60);
  return `${mins}m ${secs}s`;
}
