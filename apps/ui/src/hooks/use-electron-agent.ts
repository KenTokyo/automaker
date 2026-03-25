import { useState, useEffect, useCallback, useRef } from 'react';
import type { Message, StreamEvent } from '@/types/electron';
import { useMessageQueue } from './use-message-queue';
import type { ImageAttachment, TextFileAttachment } from '@/store/app-store';
import { getElectronAPI } from '@/lib/electron';
import { sanitizeFilename } from '@/lib/image-utils';
import { createLogger } from '@automaker/utils/logger';
import type { ReasoningEffort } from '@automaker/types';

const logger = createLogger('ElectronAgent');

export interface ActiveSubAgent {
  agentId: string;
  agentType: string;
  description: string;
  childSessionId?: string;
  model?: string;
  startedAt: Date;
  elapsedSeconds: number;
  runInBackground?: boolean;
  lastToolName?: string;
}

interface UseElectronAgentOptions {
  sessionId: string;
  workingDirectory?: string;
  model?: string;
  thinkingLevel?: string;
  reasoningEffort?: string;
  onToolUse?: (toolName: string, toolInput: unknown) => void;
}

// Server-side queued prompt type
interface QueuedPrompt {
  id: string;
  message: string;
  imagePaths?: string[];
  model?: string;
  thinkingLevel?: string;
  reasoningEffort?: string;
  addedAt: string;
}

interface UseElectronAgentResult {
  messages: Message[];
  isProcessing: boolean;
  isConnected: boolean;
  sendMessage: (
    content: string,
    images?: ImageAttachment[],
    textFiles?: TextFileAttachment[]
  ) => Promise<void>;
  stopExecution: () => Promise<void>;
  clearHistory: () => Promise<void>;
  error: string | null;
  // Client-side queue (local)
  queuedMessages: {
    id: string;
    content: string;
    images?: ImageAttachment[];
    textFiles?: TextFileAttachment[];
    timestamp: Date;
  }[];
  isQueueProcessing: boolean;
  clearMessageQueue: () => void;
  // Server-side queue (persistent, auto-runs)
  serverQueue: QueuedPrompt[];
  addToServerQueue: (
    message: string,
    images?: ImageAttachment[],
    textFiles?: TextFileAttachment[]
  ) => Promise<void>;
  removeFromServerQueue: (promptId: string) => Promise<void>;
  clearServerQueue: () => Promise<void>;
  // Active sub-agents
  activeSubAgents: ActiveSubAgent[];
}

/**
 * React hook for interacting with the Electron-based Claude agent
 *
 * This hook provides a clean interface to the agent running in the Electron
 * main process, which survives Next.js restarts.
 */
