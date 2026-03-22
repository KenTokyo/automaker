import { useEffect, useRef } from 'react';
import type { Message } from '@/types/electron';
import { playSound } from '../services/sound-service';
import { shouldPlayEvent, useSoundStore } from '../stores/sound-store';
import { playPhaseCompleteSound, useSoundEvents } from './use-sound-events';

interface UseChatSoundEffectsOptions {
  activeSessionId: null | string;
  isProcessing: boolean;
  error: null | string;
  orchestratorMode: boolean;
  messages: Message[];
}

export function useChatSoundEffects({
  activeSessionId,
  isProcessing,
  error,
  orchestratorMode,
  messages,
}: UseChatSoundEffectsOptions) {
  const prevMessageCountRef = useRef(0);
  const phaseSignalMessageIdsRef = useRef<Set<string>>(new Set());

  useSoundEvents({
    activeSessionId,
    isProcessing,
    error,
  });

  useEffect(() => {
    prevMessageCountRef.current = 0;
    phaseSignalMessageIdsRef.current.clear();
  }, [activeSessionId]);

  useEffect(() => {
    const previousCount = prevMessageCountRef.current;
    prevMessageCountRef.current = messages.length;

    if (!orchestratorMode) return;
    if (messages.length <= previousCount) return;

    const newMessages = messages.slice(previousCount);
    const hasNewPhaseSignal = newMessages.some((message) => {
      if (phaseSignalMessageIdsRef.current.has(message.id)) {
        return false;
      }

      const content = typeof message.content === 'string' ? message.content : '';
      const isPhaseSignal =
        content.includes('NEXT_PHASE_READY') || content.includes('ALL_PHASES_COMPLETE');

      if (isPhaseSignal) {
        phaseSignalMessageIdsRef.current.add(message.id);
      }

      return isPhaseSignal;
    });

    if (hasNewPhaseSignal) {
      playPhaseCompleteSound();
    }
  }, [messages, orchestratorMode]);
}

export function playMessageSentSound() {
  if (!shouldPlayEvent('messageSent')) return;
  playSound('messageSent', useSoundStore.getState().volume);
}
