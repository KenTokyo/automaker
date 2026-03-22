/**
 * Hook for completed tasks (Done Tab)
 *
 * Fetches completed tasks from the server API and listens for
 * real-time WebSocket updates (created/deleted events).
 *
 * Supports multi-project mode: pass `allProjects` to fetch
 * completed tasks from ALL registered projects simultaneously.
 */

import { useCallback, useEffect, useRef } from 'react';
import type { CompletedTask, CompletedTaskFilter } from '@automaker/types';
import { apiFetch } from '@/lib/api-fetch';
import { getHttpApiClient } from '@/lib/http-api-client';
import { useAppStore } from '@/store/app-store';

interface ProjectInfo {
  path: string;
  name: string;
}

/**
 * Build query string from filter options
 */
function buildFilterQuery(filter?: CompletedTaskFilter): string {
  if (!filter) return '';
  const params = new URLSearchParams();
  if (filter.search) params.set('search', filter.search);
  if (filter.tags?.length) params.set('tags', filter.tags.join(','));
  if (filter.status?.length) params.set('status', filter.status.join(','));
  if (filter.effort?.length) params.set('effort', filter.effort.join(','));
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
 * - When `allProjects` is provided, fetches from all projects at once
 * - Subscribes to WebSocket events for real-time updates
 * - Updates the Zustand store with results
 */
export function useCompletedTasks(
  projectPath: string | null,
  filter?: CompletedTaskFilter,
  allProjects?: ProjectInfo[]
) {
  const setCompletedTasks = useAppStore((s) => s.setCompletedTasks);
  const setLoading = useAppStore((s) => s.setCompletedTasksLoading);
  const setError = useAppStore((s) => s.setCompletedTasksError);
  const addCompletedTask = useAppStore((s) => s.addCompletedTask);
  const removeCompletedTask = useAppStore((s) => s.removeCompletedTask);

  const abortRef = useRef<AbortController | null>(null);

  // Serialize allProjects for dependency tracking (avoid re-fetching on referential changes)
  const projectsKey = allProjects
    ? allProjects
        .map((p) => p.path)
        .sort()
        .join('|')
    : '';

  const fetchTasks = useCallback(async () => {
    const hasMulti = allProjects && allProjects.length > 0;
    if (!projectPath && !hasMulti) {
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
      let url: string;

      if (hasMulti) {
        // Multi-project mode
        const pathsParam = allProjects!.map((p) => encodeURIComponent(p.path)).join('|');
        const namesParam = allProjects!.map((p) => encodeURIComponent(p.name)).join('|');
        const separator = query ? '&' : '?';
        url = `/api/completed-tasks${query}${separator}projectPaths=${pathsParam}&projectNames=${namesParam}`;
      } else {
        // Single project mode (backward compatible)
        const separator = query ? '&' : '?';
        url = `/api/completed-tasks${query}${separator}projectPath=${encodeURIComponent(projectPath!)}`;
      }

      const response = await apiFetch(url, 'GET', { signal: controller.signal });

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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectPath, projectsKey, filter, setCompletedTasks, setLoading, setError]);

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
      if (task) {
        addCompletedTask(task);
      }
    });
    const unsubDeleted = client.onCompletedTaskDeleted((payload) => {
      const data = payload as { taskId: string; projectPath: string };
      if (data) {
        // In multi-project mode accept all delete events,
        // in single-project mode check projectPath match
        const hasMulti = allProjects && allProjects.length > 0;
        if (hasMulti || data.projectPath === projectPath) {
          removeCompletedTask(data.taskId);
        }
      }
    });

    return () => {
      unsubCreated();
      unsubDeleted();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectPath, projectsKey, addCompletedTask, removeCompletedTask]);

  return { refetch: fetchTasks };
}

/**
 * Create a new completed task via POST
 */
export async function createCompletedTask(
  input: Omit<CompletedTask, 'filename'> & { projectPath: string }
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
 * Delete a completed task via DELETE (by filename)
 */
export async function deleteCompletedTask(filename: string, projectPath: string): Promise<boolean> {
  try {
    const response = await apiFetch(
      `/api/completed-tasks/${encodeURIComponent(filename)}?projectPath=${encodeURIComponent(projectPath)}`,
      'DELETE'
    );
    return response.ok;
  } catch {
    return false;
  }
}
