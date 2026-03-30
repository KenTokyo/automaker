/**
 * Global System Prompt Editor
 *
 * Inline section shown at the top of the Agent Prompts dropdown.
 * Displays the global system prompt with an edit button that opens
 * a dialog with a textarea for editing.
 *
 * The global system prompt is always active — no toggle needed.
 */

import { memo, useState, useEffect, useCallback } from 'react';
import { Shield, Pencil, Check, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { useGlobalSystemPromptStore } from '@/store/global-system-prompt-store';

interface GlobalSystemPromptEditorProps {
  /** Close the parent dropdown when opening the editor dialog */
  onCloseDropdown?: () => void;
}

export const GlobalSystemPromptEditor = memo(function GlobalSystemPromptEditor({
  onCloseDropdown,
}: GlobalSystemPromptEditorProps) {
  const { content, isLoaded, isLoading, isSaving, loadPrompt, savePrompt } =
    useGlobalSystemPromptStore();

  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [editorContent, setEditorContent] = useState('');
  const [showSaved, setShowSaved] = useState(false);

  // Load prompt on first mount
  useEffect(() => {
    loadPrompt();
  }, [loadPrompt]);

  const handleOpenEditor = useCallback(() => {
    setEditorContent(content);
    setShowSaved(false);
    // Close dropdown first so the dialog renders cleanly
    onCloseDropdown?.();
    // Small delay so the dropdown closes before dialog opens
    setTimeout(() => setIsEditorOpen(true), 100);
  }, [content, onCloseDropdown]);

  const handleSave = useCallback(async () => {
    const success = await savePrompt(editorContent);
    if (success) {
      setShowSaved(true);
      setTimeout(() => {
        setShowSaved(false);
        setIsEditorOpen(false);
      }, 800);
    }
  }, [editorContent, savePrompt]);

  const hasContent = content.trim().length > 0;
  const previewText = hasContent
    ? content.substring(0, 80) + (content.length > 80 ? '...' : '')
    : 'No system prompt set — click edit to add one';

  return (
    <>
      {/* Inline section in the dropdown */}
      <div className="border-b border-border">
        <div className="flex items-center gap-2 px-3 py-1 bg-amber-500/5 border-b border-border">
          <Shield className="w-3 h-3 text-amber-600 dark:text-amber-400" />
          <span className="text-[11px] font-medium text-amber-700 dark:text-amber-400">
            Global System Prompt
          </span>
          <Badge
            variant="secondary"
            className="text-[10px] px-1.5 py-0 h-4 ml-auto bg-amber-500/10 text-amber-600 dark:text-amber-400"
          >
            always active
          </Badge>
        </div>
        <div
          className={cn(
            'flex items-center gap-2.5 px-3 py-2 hover:bg-muted/50 cursor-pointer group'
          )}
          onClick={handleOpenEditor}
        >
          <div className="flex-1 min-w-0">
            {isLoading && !isLoaded ? (
              <span className="text-xs text-muted-foreground">Loading...</span>
            ) : (
              <p
                className={cn(
                  'text-[11px] truncate leading-tight',
                  hasContent ? 'text-foreground/80' : 'text-muted-foreground italic'
                )}
              >
                {previewText}
              </p>
            )}
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6 text-muted-foreground hover:text-foreground shrink-0 opacity-60 group-hover:opacity-100 transition-opacity"
            onClick={(e) => {
              e.stopPropagation();
              handleOpenEditor();
            }}
            title="Edit global system prompt"
          >
            <Pencil className="w-3 h-3" />
          </Button>
        </div>
      </div>

      {/* Editor Dialog */}
      <Dialog open={isEditorOpen} onOpenChange={setIsEditorOpen}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Shield className="w-4 h-4 text-amber-600" />
              Global System Prompt
            </DialogTitle>
            <DialogDescription>
              This prompt is automatically included at the start of every agent chat session. Use it
              for instructions that should always apply (e.g. &quot;Read AGENTS.md first&quot;).
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-2">
            <div className="space-y-2">
              <Label htmlFor="global-system-prompt" className="text-xs text-muted-foreground">
                Prompt content (Markdown supported)
              </Label>
              <Textarea
                id="global-system-prompt"
                placeholder={`Example:\n\n## 📖 Always read first\n- \`AGENTS.md\`\n- \`CLAUDE.md\`\n\nFollow the coding rules defined in shared-docs/CODING-RULES.md`}
                value={editorContent}
                onChange={(e) => setEditorContent(e.target.value)}
                rows={14}
                className="resize-y font-mono text-sm leading-relaxed"
              />
            </div>
            <p className="text-[11px] text-muted-foreground">
              {editorContent.length > 0
                ? `${editorContent.length} characters`
                : 'Empty — no system prompt will be sent'}
            </p>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditorOpen(false)} disabled={isSaving}>
              Cancel
            </Button>
            <Button
              onClick={handleSave}
              disabled={isSaving}
              className={cn(showSaved && 'bg-green-600 hover:bg-green-600')}
            >
              {isSaving ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                  Saving...
                </>
              ) : showSaved ? (
                <>
                  <Check className="w-3.5 h-3.5 mr-1.5" />
                  Saved!
                </>
              ) : (
                'Save'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
});
