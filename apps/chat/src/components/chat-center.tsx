import { useMemo } from 'react';
import { MessageSquareText } from 'lucide-react';
import type { PhaseModelEntry } from '@automaker/types';
import type { Message } from '@/types/electron';
import type { ImageAttachment, TextFileAttachment } from '@/store/app-store';
import { getModelDisplayName, getProviderFromModel } from '@/lib/utils';
import { detectPhases, getPhaseDividerIndices } from '../services/orchestrator-utils';
import type { SessionMessage } from '../stores/types';
import { useSessionStore } from '../stores/session-store';
import { ChatInput } from './chat-input';
import { ChatContextBar } from './chat-context-bar';
import { ChatMessages } from './chat-messages';
import type { ThinkingIntensity } from './mode-toggles';
import { OrchestratorStatusBar } from './orchestrator-status-bar';

interface ChatCenterProps {
  currentSessionId: string | null;
  currentSessionName: string | null;
  currentSessionDescription?: null | string;
  messages: Message[];
  isProcessing: boolean;
  elapsedSeconds: number;
  isConnected: boolean;
  modelSelection: PhaseModelEntry;
  onModelSelect: (entry: PhaseModelEntry) => void;
  thinkingEnabled: boolean;
  thinkingIntensity: ThinkingIntensity;
  onThinkingEnabledChange: (enabled: boolean) => void;
  onThinkingIntensityChange: (intensity: ThinkingIntensity) => void;
  orchestratorEnabled: boolean;
  orchestratorIteration: number;
  orchestratorRunId: null | string;
  onOrchestratorEnabledChange: (enabled: boolean) => void;
  input: string;
  onInputChange: (value: string) => void;
  onSend: (messageOverride?: string) => void;
  onStop: () => void;
  isStopPending: boolean;
  selectedImages: ImageAttachment[];
  selectedTextFiles: TextFileAttachment[];
  isDragOver: boolean;
  onFilesSelected: (files: FileList) => Promise<void>;
  onRemoveImage: (imageId: string) => void;
  onRemoveTextFile: (fileId: string) => void;
  onDragEnter: (event: React.DragEvent) => void;
  onDragLeave: (event: React.DragEvent) => void;
  onDragOver: (event: React.DragEvent) => void;
  onDrop: (event: React.DragEvent) => Promise<void>;
  onPaste: (event: React.ClipboardEvent) => Promise<void>;
  inputRef: React.RefObject<HTMLTextAreaElement | null>;
  onInputHeightChange: () => void;
  messagesContainerRef: React.RefObject<HTMLDivElement | null>;
  onMessagesScroll: () => void;
  showScrollToBottom: boolean;
  onScrollToBottom: () => void;
  accentColor?: string;
}

