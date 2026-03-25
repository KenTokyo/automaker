import { memo } from 'react';
import type { ImageAttachment } from '@/store/app-store';
import type { ToolUse } from '@/types/electron';
import type { ChatDisplaySettings } from '@/store/types/ui-types';
import type { ActiveSubAgent } from '@/hooks/use-electron-agent';
import { MessageBubble } from './message-bubble';
import { ThinkingIndicator } from './thinking-indicator';
import { ToolCallGroup } from './tool-call-group';
import { SubAgentIndicator } from '../sub-agent-indicator';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
  images?: ImageAttachment[];
  toolCalls?: ToolUse[];
}

interface MessageListProps {
  messages: Message[];
  isProcessing: boolean;
  activeSubAgents?: ActiveSubAgent[];
  onOpenSubAgentSession?: (sessionId: string) => void;
  messagesContainerRef: React.RefObject<HTMLDivElement | null>;
  onScroll: () => void;
  chatBackgroundColor?: string;
  chatBubbleColor?: string;
  userBubbleColor?: string;
  chatDisplaySettings: ChatDisplaySettings;
}

export const MessageList = memo(function MessageList({
  messages,
  isProcessing,
  activeSubAgents,
  onOpenSubAgentSession,
  messagesContainerRef,
  onScroll,
  chatBackgroundColor,
  chatBubbleColor,
  userBubbleColor,
  chatDisplaySettings,
}: MessageListProps) {
  const mutedChatBackground = chatBackgroundColor
    ? `color-mix(in oklch, ${chatBackgroundColor} 18%, var(--background) 82%)`
    : undefined;

  return (
    <div
      ref={messagesContainerRef}
      className="flex-1 overflow-y-auto px-2 py-4 space-y-4"
      data-testid="message-list"
      onScroll={onScroll}
      style={{ backgroundColor: mutedChatBackground }}
    >
      {messages.map((message) => (
        <div
          key={message.id}
          style={{ contentVisibility: 'auto', containIntrinsicSize: 'auto 100px' }}
        >
          {/* Tool Call Group - shown above assistant messages that used tools */}
          {message.role === 'assistant' && message.toolCalls && message.toolCalls.length > 0 && (
            <div className="mb-3">
              <ToolCallGroup toolCalls={message.toolCalls} />
            </div>
          )}
          <MessageBubble
            message={message}
            chatDisplaySettings={chatDisplaySettings}
            chatBubbleColor={chatBubbleColor}
            userBubbleColor={userBubbleColor}
          />
        </div>
      ))}

      {/* Sub-Agent Activity Indicator */}
      {activeSubAgents && activeSubAgents.length > 0 && (
        <SubAgentIndicator
          activeSubAgents={activeSubAgents}
          onOpenSession={onOpenSubAgentSession}
        />
      )}

      {/* Thinking Indicator */}
      {isProcessing && <ThinkingIndicator />}
    </div>
  );
});
