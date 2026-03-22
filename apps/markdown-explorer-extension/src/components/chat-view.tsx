import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { PhaseModelEntry, ThinkingLevel } from '@automaker/types';
import { useChatShortcuts } from '../hooks/use-chat-shortcuts';
import { createLogger } from '@automaker/utils/logger';
import { toast } from 'sonner';
import { useShallow } from 'zustand/react/shallow';
import { useElectronAgent } from '@/hooks/use-electron-agent';
import { getHttpApiClient } from '@/lib/http-api-client';
import { copyToClipboard, generateChatSummary } from '@/lib/copy-all-chat';
import type { ImageAttachment, TextFileAttachment } from '@/store/app-store';
import { useAppStore } from '@/store/app-store';
import { useAgentScroll } from '@/components/views/agent-view/hooks/use-agent-scroll';
import { useFileAttachments } from '@/components/views/agent-view/hooks/use-file-attachments';
import { ChatViewLayout } from './chat-view-layout';
import {
  estimateUsage,
  isSameModel,
  normalizeReasoningEffort,
  normalizeThinkingLevel,
  sanitizeDocumentName,
  toHistoryName,
  toSessionMessage,
} from './chat-view-utils';
import { useActiveSession } from '../hooks/use-active-session';
import { useChatPanelPreferences } from '../hooks/use-chat-panel-preferences';
import { isParallelLimitReached, MAX_PARALLEL_SESSIONS } from '../stores/session-store-helpers';
import { useChatSessionClose } from '../hooks/use-chat-session-close';
import { useChatSessionShortcuts } from '../hooks/use-chat-session-shortcuts';
import { playMessageSentSound, useChatSoundEffects } from '../hooks/use-chat-sound-effects';
import { useChatStreamSync } from '../hooks/use-chat-stream-sync';
import { useHistoryPanelData } from '../hooks/use-history-panel-data';
import { useProjectSessionBootstrap } from '../hooks/use-project-session-bootstrap';
import { useSessionActions } from '../hooks/use-session-actions';
import { useSessionStore } from '../stores/session-store';
import type { HistoryStatusFilter, HistoryTimeFilter } from './history-types';
import type { ThinkingIntensity } from './mode-toggles';

const logger = createLogger('ChatView');

interface ChatViewProps {
  onOpenSettings: () => void;
}

