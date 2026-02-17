import { memo } from 'react';
import type { ImageAttachment } from '@/store/app-store';
import type { ToolUse } from '@/types/electron';
import { MessageBubble } from './message-bubble';
import { ThinkingIndicator } from './thinking-indicator';
import { ToolCallGroup } from './tool-call-group';

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
  messagesContainerRef: React.RefObject<HTMLDivElement | null>;
  onScroll: () => void;
  chatBackgroundColor?: string;
}

export const MessageList = memo(function MessageList({
  messages,
  isProcessing,
  messagesContainerRef,
  onScroll,
  chatBackgroundColor,
}: MessageListProps) {
  return (
    <div
      ref={messagesContainerRef}
      className="flex-1 overflow-y-auto px-6 py-6 space-y-6 scroll-smooth"
      data-testid="message-list"
      onScroll={onScroll}
      style={{ backgroundColor: chatBackgroundColor || undefined }}
    >
      {messages.map((message) => (
        <div key={message.id}>
          {/* Tool Call Group - shown above assistant messages that used tools */}
          {message.role === 'assistant' && message.toolCalls && message.toolCalls.length > 0 && (
            <div className="mb-3">
              <ToolCallGroup toolCalls={message.toolCalls} />
            </div>
          )}
          <MessageBubble message={message} />
        </div>
      ))}

      {/* Thinking Indicator */}
      {isProcessing && <ThinkingIndicator />}
    </div>
  );
});
