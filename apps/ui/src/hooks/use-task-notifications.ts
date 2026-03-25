/**
 * Hook for Supabase task notifications.
 *
 * Loads unread notifications for the current user, subscribes to
 * realtime inserts, and provides mark-as-read / mark-all-as-read helpers.
 *
 * The `task_notifications` table is populated by a DB trigger when a task
 * transitions to `completed` status (see SQL migration 004).
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import type { RealtimeChannel } from '@supabase/supabase-js';
import { toast } from 'sonner';
import { isSupabaseConfigured, getSupabaseClient } from '@/lib/supabase';
import type { Database } from '@/lib/supabase-types';
import { useSupabaseAuthStore } from '@/store/supabase-auth-store';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type DbNotification = Database['public']['Tables']['task_notifications']['Row'];

export interface TaskNotification {
  id: string;
  taskId: string;
  targetUserId: string;
  type: string;
  readAt: string | null;
  createdAt: string;
  /** Joined task title (fetched alongside the notification). */
  taskTitle: string;
}

export interface UseTaskNotificationsResult {
  notifications: TaskNotification[];
  unreadCount: number;
  loading: boolean;
  markAsRead: (notificationId: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  refetch: () => Promise<void>;
}

// ---------------------------------------------------------------------------
// DB row -> domain model
// ---------------------------------------------------------------------------

function dbToNotification(row: DbNotification, taskTitle: string): TaskNotification {
  return {
    id: row.id,
    taskId: row.task_id,
    targetUserId: row.target_user_id,
    type: row.type,
    readAt: row.read_at,
    createdAt: row.created_at,
    taskTitle,
  };
}

// ---------------------------------------------------------------------------
// Simple force-update helper (same pattern as use-supabase-tasks.ts)
// ---------------------------------------------------------------------------

function useForceUpdate(): () => void {
  const [, setCount] = useState(0);
  return useCallback(() => setCount((c) => c + 1), []);
}

// ---------------------------------------------------------------------------
// Notification type -> readable label
// ---------------------------------------------------------------------------

export function notificationTypeLabel(type: string): string {
  switch (type) {
    case 'task_completed':
      return 'Task abgeschlossen';
    case 'task_assigned':
      return 'Task zugewiesen';
    default:
      return 'Benachrichtigung';
  }
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export function useTaskNotifications(projectId: string | null): UseTaskNotificationsResult {
  const user = useSupabaseAuthStore((s) => s.user);
  const notificationsRef = useRef<TaskNotification[]>([]);
  const loadingRef = useRef(false);
  const forceUpdate = useForceUpdate();

  // -----------------------------------------------------------------------
  // Fetch
  // -----------------------------------------------------------------------

  const fetchNotifications = useCallback(async () => {
    if (!isSupabaseConfigured() || !user || !projectId) {
      notificationsRef.current = [];
      forceUpdate();
      return;
    }

    loadingRef.current = true;
    forceUpdate();

    try {
      const client = getSupabaseClient();

      // Fetch notifications joined with task title via a sub-select.
      // Supabase PostgREST allows embedding foreign-key relations.
      const { data, error } = await client
        .from('task_notifications')
        .select('*, tasks!inner(title, project_id)')
        .eq('target_user_id', user.id)
        .eq('tasks.project_id', projectId)
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;

      notificationsRef.current = (
        (data ?? []) as Array<DbNotification & { tasks: { title: string; project_id: string } }>
      ).map((row) => dbToNotification(row, row.tasks?.title ?? 'Unbekannter Task'));
    } catch {
      // Silently fail - notifications are non-critical
      notificationsRef.current = [];
    } finally {
      loadingRef.current = false;
      forceUpdate();
    }
  }, [user, projectId, forceUpdate]);

  useEffect(() => {
    void fetchNotifications();
  }, [fetchNotifications]);

  // -----------------------------------------------------------------------
  // Realtime subscription
  // -----------------------------------------------------------------------

  useEffect(() => {
    if (!isSupabaseConfigured() || !user || !projectId) return;

    const client = getSupabaseClient();
    let channel: RealtimeChannel | null = null;

    channel = client
      .channel(`task_notifications:${user.id}:${projectId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'task_notifications',
          filter: `target_user_id=eq.${user.id}`,
        },
        async (payload) => {
          const newRow = payload.new as DbNotification;

          // Fetch the task title for the new notification
          let taskTitle = 'Task';
          try {
            const { data: taskData } = await client
              .from('tasks')
              .select('title, project_id')
              .eq('id', newRow.task_id)
              .single();

            if (taskData) {
              // Only add if this notification belongs to the current project
              if (taskData.project_id !== projectId) return;
              taskTitle = taskData.title;
            }
          } catch {
            // Ignore - use fallback title
          }

          const notification = dbToNotification(newRow, taskTitle);

          // Add to top of list (avoid duplicates)
          notificationsRef.current = [
            notification,
            ...notificationsRef.current.filter((n) => n.id !== notification.id),
          ];
          forceUpdate();

          // Show toast if the page is visible
          if (document.visibilityState === 'visible') {
            toast.success(`Task "${taskTitle}" wurde abgeschlossen`, {
              duration: 4000,
            });
          }
        }
      )
      .subscribe();

    return () => {
      if (channel) {
        void client.removeChannel(channel);
      }
    };
  }, [user, projectId, forceUpdate]);

  // -----------------------------------------------------------------------
  // Actions
  // -----------------------------------------------------------------------

  const markAsRead = useCallback(
    async (notificationId: string) => {
      if (!isSupabaseConfigured()) return;

      // Optimistic update
      notificationsRef.current = notificationsRef.current.map((n) =>
        n.id === notificationId ? { ...n, readAt: new Date().toISOString() } : n
      );
      forceUpdate();

      try {
        await getSupabaseClient()
          .from('task_notifications')
          .update({ read_at: new Date().toISOString() })
          .eq('id', notificationId);
      } catch {
        // Revert on failure - refetch
        void fetchNotifications();
      }
    },
    [forceUpdate, fetchNotifications]
  );

  const markAllAsRead = useCallback(async () => {
    if (!isSupabaseConfigured() || !user) return;

    const now = new Date().toISOString();

    // Optimistic update
    notificationsRef.current = notificationsRef.current.map((n) =>
      n.readAt === null ? { ...n, readAt: now } : n
    );
    forceUpdate();

    try {
      const unreadIds = notificationsRef.current
        .filter((n) => n.readAt === now) // The ones we just optimistically marked
        .map((n) => n.id);

      if (unreadIds.length > 0) {
        await getSupabaseClient()
          .from('task_notifications')
          .update({ read_at: now })
          .eq('target_user_id', user.id)
          .is('read_at', null);
      }
    } catch {
      void fetchNotifications();
    }
  }, [user, forceUpdate, fetchNotifications]);

  // -----------------------------------------------------------------------
  // Derived values
  // -----------------------------------------------------------------------

  const unreadCount = notificationsRef.current.filter((n) => n.readAt === null).length;

  return {
    notifications: notificationsRef.current,
    unreadCount,
    loading: loadingRef.current,
    markAsRead,
    markAllAsRead,
    refetch: fetchNotifications,
  };
}
