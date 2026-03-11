import { useCallback, useEffect, useMemo, useState } from 'react';
import type { Message } from '@/types/electron';
import type { ThinkingBlockData } from '../services/thinking-utils';

const STORAGE_KEY = 'automaker:chat:thinking:expanded:v1';

type MessageWithThinking = Message & {
  thinkingBlock?: ThinkingBlockData;
};

function readStoredOpenValue(fallback: boolean): boolean {
  if (typeof window === 'undefined') return fallback;
  const value = window.localStorage.getItem(STORAGE_KEY);
  if (value === 'true') return true;
  if (value === 'false') return false;
  return fallback;
}

function getDefaultOpenState(block: ThinkingBlockData, preferredOpen: boolean): boolean {
  if (block.status === 'error') return true;
  if (block.status === 'aborted') return true;
  return preferredOpen;
}

export function useThinkingState(messages: Message[]) {
  const [preferredOpen, setPreferredOpen] = useState(() => readStoredOpenValue(false));
  const [openByMessageId, setOpenByMessageId] = useState<Record<string, boolean>>({});

  const thinkingBlocksByMessageId = useMemo(() => {
    const next = new Map<string, ThinkingBlockData>();
    for (const message of messages) {
      const block = (message as MessageWithThinking).thinkingBlock;
      if (!block || message.role !== 'assistant') continue;
      next.set(message.id, block);
    }
    return next;
  }, [messages]);

  useEffect(() => {
    if (thinkingBlocksByMessageId.size === 0) return;

    setOpenByMessageId((previous) => {
      let changed = false;
      const next = { ...previous };

      for (const [messageId, block] of thinkingBlocksByMessageId.entries()) {
        if (typeof next[messageId] !== 'boolean') {
          next[messageId] = getDefaultOpenState(block, preferredOpen);
          changed = true;
        }
      }

      return changed ? next : previous;
    });
  }, [preferredOpen, thinkingBlocksByMessageId]);

  const setOpen = useCallback((messageId: string, open: boolean) => {
    setOpenByMessageId((previous) => ({
      ...previous,
      [messageId]: open,
    }));
    setPreferredOpen(open);
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(STORAGE_KEY, open ? 'true' : 'false');
    }
  }, []);

  const isOpen = useCallback(
    (messageId: string, block: ThinkingBlockData): boolean => {
      const value = openByMessageId[messageId];
      if (typeof value === 'boolean') return value;
      return getDefaultOpenState(block, preferredOpen);
    },
    [openByMessageId, preferredOpen]
  );

  return {
    thinkingBlocksByMessageId,
    isOpen,
    setOpen,
  };
}
