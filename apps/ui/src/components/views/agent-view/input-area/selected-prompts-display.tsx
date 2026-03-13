/**
 * Selected Prompts Display
 *
 * Shows the currently selected agent prompts as badges above the input area.
 * Users can click to remove individual prompts or view their content.
 */

import { X, Copy, Check, Globe, FolderOpen } from 'lucide-react';
import { memo, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import { useAgentPromptsStore, getPromptKey, type AgentPrompt } from '@/store/agent-prompts-store';

export const SelectedPromptsDisplay = memo(function SelectedPromptsDisplay() {
  const {
    globalPrompts,
    localPrompts,
    selectedPromptKeys,
    deselectPrompt,
    getSelectedPromptsText,
  } = useAgentPromptsStore();
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Get selected prompts from both arrays
  const allPrompts = [...globalPrompts, ...localPrompts];
  const selectedPrompts = allPrompts.filter((p) =>
    selectedPromptKeys.includes(getPromptKey(p.scope, p.id))
  );

  if (selectedPrompts.length === 0) {
    return null;
  }

  const handleCopy = async (prompt: AgentPrompt, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await navigator.clipboard.writeText(prompt.prompt);
      setCopiedId(getPromptKey(prompt.scope, prompt.id));
      setTimeout(() => setCopiedId(null), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  const handleCopyAll = async () => {
    try {
      const allText = getSelectedPromptsText();
      await navigator.clipboard.writeText(allText);
      setCopiedId('all');
      setTimeout(() => setCopiedId(null), 2000);
    } catch (err) {
      console.error('Failed to copy all:', err);
    }
  };

  return (
    <TooltipProvider>
      <div className="mb-3 flex max-h-28 flex-wrap items-center gap-2 overflow-y-auto rounded-lg border border-border/50 bg-muted/30 p-2 pr-1 scrollbar-styled">
        <span className="text-xs text-muted-foreground font-medium">Agent Prompts:</span>
        {selectedPrompts.map((prompt) => {
          const key = getPromptKey(prompt.scope, prompt.id);
          return (
            <Tooltip key={key}>
              <TooltipTrigger asChild>
                <Badge
                  variant="secondary"
                  className={cn(
                    'flex items-center gap-1.5 pr-1 cursor-default',
                    prompt.scope === 'global'
                      ? 'bg-blue-500/10 text-blue-600 border-blue-500/20 hover:bg-blue-500/15 dark:text-blue-400'
                      : 'bg-primary/10 text-primary border-primary/20 hover:bg-primary/15'
                  )}
                >
                  {prompt.scope === 'global' ? (
                    <Globe className="w-3 h-3 shrink-0" />
                  ) : (
                    <FolderOpen className="w-3 h-3 shrink-0" />
                  )}
                  <span className="max-w-32 truncate">{prompt.name}</span>
                  <div className="flex items-center">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-4 w-4 rounded-sm hover:bg-primary/20"
                      onClick={(e) => handleCopy(prompt, e)}
                      title="Copy prompt"
                    >
                      {copiedId === key ? (
                        <Check className="w-3 h-3" />
                      ) : (
                        <Copy className="w-3 h-3" />
                      )}
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-4 w-4 rounded-sm hover:bg-destructive/20 hover:text-destructive"
                      onClick={(e) => {
                        e.stopPropagation();
                        deselectPrompt(prompt.id, prompt.scope);
                      }}
                      title="Remove prompt"
                    >
                      <X className="w-3 h-3" />
                    </Button>
                  </div>
                </Badge>
              </TooltipTrigger>
              <TooltipContent side="top" className="max-w-xs">
                <div className="flex items-center gap-1.5 mb-1">
                  <p className="text-xs font-medium">{prompt.name}</p>
                  <span className="text-[10px] text-muted-foreground">
                    ({prompt.scope === 'global' ? 'Global' : 'Project'})
                  </span>
                </div>
                <p className="text-xs text-muted-foreground whitespace-pre-wrap line-clamp-4">
                  {prompt.prompt}
                </p>
              </TooltipContent>
            </Tooltip>
          );
        })}
        {selectedPrompts.length > 1 && (
          <Button
            variant="ghost"
            size="sm"
            className="h-6 px-2 text-xs"
            onClick={handleCopyAll}
            title="Copy all prompts"
          >
            {copiedId === 'all' ? (
              <>
                <Check className="w-3 h-3 mr-1" />
                Copied
              </>
            ) : (
              <>
                <Copy className="w-3 h-3 mr-1" />
                Copy All
              </>
            )}
          </Button>
        )}
      </div>
    </TooltipProvider>
  );
});
