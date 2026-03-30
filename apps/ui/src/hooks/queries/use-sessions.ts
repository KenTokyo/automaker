/**
 * Sessions Query Hooks
 *
 * React Query hooks for fetching session data.
 */

import { useQuery } from '@tanstack/react-query';
import { getElectronAPI } from '@/lib/electron';
import { queryKeys } from '@/lib/query-keys';
import { STALE_TIMES } from '@/lib/query-client';
import type { SessionListItem } from '@/types/electron';

async function fetchSessions(
  includeArchived: boolean,
  projectPath?: string
): Promise<SessionListItem[]> {
  const api = getElectronAPI();
  if (!api.sessions) {
    throw new Error('Sessions API not available');
  }
  const result = await api.sessions.list(includeArchived, projectPath);
  if (!result.success) {
    throw new Error(result.error || 'Failed to fetch sessions');
  }
  return result.sessions ?? [];
}

/**
 * Fetch all sessions
 *
 * @param includeArchived - Whether to include archived sessions
 * @returns Query result with sessions array
 *
 * @example
 * ```tsx
 * const { data: sessions, isLoading } = useSessions(false);
 * ```
 */
export function useSessions(includeArchived = false, projectPath?: string) {
  return useQuery({
    queryKey: queryKeys.sessions.all(includeArchived, projectPath),
    queryFn: () => fetchSessions(includeArchived, projectPath),
    staleTime: STALE_TIMES.SESSIONS,
  });
}

/**
 * Fetch a single session item from the shared sessions query.
 * This avoids re-rendering large views with the entire sessions array.
 */
export function useSessionById(sessionId: string | null | undefined, includeArchived = true) {
  return useQuery({
    queryKey: queryKeys.sessions.all(includeArchived),
    queryFn: () => fetchSessions(includeArchived),
    staleTime: STALE_TIMES.SESSIONS,
    select: (sessions): SessionListItem | null => {
      if (!sessionId) return null;
      return sessions.find((session) => session.id === sessionId) ?? null;
    },
  });
}

/**
 * Fetch session history
 *
 * @param sessionId - ID of the session
 * @returns Query result with session messages
 */
export function useSessionHistory(sessionId: string | undefined) {
  return useQuery({
    queryKey: queryKeys.sessions.history(sessionId ?? ''),
    queryFn: async () => {
      if (!sessionId) throw new Error('No session ID');
      const api = getElectronAPI();
      if (!api.agent) {
        throw new Error('Agent API not available');
      }
      const result = await api.agent.getHistory(sessionId);
      if (!result.success) {
        throw new Error(result.error || 'Failed to fetch session history');
      }
      return {
        messages: result.messages ?? [],
        isRunning: result.isRunning ?? false,
      };
    },
    enabled: !!sessionId,
    staleTime: STALE_TIMES.FEATURES, // Session history changes during conversations
  });
}

/**
 * Fetch session message queue
 *
 * @param sessionId - ID of the session
 * @returns Query result with queued messages
 */
export function useSessionQueue(sessionId: string | undefined) {
  return useQuery({
    queryKey: queryKeys.sessions.queue(sessionId ?? ''),
    queryFn: async () => {
      if (!sessionId) throw new Error('No session ID');
      const api = getElectronAPI();
      if (!api.agent) {
        throw new Error('Agent API not available');
      }
      const result = await api.agent.queueList(sessionId);
      if (!result.success) {
        throw new Error(result.error || 'Failed to fetch queue');
      }
      return result.queue ?? [];
    },
    enabled: !!sessionId,
    staleTime: STALE_TIMES.RUNNING_AGENTS, // Queue changes frequently during use
  });
}
