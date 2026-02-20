import { useState, useCallback, useRef, useEffect } from 'react';
import { useAppStore } from '@/store/app-store';
import { useAgentPromptsStore } from '@/store/agent-prompts-store';
import { useTimeLimiterStore } from '@/store/time-limiter-store';
import { useOrchestratorStore } from '@/store/orchestrator-store';
import { useElectronAgent } from '@/hooks/use-electron-agent';
import { SessionManager } from '@/components/session-manager';
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from '@/components/ui/resizable';
import { generateContextSummary } from '@/lib/copy-all-chat';
import { useSessions } from '@/hooks/queries/use-sessions';
import { useSessionQueryInvalidation } from '@/hooks/use-query-invalidation';
import { createLogger } from '@automaker/utils/logger';

// Extracted hooks
import {
  useAgentScroll,
  useFileAttachments,
  useAgentShortcuts,
  useAgentSession,
  useAgentWorktreeActions,
} from './agent-view/hooks';

// Extracted components
import { NoProjectState, AgentHeader, ChatArea, BrowserPanel } from './agent-view/components';
import { AgentInputArea } from './agent-view/input-area';
import {
  ViewWorktreeChangesDialog,
  PushToRemoteDialog,
  MergeWorktreeDialog,
} from '../views/board-view/dialogs';
import { DevServerLogsPanel } from '../views/board-view/worktree-panel/components';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { TestLogsPanel } from '@/components/ui/test-logs-panel';
import { Undo2 } from 'lucide-react';

/** Tailwind lg breakpoint in pixels */
const LG_BREAKPOINT = 1024;
/** Breakpoint above which all three panels can coexist */
const XL_BREAKPOINT = 1440;
const logger = createLogger('AgentView');

