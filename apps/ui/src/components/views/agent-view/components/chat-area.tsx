import { memo } from 'react';
import type { ImageAttachment } from '@/store/app-store';
import type { ToolUse } from '@/types/electron';
import type { ChatDisplaySettings } from '@/store/types/ui-types';
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
  chatDisplaySettings: ChatDisplaySettings;
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
  chatDisplaySettings,
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
      chatDisplaySettings={chatDisplaySettings}
    />
  );
});
