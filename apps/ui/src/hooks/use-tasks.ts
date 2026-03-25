/**
 * Hook for tasks (Tasks Tab)
 *
 * Fetches tasks from the server API and listens for
 * real-time WebSocket updates (created/updated/deleted events).
 *
 * Supports multi-project mode: pass `allProjects` to fetch
 * tasks from ALL registered projects simultaneously.
 */

import { useCallback, useEffect, useRef } from 'react';
import type { Task, TaskFilter } from '@automaker/types';
import { apiFetch } from '@/lib/api-fetch';
import { getHttpApiClient } from '@/lib/http-api-client';
import { useAppStore } from '@/store/app-store';

interface ProjectInfo {
  path: string;
  name: string;
}

function normalizeStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is string => typeof item === 'string' && item.trim().length > 0);
}

function normalizeTask(task: Task): Task {
  return {
    ...task,
    tags: normalizeStringArray(task.tags),
  };
}

function extractTaskFromEventPayload(payload: unknown): Task | null {
  const raw = payload as { task?: unknown } | null;
  const candidate = raw && typeof raw === 'object' && 'task' in raw ? raw.task : payload;
  if (!candidate || typeof candidate !== 'object') return null;

  const maybeTask = candidate as Task;
  if (typeof maybeTask.filename !== 'string' || maybeTask.filename.length === 0) {
    return null;
  }

  return normalizeTask(maybeTask);
}

/**
 * Build query string from filter options
 */
function buildFilterQuery(filter?: TaskFilter): string {
  if (!filter) return '';
  const params = new URLSearchParams();
  if (filter.search) params.set('search', filter.search);
  if (filter.tags?.length) params.set('tags', filter.tags.join(','));
  if (filter.status?.length) params.set('status', filter.status.join(','));
  if (filter.priority?.length) params.set('priority', filter.priority.join(','));
  if (filter.since) params.set('since', filter.since);
  if (filter.until) params.set('until', filter.until);
  if (filter.limit) params.set('limit', String(filter.limit));
  const qs = params.toString();
  return qs ? `?${qs}` : '';
}

/**
 * Main hook for loading and managing tasks.
 *
 * - Fetches tasks on mount and when `projectPath` or `filter` changes
 * - When `allProjects` is provided, fetches from all projects at once
 * - Subscribes to WebSocket events for real-time updates
 * - Updates the Zustand store with results
 */
export function useTasks(
  projectPath: string | null,
  filter?: TaskFilter,
  allProjects?: ProjectInfo[]
) {
  const setTasks = useAppStore((s) => s.setTasks);
  const setLoading = useAppStore((s) => s.setTasksLoading);
  const setError = useAppStore((s) => s.setTasksError);
  const addTask = useAppStore((s) => s.addTask);
  const updateTaskInStore = useAppStore((s) => s.updateTaskInStore);
  const removeTask = useAppStore((s) => s.removeTask);

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
      setTasks([]);
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
        url = `/api/tasks${query}${separator}projectPaths=${pathsParam}&projectNames=${namesParam}`;
      } else {
        // Single project mode (backward compatible)
        const separator = query ? '&' : '?';
        url = `/api/tasks${query}${separator}projectPath=${encodeURIComponent(projectPath!)}`;
      }

      const response = await apiFetch(url, 'GET', { signal: controller.signal });

      if (!response.ok) {
        throw new Error(`Server error: ${response.status}`);
      }

      const data = (await response.json()) as { tasks: Task[] };
      if (!controller.signal.aborted) {
        setTasks((data.tasks ?? []).map(normalizeTask));
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
  }, [projectPath, projectsKey, filter, setTasks, setLoading, setError]);

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
    const unsubCreated = client.onTaskCreated((payload) => {
      const task = extractTaskFromEventPayload(payload);
      if (task) {
        const exists = useAppStore
          .getState()
          .tasks.some(
            (t) =>
              t.filename === task.filename && (t.projectPath ?? '') === (task.projectPath ?? '')
          );

        if (!exists) {
          addTask(task);
        }
      }
    });
    const unsubUpdated = client.onTaskUpdated((payload) => {
      const task = extractTaskFromEventPayload(payload);
      if (task && task.filename) {
        updateTaskInStore(task.filename, task);
      }
    });
    const unsubDeleted = client.onTaskDeleted((payload) => {
      const data = payload as { taskId: string; projectPath: string };
      if (data) {
        // In multi-project mode accept all delete events,
        // in single-project mode check projectPath match
        const hasMulti = allProjects && allProjects.length > 0;
        if (hasMulti || data.projectPath === projectPath) {
          removeTask(data.taskId);
        }
      }
    });

    return () => {
      unsubCreated();
      unsubUpdated();
      unsubDeleted();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectPath, projectsKey, addTask, updateTaskInStore, removeTask]);

  return { refetch: fetchTasks };
}

/**
 * Create a new task via POST
 */
export async function createTask(
  input: Omit<Task, 'filename'> & { projectPath: string }
): Promise<Task | null> {
  try {
    const response = await apiFetch('/api/tasks', 'POST', {
      body: input,
    });
    if (!response.ok) return null;
    const data = (await response.json()) as { task: Task };
    return data.task ?? null;
  } catch {
    return null;
  }
}

/**
 * Update an existing task via PUT
 */
export async function updateTask(
  filename: string,
  projectPath: string,
  updates: Partial<Omit<Task, 'filename'>>
): Promise<Task | null> {
  try {
    const response = await apiFetch(`/api/tasks/${encodeURIComponent(filename)}`, 'PUT', {
      body: { ...updates, projectPath },
    });
    if (!response.ok) return null;
    const data = (await response.json()) as { task: Task };
    return data.task ?? null;
  } catch {
    return null;
  }
}

/**
 * Delete a task via DELETE (by filename)
 */
export async function deleteTask(filename: string, projectPath: string): Promise<boolean> {
  try {
    const response = await apiFetch(
      `/api/tasks/${encodeURIComponent(filename)}?projectPath=${encodeURIComponent(projectPath)}`,
      'DELETE'
    );
    return response.ok;
  } catch {
    return false;
  }
}
