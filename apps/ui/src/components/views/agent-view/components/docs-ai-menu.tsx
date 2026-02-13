/**
 * DocsAIMenu - AI text transformation menu for the docs editor.
 *
 * Appears in the editor bubble menu when text is selected.
 * Allows users to apply AI commands (rewrite, summarize, expand, etc.)
 * to the selected text, with inline preview and accept/reject controls.
 */

import { memo, useState, useCallback, useRef, useEffect } from 'react';
import type { Editor } from '@tiptap/react';
import {
  Sparkles,
  RefreshCw,
  Minimize2,
  Maximize2,
  Languages,
  CheckCircle2,
  Wand2,
  Eraser,
  BookOpen,
  PenLine,
  Briefcase,
  MessageSquare,
  X,
  Loader2,
  Check,
  Undo2,
  ChevronRight,
} from 'lucide-react';
import { toast } from 'sonner';
import { getHttpApiClient } from '@/lib/http-api-client';
import { useAppStore } from '@/store/app-store';
import { cn } from '@/lib/utils';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

/** AI command definition */
interface AICommand {
  id: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  description: string;
}

const AI_COMMANDS: AICommand[] = [
  {
    id: 'rewrite',
    label: 'Rewrite',
    icon: RefreshCw,
    description: 'Same meaning, different words',
  },
  { id: 'summarize', label: 'Summarize', icon: Minimize2, description: 'Make it shorter' },
  { id: 'expand', label: 'Expand', icon: Maximize2, description: 'Add more detail' },
  {
    id: 'fix-grammar',
    label: 'Fix Grammar',
    icon: CheckCircle2,
    description: 'Fix spelling & grammar',
  },
  { id: 'simplify', label: 'Simplify', icon: Eraser, description: 'Simpler words & sentences' },
  {
    id: 'professional',
    label: 'Professional',
    icon: Briefcase,
    description: 'Formal business tone',
  },
];

const LANGUAGES = [
  'English',
  'German',
  'French',
  'Spanish',
  'Italian',
  'Portuguese',
  'Dutch',
  'Japanese',
  'Chinese',
  'Korean',
];

interface DocsAIMenuProps {
  editor: Editor;
}

type MenuState = 'commands' | 'loading' | 'result' | 'custom' | 'translate';

