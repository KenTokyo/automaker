/**
 * Selected Prompts Display
 *
 * Shows the currently selected agent prompts as badges above the input area.
 * Users can click to remove individual prompts or view their content.
 */

import { X, Copy, Check } from 'lucide-react';
import { memo, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import { useAgentPromptsStore } from '@/store/agent-prompts-store';

export const SelectedPromptsDisplay = memo(function SelectedPromptsDisplay() {
  const { prompts, selectedPromptIds, deselectPrompt, getSelectedPromptsText } =
    useAgentPromptsStore();
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Get selected prompts
  const selectedPrompts = prompts.filter((p) => selectedPromptIds.includes(p.id));

  if (selectedPrompts.length === 0) {
    return null;
  }

  const handleCopy = async (promptId: string, promptText: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await navigator.clipboard.writeText(promptText);
      setCopiedId(promptId);
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
      <div className="flex flex-wrap items-center gap-2 mb-3 p-2 bg-muted/30 rounded-lg border border-border/50">
        <span className="text-xs text-muted-foreground font-medium">Agent Prompts:</span>
        {selectedPrompts.map((prompt) => (
          <Tooltip key={prompt.id}>
            <TooltipTrigger asChild>
              <Badge
                variant="secondary"
                className={cn(
                  'flex items-center gap-1.5 pr-1 cursor-default',
                  'bg-primary/10 text-primary border-primary/20 hover:bg-primary/15'
                )}
              >
                <span className="max-w-32 truncate">{prompt.name}</span>
                <div className="flex items-center">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-4 w-4 rounded-sm hover:bg-primary/20"
                    onClick={(e) => handleCopy(prompt.id, prompt.prompt, e)}
                    title="Copy prompt"
                  >
                    {copiedId === prompt.id ? (
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
                      deselectPrompt(prompt.id);
                    }}
                    title="Remove prompt"
                  >
                    <X className="w-3 h-3" />
                  </Button>
                </div>
              </Badge>
            </TooltipTrigger>
            <TooltipContent side="top" className="max-w-xs">
              <p className="text-xs font-medium mb-1">{prompt.name}</p>
              <p className="text-xs text-muted-foreground whitespace-pre-wrap line-clamp-4">
                {prompt.prompt}
              </p>
            </TooltipContent>
          </Tooltip>
        ))}
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
