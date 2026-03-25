import { memo } from 'react';
import type { ImageAttachment } from '@/store/app-store';
import type { ToolUse } from '@/types/electron';
import type { ChatDisplaySettings } from '@/store/types/ui-types';
import type { ActiveSubAgent } from '@/hooks/use-electron-agent';
import { MessageList } from './message-list';
import { NoSessionState } from './empty-states';
import { TaskContextBadge } from './task-context-badge';

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
  activeSubAgents?: ActiveSubAgent[];
  onOpenSubAgentSession?: (sessionId: string) => void;
  showSessionManager: boolean;
  messagesContainerRef: React.RefObject<HTMLDivElement | null>;
  onScroll: () => void;
  onShowSessionManager: () => void;
  chatBackgroundColor?: string;
  chatBubbleColor?: string;
  userBubbleColor?: string;
  chatDisplaySettings: ChatDisplaySettings;
}

export const ChatArea = memo(function ChatArea({
  currentSessionId,
  messages,
  isProcessing,
  activeSubAgents,
  onOpenSubAgentSession,
  showSessionManager,
  messagesContainerRef,
  onScroll,
  onShowSessionManager,
  chatBackgroundColor,
  chatBubbleColor,
  userBubbleColor,
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
    <>
      <TaskContextBadge />
      <MessageList
        messages={messages}
        isProcessing={isProcessing}
        activeSubAgents={activeSubAgents}
        onOpenSubAgentSession={onOpenSubAgentSession}
        messagesContainerRef={messagesContainerRef}
        onScroll={onScroll}
        chatBackgroundColor={chatBackgroundColor}
        chatBubbleColor={chatBubbleColor}
        userBubbleColor={userBubbleColor}
        chatDisplaySettings={chatDisplaySettings}
      />
    </>
  );
});