export function ChatView({ onOpenSettings }: ChatViewProps) {
  const {
    currentProject,
    projects,
    setCurrentProject,
    selectedAgentModel,
    setSelectedAgentModel,
    getLastSelectedSession,
    setLastSelectedSession,
  } = useAppStore(
    useShallow((state) => ({
      currentProject: state.currentProject,
      projects: state.projects,
      setCurrentProject: state.setCurrentProject,
      selectedAgentModel: state.selectedAgentModel,
      setSelectedAgentModel: state.setSelectedAgentModel,
      getLastSelectedSession: state.getLastSelectedSession,
      setLastSelectedSession: state.setLastSelectedSession,
    }))
  );

  const { activeSessionId, activeSession, projectSessions } = useActiveSession(
    currentProject?.path
  );
  const {
    createSession,
    switchSession,
    closeSession,
    renameSession,
    removeSession,
    stopExecution: stopSessionExecution,
    refreshSessionsForProject,
  } = useSessionActions();

  const {
    leftOpen,
    rightOpen,
    leftWidth,
    rightWidth,
    activeSidebarTab,
    setLeftOpen,
    setRightOpen,
    setLeftWidth,
    setRightWidth,
    setActiveSidebarTab,
  } = useChatPanelPreferences();

  const [searchHistory, setSearchHistory] = useState('');
  const [historyStatusFilter, setHistoryStatusFilter] = useState<HistoryStatusFilter>('all');
  const [historyTimeFilter, setHistoryTimeFilter] = useState<HistoryTimeFilter>('all');
  const [input, setInput] = useState('');
  const [currentTool, setCurrentTool] = useState<null | string>(null);
  const [isCreatingSession, setIsCreatingSession] = useState(false);
  const [isSavingChat, setIsSavingChat] = useState(false);
  const [isStopPending, setIsStopPending] = useState(false);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [shortcutHelpOpen, setShortcutHelpOpen] = useState(false);

  const previousSessionIdRef = useRef<null | string>(null);
  const inputValueRef = useRef('');
  const selectedImagesRef = useRef<ImageAttachment[]>([]);
  const selectedTextFilesRef = useRef<TextFileAttachment[]>([]);
  const inputAreaRef = useRef<HTMLTextAreaElement | null>(null);
  const scrollMemoryRef = useRef<Record<string, number>>({});
  const lastRestoredSessionRef = useRef<null | string>(null);
  const draftSyncTimeoutRef = useRef<null | number>(null);

  const { messages, isProcessing, isConnected, sendMessage, stopExecution, error } =
    useElectronAgent({
      sessionId: activeSessionId || '',
      workingDirectory: currentProject?.path,
      model: selectedAgentModel.model,
      thinkingLevel: selectedAgentModel.thinkingLevel,
      reasoningEffort: selectedAgentModel.reasoningEffort,
      onToolUse: (toolName) => {
        setCurrentTool(toolName);
        window.setTimeout(() => setCurrentTool(null), 1600);
      },
    });

  const fileAttachments = useFileAttachments({
    isProcessing,
    isConnected,
    projectPath: currentProject?.path,
    maxImageFileSizeBytes: 20 * 1024 * 1024,
    maxFiles: 10,
    onInsertText: (text) => {
      setInput((prev) => {
        const trimmed = prev.replace(/\s+$/, '');
        const prefix = trimmed.length > 0 ? '\n\n' : '';
        return `${trimmed}${prefix}${text}\n`;
      });
    },
  });

  const { messagesContainerRef, handleScroll, scrollToBottom, isUserAtBottom } = useAgentScroll({
    messagesLength: messages.length,
    currentSessionId: activeSessionId,
  });

  const usageEstimate = useMemo(() => estimateUsage(messages), [messages]);

  const estimatedInputTokens = activeSession?.totalTokensInput ?? usageEstimate.inputTokens;
  const estimatedOutputTokens = activeSession?.totalTokensOutput ?? usageEstimate.outputTokens;
  const estimatedCost = activeSession?.totalCost ?? usageEstimate.cost;
  const estimatedCostLabel = useMemo(() => {
    return `~$${estimatedCost.toFixed(4)}`;
  }, [estimatedCost]);

  const { items: filteredHistoryItems, totalItemCount: totalHistoryItems } = useHistoryPanelData({
    sessions: projectSessions,
    searchQuery: searchHistory,
    statusFilter: historyStatusFilter,
    timeFilter: historyTimeFilter,
  });

  const tabSessions = useMemo(() => {
    return projectSessions.map((session) => ({
      id: session.id,
      name: toHistoryName(session),
      processStatus: session.processStatus,
      model: session.model,
      totalCost: session.totalCost,
      messageCount: session.messageCount,
    }));
  }, [projectSessions]);

  const thinkingIntensity = useMemo<ThinkingIntensity>(() => {
    const normalized = normalizeThinkingLevel(activeSession?.thinkingLevel);
    if (normalized === 'low' || normalized === 'high') return normalized;
    return 'medium';
  }, [activeSession?.thinkingLevel]);

  const thinkingEnabled = useMemo(() => {
    return normalizeThinkingLevel(activeSession?.thinkingLevel) !== 'none';
  }, [activeSession?.thinkingLevel]);
  const orchestratorEnabled = activeSession?.orchestratorMode ?? false;
  const orchestratorIteration = activeSession?.orchestratorIteration ?? 0;
  const orchestratorRunId = activeSession?.orchestratorRunId ?? null;

  const persistDraftForSession = useCallback((sessionId: null | string) => {
    if (!sessionId) return;
    useSessionStore
      .getState()
      .setDraft(
        sessionId,
        inputValueRef.current,
        selectedImagesRef.current,
        selectedTextFilesRef.current
      );
  }, []);

  const persistScrollForSession = useCallback(
    (sessionId: null | string) => {
      if (!sessionId) return;
      const container = messagesContainerRef.current;
      if (!container) return;
      scrollMemoryRef.current[sessionId] = container.scrollTop;
    },
    [messagesContainerRef]
  );

  const createSessionContext = useCallback((): null | {
    projectPath: string;
    workingDirectory: string;
    modelSelection: PhaseModelEntry;
  } => {
    if (!currentProject?.path) return null;
    return {
      projectPath: currentProject.path,
      workingDirectory: currentProject.path,
      modelSelection: selectedAgentModel,
    };
  }, [currentProject?.path, selectedAgentModel]);

  const handleCreateSession = useCallback(async () => {
    const context = createSessionContext();
    if (!context || isCreatingSession) return;

    setIsCreatingSession(true);
    persistDraftForSession(activeSessionId);
    persistScrollForSession(activeSessionId);

    try {
      await createSession(context);
    } finally {
      setIsCreatingSession(false);
    }
  }, [
    activeSessionId,
    createSession,
    createSessionContext,
    isCreatingSession,
    persistDraftForSession,
    persistScrollForSession,
  ]);

  const handleSelectSession = useCallback(
    (sessionId: string) => {
      if (sessionId === activeSessionId) return;
      persistDraftForSession(activeSessionId);
      persistScrollForSession(activeSessionId);
      switchSession(sessionId);
    },
    [activeSessionId, persistDraftForSession, persistScrollForSession, switchSession]
  );

  const handleRenameSession = useCallback(
    async (sessionId: string, nextName: string): Promise<boolean> => {
      return renameSession(sessionId, nextName);
    },
    [renameSession]
  );

  const { handleCloseSession, handleCloseOtherSessions } = useChatSessionClose({
    activeSessionId,
    currentProjectPath: currentProject?.path ?? null,
    projectSessions,
    createSession,
    createSessionContext,
    closeSession,
    stopSessionExecution,
    persistDraftForSession,
    persistScrollForSession,
    onSelectSession: handleSelectSession,
  });

  const applyModelSelection = useCallback(
    (entry: PhaseModelEntry) => {
      setSelectedAgentModel(entry);
      if (!activeSessionId) return;

      useSessionStore
        .getState()
        .setSessionModel(
          activeSessionId,
          entry.model,
          entry.thinkingLevel ?? 'none',
          entry.reasoningEffort ?? 'none'
        );
    },
    [activeSessionId, setSelectedAgentModel]
  );

  const handleModelSelect = useCallback(
    (entry: PhaseModelEntry) => {
      applyModelSelection(entry);
    },
    [applyModelSelection]
  );

  const handleThinkingEnabledChange = useCallback(
    (enabled: boolean) => {
      const nextThinkingLevel: ThinkingLevel = enabled ? thinkingIntensity : 'none';
      applyModelSelection({
        ...selectedAgentModel,
        thinkingLevel: nextThinkingLevel,
      });
    },
    [applyModelSelection, selectedAgentModel, thinkingIntensity]
  );

  const handleThinkingIntensityChange = useCallback(
    (intensity: ThinkingIntensity) => {
      applyModelSelection({
        ...selectedAgentModel,
        thinkingLevel: intensity,
      });
    },
    [applyModelSelection, selectedAgentModel]
  );

  const handleOrchestratorEnabledChange = useCallback(
    (enabled: boolean) => {
      if (!activeSessionId) return;

      const runId = enabled
        ? `orch-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`
        : null;

      useSessionStore.getState().updateSession(activeSessionId, {
        orchestratorMode: enabled,
        orchestratorRunId: runId,
        orchestratorIteration: 0,
      });
    },
    [activeSessionId]
  );

  const handleSend = useCallback(
    async (messageOverride?: string) => {
      if (!activeSessionId) return;
      if (isProcessing) return;

      if (isParallelLimitReached(useSessionStore.getState().sessions)) {
        toast.info(
          `Maximal ${MAX_PARALLEL_SESSIONS} Chats gleichzeitig. Bitte warte, bis einer fertig ist.`
        );
        return;
      }

      const {
        selectedImages,
        selectedTextFiles,
        setSelectedImages,
        setSelectedTextFiles,
        setShowImageDropZone,
      } = fileAttachments;

      const rawInput = messageOverride ?? input;
      if (!rawInput.trim() && selectedImages.length === 0 && selectedTextFiles.length === 0) {
        return;
      }

      if (activeSession?.orchestratorMode) {
        useSessionStore.getState().incrementOrchestratorIteration(activeSessionId);
      }

      playMessageSentSound();

      setInput('');
      setSelectedImages([]);
      setSelectedTextFiles([]);
      setShowImageDropZone(false);
      useSessionStore.getState().setDraft(activeSessionId, '', [], []);

      await sendMessage(rawInput, selectedImages, selectedTextFiles);
    },
    [
      activeSession?.orchestratorMode,
      activeSessionId,
      fileAttachments,
      input,
      isProcessing,
      sendMessage,
    ]
  );

  const handleStop = useCallback(() => {
    if (!activeSessionId || isStopPending) return;
    setIsStopPending(true);
    void stopExecution().finally(() => {
      setIsStopPending(false);
    });
  }, [activeSessionId, isStopPending, stopExecution]);

  const handleCopyAll = useCallback(async () => {
    if (messages.length === 0) return;
    const summary = generateChatSummary(messages);
    const success = await copyToClipboard(summary.formattedChat);
    if (success) {
      toast.success('Chat wurde kopiert.');
    } else {
      toast.error('Kopieren hat nicht geklappt.');
    }
  }, [messages]);

  const handleSaveChat = useCallback(async () => {
    if (!currentProject?.path || messages.length === 0 || isSavingChat) return;

    setIsSavingChat(true);
    try {
      const summary = generateChatSummary(messages);
      const sessionLabel = activeSession?.title || activeSession?.name || 'Chat';
      const safeName = sanitizeDocumentName(sessionLabel);
      const fileName = `${safeName}-Verlauf.md`;

      const api = getHttpApiClient();
      await api.docs.create({
        projectPath: currentProject.path,
        name: fileName,
        content: summary.formattedChat,
      });

      toast.success('Chat wurde gespeichert.');
    } catch (saveError) {
      logger.error('Saving chat failed', saveError);
      toast.error('Speichern hat nicht geklappt.');
    } finally {
      setIsSavingChat(false);
    }
  }, [activeSession?.name, activeSession?.title, currentProject?.path, isSavingChat, messages]);

  const handleInputHeightChange = useCallback(() => {
    if (isUserAtBottom) {
      scrollToBottom('smooth');
    }
  }, [isUserAtBottom, scrollToBottom]);

  const handleInputChange = useCallback((value: string) => {
    setInput(value);
  }, []);

  useEffect(() => {
    if (!isProcessing) setIsStopPending(false);
  }, [isProcessing]);

  useChatSessionShortcuts({
    activeSessionId,
    projectSessions,
    onCreateSession: handleCreateSession,
    onCloseSession: handleCloseSession,
    onSelectSession: handleSelectSession,
  });

  useChatShortcuts({
    leftOpen,
    setLeftOpen: (open) => setLeftOpen(open),
    onToggleShortcutHelp: () => setShortcutHelpOpen((prev) => !prev),
  });

  useProjectSessionBootstrap({
    currentProjectPath: currentProject?.path,
    createSessionContext,
    createSession,
    switchSession,
    getLastSelectedSession,
    refreshSessionsForProject,
  });

  useEffect(() => {
    inputValueRef.current = input;
  }, [input]);
  useEffect(() => {
    selectedImagesRef.current = fileAttachments.selectedImages;
  }, [fileAttachments.selectedImages]);
  useEffect(() => {
    selectedTextFilesRef.current = fileAttachments.selectedTextFiles;
  }, [fileAttachments.selectedTextFiles]);

  useEffect(() => {
    if (!currentProject?.path || !activeSessionId) return;
    setLastSelectedSession(currentProject.path, activeSessionId);
  }, [activeSessionId, currentProject?.path, setLastSelectedSession]);

  useEffect(() => {
    const previousSessionId = previousSessionIdRef.current;
    if (previousSessionId && previousSessionId !== activeSessionId) {
      persistDraftForSession(previousSessionId);
      persistScrollForSession(previousSessionId);
    }

    previousSessionIdRef.current = activeSessionId;

    if (!activeSession) {
      setInput('');
      fileAttachments.setSelectedImages([]);
      fileAttachments.setSelectedTextFiles([]);
      fileAttachments.setShowImageDropZone(false);
      return;
    }

    setInput(activeSession.draftMessage);
    fileAttachments.setSelectedImages(activeSession.draftImages);
    fileAttachments.setSelectedTextFiles(activeSession.draftTextFiles);
    fileAttachments.setShowImageDropZone(
      activeSession.draftImages.length > 0 || activeSession.draftTextFiles.length > 0
    );
  }, [
    activeSession,
    activeSessionId,
    fileAttachments.setSelectedImages,
    fileAttachments.setSelectedTextFiles,
    fileAttachments.setShowImageDropZone,
    persistDraftForSession,
    persistScrollForSession,
  ]);

  useEffect(() => {
    if (!activeSessionId) {
      lastRestoredSessionRef.current = null;
      return;
    }

    if (lastRestoredSessionRef.current === activeSessionId) {
      return;
    }

    const restoreScroll = () => {
      const container = messagesContainerRef.current;
      if (!container) return;

      const savedPosition = scrollMemoryRef.current[activeSessionId];
      if (!Number.isFinite(savedPosition)) {
        return;
      }

      container.scrollTop = savedPosition;
      lastRestoredSessionRef.current = activeSessionId;
    };

    const firstAttempt = window.setTimeout(restoreScroll, 120);
    const secondAttempt = window.setTimeout(restoreScroll, 260);

    return () => {
      window.clearTimeout(firstAttempt);
      window.clearTimeout(secondAttempt);
    };
  }, [activeSessionId, messagesContainerRef]);

  useEffect(() => {
    if (!activeSessionId) return;
    if (draftSyncTimeoutRef.current) {
      window.clearTimeout(draftSyncTimeoutRef.current);
    }

    draftSyncTimeoutRef.current = window.setTimeout(() => {
      useSessionStore
        .getState()
        .setDraft(
          activeSessionId,
          input,
          fileAttachments.selectedImages,
          fileAttachments.selectedTextFiles
        );
    }, 500);

    return () => {
      if (draftSyncTimeoutRef.current) {
        window.clearTimeout(draftSyncTimeoutRef.current);
      }
    };
  }, [activeSessionId, fileAttachments.selectedImages, fileAttachments.selectedTextFiles, input]);

  useEffect(() => {
    if (!activeSession) return;

    const nextModel: PhaseModelEntry = {
      ...useAppStore.getState().selectedAgentModel,
      model: activeSession.model,
      thinkingLevel: normalizeThinkingLevel(activeSession.thinkingLevel),
      reasoningEffort: normalizeReasoningEffort(activeSession.reasoningEffort),
    };

    if (!isSameModel(useAppStore.getState().selectedAgentModel, nextModel)) {
      setSelectedAgentModel(nextModel);
    }
  }, [
    activeSession?.id,
    activeSession?.model,
    activeSession?.reasoningEffort,
    activeSession?.thinkingLevel,
    setSelectedAgentModel,
  ]);

  useEffect(() => {
    if (!activeSessionId) return;
    useSessionStore
      .getState()
      .setSessionRunning(activeSessionId, isProcessing, error ? String(error) : null);
  }, [activeSessionId, error, isProcessing]);

  useEffect(() => {
    if (!activeSessionId) return;
    useSessionStore.getState().setMessages(activeSessionId, messages.map(toSessionMessage));
    const estimate = estimateUsage(messages);
    useSessionStore
      .getState()
      .setSessionTokens(
        activeSessionId,
        estimate.inputTokens,
        estimate.outputTokens,
        estimate.cost
      );
  }, [activeSessionId, messages]);

  useEffect(() => {
    if (!activeSessionId) return;
    setElapsedSeconds(0);
  }, [activeSessionId]);

  useEffect(() => {
    if (!isProcessing || !activeSessionId) return;

    const interval = window.setInterval(() => {
      setElapsedSeconds((current) => current + 1);
    }, 1000);

    return () => window.clearInterval(interval);
  }, [activeSessionId, isProcessing]);

  useEffect(() => {
    if (!activeSessionId || !inputAreaRef.current) return;
    const timeout = window.setTimeout(() => {
      inputAreaRef.current?.focus();
    }, 150);
    return () => window.clearTimeout(timeout);
  }, [activeSessionId]);

  useChatStreamSync({
    activeSessionId,
    isProcessing,
  });
  useChatSoundEffects({
    activeSessionId,
    isProcessing,
    error: error ? String(error) : null,
    orchestratorMode: activeSession?.orchestratorMode ?? false,
    messages,
  });

  const showScrollToBottom = !isUserAtBottom && messages.length > 0;
  const currentSessionName = activeSession?.title?.trim() || activeSession?.name || null;
  const currentSessionDescription = activeSession?.description || null;

  return (
    <ChatViewLayout
      currentProject={currentProject}
      projects={projects}
      tabSessions={tabSessions}
      activeSessionId={activeSessionId}
      isConnected={isConnected}
      isProcessing={isProcessing}
      currentTool={currentTool}
      leftOpen={leftOpen}
      rightOpen={rightOpen}
      isCreatingSession={isCreatingSession}
      filteredHistoryItems={filteredHistoryItems}
      totalHistoryItems={totalHistoryItems}
      searchHistory={searchHistory}
      historyStatusFilter={historyStatusFilter}
      historyTimeFilter={historyTimeFilter}
      setSearchHistory={setSearchHistory}
      setHistoryStatusFilter={setHistoryStatusFilter}
      setHistoryTimeFilter={setHistoryTimeFilter}
      currentSessionName={currentSessionName}
      currentSessionDescription={currentSessionDescription}
      messages={messages}
      elapsedSeconds={elapsedSeconds}
      selectedAgentModel={selectedAgentModel}
      thinkingEnabled={thinkingEnabled}
      thinkingIntensity={thinkingIntensity}
      orchestratorEnabled={orchestratorEnabled}
      orchestratorIteration={orchestratorIteration}
      orchestratorRunId={orchestratorRunId}
      input={input}
      isStopPending={isStopPending}
      selectedImages={fileAttachments.selectedImages}
      selectedTextFiles={fileAttachments.selectedTextFiles}
      isDragOver={fileAttachments.isDragOver}
      inputAreaRef={inputAreaRef}
      messagesContainerRef={messagesContainerRef}
      showScrollToBottom={showScrollToBottom}
      estimatedInputTokens={estimatedInputTokens}
      estimatedOutputTokens={estimatedOutputTokens}
      estimatedCostLabel={estimatedCostLabel}
      error={error}
      isSavingChat={isSavingChat}
      leftWidth={leftWidth}
      rightWidth={rightWidth}
      onProjectSelect={setCurrentProject}
      onSelectSession={handleSelectSession}
      onCreateSession={handleCreateSession}
      onCloseSession={handleCloseSession}
      onCloseOtherSessions={handleCloseOtherSessions}
      onRenameSession={handleRenameSession}
      onArchiveSession={handleCloseSession}
      onDeleteSession={removeSession}
      onToggleLeft={() => setLeftOpen((value) => !value)}
      onToggleRight={() => setRightOpen((value) => !value)}
      onCopyAll={handleCopyAll}
      onSaveChat={handleSaveChat}
      onOpenSettings={onOpenSettings}
      onOpenShortcutHelp={() => setShortcutHelpOpen(true)}
      shortcutHelpOpen={shortcutHelpOpen}
      onShortcutHelpOpenChange={setShortcutHelpOpen}
      onModelSelect={handleModelSelect}
      onThinkingEnabledChange={handleThinkingEnabledChange}
      onThinkingIntensityChange={handleThinkingIntensityChange}
      onOrchestratorEnabledChange={handleOrchestratorEnabledChange}
      onInputChange={handleInputChange}
      onSend={handleSend}
      onStop={handleStop}
      onFilesSelected={fileAttachments.processDroppedFiles}
      onRemoveImage={fileAttachments.removeImage}
      onRemoveTextFile={fileAttachments.removeTextFile}
      onDragEnter={fileAttachments.handleDragEnter}
      onDragLeave={fileAttachments.handleDragLeave}
      onDragOver={fileAttachments.handleDragOver}
      onDrop={fileAttachments.handleDrop}
      onPaste={fileAttachments.handlePaste}
      onInputHeightChange={handleInputHeightChange}
      onMessagesScroll={handleScroll}
      onScrollToBottom={() => scrollToBottom('smooth')}
      setLeftOpen={setLeftOpen}
      setRightOpen={setRightOpen}
      setLeftWidth={setLeftWidth}
      setRightWidth={setRightWidth}
      activeSidebarTab={activeSidebarTab}
      onSidebarTabChange={setActiveSidebarTab}
    />
  );
}
