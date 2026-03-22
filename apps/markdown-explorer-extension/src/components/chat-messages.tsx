import { useMemo } from 'react';
import { Lightbulb, MessageSquareText } from 'lucide-react';
import type { Message } from '@/types/electron';
import { useThinkingState } from '../hooks/use-thinking-state';
import type { OrchestratorPhaseInfo } from '../services/orchestrator-utils';
import { createThinkingBlock, type ThinkingBlockData } from '../services/thinking-utils';
import {
  createLegacyToolCallGroup,
  sanitizeToolCallGroup,
  type ToolCallGroupData,
} from '../services/tool-call-utils';
import { MessageBubble } from './message-bubble';
import { MessageError } from './message-error';
import { MessageSystem } from './message-system';
import { OrchestratorPhaseDivider } from './orchestrator-phase-divider';
import { ScrollToBottom } from './scroll-to-bottom';
import { ThinkingBlock } from './thinking-block';
import { ToolCallGroup } from './tool-call-group';

interface ChatMessagesProps {
  messages: Message[];
  isProcessing: boolean;
  elapsedSeconds: number;
  modelLabel?: string;
  providerLabel?: string;
  messagesContainerRef: React.RefObject<HTMLDivElement | null>;
  onScroll: () => void;
  showScrollToBottom: boolean;
  onScrollToBottom: () => void;
  onRetryMessage?: (content: string) => void;
  phaseDividers?: Map<number, OrchestratorPhaseInfo>;
}

type MessageWithToolGroup = Message & {
  toolCallGroup?: ToolCallGroupData;
  thinkingBlock?: ThinkingBlockData;
};

function resolveToolGroup(message: Message): ToolCallGroupData | undefined {
  const directGroup = sanitizeToolCallGroup((message as MessageWithToolGroup).toolCallGroup);
  if (directGroup) {
    return directGroup;
  }

  if (message.role !== 'assistant') {
    return undefined;
  }

  return createLegacyToolCallGroup({
    messageId: message.id,
    toolCalls: message.toolCalls ?? [],
    content: message.content,
    isError: message.isError,
  });
}

export function ChatMessages({
  messages,
  isProcessing,
  elapsedSeconds,
  modelLabel,
  providerLabel,
  messagesContainerRef,
  onScroll,
  showScrollToBottom,
  onScrollToBottom,
  onRetryMessage,
  phaseDividers,
}: ChatMessagesProps) {
  const hasMessages = messages.length > 0;
  const showSkeleton = !hasMessages && isProcessing;
  const { thinkingBlocksByMessageId, isOpen, setOpen } = useThinkingState(messages);

  const hasRunningThinking = useMemo(() => {
    return Array.from(thinkingBlocksByMessageId.values()).some(
      (block) => block.status === 'start' || block.status === 'running'
    );
  }, [thinkingBlocksByMessageId]);

  const fallbackThinkingBlock = useMemo(() => {
    if (!isProcessing || hasRunningThinking) return undefined;
    const seconds = Math.max(1, elapsedSeconds);
    const startedAt = new Date(Date.now() - seconds * 1000).toISOString();
    return createThinkingBlock({
      id: 'thinking-live-fallback',
      status: 'running',
      startedAt,
    });
  }, [elapsedSeconds, hasRunningThinking, isProcessing]);

  return (
    <div className="relative min-h-0 flex-1">
      <div
        ref={messagesContainerRef}
        className="h-full overflow-y-auto px-4 py-4 scroll-smooth md:px-6"
        onScroll={onScroll}
      >
        <div className="mx-auto flex w-full max-w-5xl flex-col gap-3">
          {!hasMessages && !showSkeleton ? (
            <div className="flex min-h-[45vh] flex-col items-center justify-center rounded-2xl border border-dashed border-muted bg-card/30 px-6 py-8 text-center">
              <MessageSquareText className="mb-3 h-8 w-8 text-muted-foreground" />
              <h3 className="text-base font-semibold text-foreground">Wie kann ich dir helfen?</h3>
              <p className="mt-2 max-w-md text-sm text-muted-foreground">
                Schreib deine Frage unten. Du kannst auch ein Bild oder eine Datei anhängen.
              </p>
              <div className="mt-4 w-full max-w-md rounded-xl border border-muted bg-muted/20 p-3 text-left">
                <div className="mb-2 flex items-center gap-2 text-xs font-medium text-muted-foreground">
                  <Lightbulb className="h-3.5 w-3.5" />
                  Schnellstart
                </div>
                <ul className="space-y-1 text-sm text-foreground">
                  <li>Erkläre mir dieses Projekt in einfachen Worten.</li>
                  <li>Finde einen möglichen Bug in meiner Datei.</li>
                  <li>Schreib einen Plan für den nächsten Schritt.</li>
                </ul>
              </div>
            </div>
          ) : null}

          {showSkeleton ? (
            <div className="space-y-3">
              <div className="h-16 w-[72%] animate-pulse rounded-2xl border border-muted bg-muted/40" />
              <div className="ml-auto h-20 w-[68%] animate-pulse rounded-2xl border border-muted bg-muted/40" />
              <div className="h-24 w-[78%] animate-pulse rounded-2xl border border-muted bg-muted/40" />
            </div>
          ) : null}

          {messages.map((message, messageIndex) => {
            const isSystem =
              message.role === 'assistant' && message.content.trim().startsWith('[system]');
            const toolGroup = resolveToolGroup(message);
            const thinkingBlock = thinkingBlocksByMessageId.get(message.id);
            const thinkingOpen = thinkingBlock ? isOpen(message.id, thinkingBlock) : false;
            const dividerPhase = phaseDividers?.get(messageIndex);

            return (
              <div key={message.id} className="space-y-2">
                {dividerPhase ? <OrchestratorPhaseDivider completedPhase={dividerPhase} /> : null}

                {thinkingBlock ? (
                  <ThinkingBlock
                    block={thinkingBlock}
                    open={thinkingOpen}
                    onToggle={() => setOpen(message.id, !thinkingOpen)}
                  />
                ) : null}

                {toolGroup ? <ToolCallGroup group={toolGroup} /> : null}

                {message.isError ? (
                  <MessageError message={message.content} timestamp={message.timestamp} />
                ) : isSystem ? (
                  <MessageSystem content={message.content.replace(/^\[system\]\s*/i, '')} />
                ) : (
                  <MessageBubble
                    message={message}
                    modelLabel={message.role === 'assistant' ? modelLabel : undefined}
                    providerLabel={message.role === 'assistant' ? providerLabel : undefined}
                    onRetry={onRetryMessage}
                  />
                )}
              </div>
            );
          })}

          {fallbackThinkingBlock ? (
            <ThinkingBlock
              block={fallbackThinkingBlock}
              open={isOpen(fallbackThinkingBlock.id, fallbackThinkingBlock)}
              onToggle={() =>
                setOpen(
                  fallbackThinkingBlock.id,
                  !isOpen(fallbackThinkingBlock.id, fallbackThinkingBlock)
                )
              }
            />
          ) : null}
        </div>
      </div>

      <ScrollToBottom visible={showScrollToBottom} onClick={onScrollToBottom} />
    </div>
  );
}
