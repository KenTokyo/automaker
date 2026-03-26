import { useRef, useCallback, useEffect, useState } from 'react';
import {
  Send,
  Paperclip,
  Square,
  ListOrdered,
  Mic,
  MicOff,
  FileText,
  Plus,
  Loader2,
  Cpu,
  RotateCcw,
  FileDown,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import { AgentModelSelector } from '../shared/agent-model-selector';
import { AgentPromptsSelector } from './agent-prompts-selector';
import { TimeLimiterSettings } from './time-limiter-settings';
import { OrchestratorSettings } from './orchestrator-settings';
import { CompletedTasksToggle } from './completed-tasks-toggle';
import { useSpeechRecognition } from '@/hooks/use-speech-recognition';
import { useVoxtralSpeechRecognition } from '@/hooks/use-voxtral-speech-recognition';
import { useAppStore } from '@/store/app-store';
import { useSaveAsMarkdown } from '@/hooks/use-save-as-markdown';
import type { PhaseModelEntry } from '@automaker/types';

interface InputControlsProps {
  input: string;
  onInputChange: (value: string) => void;
  onSend: (messageOverride?: string) => void;
  onStop: () => void;
  onPaste: (e: React.ClipboardEvent) => Promise<void>;
  /** Current model selection (model + optional thinking level) */
  modelSelection: PhaseModelEntry;
  /** Callback when model is selected */
  onModelSelect: (entry: PhaseModelEntry) => void;
  isProcessing: boolean;
  isConnected: boolean;
  hasFiles: boolean;
  isDragOver: boolean;
  /** Current project path for agent prompts */
  projectPath: string | null;
  /** Elapsed seconds for time limiter display */
  elapsedSeconds?: number;
  /** Estimated context tokens for the current chat */
  estimatedContextTokens?: number;
  /** Context window size for the selected model */
  contextWindowTokens?: number | null;
  /** Native model context window size from provider metadata */
  modelContextWindowTokens?: number | null;
  /** Whether model context lookup already finished */
  isModelContextLookupReady?: boolean;
  /** True when context tokens come from provider usage events */
  isContextUsageMeasured?: boolean;
  /** Current context usage in percent */
  contextUsagePercent?: number | null;
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
  /** Callback to create a new session */
  onNewSession?: () => void;
}

/**
 * Voxtral local speech recognition is disabled for now – the WebGPU model
 * requires too many resources.  Set to `true` to re-enable.
 */
const VOXTRAL_ENABLED = false;

const TEXTAREA_MIN_HEIGHT = 44;
const TEXTAREA_MAX_HEIGHT = 320;
const INPUT_SYNC_DEBOUNCE_MS = 180;

export function InputControls({
  input,
  onInputChange,
  onSend,
  onStop,
  onPaste,
  modelSelection,
  onModelSelect,
  isProcessing,
  isConnected,
  hasFiles,
  isDragOver,
  projectPath,
  elapsedSeconds = 0,
  estimatedContextTokens = 0,
  contextWindowTokens = null,
  modelContextWindowTokens = null,
  isModelContextLookupReady = false,
  isContextUsageMeasured = false,
  contextUsagePercent = null,
  onDragEnter,
  onDragLeave,
  onDragOver,
  onDrop,
  inputRef: externalInputRef,
  accentColor,
  onInputHeightChange,
  onNewSession,
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

  // Voxtral local speech recognition (disabled – see VOXTRAL_ENABLED)
  const voxtralHook = useVoxtralSpeechRecognition(
    VOXTRAL_ENABLED
      ? {
          onTranscript: (chunk: string) => {
            setDraftInput((previous) => {
              const normalizedChunk = previous.length === 0 ? chunk.trimStart() : chunk;
              if (!normalizedChunk) return previous;
              const nextValue = previous + normalizedChunk;
              syncInputToParent(nextValue);
              return nextValue;
            });
            scheduleTextareaResize(inputRef.current);
            scrollTextareaToBottom(inputRef.current);
          },
          onError: (errorMessage: string) => {
            console.error('Voxtral speech recognition error:', errorMessage);
          },
        }
      : {}
  );

  const {
    isSupported: isVoxtralSupported,
    isListening: isVoxtralListening,
    isLoading: isVoxtralLoading,
    hasLoadedModel: hasLoadedVoxtralModel,
    status: voxtralStatus,
    loadingMessage: voxtralLoadingMessage,
    loadingProgress: voxtralLoadingProgress,
    error: voxtralError,
    toggleListening: toggleVoxtralListening,
    resetSession: resetVoxtralSession,
  } = voxtralHook;

  const voxtralButtonTitle = !isVoxtralSupported
    ? 'Voxtral braucht WebGPU und Mikrofonrechte'
    : isVoxtralLoading
      ? `Voxtral lädt (${Math.round(voxtralLoadingProgress)}%)`
      : isVoxtralListening
        ? 'Voxtral stoppen'
        : voxtralError
          ? `Voxtral Fehler: ${voxtralError}`
          : 'Voxtral lokal starten';

  const showVoxtralResetButton =
    isConnected &&
    voxtralStatus !== 'loading' &&
    (hasLoadedVoxtralModel || isVoxtralListening || Boolean(voxtralError));

  const voxtralHelpText = !isConnected
    ? null
    : !isVoxtralSupported
      ? 'Voxtral braucht WebGPU. Das heißt: Dein Gerät muss KI direkt im Browser rechnen können.'
      : isVoxtralLoading && !hasLoadedVoxtralModel
        ? `Erster Start: ${voxtralLoadingMessage} (${Math.round(voxtralLoadingProgress)}%). Das kann kurz dauern.`
        : isVoxtralLoading
          ? `${voxtralLoadingMessage} (${Math.round(voxtralLoadingProgress)}%).`
          : voxtralError
            ? `Voxtral hat ein Problem: ${voxtralError}. Mit „Zurücksetzen” kannst du neu starten.`
            : isVoxtralListening
              ? 'Voxtral hört zu. Sprich normal, der Text kommt direkt ins Feld.'
              : hasLoadedVoxtralModel
                ? 'Voxtral ist bereit. Klick auf den grünen Knopf zum Start.'
                : 'Tipp: Beim ersten Start lädt Voxtral mehr Daten. Danach geht es schneller.';

  const voxtralHelpToneClass = voxtralError
    ? 'border-red-500/30 bg-red-500/5 text-red-700'
    : isVoxtralLoading
      ? 'border-amber-500/30 bg-amber-500/5 text-amber-700'
      : isVoxtralListening
        ? 'border-emerald-500/30 bg-emerald-500/5 text-emerald-700'
        : 'border-border/70 bg-muted/40 text-muted-foreground';

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

  // Save-as-Markdown
  const {
    saveAsMarkdown,
    isSaving,
    canSave: canSaveMarkdown,
  } = useSaveAsMarkdown({
    projectPath,
    input: draftInput,
    onInputChange: (value: string) => {
      setDraftInput(value);
      syncInputToParent(value, true);
      scheduleTextareaResize(inputRef.current);
    },
  });

  const handleSaveAsMarkdown = useCallback(async () => {
    const result = await saveAsMarkdown();
    if (!result.success && result.error) {
      console.error('Markdown speichern fehlgeschlagen:', result.error);
    }
  }, [saveAsMarkdown]);

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
        'flex flex-col gap-1.5 transition-[background-color,box-shadow] duration-200 rounded-lg p-1',
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
            'w-full bg-background border-border rounded-lg pl-3 pr-3 sm:pr-16 !text-[13px] !leading-[1.45] resize-none py-2',
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

      {/* Controls row - wraps into multiple lines when needed */}
      <div className="pb-0.5">
        <div className="flex flex-wrap items-center gap-1">
          {/* New Session Button */}
          {onNewSession && (
            <Button
              onClick={onNewSession}
              disabled={!isConnected}
              className="h-7 w-7 shrink-0 rounded-md bg-emerald-600 hover:bg-emerald-500 text-white shadow-sm shadow-emerald-600/25 hover:shadow-emerald-500/30 transition-all duration-200"
              size="icon"
              data-testid="new-session-input"
              title="New Session"
            >
              <Plus className="w-3.5 h-3.5" />
            </Button>
          )}

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

          {/* Save as Markdown Button */}
          <Button
            variant="outline"
            size="icon"
            onClick={handleSaveAsMarkdown}
            disabled={!canSaveMarkdown || !isConnected}
            className={cn(
              'h-7 w-7 rounded-md shrink-0 transition-all duration-200',
              canSaveMarkdown && isConnected
                ? 'bg-emerald-600/10 text-emerald-600 border-emerald-500/40 hover:bg-emerald-600/20 hover:border-emerald-500/60'
                : 'border-border',
              isSaving && 'animate-pulse'
            )}
            title="Text als Markdown speichern"
          >
            {isSaving ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <FileDown className="w-3.5 h-3.5" />
            )}
          </Button>

          {/* Microphone Button */}
          {isSpeechSupported && (
            <Button
              variant="outline"
              size="icon"
              onClick={toggleListening}
              disabled={!isConnected}
              className={cn(
                'h-7 w-7 rounded-md border-border shrink-0',
                isListening && 'bg-red-500/10 text-red-600 border-red-500/30 animate-pulse'
              )}
              title={isListening ? 'Stop recording' : 'Start voice input'}
            >
              {isListening ? <MicOff className="w-3.5 h-3.5" /> : <Mic className="w-3.5 h-3.5" />}
            </Button>
          )}

          {/* Voxtral Test-Mikrofon (WebGPU) – disabled via VOXTRAL_ENABLED */}
          {VOXTRAL_ENABLED && (
            <Button
              variant="outline"
              size="icon"
              onClick={() => {
                void toggleVoxtralListening();
              }}
              disabled={!isConnected || (!isVoxtralSupported && !isVoxtralLoading)}
              className={cn(
                'h-7 w-7 rounded-md border-border shrink-0 transition-[background-color,color,border-color,box-shadow]',
                isVoxtralListening &&
                  'bg-emerald-500/10 text-emerald-700 border-emerald-500/40 animate-pulse shadow-[0_0_12px_rgba(16,185,129,0.35)]',
                isVoxtralLoading &&
                  'text-amber-600 border-amber-500/40 shadow-[0_0_12px_rgba(245,158,11,0.35)]',
                !isVoxtralListening &&
                  !isVoxtralLoading &&
                  isVoxtralSupported &&
                  'text-emerald-700 border-emerald-500/30 shadow-[0_0_10px_rgba(16,185,129,0.25)] hover:shadow-[0_0_14px_rgba(16,185,129,0.35)]',
                voxtralError &&
                  !isVoxtralListening &&
                  !isVoxtralLoading &&
                  'text-red-600 border-red-500/40 shadow-none'
              )}
              title={voxtralButtonTitle}
            >
              {isVoxtralLoading ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : isVoxtralListening ? (
                <MicOff className="w-3.5 h-3.5" />
              ) : (
                <Cpu className="w-3.5 h-3.5" />
              )}
            </Button>
          )}

          {/* Docs Quick Access */}
          <Popover open={docsPopoverOpen} onOpenChange={setDocsPopoverOpen}>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                size="icon"
                disabled={!isConnected}
                className="h-7 w-7 rounded-md border-border shrink-0"
                title="Insert doc path"
              >
                <FileText className="w-3.5 h-3.5" />
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

          {/* Orchestrator Settings */}
          <OrchestratorSettings disabled={!isConnected} />

          {/* Completed Tasks Toggle */}
          <CompletedTasksToggle disabled={!isConnected} />

          <div className="mx-0.5 h-4 w-px bg-border shrink-0" />

          {/* Context Condense Settings (right side, near Send) */}
          <TimeLimiterSettings
            disabled={false}
            elapsedSeconds={elapsedSeconds}
            estimatedContextTokens={estimatedContextTokens}
            contextWindowTokens={contextWindowTokens}
            modelContextWindowTokens={modelContextWindowTokens}
            isModelContextLookupReady={isModelContextLookupReady}
            isContextUsageMeasured={isContextUsageMeasured}
            contextUsagePercent={contextUsagePercent}
          />

          {/* Stop Button (only when processing) */}
          {isProcessing && (
            <Button
              onClick={onStop}
              disabled={!isConnected}
              className="h-7 w-7 rounded-md shrink-0"
              variant="destructive"
              size="icon"
              data-testid="stop-agent"
              title="Stop generation"
            >
              <Square className="w-3.5 h-3.5 fill-current" />
            </Button>
          )}

          {/* Send / Queue Button */}
          <Button
            onClick={triggerSend}
            disabled={!canSend}
            className="h-7 w-7 rounded-md shrink-0"
            variant={isProcessing ? 'outline' : 'default'}
            size="icon"
            data-testid="send-message"
            title={isProcessing ? 'Add to queue' : 'Send message'}
          >
            {isProcessing ? (
              <ListOrdered className="w-3.5 h-3.5" />
            ) : (
              <Send className="w-3.5 h-3.5" />
            )}
          </Button>
        </div>
      </div>

      {VOXTRAL_ENABLED && voxtralHelpText && (
        <div
          className={cn(
            'flex flex-col gap-1 rounded-md border px-2 py-1 text-[11px] leading-tight sm:flex-row sm:items-center sm:justify-between',
            voxtralHelpToneClass
          )}
        >
          <p>{voxtralHelpText}</p>
          {showVoxtralResetButton && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={resetVoxtralSession}
              className="h-6 px-2 text-[11px] self-start sm:self-auto"
              title="Voxtral neu starten"
            >
              <RotateCcw className="w-3 h-3 mr-1" />
              Zurücksetzen
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
