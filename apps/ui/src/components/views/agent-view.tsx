import { useState, useCallback, useRef, useEffect } from 'react';
import { useAppStore } from '@/store/app-store';
import { useAgentPromptsStore } from '@/store/agent-prompts-store';
import { useTimeLimiterStore } from '@/store/time-limiter-store';
import { useElectronAgent } from '@/hooks/use-electron-agent';
import { SessionManager } from '@/components/session-manager';
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from '@/components/ui/resizable';
import { generateContextSummary } from '@/lib/copy-all-chat';
import { useSessions } from '@/hooks/queries/use-sessions';

// Extracted hooks
import {
  useAgentScroll,
  useFileAttachments,
  useAgentShortcuts,
  useAgentSession,
} from './agent-view/hooks';

// Extracted components
import { NoProjectState, AgentHeader, ChatArea, BrowserPanel } from './agent-view/components';
import { AgentInputArea } from './agent-view/input-area';

/** Tailwind lg breakpoint in pixels */
const LG_BREAKPOINT = 1024;
/** Breakpoint above which all three panels can coexist */
const XL_BREAKPOINT = 1440;

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
    onToolUse: handleToolUse,
  });

  // File attachments hook
  const fileAttachments = useFileAttachments({
    isProcessing,
    isConnected,
  });

  // Scroll management hook
  const { messagesContainerRef, handleScroll } = useAgentScroll({
    messagesLength: messages.length,
    currentSessionId,
  });

  // Keyboard shortcuts hook
  useAgentShortcuts({
    currentProject,
    quickCreateSessionRef,
  });

  // Get agent prompts store
  const getSelectedPromptsText = useAgentPromptsStore((state) => state.getSelectedPromptsText);

  // Time limiter store
  const {
    isEnabled: timeLimiterEnabled,
    startSession,
    getElapsedSeconds,
    isTimeExceeded,
    pendingCopiedContent,
    setPendingCopiedContent,
    clearPendingContent,
  } = useTimeLimiterStore();

  // Track elapsed seconds for display
  const [elapsedSeconds, setElapsedSeconds] = useState(0);

  // Start session timer when session changes
  useEffect(() => {
    if (currentSessionId) {
      startSession();
      setElapsedSeconds(0);
    }
  }, [currentSessionId, startSession]);

  // Update elapsed seconds every second
  useEffect(() => {
    if (!currentSessionId || !timeLimiterEnabled) return;

    const interval = setInterval(() => {
      setElapsedSeconds(getElapsedSeconds());
    }, 1000);

    return () => clearInterval(interval);
  }, [currentSessionId, timeLimiterEnabled, getElapsedSeconds]);

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

  // Show welcome message if no messages yet
  const displayMessages =
    messages.length === 0
      ? [
          {
            id: 'welcome',
            role: 'assistant' as const,
            content:
              "Hello! I'm the Automaker Agent. I can help you build software autonomously. I can read and modify files in this project, run commands, and execute tests. What would you like to create today?",
            timestamp: new Date().toISOString(),
          },
        ]
      : messages;

  if (!currentProject) {
    return <NoProjectState />;
  }

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
        <ResizablePanelGroup
          direction="horizontal"
          className="flex"
          autoSaveId={
            showSessionManager && currentProject && browserPanelOpen
              ? 'agent-view-3panel'
              : showSessionManager && currentProject
                ? 'agent-view-sidebar'
                : browserPanelOpen
                  ? 'agent-view-browser'
                  : 'agent-view-chat'
          }
        >
          {/* Session Manager Sidebar - Desktop (resizable) */}
          {showSessionManager && currentProject && (
            <>
              <ResizablePanel
                defaultSize={browserPanelOpen ? 20 : 25}
                minSize={15}
                maxSize={browserPanelOpen ? 35 : 40}
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
          <ResizablePanel
            defaultSize={
              showSessionManager && currentProject && browserPanelOpen
                ? 45
                : showSessionManager && currentProject
                  ? 75
                  : browserPanelOpen
                    ? 60
                    : 100
            }
          >
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
                />
              )}
            </div>
          </ResizablePanel>

          {/* Browser Panel - Desktop (resizable) */}
          {browserPanelOpen && currentProject && (
            <>
              <ResizableHandle withHandle />
              <ResizablePanel defaultSize={showSessionManager ? 35 : 40} minSize={20} maxSize={50}>
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
            />
          )}
        </div>
      )}
    </div>
  );
}
