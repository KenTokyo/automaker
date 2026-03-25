/**
 * TaskNotificationsPopover - Bell icon with unread badge and dark popover.
 *
 * Shows Supabase task_notifications for the current project. Each notification
 * links to a completed task. The design follows the ultra-dark theme
 * (bg-zinc-950, border-white/5) with neon-cyan accents for unread items.
 */

import { useCallback } from 'react';
import { Bell, CheckCheck } from 'lucide-react';
import {
  useTaskNotifications,
  notificationTypeLabel,
  type TaskNotification,
} from '@/hooks/use-task-notifications';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

// ---------------------------------------------------------------------------
// Relative time formatter
// ---------------------------------------------------------------------------

function formatRelativeTime(iso: string): string {
  const now = Date.now();
  const then = new Date(iso).getTime();
  const diffSec = Math.floor((now - then) / 1000);

  if (diffSec < 60) return 'gerade eben';
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `vor ${diffMin} Min.`;
  const diffHour = Math.floor(diffMin / 60);
  if (diffHour < 24) return `vor ${diffHour} Std.`;
  const diffDay = Math.floor(diffHour / 24);
  if (diffDay < 7) return `vor ${diffDay} Tag${diffDay === 1 ? '' : 'en'}`;
  return new Date(iso).toLocaleDateString('de-DE');
}

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface TaskNotificationsPopoverProps {
  projectId: string | null;
  /** Optional callback when a notification is clicked (e.g., navigate to task). */
  onNotificationClick?: (notification: TaskNotification) => void;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function TaskNotificationsPopover({
  projectId,
  onNotificationClick,
}: TaskNotificationsPopoverProps) {
  const { notifications, unreadCount, markAsRead, markAllAsRead } = useTaskNotifications(projectId);

  const handleClick = useCallback(
    (notification: TaskNotification) => {
      if (notification.readAt === null) {
        void markAsRead(notification.id);
      }
      onNotificationClick?.(notification);
    },
    [markAsRead, onNotificationClick]
  );

  // Don't render anything if Supabase is not in use for this project
  if (!projectId) return null;

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          className={cn(
            'relative flex h-6 w-6 items-center justify-center rounded-md',
            'text-zinc-500 transition-colors hover:bg-zinc-800/60 hover:text-zinc-300',
            'focus:outline-none focus-visible:ring-1 focus-visible:ring-cyan-500/40'
          )}
          title="Task-Benachrichtigungen"
        >
          <Bell className="h-3 w-3" />
          {unreadCount > 0 && (
            <span className="absolute -right-1 -top-1 flex h-3.5 min-w-[14px] items-center justify-center rounded-full bg-cyan-500 px-0.5 text-[9px] font-bold leading-none text-black">
              {unreadCount > 99 ? '99+' : unreadCount}
            </span>
          )}
        </button>
      </PopoverTrigger>

      <PopoverContent
        align="end"
        sideOffset={8}
        className="w-80 rounded-lg border border-white/5 bg-zinc-950 p-0 shadow-xl shadow-black/40"
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-zinc-800/50 px-3 py-2">
          <span className="text-xs font-semibold text-zinc-400">Benachrichtigungen</span>
          {unreadCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              className="h-5 px-1.5 text-[10px] text-cyan-400 hover:bg-cyan-500/10 hover:text-cyan-300"
              onClick={() => void markAllAsRead()}
            >
              <CheckCheck className="mr-1 h-3 w-3" />
              Alle gelesen
            </Button>
          )}
        </div>

        {/* Notification list */}
        {notifications.length === 0 ? (
          <div className="flex flex-col items-center justify-center px-4 py-8">
            <Bell className="mb-2 h-6 w-6 text-zinc-700" />
            <p className="text-xs text-zinc-600">Keine Benachrichtigungen</p>
          </div>
        ) : (
          <div className="max-h-[320px] overflow-y-auto">
            {notifications.map((notification) => {
              const isUnread = notification.readAt === null;
              return (
                <button
                  key={notification.id}
                  type="button"
                  className={cn(
                    'flex w-full items-start gap-2.5 px-3 py-2.5 text-left transition-colors',
                    'border-b border-zinc-800/30 last:border-b-0',
                    'hover:bg-zinc-900/80',
                    isUnread && 'border-l-2 border-l-cyan-500/60 bg-cyan-500/[0.03]'
                  )}
                  onClick={() => handleClick(notification)}
                >
                  {/* Unread dot */}
                  <div className="mt-1 flex h-4 w-4 shrink-0 items-center justify-center">
                    {isUnread ? (
                      <span className="h-1.5 w-1.5 rounded-full bg-cyan-400" />
                    ) : (
                      <span className="h-1.5 w-1.5 rounded-full bg-zinc-700" />
                    )}
                  </div>

                  {/* Content */}
                  <div className="min-w-0 flex-1">
                    <p
                      className={cn(
                        'truncate text-xs font-medium',
                        isUnread ? 'text-zinc-200' : 'text-zinc-500'
                      )}
                    >
                      {notification.taskTitle}
                    </p>
                    <p className="mt-0.5 text-[10px] text-zinc-600">
                      {notificationTypeLabel(notification.type)}
                    </p>
                  </div>

                  {/* Timestamp */}
                  <span className="shrink-0 pt-0.5 text-[10px] text-zinc-600">
                    {formatRelativeTime(notification.createdAt)}
                  </span>
                </button>
              );
            })}
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}