export function useElectronAgent({
  sessionId,
  workingDirectory,
  model,
  thinkingLevel,
  reasoningEffort,
  onToolUse,
}: UseElectronAgentOptions): UseElectronAgentResult {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [serverQueue, setServerQueue] = useState<QueuedPrompt[]>([]);
  const [activeSubAgents, setActiveSubAgents] = useState<ActiveSubAgent[]>([]);
  const unsubscribeRef = useRef<(() => void) | null>(null);
  const currentMessageRef = useRef<Message | null>(null);
  const onToolUseRef = useRef(onToolUse);
  // Accumulate tool calls for the current assistant message
  const pendingToolCallsRef = useRef<Array<{ name: string; input: unknown }>>([]);

  // Keep onToolUse ref up to date
  useEffect(() => {
    onToolUseRef.current = onToolUse;
  }, [onToolUse]);

  const appendLocalErrorMessage = useCallback((errorText: string) => {
    const normalizedError = errorText.trim();
    if (!normalizedError) {
      return;
    }

    const nextMessage: Message = {
      id: `err_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      role: 'assistant',
      content: `Fehler: ${normalizedError}`,
      timestamp: new Date().toISOString(),
      isError: true,
    };

    setMessages((prev) => {
      const lastMessage = prev[prev.length - 1];
      if (
        lastMessage?.isError &&
        lastMessage.role === 'assistant' &&
        lastMessage.content === nextMessage.content
      ) {
        return prev;
      }

      return [...prev, nextMessage];
    });
  }, []);

  const resolveImagePaths = useCallback(
    async (
      api: ReturnType<typeof getElectronAPI>,
      images?: ImageAttachment[]
    ): Promise<string[] | undefined> => {
      if (!images || images.length === 0) {
        return undefined;
      }

      const imagePaths: string[] = [];

      for (const image of images) {
        // Reuse persisted path from paste/drop flow when available.
        if (image.savedPath) {
          imagePaths.push(image.savedPath);
          continue;
        }

        if (!api?.saveImageToTemp) {
          logger.warn('saveImageToTemp is not available and no savedPath exists for image');
          continue;
        }

        const result = await api.saveImageToTemp(
          image.data,
          sanitizeFilename(image.filename),
          image.mimeType,
          workingDirectory // Pass workingDirectory as projectPath
        );

        if (result.success && result.path) {
          imagePaths.push(result.path);
          logger.info('Saved image to .automaker/images:', result.path);
        } else {
          logger.error('Failed to save image:', result.error);
        }
      }

      const uniquePaths = Array.from(new Set(imagePaths));
      return uniquePaths.length > 0 ? uniquePaths : undefined;
    },
    [workingDirectory]
  );

  const logExecutionConfig = useCallback(
    (context: 'send' | 'queue') => {
      const ultraModeActive = thinkingLevel === 'ultrathink' || reasoningEffort === 'xhigh';
      logger.info(`[${context}] Model configuration`, {
        sessionId,
        model: model ?? '(session-default)',
        thinkingLevel: thinkingLevel ?? 'none',
        reasoningEffort: reasoningEffort ?? 'none',
        ultraModeActive,
      });
    },
    [sessionId, model, thinkingLevel, reasoningEffort]
  );

  // Send message directly to the agent (bypassing queue)
  const sendMessageDirectly = useCallback(
    async (content: string, images?: ImageAttachment[], textFiles?: TextFileAttachment[]) => {
      const api = getElectronAPI();
      if (!api?.agent) {
        setError('API not available');
        return;
      }

      if (isProcessing) {
        throw new Error('Agent is already processing a message');
      }

      setIsProcessing(true);
      setError(null);

      try {
        logger.info('Sending message directly', {
          hasImages: images && images.length > 0,
          imageCount: images?.length || 0,
          hasTextFiles: textFiles && textFiles.length > 0,
          textFileCount: textFiles?.length || 0,
        });

        // Build message content with text file context prepended
        let messageContent = content;
        if (textFiles && textFiles.length > 0) {
          const contextParts = textFiles.map((file) => {
            return `<file name="${file.filename}">\n${file.content}\n</file>`;
          });
          const contextBlock = `Here are some files for context:\n\n${contextParts.join('\n\n')}\n\n`;
          messageContent = contextBlock + content;
        }

        const imagePaths = await resolveImagePaths(api, images);
        logExecutionConfig('send');

        const result = await api.agent!.send(
          sessionId,
          messageContent,
          workingDirectory,
          imagePaths,
          model,
          thinkingLevel,
          reasoningEffort as ReasoningEffort | undefined
        );

        if (!result.success) {
          const errorText = result.error || 'Senden hat nicht geklappt.';
          setError(errorText);
          appendLocalErrorMessage(errorText);
          setIsProcessing(false);
        }
        // Note: We don't set isProcessing to false here because
        // it will be set by the "complete" or "error" stream event
      } catch (err) {
        logger.error('Failed to send message:', err);
        const errorText = err instanceof Error ? err.message : 'Senden hat nicht geklappt.';
        setError(errorText);
        appendLocalErrorMessage(errorText);
        setIsProcessing(false);
        throw err;
      }
    },
    [
      sessionId,
      workingDirectory,
      model,
      thinkingLevel,
      reasoningEffort,
      isProcessing,
      resolveImagePaths,
      logExecutionConfig,
      appendLocalErrorMessage,
    ]
  );

  // Message queue for queuing messages when agent is busy
  const { queuedMessages, isProcessingQueue, clearQueue, processNext } = useMessageQueue({
    onProcessNext: async (queuedMessage) => {
      await sendMessageDirectly(
        queuedMessage.content,
        queuedMessage.images,
        queuedMessage.textFiles
      );
    },
  });

  // Initialize connection and load history
  useEffect(() => {
    const api = getElectronAPI();
    if (!api?.agent) {
      setError('API not available.');
      return;
    }

    if (!sessionId) {
      // No session selected - reset state
      setMessages([]);
      setIsConnected(false);
      setIsProcessing(false);
      setError(null);
      return;
    }

    let mounted = true;

    // Reset connection and processing status immediately when switching sessions.
    // This prevents stale state from the previous session blocking the new one
    // (e.g. isProcessing=true from session A would cause sendMessage to silently
    // drop messages in session B).
    setIsConnected(false);
    setIsProcessing(false);
    setActiveSubAgents([]); // Clear sub-agents from previous session to prevent bleeding

    const initialize = async () => {
      // Reset error state when switching sessions
      setError(null);

      try {
        logger.info('Starting session:', sessionId);
        const result = await api.agent!.start(sessionId, workingDirectory);

        if (!mounted) return;

        if (result.success && result.messages) {
          logger.info('Loaded', result.messages.length, 'messages');
          setMessages(result.messages);
          setIsConnected(true);

          // Check if the agent is currently running for this session
          const historyResult = await api.agent!.getHistory(sessionId);
          if (mounted && historyResult.success) {
            const isRunning = historyResult.isRunning || false;
            logger.info('Session running state:', isRunning);
            setIsProcessing(isRunning);
          }
        } else {
          setError(result.error || 'Failed to start session');
          setIsProcessing(false);
        }
      } catch (err) {
        if (!mounted) return;
        logger.error('Failed to initialize:', err);
        setError(err instanceof Error ? err.message : 'Failed to initialize');
        setIsProcessing(false);
      }
    };

    initialize();

    return () => {
      mounted = false;
    };
  }, [sessionId, workingDirectory]);

  // Auto-process queue when agent finishes processing
  useEffect(() => {
    if (!isProcessing && !isProcessingQueue && queuedMessages.length > 0) {
      logger.info('Auto-processing next queued message');
      processNext();
    }
  }, [isProcessing, isProcessingQueue, queuedMessages.length, processNext]);

  // Subscribe to streaming events
  useEffect(() => {
    const api = getElectronAPI();
    if (!api?.agent) return;
    if (!sessionId) return; // Don't subscribe if no session

    logger.info('Subscribing to stream events for session:', sessionId);

    const handleStream = (event: StreamEvent) => {
      // CRITICAL: Only process events for our specific session
      if (event.sessionId !== sessionId) {
        logger.info('Ignoring event for different session:', event.sessionId);
        return;
      }

      logger.info('Stream event for', sessionId, ':', event.type);

      switch (event.type) {
        case 'started':
          // Agent started processing (including from queue)
          logger.info('Agent started processing for session:', sessionId);
          pendingToolCallsRef.current = [];
          setIsProcessing(true);
          break;

        case 'message':
          // User message added
          setMessages((prev) => {
            if (prev.some((msg) => msg.id === event.message.id)) {
              return prev;
            }
            return [...prev, event.message];
          });
          break;

        case 'stream':
          // Assistant message streaming
          setMessages((prev) => {
            const existingIndex = prev.findIndex((m) => m.id === event.messageId);
            if (existingIndex >= 0) {
              const existingMessage = prev[existingIndex];
              if (existingMessage.content === event.content) {
                return prev;
              }

              const nextMessages = [...prev];
              nextMessages[existingIndex] = {
                ...existingMessage,
                content: event.content,
              };
              return nextMessages;
            }

            const newMessage: Message = {
              id: event.messageId,
              role: 'assistant',
              content: event.content,
              timestamp: new Date().toISOString(),
            };
            currentMessageRef.current = newMessage;
            return [...prev, newMessage];
          });

          if (event.isComplete) {
            currentMessageRef.current = null;
          }
          break;

        case 'tool_use':
          // Tool being used - accumulate for current message
          logger.info('Tool use:', event.tool.name);
          pendingToolCallsRef.current.push({ name: event.tool.name, input: event.tool.input });
          onToolUseRef.current?.(event.tool.name, event.tool.input);
          break;

        case 'complete': {
          // Agent finished processing for THIS session
          logger.info('Processing complete for session:', sessionId);
          setIsProcessing(false);
          // Keep background sub-agents visible until they emit subagent_stopped.
          // This prevents them from disappearing when the parent agent completes first.
          setActiveSubAgents((prev) => prev.filter((agent) => agent.runInBackground));
          const completedToolCalls =
            pendingToolCallsRef.current.length > 0 ? [...pendingToolCallsRef.current] : undefined;
          pendingToolCallsRef.current = [];
          if (event.messageId) {
            setMessages((prev) => {
              const existingIndex = prev.findIndex((msg) => msg.id === event.messageId);
              if (existingIndex < 0) {
                return prev;
              }

              const existingMessage = prev[existingIndex];
              const tokenUsage = event.usage ?? existingMessage.tokenUsage;
              const nextMessages = [...prev];
              nextMessages[existingIndex] = {
                ...existingMessage,
                content: event.content,
                toolCalls: completedToolCalls,
                tokenUsage,
              };
              return nextMessages;
            });
          } else if (event.usage) {
            setMessages((prev) => {
              const lastAssistantIndex = [...prev]
                .map((msg, index) => ({ msg, index }))
                .reverse()
                .find(({ msg }) => msg.role === 'assistant')?.index;
              if (lastAssistantIndex === undefined) return prev;

              const existingMessage = prev[lastAssistantIndex];
              if (existingMessage.tokenUsage === event.usage) return prev;
              const nextMessages = [...prev];
              nextMessages[lastAssistantIndex] = {
                ...existingMessage,
                tokenUsage: event.usage,
              };
              return nextMessages;
            });
          }
          break;
        }

        case 'error':
          // Error occurred for THIS session
          logger.error('Agent error for session:', sessionId, event.error);
          setIsProcessing(false);
          setError(event.error);
          if (event.message) {
            const errorMessage = event.message;
            setMessages((prev) => [...prev, errorMessage]);
          } else {
            // Some providers stream an error without a message payload. Ensure the
            // user still sees a clear error bubble in the chat.
            const fallbackMessage: Message = {
              id: `err_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
              role: 'assistant',
              content: `Error: ${event.error}`,
              timestamp: new Date().toISOString(),
              isError: true,
            };
            setMessages((prev) => [...prev, fallbackMessage]);
          }
          break;

        case 'queue_updated':
          // Server queue was updated
          logger.info('Queue updated:', event.queue);
          setServerQueue(event.queue || []);
          break;

        case 'queue_error':
          // Error processing a queued prompt
          logger.error('Queue error:', event.error);
          setError(event.error);
          break;

        case 'stopped':
          // Session was manually stopped by the user
          logger.info('Session stopped for:', sessionId);
          setIsProcessing(false);
          // Keep background sub-agents visible until explicit stop events arrive.
          setActiveSubAgents((prev) => prev.filter((agent) => agent.runInBackground));
          break;

        case 'session_metadata_updated':
          // Session title/description updated from first Claude response
          // Query invalidation hook handles the sessions list refresh
          logger.info('Session metadata updated:', event.name);
          break;

        case 'subagent_started':
          // Sub-agent started processing
          logger.info('Sub-agent started:', event.agentId, event.agentType);
          setActiveSubAgents((prev) => [
            ...prev.filter((a) => a.agentId !== event.agentId),
            {
              agentId: event.agentId,
              agentType: event.agentType,
              description: event.description,
              childSessionId: event.childSessionId,
              model: event.model,
              startedAt: new Date(),
              elapsedSeconds: 0,
              runInBackground: event.runInBackground,
            },
          ]);
          break;

        case 'subagent_progress':
          // Sub-agent progress update
          setActiveSubAgents((prev) =>
            prev.map((a) =>
              a.agentId === event.agentId
                ? { ...a, elapsedSeconds: event.elapsedSeconds, lastToolName: event.toolName }
                : a
            )
          );
          break;

        case 'subagent_stopped':
          // Sub-agent stopped
          logger.info('Sub-agent stopped:', event.agentId);
          setActiveSubAgents((prev) => prev.filter((a) => a.agentId !== event.agentId));
          break;
      }
    };

    unsubscribeRef.current = api.agent!.onStream(handleStream as (data: unknown) => void);

    return () => {
      if (unsubscribeRef.current) {
        logger.info('Unsubscribing from stream events for session:', sessionId);
        unsubscribeRef.current();
        unsubscribeRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionId]); // onToolUse is intentionally excluded - we use a ref pattern to avoid re-subscribing

  // Send a message to the agent
  const sendMessage = useCallback(
    async (content: string, images?: ImageAttachment[], textFiles?: TextFileAttachment[]) => {
      const api = getElectronAPI();
      if (!api?.agent) {
        setError('API not available');
        return;
      }

      if (isProcessing) {
        logger.warn('Already processing a message');
        return;
      }

      setIsProcessing(true);
      setError(null);

      try {
        logger.info('Sending message', {
          hasImages: images && images.length > 0,
          imageCount: images?.length || 0,
          hasTextFiles: textFiles && textFiles.length > 0,
          textFileCount: textFiles?.length || 0,
        });

        // Build message content with text file context prepended
        let messageContent = content;
        if (textFiles && textFiles.length > 0) {
          const contextParts = textFiles.map((file) => {
            return `<file name="${file.filename}">\n${file.content}\n</file>`;
          });
          const contextBlock = `Here are some files for context:\n\n${contextParts.join('\n\n')}\n\n`;
          messageContent = contextBlock + content;
        }

        const imagePaths = await resolveImagePaths(api, images);
        logExecutionConfig('send');

        const result = await api.agent!.send(
          sessionId,
          messageContent,
          workingDirectory,
          imagePaths,
          model,
          thinkingLevel,
          reasoningEffort as ReasoningEffort | undefined
        );

        if (!result.success) {
          const errorText = result.error || 'Senden hat nicht geklappt.';
          setError(errorText);
          appendLocalErrorMessage(errorText);
          setIsProcessing(false);
        }
        // Note: We don't set isProcessing to false here because
        // it will be set by the "complete" or "error" stream event
      } catch (err) {
        logger.error('Failed to send message:', err);
        const errorText = err instanceof Error ? err.message : 'Senden hat nicht geklappt.';
        setError(errorText);
        appendLocalErrorMessage(errorText);
        setIsProcessing(false);
      }
    },
    [
      sessionId,
      workingDirectory,
      model,
      thinkingLevel,
      reasoningEffort,
      isProcessing,
      resolveImagePaths,
      logExecutionConfig,
      appendLocalErrorMessage,
    ]
  );

  // Stop current execution
  const stopExecution = useCallback(async () => {
    const api = getElectronAPI();
    if (!api?.agent) {
      setError('API not available');
      return;
    }

    try {
      logger.info('Stopping execution');
      const result = await api.agent!.stop(sessionId);

      if (!result.success) {
        setError(result.error || 'Failed to stop execution');
      } else {
        setIsProcessing(false);
      }
    } catch (err) {
      logger.error('Failed to stop:', err);
      setError(err instanceof Error ? err.message : 'Failed to stop execution');
    }
  }, [sessionId]);

  // Clear conversation history
  const clearHistory = useCallback(async () => {
    const api = getElectronAPI();
    if (!api?.agent) {
      setError('API not available');
      return;
    }

    try {
      logger.info('Clearing history');
      const result = await api.agent!.clear(sessionId);

      if (result.success) {
        setMessages([]);
        setError(null);
      } else {
        setError(result.error || 'Failed to clear history');
      }
    } catch (err) {
      logger.error('Failed to clear:', err);
      setError(err instanceof Error ? err.message : 'Failed to clear history');
    }
  }, [sessionId]);

  // Add a prompt to the server queue (will auto-run when current task finishes)
  const addToServerQueue = useCallback(
    async (message: string, images?: ImageAttachment[], textFiles?: TextFileAttachment[]) => {
      const api = getElectronAPI();
      if (!api?.agent?.queueAdd) {
        setError('Queue API not available');
        return;
      }

      try {
        // Build message content with text file context
        let messageContent = message;
        if (textFiles && textFiles.length > 0) {
          const contextParts = textFiles.map((file) => {
            return `<file name="${file.filename}">\n${file.content}\n</file>`;
          });
          const contextBlock = `Here are some files for context:\n\n${contextParts.join('\n\n')}\n\n`;
          messageContent = contextBlock + message;
        }

        const imagePaths = await resolveImagePaths(api, images);
        logExecutionConfig('queue');

        logger.info('Adding to server queue');
        const result = await api.agent.queueAdd(
          sessionId,
          messageContent,
          imagePaths,
          model,
          thinkingLevel,
          reasoningEffort as ReasoningEffort | undefined
        );

        if (!result.success) {
          setError(result.error || 'Failed to add to queue');
        }
      } catch (err) {
        logger.error('Failed to add to queue:', err);
        setError(err instanceof Error ? err.message : 'Failed to add to queue');
      }
    },
    [sessionId, model, thinkingLevel, reasoningEffort, resolveImagePaths, logExecutionConfig]
  );

  // Remove a prompt from the server queue
  const removeFromServerQueue = useCallback(
    async (promptId: string) => {
      const api = getElectronAPI();
      if (!api?.agent?.queueRemove) {
        setError('Queue API not available');
        return;
      }

      try {
        logger.info('Removing from server queue:', promptId);
        const result = await api.agent.queueRemove(sessionId, promptId);

        if (!result.success) {
          setError(result.error || 'Failed to remove from queue');
        }
      } catch (err) {
        logger.error('Failed to remove from queue:', err);
        setError(err instanceof Error ? err.message : 'Failed to remove from queue');
      }
    },
    [sessionId]
  );

  // Clear the entire server queue
  const clearServerQueue = useCallback(async () => {
    const api = getElectronAPI();
    if (!api?.agent?.queueClear) {
      setError('Queue API not available');
      return;
    }

    try {
      logger.info('Clearing server queue');
      const result = await api.agent.queueClear(sessionId);

      if (!result.success) {
        setError(result.error || 'Failed to clear queue');
      }
    } catch (err) {
      logger.error('Failed to clear queue:', err);
      setError(err instanceof Error ? err.message : 'Failed to clear queue');
    }
  }, [sessionId]);

  return {
    messages,
    isProcessing,
    isConnected,
    sendMessage,
    stopExecution,
    clearHistory,
    error,
    queuedMessages,
    isQueueProcessing: isProcessingQueue,
    clearMessageQueue: clearQueue,
    // Server-side queue
    serverQueue,
    addToServerQueue,
    removeFromServerQueue,
    clearServerQueue,
    // Active sub-agents
    activeSubAgents,
  };
}
