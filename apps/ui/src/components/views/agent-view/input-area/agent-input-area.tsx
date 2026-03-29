import { ImageDropZone } from '@/components/ui/image-drop-zone';
import type { ImageAttachment, TextFileAttachment } from '@/store/app-store';
import { cn } from '@/lib/utils';
import type { PhaseModelEntry } from '@automaker/types';
import { FilePreview } from './file-preview';
import { QueueDisplay } from './queue-display';
import { InputControls } from './input-controls';
import { SelectedPromptsDisplay } from './selected-prompts-display';

interface QueueItem {
  id: string;
  message: string;
  imagePaths?: string[];
}

interface AgentInputAreaProps {
  input: string;
  onInputChange: (value: string) => void;
  onSend: (messageOverride?: string) => void;
  onStop: () => void;
  /** Current model selection (model + optional thinking level) */
  modelSelection: PhaseModelEntry;
  /** Callback when model is selected */
  onModelSelect: (entry: PhaseModelEntry) => void;
  isProcessing: boolean;
  isConnected: boolean;
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
  // File attachments
  selectedImages: ImageAttachment[];
  selectedTextFiles: TextFileAttachment[];
  showImageDropZone: boolean;
  isDragOver: boolean;
  onImagesSelected: (images: ImageAttachment[]) => void;
  onToggleImageDropZone: () => void;
  onRemoveImage: (imageId: string) => void;
  onRemoveTextFile: (fileId: string) => void;
  onClearAllFiles: () => void;
  onDragEnter: (e: React.DragEvent) => void;
  onDragLeave: (e: React.DragEvent) => void;
  onDragOver: (e: React.DragEvent) => void;
  onDrop: (e: React.DragEvent) => Promise<void>;
  onPaste: (e: React.ClipboardEvent) => Promise<void>;
  // Queue
  serverQueue: QueueItem[];
  onRemoveFromQueue: (id: string) => void;
  onClearQueue: () => void;
  // Refs
  inputRef?: React.RefObject<HTMLTextAreaElement | null>;
  /** Project accent color for border/focus styling */
  accentColor?: string;
  /** Called when the textarea height changes (e.g. during speech input) so the parent can scroll the message list */
  onInputHeightChange?: () => void;
  /** Callback to create a new session */
  onNewSession?: () => void;
  /** Activity state of the currently opened chat session */
  chatActivityState?: 'idle' | 'running' | 'stopped';
  /** Run-ID of the currently opened session (if orchestrator session). */
  activeSessionOrchestratorRunId?: string | null;
}

export function AgentInputArea({
  input,
  onInputChange,
  onSend,
  onStop,
  modelSelection,
  onModelSelect,
  isProcessing,
  isConnected,
  projectPath,
  elapsedSeconds = 0,
  estimatedContextTokens = 0,
  contextWindowTokens = null,
  modelContextWindowTokens = null,
  isModelContextLookupReady = false,
  isContextUsageMeasured = false,
  contextUsagePercent = null,
  selectedImages,
  selectedTextFiles,
  showImageDropZone,
  isDragOver,
  onImagesSelected,
  onToggleImageDropZone,
  onRemoveImage,
  onRemoveTextFile,
  onClearAllFiles,
  onDragEnter,
  onDragLeave,
  onDragOver,
  onDrop,
  onPaste,
  serverQueue,
  onRemoveFromQueue,
  onClearQueue,
  inputRef,
  accentColor,
  onInputHeightChange,
  onNewSession,
  chatActivityState = 'idle',
  activeSessionOrchestratorRunId = null,
}: AgentInputAreaProps) {
  const hasFiles = selectedImages.length > 0 || selectedTextFiles.length > 0;

  return (
    <div
      className={cn(
        'border-t border-border p-2.5 bg-card/50 backdrop-blur-sm flex-shrink-0 transition-colors duration-200',
        chatActivityState === 'running' && 'border-t-2 border-amber-500 bg-amber-500/5',
        chatActivityState === 'stopped' && 'border-t-2 border-red-500 bg-red-500/5'
      )}
    >
      {/* Image Drop Zone (when visible) */}
      {showImageDropZone && (
        <ImageDropZone
          onImagesSelected={onImagesSelected}
          images={selectedImages}
          maxFiles={5}
          className="mb-4"
          disabled={!isConnected}
        />
      )}

      {/* Queued Prompts List */}
      <QueueDisplay
        serverQueue={serverQueue}
        onRemoveFromQueue={onRemoveFromQueue}
        onClearQueue={onClearQueue}
      />

      {/* Selected Files Preview - only show when ImageDropZone is hidden */}
      {!showImageDropZone && (
        <FilePreview
          selectedImages={selectedImages}
          selectedTextFiles={selectedTextFiles}
          isProcessing={isProcessing}
          onRemoveImage={onRemoveImage}
          onRemoveTextFile={onRemoveTextFile}
          onClearAll={onClearAllFiles}
        />
      )}

      {/* Selected Agent Prompts Display */}
      <SelectedPromptsDisplay />

      {/* Input Controls */}
      <InputControls
        input={input}
        onInputChange={onInputChange}
        onSend={onSend}
        onStop={onStop}
        onPaste={onPaste}
        modelSelection={modelSelection}
        onModelSelect={onModelSelect}
        isProcessing={isProcessing}
        isConnected={isConnected}
        hasFiles={hasFiles}
        isDragOver={isDragOver}
        projectPath={projectPath}
        elapsedSeconds={elapsedSeconds}
        estimatedContextTokens={estimatedContextTokens}
        contextWindowTokens={contextWindowTokens}
        modelContextWindowTokens={modelContextWindowTokens}
        isModelContextLookupReady={isModelContextLookupReady}
        isContextUsageMeasured={isContextUsageMeasured}
        contextUsagePercent={contextUsagePercent}
        onDragEnter={onDragEnter}
        onDragLeave={onDragLeave}
        onDragOver={onDragOver}
        onDrop={onDrop}
        inputRef={inputRef}
        accentColor={accentColor}
        onInputHeightChange={onInputHeightChange}
        onNewSession={onNewSession}
        activeSessionOrchestratorRunId={activeSessionOrchestratorRunId}
      />
    </div>
  );
}
