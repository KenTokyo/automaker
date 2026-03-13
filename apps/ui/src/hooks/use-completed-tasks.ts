/**
 * Hook for completed tasks (Done Tab)
 *
 * Fetches completed tasks from the server API and listens for
 * real-time WebSocket updates (created/deleted events).
 */

import { useCallback, useEffect, useRef } from 'react';
import type { CompletedTask, CompletedTaskFilter } from '@automaker/types';
import { apiFetch } from '@/lib/api-fetch';
import { getHttpApiClient } from '@/lib/http-api-client';
import { useAppStore } from '@/store/app-store';

/**
 * Build query string from filter options
 */
function buildFilterQuery(filter?: CompletedTaskFilter): string {
  if (!filter) return '';
  const params = new URLSearchParams();
  if (filter.search) params.set('search', filter.search);
  if (filter.categories?.length) params.set('categories', filter.categories.join(','));
  if (filter.badges?.length) params.set('badges', filter.badges.join(','));
  if (filter.since) params.set('since', filter.since);
  if (filter.until) params.set('until', filter.until);
  if (filter.limit) params.set('limit', String(filter.limit));
  const qs = params.toString();
  return qs ? `?${qs}` : '';
}

/**
 * Main hook for loading and managing completed tasks.
 *
 * - Fetches tasks on mount and when `projectPath` or `filter` changes
 * - Subscribes to WebSocket events for real-time updates
 * - Updates the Zustand store with results
 */
export function useCompletedTasks(projectPath: string | null, filter?: CompletedTaskFilter) {
  const setCompletedTasks = useAppStore((s) => s.setCompletedTasks);
  const setLoading = useAppStore((s) => s.setCompletedTasksLoading);
  const setError = useAppStore((s) => s.setCompletedTasksError);
  const addCompletedTask = useAppStore((s) => s.addCompletedTask);
  const removeCompletedTask = useAppStore((s) => s.removeCompletedTask);

  const abortRef = useRef<AbortController | null>(null);

  const fetchTasks = useCallback(async () => {
    if (!projectPath) {
      setCompletedTasks([]);
      return;
    }

    // Cancel previous request
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setLoading(true);
    setError(null);

    try {
      const query = buildFilterQuery(filter);
      const response = await apiFetch(
        `/api/completed-tasks${query}${query ? '&' : '?'}projectPath=${encodeURIComponent(projectPath)}`,
        'GET',
        { signal: controller.signal }
      );

      if (!response.ok) {
        throw new Error(`Server error: ${response.status}`);
      }

      const data = (await response.json()) as { tasks: CompletedTask[] };
      if (!controller.signal.aborted) {
        setCompletedTasks(data.tasks ?? []);
        setLoading(false);
      }
    } catch (err: unknown) {
      if (err instanceof DOMException && err.name === 'AbortError') return;
      const message = err instanceof Error ? err.message : 'Unbekannter Fehler';
      if (!controller.signal.aborted) {
        setError(message);
        setLoading(false);
      }
    }
  }, [projectPath, filter, setCompletedTasks, setLoading, setError]);

  // Fetch on mount / when deps change
  useEffect(() => {
    void fetchTasks();
    return () => {
      abortRef.current?.abort();
    };
  }, [fetchTasks]);

  // WebSocket real-time updates
  useEffect(() => {
    const client = getHttpApiClient();
    const unsubCreated = client.onCompletedTaskCreated((payload) => {
      const task = payload as CompletedTask;
      if (task && task.projectPath === projectPath) {
        addCompletedTask(task);
      }
    });
    const unsubDeleted = client.onCompletedTaskDeleted((payload) => {
      const data = payload as { taskId: string; projectPath: string };
      if (data && data.projectPath === projectPath) {
        removeCompletedTask(data.taskId);
      }
    });

    return () => {
      unsubCreated();
      unsubDeleted();
    };
  }, [projectPath, addCompletedTask, removeCompletedTask]);

  return { refetch: fetchTasks };
}

/**
 * Create a new completed task via POST
 */
export async function createCompletedTask(
  input: Omit<CompletedTask, 'id' | 'completedAt'>
): Promise<CompletedTask | null> {
  try {
    const response = await apiFetch('/api/completed-tasks', 'POST', {
      body: input,
    });
    if (!response.ok) return null;
    const data = (await response.json()) as { task: CompletedTask };
    return data.task ?? null;
  } catch {
    return null;
  }
}

/**
 * Delete a completed task via DELETE
 */
export async function deleteCompletedTask(taskId: string, projectPath: string): Promise<boolean> {
  try {
    const response = await apiFetch(
      `/api/completed-tasks/${encodeURIComponent(taskId)}?projectPath=${encodeURIComponent(projectPath)}`,
      'DELETE'
    );
    return response.ok;
  } catch {
    return false;
  }
}
