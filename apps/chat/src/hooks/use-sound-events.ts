import { useEffect, useRef } from 'react';
import { playSound, disposeAudioContext } from '../services/sound-service';
import { shouldPlayEvent, useSoundStore } from '../stores/sound-store';

interface UseSoundEventsOptions {
  /** Current session ID (used to detect session changes) */
  activeSessionId: string | null;
  /** Whether the agent is currently processing */
  isProcessing: boolean;
  /** Current error string, if any */
  error: string | null;
}

/**
 * Watches chat state transitions and plays corresponding sounds.
 *
 * Sound triggers:
 * - `taskComplete`: isProcessing transitions from true to false (without error)
 * - `error`: isProcessing transitions to false with an error, or error appears
 * - `phaseComplete`: placeholder for orchestrator phase changes
 */
export function useSoundEvents({ activeSessionId, isProcessing, error }: UseSoundEventsOptions) {
  const prevProcessingRef = useRef(false);
  const prevErrorRef = useRef<string | null>(null);
  const prevSessionIdRef = useRef<string | null>(null);
  const hasEverProcessedRef = useRef(false);

  useEffect(() => {
    return () => {
      disposeAudioContext();
    };
  }, []);

  useEffect(() => {
    const wasProcessing = prevProcessingRef.current;
    const prevError = prevErrorRef.current;
    const prevSessionId = prevSessionIdRef.current;

    prevProcessingRef.current = isProcessing;
    prevErrorRef.current = error;
    prevSessionIdRef.current = activeSessionId;

    // Don't play sounds on session switch
    if (activeSessionId !== prevSessionId) return;

    // Track if we've ever seen processing for this session
    if (isProcessing) {
      hasEverProcessedRef.current = true;
    }

    // Only play sounds if we've seen processing start in this session
    if (!hasEverProcessedRef.current) return;

    const volume = useSoundStore.getState().volume;

    // Processing just finished
    if (wasProcessing && !isProcessing) {
      if (error && error !== prevError) {
        // Finished with error
        if (shouldPlayEvent('error')) {
          playSound('error', volume);
        }
      } else if (!error) {
        // Finished successfully
        if (shouldPlayEvent('taskComplete')) {
          playSound('taskComplete', volume);
        }
      }
      return;
    }

    // New error appeared while not transitioning from processing
    if (error && error !== prevError && !isProcessing) {
      if (shouldPlayEvent('error')) {
        playSound('error', volume);
      }
    }
  }, [activeSessionId, error, isProcessing]);

  // Reset hasEverProcessed when session changes
  useEffect(() => {
    hasEverProcessedRef.current = false;
  }, [activeSessionId]);
}

/**
 * Play the phase-complete sound (called from orchestrator logic).
 */
export function playPhaseCompleteSound() {
  if (shouldPlayEvent('phaseComplete')) {
    playSound('phaseComplete', useSoundStore.getState().volume);
  }
}
