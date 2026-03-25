import { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import { useAppStore } from '@/store/app-store';
import { useAgentPromptsStore } from '@/store/agent-prompts-store';
import { useTimeLimiterStore } from '@/store/time-limiter-store';
import { useOrchestratorStore } from '@/store/orchestrator-store';
import { useShallow } from 'zustand/react/shallow';
import { useElectronAgent } from '@/hooks/use-electron-agent';
import { SessionManager, type QuickCreateSessionArgs } from '@/components/session-manager';
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from '@/components/ui/resizable';
import { copyToClipboard, generateChatSummary, generateContextSummary } from '@/lib/copy-all-chat';
import { embedSystemPrompts } from '@/lib/system-prompt-payload';
import type { ChatDisplaySettings } from '@/store/types/ui-types';
import { DEFAULT_CHAT_DISPLAY_SETTINGS } from '@/store/types/ui-types';
import { getHttpApiClient } from '@/lib/http-api-client';
import { useSessions } from '@/hooks/queries/use-sessions';
import { useAvailableModels } from '@/hooks/queries/use-models';
import { useSessionQueryInvalidation } from '@/hooks/use-query-invalidation';
import { createLogger } from '@automaker/utils/logger';
import { CLAUDE_CANONICAL_MAP } from '@automaker/types';
import { toast } from 'sonner';

// Extracted hooks
import {
  useAgentScroll,
  useFileAttachments,
  useAgentShortcuts,
  useAgentSession,
  useAgentWorktreeActions,
} from './agent-view/hooks';

// Extracted components
import { NoProjectState, AgentHeader, ChatArea, RightPanelShell } from './agent-view/components';
import { AgentInputArea } from './agent-view/input-area';
import {
  ViewWorktreeChangesDialog,
  PushToRemoteDialog,
  MergeWorktreeDialog,
} from '../views/board-view/dialogs';
import { DevServerLogsPanel } from '../views/board-view/worktree-panel/components';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { TestLogsPanel } from '@/components/ui/test-logs-panel';
import { Undo2, Trash2 } from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';

/** Tailwind lg breakpoint in pixels */
const LG_BREAKPOINT = 1024;
/** Breakpoint above which all three panels can coexist */
const XL_BREAKPOINT = 1440;
const MIN_MESSAGES_FOR_AUTO_CONDENSE = 4;
const CONTEXT_TEXT_CHARS_PER_TOKEN = 4;
const CONTEXT_TOOL_CHARS_PER_TOKEN = 3;
const CONTEXT_IMAGE_TOKEN_ESTIMATE = 850;
const CONTEXT_BASELINE_TOKENS = 12000;
const logger = createLogger('AgentView');

interface AgentViewProps {
  /** When true, the built-in AgentHeader is not rendered (useful for custom headers). */
  hideHeader?: boolean;
}

export function AgentView({ hideHeader }: AgentViewProps = {}) {
  const {
    currentProject,
    projects,
    setCurrentProject,
    selectedAgentModel,
    setSelectedAgentModel,
    browserPanelOpen,
    setBrowserPanelOpen,
    currentDocPath,
    setCurrentDocPath,
    setDocsOpen,
  } = useAppStore(
    useShallow((s) => ({
      currentProject: s.currentProject,
      projects: s.projects,
      setCurrentProject: s.setCurrentProject,
      selectedAgentModel: s.selectedAgentModel,
      setSelectedAgentModel: s.setSelectedAgentModel,
      browserPanelOpen: s.browserPanelOpen,
      setBrowserPanelOpen: s.setBrowserPanelOpen,
      currentDocPath: s.currentDocPath,
      setCurrentDocPath: s.setCurrentDocPath,
      setDocsOpen: s.setDocsOpen,
    }))
  );
  const [input, setInput] = useState('');
  const [currentTool, setCurrentTool] = useState<string | null>(null);
  const [isDesktop, setIsDesktop] = useState(true);
  const [chatDisplaySettings, setChatDisplaySettings] = useState<ChatDisplaySettings>(() => {
    if (typeof window === 'undefined') return DEFAULT_CHAT_DISPLAY_SETTINGS;
    // Try new key first
    const stored = window.localStorage.getItem('automaker:chatDisplaySettings');
    if (stored) {
      try {
        const parsed = JSON.parse(stored) as ChatDisplaySettings;
        return { ...DEFAULT_CHAT_DISPLAY_SETTINGS, ...parsed };
      } catch {
        // fall through
      }
    }
    // Migration: read old chatFontSize key
    const oldSize = window.localStorage.getItem('automaker:chatFontSize');
    if (oldSize) {
      const parsed = parseInt(oldSize, 10);
      if (Number.isFinite(parsed)) {
        const migrated = {
          ...DEFAULT_CHAT_DISPLAY_SETTINGS,
          fontSize: Math.max(10, Math.min(20, parsed)),
        };
        window.localStorage.setItem('automaker:chatDisplaySettings', JSON.stringify(migrated));
        window.localStorage.removeItem('automaker:chatFontSize');
        return migrated;
      }
    }
    return DEFAULT_CHAT_DISPLAY_SETTINGS;
  });
  // Initialize session manager state - starts as true to match SSR
  // Then updates on mount based on actual screen size to prevent hydration mismatch
  const [showSessionManager, setShowSessionManager] = useState(true);
  const [showClearDialog, setShowClearDialog] = useState(false);

  const skipClearChatConfirm = useAppStore((s) => s.skipClearChatConfirm);
  const setSkipClearChatConfirm = useAppStore((s) => s.setSkipClearChatConfirm);

  const handleChatDisplaySettingsChange = useCallback((settings: ChatDisplaySettings) => {
    setChatDisplaySettings(settings);
    if (typeof window !== 'undefined') {
      window.localStorage.setItem('automaker:chatDisplaySettings', JSON.stringify(settings));
      // Notify same-tab listeners (e.g. FilePreview) about the change
      window.dispatchEvent(new CustomEvent('chatDisplaySettingsChanged'));
    }
  }, []);

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
  const quickCreateSessionRef = useRef<
    ((options?: QuickCreateSessionArgs) => Promise<boolean>) | null
  >(null);

  // Session management hook
  const { currentSessionId, handleSelectSession } = useAgentSession({
    projectPath: currentProject?.path,
  });

  // Invalidate session queries when WebSocket events arrive (e.g. session_metadata_updated, complete)
  useSessionQueryInvalidation(currentSessionId ?? undefined);

  // Session name for Save-to-Docs feature
  const { data: allSessions = [] } = useSessions(true);
  const currentSession = useMemo(
    () => allSessions.find((session) => session.id === currentSessionId) ?? null,
    [allSessions, currentSessionId]
  );
  const { data: availableModels = [], isFetched: availableModelsFetched } = useAvailableModels();
  const currentSessionName = currentSession?.name ?? null;
  const [copySuccess, setCopySuccess] = useState(false);
  const [isSavingToDoc, setIsSavingToDoc] = useState(false);

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
    activeSubAgents,
  } = useElectronAgent({
    sessionId: currentSessionId || '',
    workingDirectory: currentProject?.path,
    model: modelSelection.model,
    thinkingLevel: modelSelection.thinkingLevel,
    reasoningEffort: modelSelection.reasoningEffort,
    onToolUse: handleToolUse,
  });

  const chatActivityState: 'idle' | 'running' | 'stopped' =
    isProcessing || currentSession?.status === 'running'
      ? 'running'
      : currentSession?.status === 'stopped'
        ? 'stopped'
        : 'idle';

  const chatActivityHandleClass =
    chatActivityState === 'running'
      ? 'bg-amber-500/70 data-[resize-handle-state=hover]:bg-amber-500 data-[resize-handle-state=drag]:bg-amber-500 focus-visible:ring-amber-500'
      : chatActivityState === 'stopped'
        ? 'bg-red-500/70 data-[resize-handle-state=hover]:bg-red-500 data-[resize-handle-state=drag]:bg-red-500 focus-visible:ring-red-500'
        : undefined;

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
    setCurrentModel: timeLimiterSetCurrentModel,
    getElapsedSeconds,
    isTimeExceeded,
    isContextThresholdExceeded,
    autoCondenseEnabled,
    contextWindowOverrideTokens,
    pendingCopiedContent,
    setPendingCopiedContent,
    clearPendingContent,
  } = useTimeLimiterStore();

  const contextMessageCount = useMemo(() => {
    return messages.filter((message) => message.id !== 'welcome').length;
  }, [messages]);

  const estimatedConversationTokens = useMemo(() => {
    return messages
      .filter((message) => message.id !== 'welcome')
      .reduce((sum, message) => {
        const textTokens = Math.max(
          1,
          Math.ceil(message.content.length / CONTEXT_TEXT_CHARS_PER_TOKEN)
        );
        const toolTokens = (message.toolCalls ?? []).reduce((toolSum, toolCall) => {
          const inputPayload = JSON.stringify(toolCall.input);
          if (!inputPayload) return toolSum;
          return (
            toolSum + Math.max(1, Math.ceil(inputPayload.length / CONTEXT_TOOL_CHARS_PER_TOKEN))
          );
        }, 0);
        const imageTokens = (message.images?.length ?? 0) * CONTEXT_IMAGE_TOKEN_ESTIMATE;
        return sum + textTokens + toolTokens + imageTokens;
      }, 0);
  }, [messages]);

  const estimatedContextTokens = useMemo(() => {
    if (contextMessageCount <= 0) return 0;
    return estimatedConversationTokens + CONTEXT_BASELINE_TOKENS;
  }, [contextMessageCount, estimatedConversationTokens]);
  const hasConversationMessages = useMemo(() => {
    return messages.some((message) => message.role === 'user' || message.role === 'assistant');
  }, [messages]);

  const modelContextWindowTokens = useMemo(() => {
    if (!modelSelection.model || availableModels.length === 0) return null;

    const selectedModel = modelSelection.model.toLowerCase();
    const hasClaudeCanonical = Object.prototype.hasOwnProperty.call(
      CLAUDE_CANONICAL_MAP,
      selectedModel
    );
    const canonicalClaudeModel = hasClaudeCanonical
      ? CLAUDE_CANONICAL_MAP[selectedModel as keyof typeof CLAUDE_CANONICAL_MAP].toLowerCase()
      : null;
    const selectedCandidates = Array.from(
      new Set(
        [selectedModel, canonicalClaudeModel]
          .filter((value): value is string => Boolean(value))
          .flatMap((value) => [value, value.replace(/^(claude|cursor|codex|gemini|copilot)-/, '')])
      )
    );
    const selectedProvider = modelSelection.providerId?.toLowerCase();

    const matchesModel = (candidate: string | undefined): boolean => {
      if (!candidate) return false;
      const normalized = candidate.toLowerCase();
      if (selectedCandidates.includes(normalized)) return true;
      return selectedCandidates.some((value) => normalized.endsWith(`-${value}`));
    };

    const findMatch = (respectProvider: boolean) => {
      return availableModels.find((model) => {
        if (
          respectProvider &&
          selectedProvider &&
          model.provider &&
          model.provider.toLowerCase() !== selectedProvider
        ) {
          return false;
        }

        return matchesModel(model.id) || matchesModel(model.modelString);
      });
    };

    const matchedModel = findMatch(true) ?? findMatch(false);
    const windowSize = matchedModel?.contextWindow;

    if (typeof windowSize !== 'number' || windowSize <= 0) {
      return null;
    }

    return windowSize;
  }, [availableModels, modelSelection.model, modelSelection.providerId]);

  const contextWindowTokens = useMemo(() => {
    if (typeof modelContextWindowTokens === 'number' && modelContextWindowTokens > 0) {
      return modelContextWindowTokens;
    }

    if (typeof contextWindowOverrideTokens === 'number' && contextWindowOverrideTokens > 0) {
      return contextWindowOverrideTokens;
    }

    return null;
  }, [modelContextWindowTokens, contextWindowOverrideTokens]);

  const contextUsagePercent = useMemo(() => {
    if (!contextWindowTokens || contextWindowTokens <= 0) return null;
    return (estimatedContextTokens / contextWindowTokens) * 100;
  }, [estimatedContextTokens, contextWindowTokens]);

  // Sync the current model to the time limiter store so it uses model-specific time limits
  useEffect(() => {
    if (modelSelection.model) {
      timeLimiterSetCurrentModel(modelSelection.model);
    }
  }, [modelSelection.model, timeLimiterSetCurrentModel]);

  // Track elapsed seconds for display
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const autoSessionSwitchTriggeredSessionsRef = useRef(new Set<string>());
  const pendingCopiedContentSourceSessionIdRef = useRef<string | null>(null);

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
      const sourceSessionId = pendingCopiedContentSourceSessionIdRef.current;
      if (sourceSessionId && sourceSessionId === currentSessionId) {
        return;
      }
      // Never inject into an already-used chat. Wait for the fresh follow-up session.
      if (hasConversationMessages) {
        return;
      }

      // Set the pending content as input
      setInput(pendingCopiedContent);
      clearPendingContent();
      pendingCopiedContentSourceSessionIdRef.current = null;
    }
  }, [
    pendingCopiedContent,
    currentSessionId,
    isConnected,
    isProcessing,
    clearPendingContent,
    hasConversationMessages,
  ]);

  const createFollowUpSessionWithSummary = useCallback(
    async (reason: 'time-limit' | 'context-threshold'): Promise<boolean> => {
      const quickCreate = quickCreateSessionRef.current;
      if (!quickCreate || !currentSessionId) return false;

      const autoHintText =
        reason === 'context-threshold'
          ? 'Hinweis: Dieser Chat wurde automatisch zusammengefasst, weil der Kontext fast voll war.\n\n'
          : 'Hinweis: Dieser Chat wurde automatisch zusammengefasst, weil das Zeitlimit erreicht war.\n\n';

      const contextSummary = `${autoHintText}${generateContextSummary(messages)}`;
      pendingCopiedContentSourceSessionIdRef.current = currentSessionId;
      setPendingCopiedContent(contextSummary);
      const created = await quickCreate({
        attachOrchestratorRunId: false,
        forceCreate: true,
        sourceType: 'manual',
        parentSessionId: currentSessionId,
      });

      if (!created) {
        pendingCopiedContentSourceSessionIdRef.current = null;
        clearPendingContent();
        toast.error('Automatischer Wechsel fehlgeschlagen. Bitte kurz erneut versuchen.');
        return false;
      }

      if (reason === 'context-threshold') {
        toast.success('Kontext war fast voll. Neuer Chat mit Zusammenfassung gestartet.');
      } else {
        toast.success('Zeitlimit erreicht. Neuer Chat mit Zusammenfassung gestartet.');
      }

      return true;
    },
    [messages, currentSessionId, setPendingCopiedContent, clearPendingContent]
  );

  // Auto-session-switch when time limit is exceeded
  useEffect(() => {
    if (!timeLimiterEnabled || !currentSessionId || !isConnected) return;
    if (!isTimeExceeded()) return;
    if (isProcessing) return; // Don't switch while processing
    if (autoSessionSwitchTriggeredSessionsRef.current.has(currentSessionId)) return;

    const sourceSessionId = currentSessionId;
    autoSessionSwitchTriggeredSessionsRef.current.add(sourceSessionId);

    void createFollowUpSessionWithSummary('time-limit')
      .then((didCreate) => {
        if (!didCreate) {
          autoSessionSwitchTriggeredSessionsRef.current.delete(sourceSessionId);
        }
      })
      .catch((error) => {
        logger.error('[TimeLimiter] Automatic session switch failed', error);
        autoSessionSwitchTriggeredSessionsRef.current.delete(sourceSessionId);
      });
  }, [
    timeLimiterEnabled,
    currentSessionId,
    isConnected,
    isProcessing,
    isTimeExceeded,
    createFollowUpSessionWithSummary,
  ]);

  // Auto-session-switch when context threshold is exceeded
  useEffect(() => {
    if (!autoCondenseEnabled || !currentSessionId || !isConnected) return;
    if (isProcessing) return;
    if (contextUsagePercent === null) return;
    if (contextWindowTokens === null) return;
    if (!isContextThresholdExceeded(contextUsagePercent)) return;
    if (contextMessageCount < MIN_MESSAGES_FOR_AUTO_CONDENSE) return;
    if (autoSessionSwitchTriggeredSessionsRef.current.has(currentSessionId)) return;

    const sourceSessionId = currentSessionId;
    autoSessionSwitchTriggeredSessionsRef.current.add(sourceSessionId);

    void createFollowUpSessionWithSummary('context-threshold')
      .then((didCreate) => {
        if (!didCreate) {
          autoSessionSwitchTriggeredSessionsRef.current.delete(sourceSessionId);
        }
      })
      .catch((error) => {
        logger.error('[ContextCondense] Automatic session switch failed', error);
        autoSessionSwitchTriggeredSessionsRef.current.delete(sourceSessionId);
      });
  }, [
    autoCondenseEnabled,
    currentSessionId,
    isConnected,
    isProcessing,
    contextUsagePercent,
    contextWindowTokens,
    contextMessageCount,
    isContextThresholdExceeded,
    createFollowUpSessionWithSummary,
  ]);

  // Orchestrator store
  const {
    isEnabled: orchestratorEnabled,
    triggerKeyword: orchestratorTriggerKeyword,
    shouldTrigger: orchestratorShouldTrigger,
    incrementIteration: orchestratorIncrementIteration,
    setPendingContent: setOrchestratorPendingContent,
    pendingOrchestratorContent,
    clearPendingContent: clearOrchestratorPendingContent,
    autoSendEnabled: orchestratorAutoSend,
    getMessageWrapper: getOrchestratorMessageWrapper,
    setAutoSendStatus: orchestratorSetAutoSendStatus,
    setLastTriggerCheck: orchestratorSetLastTriggerCheck,
  } = useOrchestratorStore(
    useShallow((s) => ({
      isEnabled: s.isEnabled,
      triggerKeyword: s.triggerKeyword,
      shouldTrigger: s.shouldTrigger,
      incrementIteration: s.incrementIteration,
      setPendingContent: s.setPendingContent,
      pendingOrchestratorContent: s.pendingOrchestratorContent,
      clearPendingContent: s.clearPendingContent,
      autoSendEnabled: s.autoSendEnabled,
      getMessageWrapper: s.getMessageWrapper,
      setAutoSendStatus: s.setAutoSendStatus,
      setLastTriggerCheck: s.setLastTriggerCheck,
    }))
  );

  // Track previous isProcessing to detect complete events (true → false)
  const wasProcessingRef = useRef(false);
  const assistantSnapshotAtProcessingStartRef = useRef<{ id: string; content: string } | null>(
    null
  );
  const orchestratorSourceSessionIdRef = useRef<string | null>(null);
  const sessionsWithInjectedSystemPromptsRef = useRef(new Set<string>());

  // Detect when processing finishes and check for orchestrator trigger
  useEffect(() => {
    const wasProcessing = wasProcessingRef.current;
    const assistantMessages = messages.filter((message) => message.role === 'assistant');
    const lastAssistantMessage =
      assistantMessages.length > 0 ? assistantMessages[assistantMessages.length - 1] : null;

    if (!wasProcessing && isProcessing) {
      assistantSnapshotAtProcessingStartRef.current = lastAssistantMessage
        ? {
            id: lastAssistantMessage.id,
            content: lastAssistantMessage.content,
          }
        : null;
    }

    wasProcessingRef.current = isProcessing;

    // Only trigger when processing transitions from true → false
    if (!wasProcessing || isProcessing) return;
    if (!orchestratorEnabled || !currentSessionId || !isConnected) return;

    // Ignore stale completion events that did not produce a new assistant message.
    if (!lastAssistantMessage) {
      return;
    }

    const assistantSnapshot = assistantSnapshotAtProcessingStartRef.current;
    const hasNewAssistantOutput =
      !assistantSnapshot ||
      lastAssistantMessage.id !== assistantSnapshot.id ||
      lastAssistantMessage.content !== assistantSnapshot.content;

    if (!hasNewAssistantOutput) {
      logger.info(
        '[Orchestrator] Ignoring completion event because assistant output did not change'
      );
      orchestratorSetLastTriggerCheck({
        checkedAt: Date.now(),
        matched: false,
        reason: 'no-new-assistant-output',
        lastLine: '',
        keyword: orchestratorTriggerKeyword.trim(),
      });
      return;
    }

    // Check if the trigger keyword is present
    if (!orchestratorShouldTrigger(lastAssistantMessage.content)) return;

    // Increment iteration (returns false if max reached)
    const canContinue = orchestratorIncrementIteration();
    if (!canContinue) return;

    // Remember source session so content is only injected/sent after switching sessions.
    orchestratorSourceSessionIdRef.current = currentSessionId;

    // Store the last AI message as pending content for the new chat
    setOrchestratorPendingContent(lastAssistantMessage.content);
    if (orchestratorAutoSend) {
      orchestratorSetAutoSendStatus('waiting');
    }

    // Create a new session (orchestrator-triggered: attach run ID)
    if (quickCreateSessionRef.current) {
      quickCreateSessionRef.current(true);
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
    orchestratorAutoSend,
    orchestratorSetAutoSendStatus,
    orchestratorSetLastTriggerCheck,
    orchestratorTriggerKeyword,
  ]);

  // Guard ref to prevent double auto-sends
  const orchestratorAutoSendInProgressRef = useRef(false);

  // Handle pending orchestrator content in new session
  useEffect(() => {
    if (!pendingOrchestratorContent || !currentSessionId) return;
    const content = pendingOrchestratorContent;
    const sourceSessionId = orchestratorSourceSessionIdRef.current;

    // Never inject pending content back into the source/origin session.
    // Wait until SessionManager actually switched to the newly created session.
    if (sourceSessionId && sourceSessionId === currentSessionId) {
      if (orchestratorAutoSend) {
        orchestratorSetAutoSendStatus('waiting');
      }
      return;
    }

    if (!orchestratorAutoSend) {
      // Manual mode: paste into input of the new session and keep it visible.
      setInput(content);
      clearOrchestratorPendingContent();
      orchestratorSetAutoSendStatus('idle');
      orchestratorSourceSessionIdRef.current = null;
      return;
    }

    // Auto-send mode: reactively wait until session is connected and idle.
    if (!isConnected || isProcessing) {
      orchestratorSetAutoSendStatus('waiting');
      return;
    }

    if (orchestratorAutoSendInProgressRef.current) return;

    orchestratorAutoSendInProgressRef.current = true;
    orchestratorSetAutoSendStatus('sending');
    clearOrchestratorPendingContent();

    sendMessage(content)
      .catch((error) => {
        logger.error('[Orchestrator] Auto-send failed, falling back to textarea', error);
        setInput(content);
      })
      .finally(() => {
        orchestratorAutoSendInProgressRef.current = false;
        orchestratorSetAutoSendStatus('idle');
        orchestratorSourceSessionIdRef.current = null;
      });
  }, [
    pendingOrchestratorContent,
    currentSessionId,
    isConnected,
    isProcessing,
    clearOrchestratorPendingContent,
    orchestratorAutoSend,
    sendMessage,
    orchestratorSetAutoSendStatus,
  ]);

  useEffect(() => {
    if (!currentSessionId) return;

    const hasUserMessages = messages.some((message) => message.role === 'user');
    if (hasUserMessages) {
      sessionsWithInjectedSystemPromptsRef.current.add(currentSessionId);
      return;
    }

    sessionsWithInjectedSystemPromptsRef.current.delete(currentSessionId);
  }, [currentSessionId, messages]);

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

      let messageContent = messageInput;
      const shouldInjectSystemPrompts =
        !!currentSessionId && !sessionsWithInjectedSystemPromptsRef.current.has(currentSessionId);

      if (shouldInjectSystemPrompts) {
        const agentPromptsText = getSelectedPromptsText();
        const orchestratorWrapper = getOrchestratorMessageWrapper();

        messageContent = embedSystemPrompts(messageInput, {
          agentPromptsText,
          orchestratorPreMessage: orchestratorWrapper?.preMessage,
          orchestratorPostMessage: orchestratorWrapper?.postMessage,
        });

        sessionsWithInjectedSystemPromptsRef.current.add(currentSessionId);
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
    [
      input,
      fileAttachments,
      isProcessing,
      sendMessage,
      addToServerQueue,
      getSelectedPromptsText,
      getOrchestratorMessageWrapper,
    ]
  );

  const handleNewSession = useCallback(() => {
    quickCreateSessionRef.current?.();
  }, []);

  const handleClearChat = async () => {
    if (skipClearChatConfirm) {
      await clearHistory();
      if (currentSessionId) {
        sessionsWithInjectedSystemPromptsRef.current.delete(currentSessionId);
      }
    } else {
      setShowClearDialog(true);
    }
  };

  const handleConfirmClear = async () => {
    await clearHistory();
    if (currentSessionId) {
      sessionsWithInjectedSystemPromptsRef.current.delete(currentSessionId);
    }
  };

  const handleCopyAll = useCallback(async () => {
    if (messages.length === 0) return;
    const summary = generateChatSummary(messages);
    const success = await copyToClipboard(summary.formattedChat);
    if (success) {
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 2000);
    }
  }, [messages]);

  const handleSaveAsNewDoc = useCallback(async () => {
    if (!currentProject?.path || messages.length === 0 || isSavingToDoc) return;
    setIsSavingToDoc(true);
    try {
      const api = getHttpApiClient();
      const summary = generateChatSummary(messages);
      const safeName = (currentSessionName || 'Chat')
        .replace(/[<>:"/\\|?*\x00-\x1f]/g, '')
        .replace(/\s+/g, '-')
        .replace(/-+/g, '-')
        .replace(/^-|-$/g, '')
        .slice(0, 100);
      const docName = `${safeName}-history.md`;

      // Save to {projectRoot}/History/ folder instead of .automaker/docs/
      const historyDir = `${currentProject.path}/History`;
      const historyFilePath = `${historyDir}/${docName}`;

      // Ensure History/ directory exists
      await api.mkdir(historyDir);

      // Write the history file
      await api.writeFile(historyFilePath, summary.formattedChat);

      // Set the file path with prefix into the chat input field
      setInput((prev) => {
        const trimmed = prev.replace(/\s+$/, '');
        const prefix = trimmed.length > 0 ? '\n\n' : '';
        return `${trimmed}${prefix}Verlaufsdatei: ${historyFilePath}\n`;
      });

      // Focus the input field
      setTimeout(() => {
        inputRef.current?.focus();
      }, 100);

      toast.success(`Verlauf gespeichert: History/${docName}`);
      setCurrentDocPath(historyFilePath);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Fehler beim Speichern';
      toast.error(msg);
    } finally {
      setIsSavingToDoc(false);
    }
  }, [currentProject, messages, isSavingToDoc, currentSessionName, setCurrentDocPath, setInput]);

  const handleAppendChatToCurrent = useCallback(async () => {
    if (!currentProject?.path || !currentDocPath || messages.length === 0 || isSavingToDoc) return;
    setIsSavingToDoc(true);
    try {
      const api = getHttpApiClient();
      const summary = generateChatSummary(messages);

      // Read existing content from the current history file
      const existingResult = await api.readFile(currentDocPath);
      const existing = existingResult.content || '';
      const separator = existing.trim().length > 0 ? '\n\n---\n\n' : '';

      // Write appended content back to the history file
      await api.writeFile(currentDocPath, existing + separator + summary.formattedChat);

      // Set the file path with prefix into the chat input field
      setInput((prev) => {
        const trimmed = prev.replace(/\s+$/, '');
        const prefix = trimmed.length > 0 ? '\n\n' : '';
        return `${trimmed}${prefix}Verlaufsdatei: ${currentDocPath}\n`;
      });

      // Focus the input field
      setTimeout(() => {
        inputRef.current?.focus();
      }, 100);

      toast.success('Verlauf zum Dokument hinzugefuegt');
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Fehler beim Anhaengen';
      toast.error(msg);
    } finally {
      setIsSavingToDoc(false);
    }
  }, [currentProject, currentDocPath, messages, isSavingToDoc, setInput]);

  const handleShowSessionManager = useCallback(() => {
    setShowSessionManager(true);
  }, []);

  const handleOpenSubAgentSession = useCallback(
    (sessionId: string) => {
      const targetSession = allSessions.find((session) => session.id === sessionId);
      handleSelectSession(sessionId, targetSession?.projectPath);
    },
    [allSessions, handleSelectSession]
  );

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
              <ResizableHandle withHandle className={chatActivityHandleClass} />
            </>
          )}

          {/* Chat Area - Desktop */}
          <ResizablePanel id="chat-area" defaultSize={60} minSize={30}>
            <div className="flex-1 flex flex-col overflow-hidden h-full">
              {/* Header */}
              {!hideHeader && (
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
                  onCopyAll={handleCopyAll}
                  copySuccess={copySuccess}
                  canCopyAll={messages.length > 0 && isConnected}
                  canSaveToDocs={
                    Boolean(currentProject?.path) && messages.length > 0 && isConnected
                  }
                  hasCurrentDocPath={Boolean(currentDocPath)}
                  isSavingToDoc={isSavingToDoc}
                  chatDisplaySettings={chatDisplaySettings}
                  onChatDisplaySettingsChange={handleChatDisplaySettingsChange}
                  onSaveAsNewDoc={handleSaveAsNewDoc}
                  onAppendChatToCurrent={handleAppendChatToCurrent}
                  worktreeActions={worktreeActionsProps}
                />
              )}

              {/* Messages */}
              <ChatArea
                currentSessionId={currentSessionId}
                messages={displayMessages}
                isProcessing={isProcessing}
                activeSubAgents={activeSubAgents}
                onOpenSubAgentSession={handleOpenSubAgentSession}
                showSessionManager={showSessionManager}
                messagesContainerRef={messagesContainerRef}
                onScroll={handleScroll}
                onShowSessionManager={handleShowSessionManager}
                chatBackgroundColor={currentProject?.chatBackgroundColor}
                chatBubbleColor={currentProject?.chatBubbleColor}
                userBubbleColor={currentProject?.userBubbleColor}
                chatDisplaySettings={chatDisplaySettings}
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
                  elapsedSeconds={elapsedSeconds}
                  estimatedContextTokens={estimatedContextTokens}
                  contextWindowTokens={contextWindowTokens}
                  modelContextWindowTokens={modelContextWindowTokens}
                  isModelContextLookupReady={availableModelsFetched}
                  contextUsagePercent={contextUsagePercent}
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
                  onNewSession={handleNewSession}
                  chatActivityState={chatActivityState}
                />
              )}
            </div>
          </ResizablePanel>

          {/* Right Panel - Desktop (resizable): Browser, Files, Terminal, Dashboard */}
          {browserPanelOpen && currentProject && (
            <>
              <ResizableHandle withHandle className={chatActivityHandleClass} />
              <ResizablePanel id="right-panel" defaultSize={20} minSize={15} maxSize={50}>
                <RightPanelShell projectPath={currentProject.path} />
              </ResizablePanel>
            </>
          )}
        </ResizablePanelGroup>
      ) : (
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Header */}
          {!hideHeader && (
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
              onCopyAll={handleCopyAll}
              copySuccess={copySuccess}
              canCopyAll={messages.length > 0 && isConnected}
              canSaveToDocs={Boolean(currentProject?.path) && messages.length > 0 && isConnected}
              hasCurrentDocPath={Boolean(currentDocPath)}
              isSavingToDoc={isSavingToDoc}
              chatDisplaySettings={chatDisplaySettings}
              onChatDisplaySettingsChange={handleChatDisplaySettingsChange}
              onSaveAsNewDoc={handleSaveAsNewDoc}
              onAppendChatToCurrent={handleAppendChatToCurrent}
            />
          )}

          {/* Messages */}
          <ChatArea
            currentSessionId={currentSessionId}
            messages={displayMessages}
            isProcessing={isProcessing}
            activeSubAgents={activeSubAgents}
            onOpenSubAgentSession={handleOpenSubAgentSession}
            showSessionManager={showSessionManager}
            messagesContainerRef={messagesContainerRef}
            onScroll={handleScroll}
            onShowSessionManager={handleShowSessionManager}
            chatBackgroundColor={currentProject?.chatBackgroundColor}
            chatBubbleColor={currentProject?.chatBubbleColor}
            userBubbleColor={currentProject?.userBubbleColor}
            chatDisplaySettings={chatDisplaySettings}
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
              elapsedSeconds={elapsedSeconds}
              estimatedContextTokens={estimatedContextTokens}
              contextWindowTokens={contextWindowTokens}
              modelContextWindowTokens={modelContextWindowTokens}
              isModelContextLookupReady={availableModelsFetched}
              contextUsagePercent={contextUsagePercent}
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
              onNewSession={handleNewSession}
              chatActivityState={chatActivityState}
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

      {/* Clear Chat Confirmation Dialog */}
      <ConfirmDialog
        open={showClearDialog}
        onOpenChange={setShowClearDialog}
        onConfirm={handleConfirmClear}
        title="Clear Conversation"
        description="Are you sure you want to clear this conversation? All messages will be permanently deleted."
        icon={Trash2}
        iconClassName="text-red-400"
        confirmText="Clear"
        confirmVariant="destructive"
      >
        <div className="flex items-center gap-2 pt-2">
          <Checkbox
            id="skip-clear-confirm"
            checked={skipClearChatConfirm}
            onCheckedChange={(checked) => setSkipClearChatConfirm(checked)}
          />
          <Label
            htmlFor="skip-clear-confirm"
            className="text-sm text-muted-foreground cursor-pointer select-none"
          >
            Don&apos;t ask again
          </Label>
        </div>
      </ConfirmDialog>
    </div>
  );
}
