import { useState, useCallback, useRef, useEffect } from 'react';
import { useAppStore } from '@/store/app-store';
import { useAgentPromptsStore } from '@/store/agent-prompts-store';
import { useTimeLimiterStore } from '@/store/time-limiter-store';
import type { PhaseModelEntry } from '@automaker/types';
import { useElectronAgent } from '@/hooks/use-electron-agent';
import { SessionManager } from '@/components/session-manager';
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from '@/components/ui/resizable';
import { generateContextSummary } from '@/lib/copy-all-chat';

// Extracted hooks
import {
  useAgentScroll,
  useFileAttachments,
  useAgentShortcuts,
  useAgentSession,
} from './agent-view/hooks';

// Extracted components
import { NoProjectState, AgentHeader, ChatArea } from './agent-view/components';
import { AgentInputArea } from './agent-view/input-area';

/** Tailwind lg breakpoint in pixels */
const LG_BREAKPOINT = 1024;

export function AgentView() {
  const { currentProject, projects, setCurrentProject } = useAppStore();
  const [input, setInput] = useState('');
  const [currentTool, setCurrentTool] = useState<string | null>(null);
  // Initialize session manager state - starts as true to match SSR
  // Then updates on mount based on actual screen size to prevent hydration mismatch
  const [showSessionManager, setShowSessionManager] = useState(true);

  // Update session manager visibility based on screen size after mount and on resize
  useEffect(() => {
    const updateVisibility = () => {
      const isDesktop = window.innerWidth >= LG_BREAKPOINT;
      setShowSessionManager(isDesktop);
    };

    // Set initial value
    updateVisibility();

    // Listen for resize events
    window.addEventListener('resize', updateVisibility);
    return () => window.removeEventListener('resize', updateVisibility);
  }, []);

  const [modelSelection, setModelSelection] = useState<PhaseModelEntry>({ model: 'claude-sonnet' });

  // Input ref for auto-focus
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Ref for quick create session function from SessionManager
  const quickCreateSessionRef = useRef<(() => Promise<void>) | null>(null);

  // Session management hook
  const { currentSessionId, handleSelectSession } = useAgentSession({
    projectPath: currentProject?.path,
  });

  // Use the Electron agent hook (only if we have a session)
  const {
    messages,
    isProcessing,
    isConnected,
    sendMessage,
    clearHistory,
    stopExecution,
    error: agentError,
    serverQueue,
    addToServerQueue,
    removeFromServerQueue,
    clearServerQueue,
  } = useElectronAgent({
    sessionId: currentSessionId || '',
    workingDirectory: currentProject?.path,
    model: modelSelection.model,
    thinkingLevel: modelSelection.thinkingLevel,
    onToolUse: (toolName) => {
      setCurrentTool(toolName);
      setTimeout(() => setCurrentTool(null), 2000);
    },
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
    timeLimitSeconds,
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
  const handleSend = useCallback(async () => {
    const {
      selectedImages,
      selectedTextFiles,
      setSelectedImages,
      setSelectedTextFiles,
      setShowImageDropZone,
    } = fileAttachments;

    if (!input.trim() && selectedImages.length === 0 && selectedTextFiles.length === 0) return;

    // Get selected agent prompts and prepend to message
    const agentPromptsText = getSelectedPromptsText();
    let messageContent = input;
    if (agentPromptsText) {
      messageContent = agentPromptsText + '\n\n---\n\n' + input;
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
  }, [input, fileAttachments, isProcessing, sendMessage, addToServerQueue, getSelectedPromptsText]);

  const handleClearChat = async () => {
    if (!confirm('Are you sure you want to clear this conversation?')) return;
    await clearHistory();
  };

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
      {showSessionManager && currentProject && (
        <div
          className="fixed inset-0 bg-black/50 z-20 lg:hidden"
          onClick={() => setShowSessionManager(false)}
          data-testid="session-manager-backdrop"
        />
      )}

      {/* Mobile Session Manager - fixed overlay */}
      {showSessionManager && currentProject && (
        <div className="fixed inset-y-0 left-0 w-72 z-30 lg:hidden border-r border-border shrink-0 bg-card">
          <SessionManager
            currentSessionId={currentSessionId}
            onSelectSession={handleSelectSession}
            projectPath={currentProject.path}
            isCurrentSessionThinking={isProcessing}
            onQuickCreateRef={quickCreateSessionRef}
          />
        </div>
      )}

      {/* Desktop layout with resizable panels */}
      <ResizablePanelGroup
        direction="horizontal"
        className="hidden lg:flex"
        autoSaveId="agent-view-sidebar"
      >
        {/* Session Manager Sidebar - Desktop (resizable) */}
        {showSessionManager && currentProject && (
          <>
            <ResizablePanel
              defaultSize={25}
              minSize={15}
              maxSize={40}
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
        <ResizablePanel defaultSize={showSessionManager && currentProject ? 75 : 100}>
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
              onToggleSessionManager={() => setShowSessionManager(!showSessionManager)}
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
              onShowSessionManager={() => setShowSessionManager(true)}
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
      </ResizablePanelGroup>

      {/* Mobile Chat Area */}
      <div className="flex-1 flex flex-col overflow-hidden lg:hidden">
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
          onToggleSessionManager={() => setShowSessionManager(!showSessionManager)}
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
          onShowSessionManager={() => setShowSessionManager(true)}
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
    </div>
  );
}