export function AgentView() {
  const {
    currentProject,
    projects,
    setCurrentProject,
    selectedAgentModel,
    setSelectedAgentModel,
    browserPanelOpen,
    setBrowserPanelOpen,
  } = useAppStore();
  const [input, setInput] = useState('');
  const [currentTool, setCurrentTool] = useState<string | null>(null);
  const [isDesktop, setIsDesktop] = useState(true);
  // Initialize session manager state - starts as true to match SSR
  // Then updates on mount based on actual screen size to prevent hydration mismatch
  const [showSessionManager, setShowSessionManager] = useState(true);

  // Update session manager visibility based on screen size after mount and on resize
  useEffect(() => {
    const updateViewportState = () => {
      const desktop = window.innerWidth >= LG_BREAKPOINT;
      setIsDesktop(desktop);
      setShowSessionManager(desktop);
      // Auto-close browser panel on mobile (it's not supported below lg)
      if (!desktop) {
        setBrowserPanelOpen(false);
      }
    };

    // Set initial value
    updateViewportState();

    // Listen for resize events
    window.addEventListener('resize', updateViewportState);
    return () => window.removeEventListener('resize', updateViewportState);
  }, [setBrowserPanelOpen]);

  // Model selection now persisted via app-store
  const modelSelection = selectedAgentModel;
  const setModelSelection = setSelectedAgentModel;

  useEffect(() => {
    const ultraModeActive =
      modelSelection.thinkingLevel === 'ultrathink' || modelSelection.reasoningEffort === 'xhigh';
    logger.info('[ModelSelection]', {
      model: modelSelection.model,
      providerId: modelSelection.providerId ?? null,
      thinkingLevel: modelSelection.thinkingLevel ?? 'none',
      reasoningEffort: modelSelection.reasoningEffort ?? 'none',
      ultraModeActive,
    });
  }, [
    modelSelection.model,
    modelSelection.providerId,
    modelSelection.thinkingLevel,
    modelSelection.reasoningEffort,
  ]);

  const handleToolUse = useCallback((toolName: string) => {
    setCurrentTool(toolName);
    setTimeout(() => setCurrentTool(null), 2000);
  }, []);

  // Input ref for auto-focus
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Ref for quick create session function from SessionManager
  const quickCreateSessionRef = useRef<(() => Promise<void>) | null>(null);

  // Session management hook
  const { currentSessionId, handleSelectSession } = useAgentSession({
    projectPath: currentProject?.path,
  });

  // Invalidate session queries when WebSocket events arrive (e.g. session_metadata_updated, complete)
  useSessionQueryInvalidation(currentSessionId ?? undefined);

  // Session name for Save-to-Docs feature
  const { data: allSessions = [] } = useSessions(true);
  const currentSessionName = allSessions.find((s) => s.id === currentSessionId)?.name ?? null;

  // Use the Electron agent hook (only if we have a session)
  const {
    messages,
    isProcessing,
    isConnected,
    sendMessage,
    clearHistory,
    stopExecution,
    serverQueue,
    addToServerQueue,
    removeFromServerQueue,
    clearServerQueue,
  } = useElectronAgent({
    sessionId: currentSessionId || '',
    workingDirectory: currentProject?.path,
    model: modelSelection.model,
    thinkingLevel: modelSelection.thinkingLevel,
    reasoningEffort: modelSelection.reasoningEffort,
    onToolUse: handleToolUse,
  });

  // File attachments hook
  const fileAttachments = useFileAttachments({
    isProcessing,
    isConnected,
    projectPath: currentProject?.path,
    onInsertText: (text) => {
      setInput((prev) => {
        const trimmed = prev.replace(/\s+$/, '');
        const prefix = trimmed.length > 0 ? '\n\n' : '';
        return `${trimmed}${prefix}${text}\n`;
      });
    },
  });

  // Scroll management hook
  const { messagesContainerRef, handleScroll, scrollToBottom, isUserAtBottom } = useAgentScroll({
    messagesLength: messages.length,
    currentSessionId,
  });

  // Scroll message list when input area height changes (e.g. during speech input)
  const handleInputHeightChange = useCallback(() => {
    if (isUserAtBottom) {
      scrollToBottom('smooth');
    }
  }, [isUserAtBottom, scrollToBottom]);

  // Keyboard shortcuts hook
  useAgentShortcuts({
    currentProject,
    quickCreateSessionRef,
  });

  // Worktree actions for the Agent Header
  const worktreeActions = useAgentWorktreeActions({
    projectPath: currentProject?.path,
  });

  // Get agent prompts store
  const getSelectedPromptsText = useAgentPromptsStore((state) => state.getSelectedPromptsText);

  // Time limiter store
  const {
    isEnabled: timeLimiterEnabled,
    startProcessing: timeLimiterStartProcessing,
    stopProcessing: timeLimiterStopProcessing,
    resetTimer: timeLimiterResetTimer,
    getElapsedSeconds,
    isTimeExceeded,
    pendingCopiedContent,
    setPendingCopiedContent,
    clearPendingContent,
  } = useTimeLimiterStore();

  // Track elapsed seconds for display
  const [elapsedSeconds, setElapsedSeconds] = useState(0);

  // Reset timer when session changes
  useEffect(() => {
    if (currentSessionId) {
      timeLimiterResetTimer();
      setElapsedSeconds(0);
    }
  }, [currentSessionId, timeLimiterResetTimer]);

  // Start/stop timer based on isProcessing transitions
  const wasProcessingForTimerRef = useRef(false);
  useEffect(() => {
    const wasProcessing = wasProcessingForTimerRef.current;
    wasProcessingForTimerRef.current = isProcessing;

    if (!timeLimiterEnabled) return;

    if (!wasProcessing && isProcessing) {
      // Agent started processing → start the timer
      timeLimiterStartProcessing();
    } else if (wasProcessing && !isProcessing) {
      // Agent finished processing → stop/accumulate the timer
      timeLimiterStopProcessing();
      // Update display with final accumulated value
      setElapsedSeconds(getElapsedSeconds());
    }
  }, [
    isProcessing,
    timeLimiterEnabled,
    timeLimiterStartProcessing,
    timeLimiterStopProcessing,
    getElapsedSeconds,
  ]);

  // Update elapsed seconds every second (only while processing)
  useEffect(() => {
    if (!currentSessionId || !timeLimiterEnabled || !isProcessing) return;

    const interval = setInterval(() => {
      setElapsedSeconds(getElapsedSeconds());
    }, 1000);

    // Also set immediately when processing starts
    setElapsedSeconds(getElapsedSeconds());

    return () => clearInterval(interval);
  }, [currentSessionId, timeLimiterEnabled, isProcessing, getElapsedSeconds]);

  // Handle pending content from previous session (paste into new session)
  useEffect(() => {
    if (pendingCopiedContent && currentSessionId && isConnected && !isProcessing) {
      // Set the pending content as input
      setInput(pendingCopiedContent);
      clearPendingContent();
    }
  }, [pendingCopiedContent, currentSessionId, isConnected, isProcessing, clearPendingContent]);

  // Auto-session-switch when time limit is exceeded
  useEffect(() => {
    if (!timeLimiterEnabled || !currentSessionId || !isConnected) return;
    if (!isTimeExceeded()) return;
    if (isProcessing) return; // Don't switch while processing

    // Only trigger once per session
    const handleTimeExceeded = async () => {
      // Generate context summary
      const contextSummary = generateContextSummary(messages);

      // Store the content to paste into new session
      setPendingCopiedContent(contextSummary);

      // Create new session
      if (quickCreateSessionRef.current) {
        await quickCreateSessionRef.current();
      }
    };

    handleTimeExceeded();
  }, [
    timeLimiterEnabled,
    currentSessionId,
    isConnected,
    isProcessing,
    messages,
    isTimeExceeded,
    setPendingCopiedContent,
  ]);

  // Orchestrator store
  const {
    isEnabled: orchestratorEnabled,
    shouldTrigger: orchestratorShouldTrigger,
    incrementIteration: orchestratorIncrementIteration,
    setPendingContent: setOrchestratorPendingContent,
    pendingOrchestratorContent,
    clearPendingContent: clearOrchestratorPendingContent,
    autoSendEnabled: orchestratorAutoSend,
  } = useOrchestratorStore();

  // Track previous isProcessing to detect complete events (true → false)
  const wasProcessingRef = useRef(false);

  // Detect when processing finishes and check for orchestrator trigger
  useEffect(() => {
    const wasProcessing = wasProcessingRef.current;
    wasProcessingRef.current = isProcessing;

    // Only trigger when processing transitions from true → false
    if (!wasProcessing || isProcessing) return;
    if (!orchestratorEnabled || !currentSessionId || !isConnected) return;

    // Find the last assistant message
    const lastAssistantMessage = [...messages].reverse().find((m) => m.role === 'assistant');
    if (!lastAssistantMessage) return;

    // Check if the trigger keyword is present
    if (!orchestratorShouldTrigger(lastAssistantMessage.content)) return;

    // Increment iteration (returns false if max reached)
    const canContinue = orchestratorIncrementIteration();
    if (!canContinue) return;

    // Store the last AI message as pending content for the new chat
    setOrchestratorPendingContent(lastAssistantMessage.content);

    // Create a new session
    if (quickCreateSessionRef.current) {
      quickCreateSessionRef.current();
    }
  }, [
    isProcessing,
    orchestratorEnabled,
    currentSessionId,
    isConnected,
    messages,
    orchestratorShouldTrigger,
    orchestratorIncrementIteration,
    setOrchestratorPendingContent,
  ]);

  // Handle pending orchestrator content in new session
  useEffect(() => {
    if (!pendingOrchestratorContent || !currentSessionId || !isConnected || isProcessing) return;

    const content = pendingOrchestratorContent;
    clearOrchestratorPendingContent();

    if (orchestratorAutoSend) {
      // Auto-send: set input and trigger send immediately
      setInput(content);
      // Use setTimeout to ensure input state is set before sending
      setTimeout(() => {
        sendMessage(content);
      }, 100);
    } else {
      // Just paste into input
      setInput(content);
    }
  }, [
    pendingOrchestratorContent,
    currentSessionId,
    isConnected,
    isProcessing,
    clearOrchestratorPendingContent,
    orchestratorAutoSend,
    sendMessage,
  ]);

  // Handle send message
  const handleSend = useCallback(
    async (messageOverride?: string) => {
      const {
        selectedImages,
        selectedTextFiles,
        setSelectedImages,
        setSelectedTextFiles,
        setShowImageDropZone,
      } = fileAttachments;

      const messageInput = messageOverride ?? input;
      if (!messageInput.trim() && selectedImages.length === 0 && selectedTextFiles.length === 0) {
        return;
      }

      // Get selected agent prompts and prepend to message
      const agentPromptsText = getSelectedPromptsText();
      let messageContent = messageInput;
      if (agentPromptsText) {
        messageContent = agentPromptsText + '\n\n---\n\n' + messageInput;
      }

      const messageImages = selectedImages;
      const messageTextFiles = selectedTextFiles;

      setInput('');
      setSelectedImages([]);
      setSelectedTextFiles([]);
      setShowImageDropZone(false);

      // If already processing, add to server queue instead
      if (isProcessing) {
        await addToServerQueue(messageContent, messageImages, messageTextFiles);
      } else {
        await sendMessage(messageContent, messageImages, messageTextFiles);
      }
    },
    [input, fileAttachments, isProcessing, sendMessage, addToServerQueue, getSelectedPromptsText]
  );

  const handleClearChat = async () => {
    if (!confirm('Are you sure you want to clear this conversation?')) return;
    await clearHistory();
  };

  const handleShowSessionManager = useCallback(() => {
    setShowSessionManager(true);
  }, []);

  const handleHideSessionManager = useCallback(() => {
    setShowSessionManager(false);
  }, []);

  const handleToggleSessionManager = useCallback(() => {
    setShowSessionManager((previous) => {
      const willShow = !previous;
      // On mid-size viewports, auto-close browser panel when opening session manager
      if (willShow && window.innerWidth < XL_BREAKPOINT && browserPanelOpen) {
        setBrowserPanelOpen(false);
      }
      return willShow;
    });
  }, [browserPanelOpen, setBrowserPanelOpen]);

  // On mid-size viewports (1024-1440px), auto-close session manager when browser opens
  useEffect(() => {
    if (browserPanelOpen && isDesktop && window.innerWidth < XL_BREAKPOINT && showSessionManager) {
      setShowSessionManager(false);
    }
  }, [browserPanelOpen, isDesktop]);

  // Auto-focus input when session is selected/changed
  useEffect(() => {
    if (currentSessionId && inputRef.current) {
      setTimeout(() => {
        inputRef.current?.focus();
      }, 200);
    }
  }, [currentSessionId]);

  // Auto-close session manager on mobile when a session is selected
  useEffect(() => {
    if (currentSessionId && typeof window !== 'undefined' && window.innerWidth < 1024) {
      setShowSessionManager(false);
    }
  }, [currentSessionId]);

  const displayMessages = messages;

  if (!currentProject) {
    return <NoProjectState />;
  }

  // Build worktree actions props for the AgentHeader
  const worktreeActionsProps = worktreeActions.mainWorktree
    ? {
        mainWorktree: worktreeActions.mainWorktree,
        aheadCount: worktreeActions.aheadCount,
        behindCount: worktreeActions.behindCount,
        hasRemoteBranch: worktreeActions.hasRemoteBranch,
        gitRepoStatus: worktreeActions.gitRepoStatus,
        isStartingDevServer: worktreeActions.isStartingDevServer,
        isDevServerRunning: worktreeActions.isDevServerRunning,
        devServerInfo: worktreeActions.devServerInfo,
        isPulling: worktreeActions.isPulling,
        isPushing: worktreeActions.isPushing,
        isAutoModeRunning: worktreeActions.isAutoModeRunning,
        hasTestCommand: worktreeActions.hasTestCommand,
        isStartingTests: worktreeActions.isStartingTests,
        isTestRunning: worktreeActions.isTestRunning,
        testSessionInfo: worktreeActions.testSessionInfo,
        hasInitScript: worktreeActions.hasInitScript,
        onOpenChange: worktreeActions.handleActionsDropdownOpenChange,
        onPull: worktreeActions.handlePull,
        onPush: worktreeActions.handlePush,
        onPushNewBranch: worktreeActions.handlePushNewBranch,
        onOpenInEditor: worktreeActions.handleOpenInEditor,
        onOpenInIntegratedTerminal: worktreeActions.handleOpenInIntegratedTerminal,
        onOpenInExternalTerminal: worktreeActions.handleOpenInExternalTerminal,
        onViewChanges: worktreeActions.handleViewChanges,
        onDiscardChanges: worktreeActions.handleDiscardChanges,
        onCommit: worktreeActions.handleCommit,
        onCreatePR: worktreeActions.handleCreatePR,
        onAddressPRComments: worktreeActions.handleAddressPRComments,
        onResolveConflicts: worktreeActions.handleResolveConflicts,
        onDeleteWorktree: worktreeActions.handleDeleteWorktree,
        onStartDevServer: worktreeActions.handleStartDevServer,
        onStopDevServer: worktreeActions.handleStopDevServer,
        onOpenDevServerUrl: worktreeActions.handleOpenDevServerUrl,
        onViewDevServerLogs: worktreeActions.handleViewDevServerLogs,
        onRunInitScript: worktreeActions.handleRunInitScript,
        onToggleAutoMode: worktreeActions.handleToggleAutoMode,
        onMerge: worktreeActions.handleMerge,
        onStartTests: worktreeActions.handleStartTests,
        onStopTests: worktreeActions.handleStopTests,
        onViewTestLogs: worktreeActions.handleViewTestLogs,
      }
    : undefined;

  return (
    <div className="flex-1 flex overflow-hidden bg-background" data-testid="agent-view">
      {/* Mobile backdrop overlay for Session Manager */}
      {!isDesktop && showSessionManager && currentProject && (
        <div
          className="fixed inset-0 bg-black/50 z-20"
          onClick={handleHideSessionManager}
          data-testid="session-manager-backdrop"
        />
      )}

      {/* Mobile Session Manager - fixed overlay */}
      {!isDesktop && showSessionManager && currentProject && (
        <div className="fixed inset-y-0 left-0 w-72 z-30 border-r border-border shrink-0 bg-card">
          <SessionManager
            currentSessionId={currentSessionId}
            onSelectSession={handleSelectSession}
            projectPath={currentProject.path}
            isCurrentSessionThinking={isProcessing}
            onQuickCreateRef={quickCreateSessionRef}
          />
        </div>
      )}

      {isDesktop ? (
        <ResizablePanelGroup direction="horizontal" className="flex" autoSaveId="agent-view-panels">
          {/* Session Manager Sidebar - Desktop (resizable) */}
          {showSessionManager && currentProject && (
            <>
              <ResizablePanel
                id="session-manager"
                defaultSize={20}
                minSize={15}
                maxSize={35}
                className="bg-card border-r border-border"
              >
                <SessionManager
                  currentSessionId={currentSessionId}
                  onSelectSession={handleSelectSession}
                  projectPath={currentProject.path}
                  isCurrentSessionThinking={isProcessing}
                  onQuickCreateRef={quickCreateSessionRef}
                />
              </ResizablePanel>
              <ResizableHandle withHandle />
            </>
          )}

          {/* Chat Area - Desktop */}
          <ResizablePanel id="chat-area" defaultSize={60} minSize={30}>
            <div className="flex-1 flex flex-col overflow-hidden h-full">
              {/* Header */}
              <AgentHeader
                currentProject={currentProject}
                projects={projects}
                onProjectSelect={setCurrentProject}
                currentSessionId={currentSessionId}
                isConnected={isConnected}
                isProcessing={isProcessing}
                currentTool={currentTool}
                messagesCount={messages.length}
                showSessionManager={showSessionManager}
                onToggleSessionManager={handleToggleSessionManager}
                onClearChat={handleClearChat}
                worktreeActions={worktreeActionsProps}
              />

              {/* Messages */}
              <ChatArea
                currentSessionId={currentSessionId}
                messages={displayMessages}
                isProcessing={isProcessing}
                showSessionManager={showSessionManager}
                messagesContainerRef={messagesContainerRef}
                onScroll={handleScroll}
                onShowSessionManager={handleShowSessionManager}
                chatBackgroundColor={currentProject?.chatBackgroundColor}
              />

              {/* Input Area */}
              {currentSessionId && (
                <AgentInputArea
                  input={input}
                  onInputChange={setInput}
                  onSend={handleSend}
                  onStop={stopExecution}
                  modelSelection={modelSelection}
                  onModelSelect={setModelSelection}
                  isProcessing={isProcessing}
                  isConnected={isConnected}
                  projectPath={currentProject?.path || null}
                  messages={messages}
                  elapsedSeconds={elapsedSeconds}
                  sessionName={currentSessionName}
                  selectedImages={fileAttachments.selectedImages}
                  selectedTextFiles={fileAttachments.selectedTextFiles}
                  showImageDropZone={fileAttachments.showImageDropZone}
                  isDragOver={fileAttachments.isDragOver}
                  onImagesSelected={fileAttachments.handleImagesSelected}
                  onToggleImageDropZone={fileAttachments.toggleImageDropZone}
                  onRemoveImage={fileAttachments.removeImage}
                  onRemoveTextFile={fileAttachments.removeTextFile}
                  onClearAllFiles={fileAttachments.clearAllFiles}
                  onDragEnter={fileAttachments.handleDragEnter}
                  onDragLeave={fileAttachments.handleDragLeave}
                  onDragOver={fileAttachments.handleDragOver}
                  onDrop={fileAttachments.handleDrop}
                  onPaste={fileAttachments.handlePaste}
                  serverQueue={serverQueue}
                  onRemoveFromQueue={removeFromServerQueue}
                  onClearQueue={clearServerQueue}
                  inputRef={inputRef}
                  accentColor={currentProject?.badgeColor || currentProject?.backgroundColor}
                  onInputHeightChange={handleInputHeightChange}
                />
              )}
            </div>
          </ResizablePanel>

          {/* Browser Panel - Desktop (resizable) */}
          {browserPanelOpen && currentProject && (
            <>
              <ResizableHandle withHandle />
              <ResizablePanel id="browser-panel" defaultSize={20} minSize={15} maxSize={50}>
                <BrowserPanel projectPath={currentProject.path} />
              </ResizablePanel>
            </>
          )}
        </ResizablePanelGroup>
      ) : (
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Header */}
          <AgentHeader
            currentProject={currentProject}
            projects={projects}
            onProjectSelect={setCurrentProject}
            currentSessionId={currentSessionId}
            isConnected={isConnected}
            isProcessing={isProcessing}
            currentTool={currentTool}
            messagesCount={messages.length}
            showSessionManager={showSessionManager}
            onToggleSessionManager={handleToggleSessionManager}
            onClearChat={handleClearChat}
          />

          {/* Messages */}
          <ChatArea
            currentSessionId={currentSessionId}
            messages={displayMessages}
            isProcessing={isProcessing}
            showSessionManager={showSessionManager}
            messagesContainerRef={messagesContainerRef}
            onScroll={handleScroll}
            onShowSessionManager={handleShowSessionManager}
            chatBackgroundColor={currentProject?.chatBackgroundColor}
          />

          {/* Input Area */}
          {currentSessionId && (
            <AgentInputArea
              input={input}
              onInputChange={setInput}
              onSend={handleSend}
              onStop={stopExecution}
              modelSelection={modelSelection}
              onModelSelect={setModelSelection}
              isProcessing={isProcessing}
              isConnected={isConnected}
              projectPath={currentProject?.path || null}
              messages={messages}
              elapsedSeconds={elapsedSeconds}
              sessionName={currentSessionName}
              selectedImages={fileAttachments.selectedImages}
              selectedTextFiles={fileAttachments.selectedTextFiles}
              showImageDropZone={fileAttachments.showImageDropZone}
              isDragOver={fileAttachments.isDragOver}
              onImagesSelected={fileAttachments.handleImagesSelected}
              onToggleImageDropZone={fileAttachments.toggleImageDropZone}
              onRemoveImage={fileAttachments.removeImage}
              onRemoveTextFile={fileAttachments.removeTextFile}
              onClearAllFiles={fileAttachments.clearAllFiles}
              onDragEnter={fileAttachments.handleDragEnter}
              onDragLeave={fileAttachments.handleDragLeave}
              onDragOver={fileAttachments.handleDragOver}
              onDrop={fileAttachments.handleDrop}
              onPaste={fileAttachments.handlePaste}
              serverQueue={serverQueue}
              onRemoveFromQueue={removeFromServerQueue}
              onClearQueue={clearServerQueue}
              inputRef={inputRef}
              onInputHeightChange={handleInputHeightChange}
            />
          )}
        </div>
      )}

      {/* Worktree Action Dialogs */}
      <ViewWorktreeChangesDialog
        open={worktreeActions.viewChangesDialogOpen}
        onOpenChange={worktreeActions.setViewChangesDialogOpen}
        worktree={worktreeActions.viewChangesWorktree}
        projectPath={currentProject.path}
      />

      <ConfirmDialog
        open={worktreeActions.discardChangesDialogOpen}
        onOpenChange={worktreeActions.setDiscardChangesDialogOpen}
        onConfirm={worktreeActions.handleConfirmDiscardChanges}
        title="Discard Changes"
        description={`Are you sure you want to discard all changes in "${worktreeActions.discardChangesWorktree?.branch}"? This will reset staged changes, discard modifications to tracked files, and remove untracked files. This action cannot be undone.`}
        icon={Undo2}
        iconClassName="text-destructive"
        confirmText="Discard Changes"
        confirmVariant="destructive"
      />

      <DevServerLogsPanel
        open={worktreeActions.logPanelOpen}
        onClose={() => worktreeActions.setLogPanelOpen(false)}
        worktree={worktreeActions.logPanelWorktree}
        onStopDevServer={worktreeActions.handleStopDevServer}
        onOpenDevServerUrl={worktreeActions.handleOpenDevServerUrl}
      />

      <PushToRemoteDialog
        open={worktreeActions.pushToRemoteDialogOpen}
        onOpenChange={worktreeActions.setPushToRemoteDialogOpen}
        worktree={worktreeActions.pushToRemoteWorktree}
        onConfirm={worktreeActions.handleConfirmPushToRemote}
      />

      <MergeWorktreeDialog
        open={worktreeActions.mergeDialogOpen}
        onOpenChange={worktreeActions.setMergeDialogOpen}
        projectPath={currentProject.path}
        worktree={worktreeActions.mergeWorktree}
        onMerged={() => {}}
      />

      <TestLogsPanel
        open={worktreeActions.testLogsPanelOpen}
        onClose={() => worktreeActions.setTestLogsPanelOpen(false)}
        worktreePath={worktreeActions.testLogsPanelWorktree?.path ?? null}
        branch={worktreeActions.testLogsPanelWorktree?.branch}
        onStopTests={
          worktreeActions.testLogsPanelWorktree
            ? () => worktreeActions.handleStopTests(worktreeActions.testLogsPanelWorktree!)
            : undefined
        }
      />
    </div>
  );
}