export const DocsAIMenu = memo(function DocsAIMenu({ editor }: DocsAIMenuProps) {
  const [open, setOpen] = useState(false);
  const [menuState, setMenuState] = useState<MenuState>('commands');
  const [result, setResult] = useState('');
  const [originalText, setOriginalText] = useState('');
  const [customPrompt, setCustomPrompt] = useState('');
  const [activeCommand, setActiveCommand] = useState('');
  const abortRef = useRef<AbortController | null>(null);
  const customInputRef = useRef<HTMLInputElement>(null);

  const projectPath = useAppStore((s) => s.currentProject?.path);

  const reset = useCallback(() => {
    setMenuState('commands');
    setResult('');
    setOriginalText('');
    setActiveCommand('');
    setCustomPrompt('');
    if (abortRef.current) {
      abortRef.current.abort();
      abortRef.current = null;
    }
  }, []);

  const handleOpenChange = useCallback(
    (isOpen: boolean) => {
      setOpen(isOpen);
      if (!isOpen) reset();
    },
    [reset]
  );

  /** Get the selected text and some surrounding context */
  const getSelectionInfo = useCallback(() => {
    const { from, to } = editor.state.selection;
    const selectedText = editor.state.doc.textBetween(from, to, '\n');

    // Get surrounding context (up to 200 chars before and after)
    const docSize = editor.state.doc.content.size;
    const contextStart = Math.max(0, from - 200);
    const contextEnd = Math.min(docSize, to + 200);
    const beforeContext =
      from > contextStart ? editor.state.doc.textBetween(contextStart, from, '\n') : '';
    const afterContext = to < contextEnd ? editor.state.doc.textBetween(to, contextEnd, '\n') : '';
    const context =
      beforeContext || afterContext ? `${beforeContext}[SELECTED]${afterContext}` : undefined;

    return { selectedText, context };
  }, [editor]);

  /** Execute an AI transform command */
  const executeCommand = useCallback(
    async (command: string, language?: string, customPromptText?: string) => {
      const { selectedText, context } = getSelectionInfo();
      if (!selectedText.trim()) {
        toast.error('No text selected');
        return;
      }

      setOriginalText(selectedText);
      setActiveCommand(command);
      setMenuState('loading');

      const controller = new AbortController();
      abortRef.current = controller;

      try {
        const api = getHttpApiClient();
        const response = await api.docs.aiTransform({
          text: selectedText,
          command,
          customPrompt: customPromptText,
          context,
          language,
          projectPath,
        });

        if (controller.signal.aborted) return;

        if (response.success && response.transformedText) {
          setResult(response.transformedText);
          setMenuState('result');
        } else {
          toast.error('AI transform failed');
          setMenuState('commands');
        }
      } catch (err) {
        if (controller.signal.aborted) return;
        const msg = err instanceof Error ? err.message : 'AI transform failed';
        toast.error(msg);
        setMenuState('commands');
      } finally {
        abortRef.current = null;
      }
    },
    [getSelectionInfo, projectPath]
  );

  const handleAccept = useCallback(() => {
    if (!result) return;

    // Replace selected text with the AI result
    const { from, to } = editor.state.selection;
    editor.chain().focus().deleteRange({ from, to }).insertContentAt(from, result).run();

    toast.success('AI text applied');
    setOpen(false);
    reset();
  }, [editor, result, reset]);

  const handleReject = useCallback(() => {
    reset();
  }, [reset]);

  const handleTryAgain = useCallback(() => {
    if (activeCommand) {
      executeCommand(activeCommand);
    }
  }, [activeCommand, executeCommand]);

  const handleCancel = useCallback(() => {
    if (abortRef.current) {
      abortRef.current.abort();
      abortRef.current = null;
    }
    setMenuState('commands');
  }, []);

  const handleCustomSubmit = useCallback(() => {
    if (customPrompt.trim()) {
      executeCommand('custom', undefined, customPrompt.trim());
    }
  }, [customPrompt, executeCommand]);

  const handleTranslate = useCallback(
    (language: string) => {
      executeCommand('translate', language);
    },
    [executeCommand]
  );

  // Focus custom input when entering custom mode
  useEffect(() => {
    if (menuState === 'custom') {
      setTimeout(() => customInputRef.current?.focus(), 50);
    }
  }, [menuState]);

  // Keyboard shortcut: Ctrl+Shift+A to open AI menu
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const isMod = e.ctrlKey || e.metaKey;
      if (isMod && e.shiftKey && e.key === 'A' && editor.isFocused) {
        const { from, to } = editor.state.selection;
        if (from !== to) {
          e.preventDefault();
          setOpen(true);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [editor]);

  return (
    <Popover open={open} onOpenChange={handleOpenChange}>
      <PopoverTrigger asChild>
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                type="button"
                onClick={() => setOpen(!open)}
                className={cn(
                  'inline-flex items-center justify-center rounded h-6 w-6 text-popover-foreground/70 hover:text-popover-foreground hover:bg-accent transition-colors',
                  open && 'bg-accent text-popover-foreground'
                )}
              >
                <Sparkles className="w-3.5 h-3.5" />
              </button>
            </TooltipTrigger>
            <TooltipContent side="bottom" className="text-xs">
              AI Transform (Ctrl+Shift+A)
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </PopoverTrigger>

      <PopoverContent
        className="w-72 p-0"
        side="top"
        align="start"
        sideOffset={8}
        onOpenAutoFocus={(e) => e.preventDefault()}
      >
        {menuState === 'commands' && (
          <CommandsView
            onCommand={executeCommand}
            onCustom={() => setMenuState('custom')}
            onTranslate={() => setMenuState('translate')}
          />
        )}

        {menuState === 'loading' && <LoadingView command={activeCommand} onCancel={handleCancel} />}

        {menuState === 'result' && (
          <ResultView
            original={originalText}
            result={result}
            command={activeCommand}
            onAccept={handleAccept}
            onReject={handleReject}
            onTryAgain={handleTryAgain}
          />
        )}

        {menuState === 'custom' && (
          <CustomPromptView
            value={customPrompt}
            onChange={setCustomPrompt}
            onSubmit={handleCustomSubmit}
            onBack={() => setMenuState('commands')}
            inputRef={customInputRef}
          />
        )}

        {menuState === 'translate' && (
          <TranslateView onSelect={handleTranslate} onBack={() => setMenuState('commands')} />
        )}
      </PopoverContent>
    </Popover>
  );
});

// --- Sub-views ---

function CommandsView({
  onCommand,
  onCustom,
  onTranslate,
}: {
  onCommand: (command: string) => void;
  onCustom: () => void;
  onTranslate: () => void;
}) {
  return (
    <div className="py-1">
      <div className="px-3 py-1.5 text-xs font-medium text-muted-foreground flex items-center gap-1.5">
        <Sparkles className="w-3 h-3" />
        AI Transform
      </div>
      {AI_COMMANDS.map((cmd) => (
        <button
          key={cmd.id}
          type="button"
          onClick={() => onCommand(cmd.id)}
          className="flex items-center gap-2.5 w-full px-3 py-1.5 text-sm hover:bg-accent transition-colors text-left"
        >
          <cmd.icon className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
          <span className="flex-1">{cmd.label}</span>
          <span className="text-[10px] text-muted-foreground">{cmd.description}</span>
        </button>
      ))}
      <div className="h-px bg-border my-1" />
      <button
        type="button"
        onClick={onTranslate}
        className="flex items-center gap-2.5 w-full px-3 py-1.5 text-sm hover:bg-accent transition-colors text-left"
      >
        <Languages className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
        <span className="flex-1">Translate</span>
        <ChevronRight className="w-3 h-3 text-muted-foreground" />
      </button>
      <button
        type="button"
        onClick={onCustom}
        className="flex items-center gap-2.5 w-full px-3 py-1.5 text-sm hover:bg-accent transition-colors text-left"
      >
        <MessageSquare className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
        <span className="flex-1">Custom Prompt</span>
        <ChevronRight className="w-3 h-3 text-muted-foreground" />
      </button>
    </div>
  );
}

function LoadingView({ command, onCancel }: { command: string; onCancel: () => void }) {
  return (
    <div className="p-4 flex flex-col items-center gap-3">
      <Loader2 className="w-5 h-5 animate-spin text-primary" />
      <span className="text-sm text-muted-foreground">
        Running <span className="font-medium text-foreground">{command}</span>...
      </span>
      <Button variant="ghost" size="sm" onClick={onCancel} className="h-7 text-xs">
        <X className="w-3 h-3 mr-1" />
        Cancel
      </Button>
    </div>
  );
}

function ResultView({
  original,
  result,
  command,
  onAccept,
  onReject,
  onTryAgain,
}: {
  original: string;
  result: string;
  command: string;
  onAccept: () => void;
  onReject: () => void;
  onTryAgain: () => void;
}) {
  const [showDiff, setShowDiff] = useState(false);

  return (
    <div className="p-3 space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-muted-foreground flex items-center gap-1">
          <Wand2 className="w-3 h-3" />
          {command} result
        </span>
        <button
          type="button"
          onClick={() => setShowDiff(!showDiff)}
          className="text-[10px] text-muted-foreground hover:text-foreground transition-colors"
        >
          {showDiff ? 'Hide original' : 'Show original'}
        </button>
      </div>

      {showDiff && (
        <div className="text-xs bg-red-500/5 border border-red-500/20 rounded-md p-2 max-h-24 overflow-y-auto">
          <span className="text-red-500/70 line-through">{truncate(original, 300)}</span>
        </div>
      )}

      <div className="text-xs bg-green-500/5 border border-green-500/20 rounded-md p-2 max-h-32 overflow-y-auto">
        <span className="text-foreground">{truncate(result, 500)}</span>
      </div>

      <div className="flex items-center gap-1.5">
        <Button size="sm" className="h-7 text-xs flex-1" onClick={onAccept}>
          <Check className="w-3 h-3 mr-1" />
          Accept
        </Button>
        <Button variant="outline" size="sm" className="h-7 text-xs" onClick={onTryAgain}>
          <RefreshCw className="w-3 h-3" />
        </Button>
        <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={onReject}>
          <Undo2 className="w-3 h-3" />
        </Button>
      </div>
    </div>
  );
}

function CustomPromptView({
  value,
  onChange,
  onSubmit,
  onBack,
  inputRef,
}: {
  value: string;
  onChange: (v: string) => void;
  onSubmit: () => void;
  onBack: () => void;
  inputRef: React.RefObject<HTMLInputElement | null>;
}) {
  return (
    <div className="p-3 space-y-2">
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={onBack}
          className="text-muted-foreground hover:text-foreground transition-colors"
        >
          <ChevronRight className="w-3.5 h-3.5 rotate-180" />
        </button>
        <span className="text-xs font-medium text-muted-foreground">Custom Prompt</span>
      </div>
      <Input
        ref={inputRef}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && value.trim()) {
            e.preventDefault();
            onSubmit();
          }
          if (e.key === 'Escape') {
            e.preventDefault();
            onBack();
          }
        }}
        placeholder="e.g., Make it funnier..."
        className="h-8 text-sm"
      />
      <Button size="sm" className="h-7 text-xs w-full" onClick={onSubmit} disabled={!value.trim()}>
        <Sparkles className="w-3 h-3 mr-1" />
        Transform
      </Button>
    </div>
  );
}

function TranslateView({
  onSelect,
  onBack,
}: {
  onSelect: (language: string) => void;
  onBack: () => void;
}) {
  return (
    <div className="py-1">
      <div className="px-3 py-1.5 flex items-center gap-2">
        <button
          type="button"
          onClick={onBack}
          className="text-muted-foreground hover:text-foreground transition-colors"
        >
          <ChevronRight className="w-3.5 h-3.5 rotate-180" />
        </button>
        <span className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
          <Languages className="w-3 h-3" />
          Translate to...
        </span>
      </div>
      {LANGUAGES.map((lang) => (
        <button
          key={lang}
          type="button"
          onClick={() => onSelect(lang)}
          className="w-full px-3 py-1.5 text-sm hover:bg-accent transition-colors text-left pl-8"
        >
          {lang}
        </button>
      ))}
    </div>
  );
}

function truncate(text: string, maxLen: number): string {
  if (text.length <= maxLen) return text;
  return text.slice(0, maxLen) + '...';
}
