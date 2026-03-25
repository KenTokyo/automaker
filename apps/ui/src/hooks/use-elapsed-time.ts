import { useState, useEffect, useRef, useCallback } from 'react';

/**
 * Format milliseconds into a human-readable duration string.
 * Examples: "0:05", "1:23", "1:05:30"
 */
export function formatElapsedTime(ms: number): string {
  if (ms <= 0) return '0:00';

  const totalSeconds = Math.floor(ms / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  if (hours > 0) {
    return `${hours}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
  }
  return `${minutes}:${String(seconds).padStart(2, '0')}`;
}

/**
 * Module-level cache for local fallback timestamps.
 * Keyed by sessionId so the fallback survives component unmount/remount
 * (e.g. when switching between left-panel tabs).
 */
const fallbackTimestampCache = new Map<string, number>();

/**
 * Hook that returns a live-updating elapsed time string for a session.
 *
 * @param totalElapsedMs - Previously accumulated time in ms
 * @param lastStartedAt  - ISO timestamp of when the current run started (undefined if not running)
 * @param isRunning       - Whether the session is currently running
 * @param sessionId       - Optional session ID; when provided the local fallback timestamp
 *                          is cached at module level so it survives unmount/remount cycles.
 */
export function useElapsedTime(
  totalElapsedMs: number | undefined,
  lastStartedAt: string | undefined,
  isRunning: boolean,
  sessionId?: string
): string {
  const base = totalElapsedMs || 0;

  // When the session is running but lastStartedAt hasn't arrived yet
  // (e.g. isCurrentSessionThinking is true before the session list refetches),
  // use a local fallback timestamp so the timer starts counting immediately.
  //
  // If a sessionId is provided we persist the fallback in a module-level Map
  // so it survives unmount/remount (e.g. tab switch). Otherwise we fall back
  // to a plain ref (original behaviour).
  const localFallbackRef = useRef<number | null>(null);

  // Restore cached fallback on mount when sessionId is provided
  if (sessionId && localFallbackRef.current === null) {
    localFallbackRef.current = fallbackTimestampCache.get(sessionId) ?? null;
  }

  if (isRunning && !lastStartedAt && localFallbackRef.current === null) {
    localFallbackRef.current = Date.now();
  }
  if (!isRunning) {
    localFallbackRef.current = null;
    if (sessionId) {
      fallbackTimestampCache.delete(sessionId);
    }
  }

  // Sync to module-level cache whenever the value changes
  if (sessionId && localFallbackRef.current !== null) {
    fallbackTimestampCache.set(sessionId, localFallbackRef.current);
  }

  const computeElapsed = useCallback((): number => {
    if (isRunning) {
      const started = lastStartedAt ? new Date(lastStartedAt).getTime() : localFallbackRef.current;
      if (started) {
        const runningMs = Math.max(0, Date.now() - started);
        return base + runningMs;
      }
    }
    return base;
  }, [base, lastStartedAt, isRunning]);

  const [elapsed, setElapsed] = useState(computeElapsed);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    setElapsed(computeElapsed());

    if (isRunning) {
      intervalRef.current = setInterval(() => {
        setElapsed(computeElapsed());
      }, 1000);
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [isRunning, lastStartedAt, computeElapsed]);

  return formatElapsedTime(elapsed);
}
