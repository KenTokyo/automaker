/**
 * Favorite Agent Buttons
 *
 * Renders compact toggle buttons for favorited agent prompts next to the Send button.
 * Clicking a button toggles the agent's selection state (same as the checkbox in the dropdown).
 * Favorites are persisted in localStorage via the agent-prompts-store.
 */

import { memo } from 'react';
import { cn } from '@/lib/utils';
import { useAgentPromptsStore } from '@/store/agent-prompts-store';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface FavoriteAgentButtonsProps {
  disabled?: boolean;
}

export const FavoriteAgentButtons = memo(function FavoriteAgentButtons({
  disabled,
}: FavoriteAgentButtonsProps) {
  const { getFavoritePrompts, togglePromptSelection, isSelected } = useAgentPromptsStore();

  const favorites = getFavoritePrompts();

  if (favorites.length === 0) return null;

  return (
    <TooltipProvider delayDuration={300}>
      <div className="flex items-center gap-0.5 shrink-0">
        {favorites.map((prompt) => {
          const active = isSelected(prompt.id, prompt.scope);
          return (
            <Tooltip key={`${prompt.scope}:${prompt.id}`}>
              <TooltipTrigger asChild>
                <button
                  type="button"
                  disabled={disabled}
                  onClick={() => togglePromptSelection(prompt.id, prompt.scope)}
                  className={cn(
                    'inline-flex items-center h-6 px-1.5 rounded text-[10px] font-medium leading-none',
                    'border transition-all duration-150 max-w-[72px] truncate',
                    'focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring',
                    'disabled:opacity-40 disabled:pointer-events-none',
                    active
                      ? 'bg-primary/15 text-primary border-primary/40 shadow-[0_0_6px_rgba(var(--primary-rgb,99,102,241),0.15)]'
                      : 'bg-muted/40 text-muted-foreground border-border/60 hover:bg-muted/70 hover:text-foreground hover:border-border'
                  )}
                >
                  <span className="truncate">{prompt.name}</span>
                </button>
              </TooltipTrigger>
              <TooltipContent side="top" className="max-w-xs">
                <p className="text-xs font-medium">{prompt.name}</p>
                <p className="text-[11px] text-muted-foreground mt-0.5">
                  {active ? 'Active' : 'Inactive'} &middot;{' '}
                  {prompt.scope === 'global' ? 'Global' : 'Project'}
                </p>
                <p className="text-[11px] text-muted-foreground mt-1 line-clamp-2 whitespace-pre-wrap">
                  {prompt.prompt.substring(0, 120)}
                  {prompt.prompt.length > 120 ? '...' : ''}
                </p>
              </TooltipContent>
            </Tooltip>
          );
        })}
      </div>
    </TooltipProvider>
  );
});