export function ChatCenter({
  currentSessionId,
  currentSessionName,
  currentSessionDescription,
  messages,
  isProcessing,
  elapsedSeconds,
  isConnected,
  modelSelection,
  onModelSelect,
  thinkingEnabled,
  thinkingIntensity,
  onThinkingEnabledChange,
  onThinkingIntensityChange,
  orchestratorEnabled,
  orchestratorIteration,
  orchestratorRunId,
  onOrchestratorEnabledChange,
  input,
  onInputChange,
  onSend,
  onStop,
  isStopPending,
  selectedImages,
  selectedTextFiles,
  isDragOver,
  onFilesSelected,
  onRemoveImage,
  onRemoveTextFile,
  onDragEnter,
  onDragLeave,
  onDragOver,
  onDrop,
  onPaste,
  inputRef,
  onInputHeightChange,
  messagesContainerRef,
  onMessagesScroll,
  showScrollToBottom,
  onScrollToBottom,
  accentColor,
}: ChatCenterProps) {
  const providerLabel = useMemo(() => {
    const provider = getProviderFromModel(modelSelection.model);
    if (provider === 'codex') return 'OpenAI';
    if (provider === 'cursor') return 'Cursor';
    return 'Claude';
  }, [modelSelection.model]);

  const modelLabel = useMemo(
    () => getModelDisplayName(modelSelection.model),
    [modelSelection.model]
  );
  const showContextLoading = Boolean(
    currentSessionId && isProcessing && !currentSessionDescription
  );
  const storedMessages = useSessionStore((state) =>
    currentSessionId ? (state.sessions[currentSessionId]?.messages ?? []) : []
  );

  const mergedMessages = useMemo(() => {
    if (storedMessages.length === 0) return messages;

    const storedById = new Map(storedMessages.map((message) => [message.id, message]));
    const baseMessages = messages.map((message) => {
      const stored = storedById.get(message.id);
      if (!stored) return message;
      if (!stored.toolCallGroup && !stored.thinking && !stored.thinkingBlock) return message;

      return {
        ...message,
        toolCallGroup: stored.toolCallGroup,
        thinking: stored.thinking,
        thinkingBlock: stored.thinkingBlock,
      };
    });

    const knownIds = new Set(baseMessages.map((message) => message.id));
    const extraStored = storedMessages.filter((message) => !knownIds.has(message.id));
    if (extraStored.length === 0) return baseMessages;

    return [...baseMessages, ...extraStored].sort((left, right) => {
      const leftTs = Date.parse(left.timestamp);
      const rightTs = Date.parse(right.timestamp);
      if (Number.isNaN(leftTs) || Number.isNaN(rightTs)) return 0;
      return leftTs - rightTs;
    });
  }, [messages, storedMessages]);

  const orchestratorRunInfo = useMemo(() => {
    if (!orchestratorEnabled) return null;
    return detectPhases(
      storedMessages as SessionMessage[],
      orchestratorEnabled,
      orchestratorIteration,
      orchestratorRunId
    );
  }, [orchestratorEnabled, orchestratorIteration, orchestratorRunId, storedMessages]);

  const phaseDividers = useMemo(() => {
    if (!orchestratorRunInfo || orchestratorRunInfo.phases.length <= 1) return undefined;
    return getPhaseDividerIndices(orchestratorRunInfo.phases);
  }, [orchestratorRunInfo]);

  return (
    <div className="flex h-full min-h-0 flex-col bg-background">
      <ChatContextBar
        title={currentSessionName}
        description={currentSessionDescription || null}
        isGenerating={showContextLoading}
        isHidden={!currentSessionId}
      />

      {orchestratorRunInfo ? (
        <OrchestratorStatusBar runInfo={orchestratorRunInfo} isProcessing={isProcessing} />
      ) : null}

      <div className="relative min-h-0 flex-1">
        {currentSessionId ? (
          <ChatMessages
            messages={mergedMessages}
            isProcessing={isProcessing}
            elapsedSeconds={elapsedSeconds}
            modelLabel={modelLabel}
            providerLabel={providerLabel}
            messagesContainerRef={messagesContainerRef}
            onScroll={onMessagesScroll}
            showScrollToBottom={showScrollToBottom}
            onScrollToBottom={onScrollToBottom}
            onRetryMessage={(content) => {
              onSend(content);
            }}
            phaseDividers={phaseDividers}
          />
        ) : (
          <div className="flex h-full items-center justify-center px-6">
            <div className="max-w-sm rounded-lg border border-dashed border-muted p-6 text-center">
              <MessageSquareText className="mx-auto mb-3 h-8 w-8 text-muted-foreground" />
              <h3 className="text-base font-semibold">Noch kein Chat offen</h3>
              <p className="mt-2 text-sm text-muted-foreground">
                Erstelle links oder oben einen neuen Chat, dann kannst du direkt loslegen.
              </p>
            </div>
          </div>
        )}
      </div>

      {currentSessionId && (
        <ChatInput
          input={input}
          onInputChange={onInputChange}
          onSend={onSend}
          onStop={onStop}
          isStopPending={isStopPending}
          modelSelection={modelSelection}
          onModelSelect={onModelSelect}
          thinkingEnabled={thinkingEnabled}
          thinkingIntensity={thinkingIntensity}
          onThinkingEnabledChange={onThinkingEnabledChange}
          onThinkingIntensityChange={onThinkingIntensityChange}
          orchestratorEnabled={orchestratorEnabled}
          orchestratorIteration={orchestratorIteration}
          orchestratorRunId={orchestratorRunId}
          onOrchestratorEnabledChange={onOrchestratorEnabledChange}
          isProcessing={isProcessing}
          isConnected={isConnected}
          selectedImages={selectedImages}
          selectedTextFiles={selectedTextFiles}
          isDragOver={isDragOver}
          onFilesSelected={onFilesSelected}
          onRemoveImage={onRemoveImage}
          onRemoveTextFile={onRemoveTextFile}
          onDragEnter={onDragEnter}
          onDragLeave={onDragLeave}
          onDragOver={onDragOver}
          onDrop={onDrop}
          onPaste={onPaste}
          inputRef={inputRef}
          accentColor={accentColor}
          onInputHeightChange={onInputHeightChange}
        />
      )}
    </div>
  );
}
