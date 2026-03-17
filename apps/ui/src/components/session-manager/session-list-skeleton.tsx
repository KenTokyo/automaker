/**
 * Session List Skeleton
 *
 * Skeleton-Loading-Placeholder für die Session-Liste.
 * Wird angezeigt während Sessions geladen werden.
 */

import { SkeletonPulse } from '@/components/ui/skeleton';

interface SessionListSkeletonProps {
  count?: number;
}

/**
 * Zeigt animierte Platzhalter-Karten an, die das Layout
 * einer SessionListItemRow nachahmen.
 */
export function SessionListSkeleton({ count = 4 }: SessionListSkeletonProps) {
  return (
    <div className="space-y-1.5" data-testid="session-list-skeleton">
      {Array.from({ length: count }, (_, i) => (
        <div key={`skeleton-${i}`} className="rounded-lg border border-border/40 px-3 py-2">
          {/* Session Name */}
          <SkeletonPulse className="mb-1.5 h-3.5 w-3/4" />
          {/* Description line */}
          <SkeletonPulse className="h-2.5 w-1/2" />
        </div>
      ))}
    </div>
  );
}
