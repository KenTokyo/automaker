import { memo } from 'react';
import type { ImageAttachment } from '@/store/app-store';
import type { ToolUse } from '@/types/electron';
import { MessageList } from './message-list';
import { NoSessionState } from './empty-states';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
  isError?: boolean;
  images?: ImageAttachment[];
  toolCalls?: ToolUse[];
}

interface ChatAreaProps {
  currentSessionId: string | null;
  messages: Message[];
  isProcessing: boolean;
  showSessionManager: boolean;
  messagesContainerRef: React.RefObject<HTMLDivElement | null>;
  onScroll: () => void;
  onShowSessionManager: () => void;
  chatBackgroundColor?: string;
  chatFontSize: number;
}

export const ChatArea = memo(function ChatArea({
  currentSessionId,
  messages,
  isProcessing,
  showSessionManager,
  messagesContainerRef,
  onScroll,
  onShowSessionManager,
  chatBackgroundColor,
  chatFontSize,
}: ChatAreaProps) {
  if (!currentSessionId) {
    return (
      <NoSessionState
        showSessionManager={showSessionManager}
        onShowSessionManager={onShowSessionManager}
      />
    );
  }

  return (
    <MessageList
      messages={messages}
      isProcessing={isProcessing}
      messagesContainerRef={messagesContainerRef}
      onScroll={onScroll}
      chatBackgroundColor={chatBackgroundColor}
      chatFontSize={chatFontSize}
    />
  );
});
