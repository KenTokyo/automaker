import { useCallback, useEffect, useRef } from 'react';
import type { ClipboardEvent, DragEvent, KeyboardEvent, RefObject } from 'react';
import type { PhaseModelEntry } from '@automaker/types';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import type { ImageAttachment, TextFileAttachment } from '@/store/app-store';
import { ChatInputToolbar } from './chat-input-toolbar';
import { ImageAttachment as ImageAttachmentPreview } from './image-attachment';
import type { ThinkingIntensity } from './mode-toggles';

const INPUT_MIN_HEIGHT = 44;
const INPUT_MAX_LINES = 15;

interface ChatInputProps {
  input: string;
  onInputChange: (value: string) => void;
  onSend: (messageOverride?: string) => void;
  onStop: () => void;
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
  selectedImages: ImageAttachment[];
  selectedTextFiles: TextFileAttachment[];
  onFilesSelected: (files: FileList) => Promise<void>;
  onRemoveImage: (imageId: string) => void;
  onRemoveTextFile: (fileId: string) => void;
  isProcessing: boolean;
  isConnected: boolean;
  isDragOver: boolean;
  isStopPending: boolean;
  onDragEnter: (event: DragEvent) => void;
  onDragLeave: (event: DragEvent) => void;
  onDragOver: (event: DragEvent) => void;
  onDrop: (event: DragEvent) => Promise<void>;
  onPaste: (event: ClipboardEvent) => Promise<void>;
  inputRef: RefObject<HTMLTextAreaElement | null>;
  onInputHeightChange: () => void;
  accentColor?: string;
}

export function ChatInput({
  input,
  onInputChange,
  onSend,
  onStop,
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
  selectedImages,
  selectedTextFiles,
  onFilesSelected,
  onRemoveImage,
  onRemoveTextFile,
  isProcessing,
  isConnected,
  isDragOver,
  isStopPending,
  onDragEnter,
  onDragLeave,
  onDragOver,
  onDrop,
  onPaste,
  inputRef,
  onInputHeightChange,
  accentColor,
}: ChatInputProps) {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const lastHeightRef = useRef<number>(INPUT_MIN_HEIGHT);

  const hasFiles = selectedImages.length > 0 || selectedTextFiles.length > 0;
  const canSend = (input.trim().length > 0 || hasFiles) && isConnected && !isProcessing;

  const resizeTextarea = useCallback(
    (textarea: HTMLTextAreaElement | null) => {
      if (!textarea) return;

      textarea.style.height = 'auto';
      const style = window.getComputedStyle(textarea);
      const lineHeight = Number.parseFloat(style.lineHeight) || 22;
      const paddingTop = Number.parseFloat(style.paddingTop) || 0;
      const paddingBottom = Number.parseFloat(style.paddingBottom) || 0;
      const maxHeight = lineHeight * INPUT_MAX_LINES + paddingTop + paddingBottom;
      const nextHeight = Math.max(INPUT_MIN_HEIGHT, Math.min(textarea.scrollHeight, maxHeight));

      textarea.style.height = `${nextHeight}px`;
      textarea.style.overflowY = textarea.scrollHeight > maxHeight ? 'auto' : 'hidden';

      if (nextHeight !== lastHeightRef.current) {
        lastHeightRef.current = nextHeight;
        onInputHeightChange();
      }
    },
    [onInputHeightChange]
  );

  const triggerSend = useCallback(() => {
    if (!canSend) return;
    onSend(input);
  }, [canSend, input, onSend]);

  const openFileDialog = useCallback(() => {
    if (!isConnected) return;
    fileInputRef.current?.click();
  }, [isConnected]);

  const handleFileSelection = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const files = event.currentTarget.files;
      if (!files || files.length === 0) return;
      void onFilesSelected(files);
      event.currentTarget.value = '';
    },
    [onFilesSelected]
  );

  const handleKeyDown = useCallback(
    (event: KeyboardEvent<HTMLTextAreaElement>) => {
      if (event.nativeEvent.isComposing) return;

      if (event.key === 'Escape') {
        if (!input.trim()) return;
        event.preventDefault();
        const shouldClear = window.confirm('Eingabe wirklich löschen?');
        if (shouldClear) {
          onInputChange('');
        }
        return;
      }

      if (event.key === 'Enter' && (event.ctrlKey || event.metaKey)) {
        event.preventDefault();
        triggerSend();
        return;
      }

      if (event.key === 'Enter' && !event.shiftKey) {
        event.preventDefault();
        triggerSend();
      }
    },
    [input, onInputChange, triggerSend]
  );

  useEffect(() => {
    resizeTextarea(inputRef.current);
  }, [input, inputRef, resizeTextarea]);

  return (
    <div className="border-t border-muted bg-card/50 p-2.5">
      <input
        ref={fileInputRef}
        type="file"
        className="hidden"
        accept="image/png,image/jpeg,image/jpg,image/gif,image/webp,.txt,.md,text/plain,text/markdown"
        multiple
        onChange={handleFileSelection}
      />

      <div
        className={cn(
          'flex flex-col gap-2 rounded-lg border border-muted bg-card/70 p-2 transition-colors',
          isDragOver && 'border-primary/40 bg-primary/5'
        )}
        onDragEnter={onDragEnter}
        onDragLeave={onDragLeave}
        onDragOver={onDragOver}
        onDrop={onDrop}
      >
        <ImageAttachmentPreview
          selectedImages={selectedImages}
          selectedTextFiles={selectedTextFiles}
          onOpenFileDialog={openFileDialog}
          onRemoveImage={onRemoveImage}
          onRemoveTextFile={onRemoveTextFile}
          disabled={isProcessing || !isConnected}
        />

        <Textarea
          ref={inputRef}
          value={input}
          onChange={(event) => {
            onInputChange(event.currentTarget.value);
            resizeTextarea(event.currentTarget);
          }}
          onKeyDown={handleKeyDown}
          onPaste={onPaste}
          placeholder={isDragOver ? 'Dateien hier loslassen...' : 'Nachricht schreiben...'}
          disabled={!isConnected}
          rows={1}
          data-focus-target="chat-input"
          className={cn(
            'min-h-[44px] resize-none border-muted bg-background text-sm',
            !accentColor && 'focus:border-primary/50 focus:ring-primary/20'
          )}
          style={
            accentColor && !isDragOver
              ? {
                  borderColor: `${accentColor}55`,
                }
              : undefined
          }
        />

        <p className="text-[11px] text-muted-foreground">
          Enter sendet, Shift+Enter macht eine neue Zeile, Esc leert die Eingabe.
        </p>

        <ChatInputToolbar
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
          hasFiles={hasFiles}
          canSend={canSend}
          isProcessing={isProcessing}
          isConnected={isConnected}
          isStopping={isStopPending}
          onOpenFileDialog={openFileDialog}
          onSend={triggerSend}
          onStop={onStop}
        />
      </div>
    </div>
  );
}
