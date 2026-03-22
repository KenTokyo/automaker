import { useEffect } from 'react';
import { isTypingTarget } from '../components/chat-view-utils';

interface UseChatShortcutsOptions {
  leftOpen: boolean;
  setLeftOpen: (open: boolean) => void;
  onToggleShortcutHelp: () => void;
}

export function useChatShortcuts({
  leftOpen,
  setLeftOpen,
  onToggleShortcutHelp,
}: UseChatShortcutsOptions) {
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const isPrimaryModifier = event.ctrlKey || event.metaKey;
      if (!isPrimaryModifier) return;

      const key = event.key.toLowerCase();

      // Ctrl+K -> open left sidebar + focus history search
      if (key === 'k') {
        event.preventDefault();
        if (!leftOpen) {
          setLeftOpen(true);
        }
        // Use requestAnimationFrame so the sidebar has time to render
        requestAnimationFrame(() => {
          const searchInput = document.querySelector<HTMLInputElement>(
            '[data-focus-target="history-search"]'
          );
          searchInput?.focus();
        });
        return;
      }

      // Ctrl+/ -> toggle shortcut help dialog
      if (event.key === '/') {
        event.preventDefault();
        onToggleShortcutHelp();
        return;
      }

      // Ctrl+L -> focus main input textarea
      if (key === 'l') {
        const typing = isTypingTarget(event.target);
        // Allow Ctrl+L even from typing targets (it refocuses the main input)
        if (typing) {
          // Only prevent if not already in the chat input
          const target = event.target as HTMLElement;
          if (target.getAttribute('data-focus-target') === 'chat-input') {
            return;
          }
        }
        event.preventDefault();
        const chatInput = document.querySelector<HTMLTextAreaElement>(
          '[data-focus-target="chat-input"]'
        );
        chatInput?.focus();
        return;
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [leftOpen, onToggleShortcutHelp, setLeftOpen]);
}
