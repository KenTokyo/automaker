import { useEffect } from 'react';
import { isTypingTarget } from '../components/chat-view-utils';
import type { SessionState } from '../stores/types';

interface UseChatSessionShortcutsOptions {
  activeSessionId: null | string;
  projectSessions: SessionState[];
  onCreateSession: () => Promise<void>;
  onCloseSession: (sessionId: string) => Promise<boolean>;
  onSelectSession: (sessionId: string) => void;
}

export function useChatSessionShortcuts({
  activeSessionId,
  projectSessions,
  onCreateSession,
  onCloseSession,
  onSelectSession,
}: UseChatSessionShortcutsOptions) {
  useEffect(() => {
    const selectRelativeSession = (direction: 1 | -1) => {
      if (projectSessions.length <= 1 || !activeSessionId) return;
      const currentIndex = projectSessions.findIndex((session) => session.id === activeSessionId);
      if (currentIndex < 0) return;

      const nextIndex =
        (currentIndex + direction + projectSessions.length) % projectSessions.length;
      const nextSession = projectSessions[nextIndex];
      if (!nextSession) return;
      onSelectSession(nextSession.id);
    };

    const selectSessionByIndex = (index: number) => {
      if (index < 0) return;
      const nextSession = projectSessions[index];
      if (!nextSession) return;
      onSelectSession(nextSession.id);
    };

    const onKeyDown = (event: KeyboardEvent) => {
      const isPrimaryModifier = event.ctrlKey || event.metaKey;
      if (!isPrimaryModifier) return;

      const key = event.key.toLowerCase();
      const typing = isTypingTarget(event.target);

      if (key === 't') {
        event.preventDefault();
        void onCreateSession();
        return;
      }

      if (key === 'w') {
        if (!activeSessionId) return;
        event.preventDefault();
        void onCloseSession(activeSessionId);
        return;
      }

      if (event.key === 'Tab') {
        event.preventDefault();
        selectRelativeSession(event.shiftKey ? -1 : 1);
        return;
      }

      if (!typing && /^[1-9]$/.test(event.key)) {
        event.preventDefault();
        selectSessionByIndex(Number(event.key) - 1);
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [activeSessionId, onCloseSession, onCreateSession, onSelectSession, projectSessions]);
}
