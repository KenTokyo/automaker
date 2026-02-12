import { useRef, useCallback, useEffect, useState } from 'react';
import { Send, Paperclip, Square, ListOrdered, Copy, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import { AgentModelSelector } from '../shared/agent-model-selector';
import { AgentPromptsSelector } from './agent-prompts-selector';
import { TimeLimiterSettings } from './time-limiter-settings';
import { generateChatSummary, copyToClipboard } from '@/lib/copy-all-chat';
import type { PhaseModelEntry } from '@automaker/types';
import type { Message } from '@/types/electron';

interface InputControlsProps {
  input: string;
  onInputChange: (value: string) => void;
  onSend: () => void;
  onStop: () => void;
  onToggleImageDropZone: () => void;
  onPaste: (e: React.ClipboardEvent) => Promise<void>;
  /** Current model selection (model + optional thinking level) */
  modelSelection: PhaseModelEntry;
  /** Callback when model is selected */
  onModelSelect: (entry: PhaseModelEntry) => void;
  isProcessing: boolean;
  isConnected: boolean;
  hasFiles: boolean;
  isDragOver: boolean;
  showImageDropZone: boolean;
  /** Current project path for agent prompts */
  projectPath: string | null;
  /** Chat messages for Copy-All feature */
  messages?: Message[];
  /** Elapsed seconds for time limiter display */
  elapsedSeconds?: number;
  // Drag handlers
  onDragEnter: (e: React.DragEvent) => void;
  onDragLeave: (e: React.DragEvent) => void;
  onDragOver: (e: React.DragEvent) => void;
  onDrop: (e: React.DragEvent) => Promise<void>;
  // Refs
  inputRef?: React.RefObject<HTMLTextAreaElement | null>;
}

export function InputControls({
  input,
  onInputChange,
  onSend,
  onStop,
  onToggleImageDropZone,
  onPaste,
  modelSelection,
  onModelSelect,
  isProcessing,
  isConnected,
  hasFiles,
  isDragOver,
  showImageDropZone,
  projectPath,
  messages = [],
  elapsedSeconds = 0,
  onDragEnter,
  onDragLeave,
  onDragOver,
  onDrop,
  inputRef: externalInputRef,
}: InputControlsProps) {
  const internalInputRef = useRef<HTMLTextAreaElement>(null);
  const inputRef = externalInputRef || internalInputRef;
  const [copySuccess, setCopySuccess] = useState(false);

  // Handle Copy-All button click
  const handleCopyAll = useCallback(async () => {
    if (messages.length === 0) return;

    const summary = generateChatSummary(messages);
    const success = await copyToClipboard(summary.formattedChat);

    if (success) {
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 2000);
    }
  }, [messages]);

  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      onInputChange(e.target.value);
    },
    [onInputChange]
  );

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      onSend();
      // Reset height after sending (will be handled by useEffect when input clears)
    }
  };

  // Adjust height when input changes (including when cleared after send)
  useEffect(() => {
    const textarea = inputRef.current;
    if (!textarea) return;

    const minHeight = 44;
    const maxHeight = 320;

    textarea.style.height = 'auto';
    const scrollHeight = textarea.scrollHeight;
    const newHeight = Math.max(minHeight, Math.min(scrollHeight, maxHeight));

    textarea.style.height = `${newHeight}px`;
    textarea.style.overflowY = scrollHeight > maxHeight ? 'auto' : 'hidden';
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [input]); // inputRef is a ref and doesn't need to be in dependencies

  const canSend = (input.trim() || hasFiles) && isConnected;

  return (
    <>
      {/* Text Input and Controls */}
      <div
        className={cn(
          'flex flex-col gap-2 transition-all duration-200 rounded-xl p-1',
          isDragOver && 'bg-primary/5 ring-2 ring-primary/30'
        )}
        onDragEnter={onDragEnter}
        onDragLeave={onDragLeave}
        onDragOver={onDragOver}
        onDrop={onDrop}
      >
        {/* Textarea - full width on mobile */}
        <div className="relative w-full">
          <Textarea
            ref={inputRef}
            placeholder={
              isDragOver
                ? 'Drop your files here...'
                : isProcessing
                  ? 'Type to queue another prompt...'
                  : 'Describe what you want to build...'
            }
            value={input}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            onPaste={onPaste}
            disabled={!isConnected}
            data-testid="agent-input"
            rows={1}
            className={cn(
              'w-full bg-background border-border rounded-xl pl-4 pr-4 sm:pr-20 text-sm resize-none py-2.5',
              'focus:ring-2 focus:ring-primary/20 focus:border-primary/50',
              'min-h-[44px]',
              hasFiles && 'border-primary/30',
              isDragOver && 'border-primary bg-primary/5'
            )}
          />
          {hasFiles && !isDragOver && (
            <div className="hidden sm:block absolute right-3 top-1/2 -translate-y-1/2 text-xs bg-primary text-primary-foreground px-2 py-0.5 rounded-full font-medium">
              files attached
            </div>
          )}
          {isDragOver && (
            <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1.5 text-xs text-primary font-medium">
              <Paperclip className="w-3 h-3" />
              Drop here
            </div>
          )}
        </div>

        {/* Controls row - responsive layout */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Model Selector */}
          <AgentModelSelector
            value={modelSelection}
            onChange={onModelSelect}
            disabled={!isConnected}
          />

          {/* File Attachment Button */}
          <Button
            variant="outline"
            size="icon"
            onClick={onToggleImageDropZone}
            disabled={!isConnected}
            className={cn(
              'h-11 w-11 rounded-xl border-border shrink-0',
              showImageDropZone && 'bg-primary/10 text-primary border-primary/30',
              hasFiles && 'border-primary/30 text-primary'
            )}
            title="Attach files (images, .txt, .md)"
          >
            <Paperclip className="w-4 h-4" />
          </Button>

          {/* Agent Prompts Selector */}
          <AgentPromptsSelector projectPath={projectPath} disabled={!isConnected} />

          {/* Time Limiter Settings */}
          <TimeLimiterSettings disabled={!isConnected} elapsedSeconds={elapsedSeconds} />

          {/* Copy-All Button */}
          <Button
            variant="outline"
            size="icon"
            onClick={handleCopyAll}
            disabled={!isConnected || messages.length === 0}
            className={cn(
              'h-11 w-11 rounded-xl border-border shrink-0',
              copySuccess && 'border-green-500/50 text-green-600'
            )}
            title="Copy entire chat history"
          >
            {copySuccess ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
          </Button>

          {/* Spacer to push action buttons to the right */}
          <div className="flex-1" />

          {/* Stop Button (only when processing) */}
          {isProcessing && (
            <Button
              onClick={onStop}
              disabled={!isConnected}
              className="h-11 px-4 rounded-xl shrink-0"
              variant="destructive"
              data-testid="stop-agent"
              title="Stop generation"
            >
              <Square className="w-4 h-4 fill-current" />
            </Button>
          )}

          {/* Send / Queue Button */}
          <Button
            onClick={onSend}
            disabled={!canSend}
            className="h-11 px-4 rounded-xl shrink-0"
            variant={isProcessing ? 'outline' : 'default'}
            data-testid="send-message"
            title={isProcessing ? 'Add to queue' : 'Send message'}
          >
            {isProcessing ? <ListOrdered className="w-4 h-4" /> : <Send className="w-4 h-4" />}
          </Button>
        </div>
      </div>

      {/* Keyboard hint */}
      <p className="text-[11px] text-muted-foreground mt-2 text-center hidden sm:block">
        Press <kbd className="px-1.5 py-0.5 bg-muted rounded text-[10px] font-medium">Enter</kbd> to
        send,{' '}
        <kbd className="px-1.5 py-0.5 bg-muted rounded text-[10px] font-medium">Shift+Enter</kbd>{' '}
        for new line
      </p>
    </>
  );
}
