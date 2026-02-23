import { useRef, useCallback, useEffect, useState } from 'react';
import { Send, Paperclip, Square, ListOrdered, Mic, MicOff, FileText, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import { AgentModelSelector } from '../shared/agent-model-selector';
import { AgentPromptsSelector } from './agent-prompts-selector';
import { TimeLimiterSettings } from './time-limiter-settings';
import { OrchestratorSettings } from './orchestrator-settings';
import { useSpeechRecognition } from '@/hooks/use-speech-recognition';
import { useAppStore } from '@/store/app-store';
import type { PhaseModelEntry } from '@automaker/types';

interface InputControlsProps {
  input: string;
  onInputChange: (value: string) => void;
  onSend: (messageOverride?: string) => void;
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
  /** Elapsed seconds for time limiter display */
  elapsedSeconds?: number;
  // Drag handlers
  onDragEnter: (e: React.DragEvent) => void;
  onDragLeave: (e: React.DragEvent) => void;
  onDragOver: (e: React.DragEvent) => void;
  onDrop: (e: React.DragEvent) => Promise<void>;
  // Refs
  inputRef?: React.RefObject<HTMLTextAreaElement | null>;
  /** Project accent color for border/focus styling */
  accentColor?: string;
  /** Called when the textarea height changes (e.g. during speech input) so the parent can scroll the message list */
  onInputHeightChange?: () => void;
}

const TEXTAREA_MIN_HEIGHT = 44;
const TEXTAREA_MAX_HEIGHT = 320;
const INPUT_SYNC_DEBOUNCE_MS = 180;

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
  elapsedSeconds = 0,
  onDragEnter,
  onDragLeave,
  onDragOver,
  onDrop,
  inputRef: externalInputRef,
  accentColor,
  onInputHeightChange,
}: InputControlsProps) {
  const internalInputRef = useRef<HTMLTextAreaElement>(null);
  const inputRef = externalInputRef || internalInputRef;
  const onSendRef = useRef(onSend);
  const inputSyncTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const resizeFrameRef = useRef<number | null>(null);
  const lastTextareaHeightRef = useRef<number>(TEXTAREA_MIN_HEIGHT);
  const [draftInput, setDraftInput] = useState(input);
  const draftInputRef = useRef(input);
  const [interimTranscript, setInterimTranscript] = useState('');
  onSendRef.current = onSend;

  const resizeTextarea = useCallback(
    (textarea: HTMLTextAreaElement | null) => {
      if (!textarea) return;

      textarea.style.height = 'auto';
      const scrollHeight = textarea.scrollHeight;
      const newHeight = Math.max(TEXTAREA_MIN_HEIGHT, Math.min(scrollHeight, TEXTAREA_MAX_HEIGHT));

      textarea.style.height = `${newHeight}px`;
      textarea.style.overflowY = scrollHeight > TEXTAREA_MAX_HEIGHT ? 'auto' : 'hidden';

      // Notify parent when height grows so the message list can scroll down
      if (newHeight !== lastTextareaHeightRef.current) {
        lastTextareaHeightRef.current = newHeight;
        onInputHeightChange?.();
      }
    },
    [onInputHeightChange]
  );

  // Auto-scroll textarea to bottom (for speech input)
  const scrollTextareaToBottom = useCallback((textarea: HTMLTextAreaElement | null) => {
    if (!textarea) return;
    // Use requestAnimationFrame to ensure scroll happens after content update
    requestAnimationFrame(() => {
      textarea.scrollTop = textarea.scrollHeight;
    });
  }, []);

  const clearPendingInputSync = useCallback(() => {
    if (inputSyncTimeoutRef.current !== null) {
      clearTimeout(inputSyncTimeoutRef.current);
      inputSyncTimeoutRef.current = null;
    }
  }, []);

  const clearPendingResize = useCallback(() => {
    if (resizeFrameRef.current !== null) {
      window.cancelAnimationFrame(resizeFrameRef.current);
      resizeFrameRef.current = null;
    }
  }, []);

  const scheduleTextareaResize = useCallback(
    (textarea: HTMLTextAreaElement | null) => {
      if (!textarea) return;

      clearPendingResize();
      resizeFrameRef.current = window.requestAnimationFrame(() => {
        resizeFrameRef.current = null;
        resizeTextarea(textarea);
      });
    },
    [clearPendingResize, resizeTextarea]
  );

  const syncInputToParent = useCallback(
    (nextValue: string, immediate = false) => {
      clearPendingInputSync();

      if (immediate) {
        onInputChange(nextValue);
        return;
      }

      inputSyncTimeoutRef.current = setTimeout(() => {
        inputSyncTimeoutRef.current = null;
        onInputChange(nextValue);
      }, INPUT_SYNC_DEBOUNCE_MS);
    },
    [clearPendingInputSync, onInputChange]
  );

  const canSend = (draftInput.trim().length > 0 || hasFiles) && isConnected;

  useEffect(() => {
    draftInputRef.current = draftInput;
  }, [draftInput]);

  useEffect(() => {
    return () => {
      clearPendingInputSync();
      clearPendingResize();
    };
  }, [clearPendingInputSync, clearPendingResize]);

  useEffect(() => {
    if (input === draftInputRef.current) return;
    setDraftInput(input);
    setInterimTranscript('');
    scheduleTextareaResize(inputRef.current);
  }, [input, inputRef, scheduleTextareaResize]);

  // Speech recognition
  const {
    isListening,
    isSupported: isSpeechSupported,
    toggleListening,
  } = useSpeechRecognition({
    lang: 'de-DE',
    continuous: true,
    interimResults: true,
    onTranscript: useCallback(
      (transcript: string, isFinal: boolean) => {
        if (isFinal) {
          // Append final transcript to local draft first to keep typing responsive.
          setDraftInput((previous) => {
            const nextValue = previous + (previous ? ' ' : '') + transcript;
            syncInputToParent(nextValue);
            return nextValue;
          });
          setInterimTranscript('');
          scheduleTextareaResize(inputRef.current);
          // Auto-scroll to bottom so user sees the latest text
          scrollTextareaToBottom(inputRef.current);
        } else {
          // Show interim results
          setInterimTranscript(transcript);
          // Auto-scroll to bottom during speech input
          scrollTextareaToBottom(inputRef.current);
        }
      },
      [inputRef, scheduleTextareaResize, scrollTextareaToBottom, syncInputToParent]
    ),
    onError: useCallback((error: string) => {
      console.error('Speech recognition error:', error);
      setInterimTranscript('');
    }, []),
  });

  // Listen for docs:insert-path events
  useEffect(() => {
    const handleInsertPath = (e: Event) => {
      const path = (e as CustomEvent<string>).detail;
      if (!path) return;
      setDraftInput((previous) => {
        const nextValue = previous ? previous + '\n' + path : path;
        syncInputToParent(nextValue, true);
        return nextValue;
      });
      scheduleTextareaResize(inputRef.current);
      inputRef.current?.focus();
    };

    window.addEventListener('docs:insert-path', handleInsertPath);
    return () => window.removeEventListener('docs:insert-path', handleInsertPath);
  }, [inputRef, scheduleTextareaResize, syncInputToParent]);

  // Recent docs from store
  const recentDocs = useAppStore((s) => s.recentDocs);
  const setDocsOpen = useAppStore((s) => s.setDocsOpen);
  const [docsPopoverOpen, setDocsPopoverOpen] = useState(false);

  const handleInsertRecentDoc = useCallback(
    (absolutePath: string) => {
      setDraftInput((previous) => {
        const nextValue = previous ? previous + '\n' + absolutePath : absolutePath;
        syncInputToParent(nextValue, true);
        return nextValue;
      });
      scheduleTextareaResize(inputRef.current);
      inputRef.current?.focus();
      setDocsPopoverOpen(false);
    },
    [inputRef, scheduleTextareaResize, syncInputToParent]
  );

  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      const nextValue = e.currentTarget.value;
      setDraftInput(nextValue);
      syncInputToParent(nextValue);
      scheduleTextareaResize(e.currentTarget);
    },
    [scheduleTextareaResize, syncInputToParent]
  );

  const triggerSend = useCallback(() => {
    if (!canSend) return;

    onSendRef.current(draftInput);
    setDraftInput('');
    setInterimTranscript('');
    syncInputToParent('', true);
    scheduleTextareaResize(inputRef.current);
  }, [canSend, draftInput, inputRef, scheduleTextareaResize, syncInputToParent]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.nativeEvent.isComposing) return;
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      triggerSend();
    }
  };

  return (
    <div
      className={cn(
        'flex flex-col gap-1.5 transition-all duration-200 rounded-lg p-1',
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
          value={
            draftInput + (interimTranscript ? (draftInput ? ' ' : '') + interimTranscript : '')
          }
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          onBlur={() => syncInputToParent(draftInput, true)}
          onPaste={onPaste}
          disabled={!isConnected}
          data-testid="agent-input"
          rows={1}
          className={cn(
            'w-full bg-background border-border rounded-lg pl-3 pr-3 sm:pr-16 text-sm resize-none py-2',
            !accentColor && 'focus:ring-2 focus:ring-primary/20 focus:border-primary/50',
            'min-h-[44px]',
            hasFiles && !accentColor && 'border-primary/30',
            isDragOver && 'border-primary bg-primary/5',
            isListening && 'border-red-500/50 ring-2 ring-red-500/20'
          )}
          style={
            accentColor && !isDragOver && !isListening
              ? {
                  borderColor: accentColor + '40',
                  boxShadow: `0 0 0 1px ${accentColor}20`,
                }
              : undefined
          }
          onFocus={(e) => {
            if (accentColor && !isDragOver && !isListening) {
              e.currentTarget.style.borderColor = accentColor + '70';
              e.currentTarget.style.boxShadow = `0 0 0 2px ${accentColor}30`;
            }
          }}
          onBlurCapture={(e) => {
            if (accentColor && !isDragOver && !isListening) {
              e.currentTarget.style.borderColor = accentColor + '40';
              e.currentTarget.style.boxShadow = `0 0 0 1px ${accentColor}20`;
            }
          }}
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

      {/* Controls row - compact single line (scrolls on small widths) */}
      <div className="overflow-x-auto pb-0.5 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        <div className="flex min-w-max items-center gap-1.5 whitespace-nowrap">
          {/* Model Selector */}
          <div className="shrink-0">
            <AgentModelSelector
              value={modelSelection}
              onChange={onModelSelect}
              disabled={!isConnected}
            />
          </div>

          {/* Agent Prompts Selector */}
          <AgentPromptsSelector projectPath={projectPath} disabled={!isConnected} />

          {/* Microphone Button */}
          {isSpeechSupported && (
            <Button
              variant="outline"
              size="icon"
              onClick={toggleListening}
              disabled={!isConnected}
              className={cn(
                'h-9 w-9 rounded-lg border-border shrink-0',
                isListening && 'bg-red-500/10 text-red-600 border-red-500/30 animate-pulse'
              )}
              title={isListening ? 'Stop recording' : 'Start voice input'}
            >
              {isListening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
            </Button>
          )}

          {/* File Attachment Button */}
          <Button
            variant="outline"
            size="icon"
            onClick={onToggleImageDropZone}
            disabled={!isConnected}
            className={cn(
              'h-9 w-9 rounded-lg border-border shrink-0',
              showImageDropZone && 'bg-primary/10 text-primary border-primary/30',
              hasFiles && 'border-primary/30 text-primary'
            )}
            title="Attach files (images, .txt, .md)"
          >
            <Paperclip className="w-4 h-4" />
          </Button>

          {/* Docs Quick Access */}
          <Popover open={docsPopoverOpen} onOpenChange={setDocsPopoverOpen}>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                size="icon"
                disabled={!isConnected}
                className="h-9 w-9 rounded-lg border-border shrink-0"
                title="Insert doc path"
              >
                <FileText className="w-4 h-4" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-64 p-0" align="start">
              <div className="p-2 border-b">
                <p className="text-xs font-medium text-muted-foreground">Recent Docs</p>
              </div>
              {recentDocs.length === 0 ? (
                <div className="p-3 text-xs text-muted-foreground text-center">No recent docs</div>
              ) : (
                <div className="max-h-48 overflow-y-auto">
                  {recentDocs.slice(0, 5).map((doc) => (
                    <button
                      key={doc.path}
                      className="flex items-center justify-between w-full px-3 py-2 text-sm hover:bg-accent/50 transition-colors"
                      onClick={() => handleInsertRecentDoc(doc.absolutePath)}
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <FileText className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                        <span className="truncate">{doc.name}</span>
                      </div>
                      <Plus className="w-3 h-3 text-muted-foreground shrink-0" />
                    </button>
                  ))}
                </div>
              )}
              <div className="p-2 border-t">
                <button
                  className="w-full text-xs text-center text-primary hover:underline"
                  onClick={() => {
                    setDocsOpen(true);
                    setDocsPopoverOpen(false);
                  }}
                >
                  Browse All Docs
                </button>
              </div>
            </PopoverContent>
          </Popover>

          {/* Time Limiter Settings */}
          <TimeLimiterSettings disabled={!isConnected} elapsedSeconds={elapsedSeconds} />

          {/* Orchestrator Settings */}
          <OrchestratorSettings disabled={!isConnected} />

          <div className="mx-1 h-5 w-px bg-border shrink-0" />

          {/* Stop Button (only when processing) */}
          {isProcessing && (
            <Button
              onClick={onStop}
              disabled={!isConnected}
              className="h-9 px-3 rounded-lg shrink-0"
              variant="destructive"
              data-testid="stop-agent"
              title="Stop generation"
            >
              <Square className="w-4 h-4 fill-current" />
            </Button>
          )}

          {/* Send / Queue Button */}
          <Button
            onClick={triggerSend}
            disabled={!canSend}
            className="h-9 px-3 rounded-lg shrink-0"
            variant={isProcessing ? 'outline' : 'default'}
            data-testid="send-message"
            title={isProcessing ? 'Add to queue' : 'Send message'}
          >
            {isProcessing ? <ListOrdered className="w-4 h-4" /> : <Send className="w-4 h-4" />}
          </Button>
        </div>
      </div>
    </div>
  );
}
