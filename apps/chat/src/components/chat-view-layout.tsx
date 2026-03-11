import type { ClipboardEvent, DragEvent } from 'react';
import type { PhaseModelEntry } from '@automaker/types';
import type { Project } from '@/lib/electron';
import type { ImageAttachment, TextFileAttachment } from '@/store/app-store';
import type { Message } from '@/types/electron';
import { ChatCenter } from './chat-center';
import { ChatHeader } from './chat-header';
import { ChatLayoutV2 } from './chat-layout-v2';
import { ChatSidebarLeft } from './chat-sidebar-left';
import { ChatSidebarRight } from './chat-sidebar-right';
import { ChatStatusBar } from './chat-status-bar';
import { ShortcutHelpDialog } from './shortcut-help-dialog';
import type { SidebarTab } from '../hooks/use-chat-panel-preferences';
import type { HistoryListItem, HistoryStatusFilter, HistoryTimeFilter } from './history-types';
import type { ThinkingIntensity } from './mode-toggles';
import type { SessionTabItem } from './session-tab-bar';

interface ChatViewLayoutProps {
  currentProject: null | Project;
  projects: Project[];
  tabSessions: SessionTabItem[];
  activeSessionId: null | string;
  isConnected: boolean;
  isProcessing: boolean;
  currentTool: null | string;
  leftOpen: boolean;
  rightOpen: boolean;
  isCreatingSession: boolean;
  filteredHistoryItems: HistoryListItem[];
  totalHistoryItems: number;
  searchHistory: string;
  historyStatusFilter: HistoryStatusFilter;
  historyTimeFilter: HistoryTimeFilter;
  setSearchHistory: (value: string) => void;
  setHistoryStatusFilter: (value: HistoryStatusFilter) => void;
  setHistoryTimeFilter: (value: HistoryTimeFilter) => void;
  currentSessionName: null | string;
  currentSessionDescription: null | string;
  messages: Message[];
  elapsedSeconds: number;
  selectedAgentModel: PhaseModelEntry;
  thinkingEnabled: boolean;
  thinkingIntensity: ThinkingIntensity;
  orchestratorEnabled: boolean;
  orchestratorIteration: number;
  orchestratorRunId: null | string;
  input: string;
  isStopPending: boolean;
  selectedImages: ImageAttachment[];
  selectedTextFiles: TextFileAttachment[];
  isDragOver: boolean;
  inputAreaRef: React.RefObject<HTMLTextAreaElement | null>;
  messagesContainerRef: React.RefObject<HTMLDivElement | null>;
  showScrollToBottom: boolean;
  estimatedInputTokens: number;
  estimatedOutputTokens: number;
  estimatedCostLabel: string;
  error: null | string;
  isSavingChat: boolean;
  leftWidth: number;
  rightWidth: number;
  onProjectSelect: (project: Project) => void;
  onSelectSession: (sessionId: string) => void;
  onCreateSession: () => Promise<void>;
  onCloseSession: (sessionId: string) => Promise<boolean>;
  onCloseOtherSessions: (sessionId: string) => Promise<void>;
  onRenameSession: (sessionId: string, nextName: string) => Promise<boolean>;
  onArchiveSession: (sessionId: string) => Promise<boolean>;
  onDeleteSession: (sessionId: string) => Promise<boolean>;
  onToggleLeft: () => void;
  onToggleRight: () => void;
  onCopyAll: () => Promise<void>;
  onSaveChat: () => Promise<void>;
  onOpenSettings: () => void;
  onOpenShortcutHelp: () => void;
  shortcutHelpOpen: boolean;
  onShortcutHelpOpenChange: (open: boolean) => void;
  onModelSelect: (entry: PhaseModelEntry) => void;
  onThinkingEnabledChange: (enabled: boolean) => void;
  onThinkingIntensityChange: (intensity: ThinkingIntensity) => void;
  onOrchestratorEnabledChange: (enabled: boolean) => void;
  onInputChange: (value: string) => void;
  onSend: (messageOverride?: string) => Promise<void>;
  onStop: () => void;
  onFilesSelected: (files: FileList) => Promise<void>;
  onRemoveImage: (imageId: string) => void;
  onRemoveTextFile: (fileId: string) => void;
  onDragEnter: (event: DragEvent) => void;
  onDragLeave: (event: DragEvent) => void;
  onDragOver: (event: DragEvent) => void;
  onDrop: (event: DragEvent) => Promise<void>;
  onPaste: (event: ClipboardEvent) => Promise<void>;
  onInputHeightChange: () => void;
  onMessagesScroll: () => void;
  onScrollToBottom: () => void;
  setLeftOpen: React.Dispatch<React.SetStateAction<boolean>>;
  setRightOpen: React.Dispatch<React.SetStateAction<boolean>>;
  setLeftWidth: React.Dispatch<React.SetStateAction<number>>;
  setRightWidth: React.Dispatch<React.SetStateAction<number>>;
  activeSidebarTab: SidebarTab;
  onSidebarTabChange: (tab: SidebarTab) => void;
}

