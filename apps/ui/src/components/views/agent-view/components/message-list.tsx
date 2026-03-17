import { memo } from 'react';
import type { ImageAttachment } from '@/store/app-store';
import type { ToolUse } from '@/types/electron';
import type { ChatDisplaySettings } from '@/store/types/ui-types';
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
  chatDisplaySettings: ChatDisplaySettings;
}

export const MessageList = memo(function MessageList({
  messages,
  isProcessing,
  messagesContainerRef,
  onScroll,
  chatBackgroundColor,
  chatDisplaySettings,
}: MessageListProps) {
  const mutedChatBackground = chatBackgroundColor
    ? `color-mix(in oklch, ${chatBackgroundColor} 18%, var(--background) 82%)`
    : undefined;

  return (
    <div
      ref={messagesContainerRef}
      className="flex-1 overflow-y-auto px-6 py-6 space-y-6"
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
          <MessageBubble message={message} chatDisplaySettings={chatDisplaySettings} />
        </div>
      ))}

      {/* Thinking Indicator */}
      {isProcessing && <ThinkingIndicator />}
    </div>
  );
});