export function ChatViewLayout({
  currentProject,
  projects,
  tabSessions,
  activeSessionId,
  isConnected,
  isProcessing,
  currentTool,
  leftOpen,
  rightOpen,
  isCreatingSession,
  filteredHistoryItems,
  totalHistoryItems,
  searchHistory,
  historyStatusFilter,
  historyTimeFilter,
  setSearchHistory,
  setHistoryStatusFilter,
  setHistoryTimeFilter,
  currentSessionName,
  currentSessionDescription,
  messages,
  elapsedSeconds,
  selectedAgentModel,
  thinkingEnabled,
  thinkingIntensity,
  orchestratorEnabled,
  orchestratorIteration,
  orchestratorRunId,
  input,
  isStopPending,
  selectedImages,
  selectedTextFiles,
  isDragOver,
  inputAreaRef,
  messagesContainerRef,
  showScrollToBottom,
  estimatedInputTokens,
  estimatedOutputTokens,
  estimatedCostLabel,
  error,
  isSavingChat,
  leftWidth,
  rightWidth,
  onProjectSelect,
  onSelectSession,
  onCreateSession,
  onCloseSession,
  onCloseOtherSessions,
  onRenameSession,
  onArchiveSession,
  onDeleteSession,
  onToggleLeft,
  onToggleRight,
  onCopyAll,
  onSaveChat,
  onOpenSettings,
  onOpenShortcutHelp,
  shortcutHelpOpen,
  onShortcutHelpOpenChange,
  onModelSelect,
  onThinkingEnabledChange,
  onThinkingIntensityChange,
  onOrchestratorEnabledChange,
  onInputChange,
  onSend,
  onStop,
  onFilesSelected,
  onRemoveImage,
  onRemoveTextFile,
  onDragEnter,
  onDragLeave,
  onDragOver,
  onDrop,
  onPaste,
  onInputHeightChange,
  onMessagesScroll,
  onScrollToBottom,
  setLeftOpen,
  setRightOpen,
  setLeftWidth,
  setRightWidth,
  activeSidebarTab,
  onSidebarTabChange,
}: ChatViewLayoutProps) {
  return (
    <div className="flex h-full min-h-0 flex-1 overflow-hidden" data-testid="chat-view-v2">
      <ChatLayoutV2
        header={
          <ChatHeader
            currentProject={currentProject as Project}
            projects={projects}
            sessions={tabSessions}
            currentSessionId={activeSessionId}
            isConnected={isConnected}
            currentTool={currentTool}
            leftOpen={leftOpen}
            rightOpen={rightOpen}
            isCreatingSession={isCreatingSession}
            onProjectSelect={onProjectSelect}
            onSelectSession={onSelectSession}
            onNewChat={() => {
              void onCreateSession();
            }}
            onCloseSession={(sessionId) => {
              void onCloseSession(sessionId);
            }}
            onCloseOtherSessions={(sessionId) => {
              void onCloseOtherSessions(sessionId);
            }}
            onRenameSession={onRenameSession}
            onToggleLeft={onToggleLeft}
            onToggleRight={onToggleRight}
            onCopyAll={() => {
              void onCopyAll();
            }}
            onSaveChat={() => {
              void onSaveChat();
            }}
            onOpenSettings={onOpenSettings}
            onOpenShortcutHelp={onOpenShortcutHelp}
            copyDisabled={messages.length === 0}
            saveDisabled={messages.length === 0 || isSavingChat}
          />
        }
        leftSidebar={
          <ChatSidebarLeft
            items={filteredHistoryItems}
            totalItemCount={totalHistoryItems}
            currentSessionId={activeSessionId}
            searchQuery={searchHistory}
            statusFilter={historyStatusFilter}
            timeFilter={historyTimeFilter}
            onSearchQueryChange={setSearchHistory}
            onStatusFilterChange={setHistoryStatusFilter}
            onTimeFilterChange={setHistoryTimeFilter}
            onSelectSession={onSelectSession}
            onCreateSession={() => {
              void onCreateSession();
            }}
            onRenameSession={onRenameSession}
            onArchiveSession={onArchiveSession}
            onDeleteSession={onDeleteSession}
            onClose={() => setLeftOpen(false)}
            activeSidebarTab={activeSidebarTab}
            onSidebarTabChange={onSidebarTabChange}
          />
        }
        center={
          <ChatCenter
            currentSessionId={activeSessionId}
            currentSessionName={currentSessionName}
            currentSessionDescription={currentSessionDescription}
            messages={messages}
            isProcessing={isProcessing}
            elapsedSeconds={elapsedSeconds}
            isConnected={isConnected}
            modelSelection={selectedAgentModel}
            onModelSelect={onModelSelect}
            thinkingEnabled={thinkingEnabled}
            thinkingIntensity={thinkingIntensity}
            onThinkingEnabledChange={onThinkingEnabledChange}
            onThinkingIntensityChange={onThinkingIntensityChange}
            orchestratorEnabled={orchestratorEnabled}
            orchestratorIteration={orchestratorIteration}
            orchestratorRunId={orchestratorRunId}
            onOrchestratorEnabledChange={onOrchestratorEnabledChange}
            input={input}
            onInputChange={onInputChange}
            onSend={(messageOverride?: string) => {
              void onSend(messageOverride);
            }}
            onStop={onStop}
            isStopPending={isStopPending}
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
            inputRef={inputAreaRef}
            onInputHeightChange={onInputHeightChange}
            messagesContainerRef={messagesContainerRef}
            onMessagesScroll={onMessagesScroll}
            showScrollToBottom={showScrollToBottom}
            onScrollToBottom={onScrollToBottom}
            accentColor={currentProject?.badgeColor || currentProject?.backgroundColor}
          />
        }
        rightSidebar={
          <ChatSidebarRight
            projectPath={currentProject?.path ?? null}
            onClose={() => setRightOpen(false)}
          />
        }
        statusBar={
          <ChatStatusBar
            modelSelection={selectedAgentModel}
            isConnected={isConnected}
            isProcessing={isProcessing}
            inputTokens={estimatedInputTokens}
            outputTokens={estimatedOutputTokens}
            estimatedCost={estimatedCostLabel}
            errorMessage={error}
            orchestratorEnabled={orchestratorEnabled}
            orchestratorIteration={orchestratorIteration}
            orchestratorRunId={orchestratorRunId}
          />
        }
        leftOpen={leftOpen}
        rightOpen={rightOpen}
        leftWidth={leftWidth}
        rightWidth={rightWidth}
        onLeftOpenChange={setLeftOpen}
        onRightOpenChange={setRightOpen}
        onLeftWidthChange={setLeftWidth}
        onRightWidthChange={setRightWidth}
      />
      <ShortcutHelpDialog open={shortcutHelpOpen} onOpenChange={onShortcutHelpOpenChange} />
    </div>
  );
}
