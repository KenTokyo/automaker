import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { SessionTab, type SessionTabItem } from './session-tab';

export type { SessionTabItem };

interface SessionTabBarProps {
  sessions: SessionTabItem[];
  activeSessionId: string | null;
  isCreatingSession: boolean;
  onCreateSession: () => void;
  onSelectSession: (sessionId: string) => void;
  onCloseSession: (sessionId: string) => void;
  onCloseOtherSessions: (sessionId: string) => void;
  onRenameSession: (sessionId: string, nextName: string) => Promise<boolean>;
}

const SCROLL_STEP = 260;

function clampScrollLeft(value: number): number {
  if (!Number.isFinite(value) || value < 0) return 0;
  return value;
}

export function SessionTabBar({
  sessions,
  activeSessionId,
  isCreatingSession,
  onCreateSession,
  onSelectSession,
  onCloseSession,
  onCloseOtherSessions,
  onRenameSession,
}: SessionTabBarProps) {
  const scrollContainerRef = useRef<HTMLDivElement | null>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  const showScrollButtons = sessions.length > 2 && (canScrollLeft || canScrollRight);

  const updateScrollState = useCallback(() => {
    const container = scrollContainerRef.current;
    if (!container) {
      setCanScrollLeft(false);
      setCanScrollRight(false);
      return;
    }

    const left = clampScrollLeft(container.scrollLeft);
    const right = left + container.clientWidth;
    const width = container.scrollWidth;

    setCanScrollLeft(left > 4);
    setCanScrollRight(right < width - 4);
  }, []);

  useEffect(() => {
    updateScrollState();
  }, [sessions, updateScrollState]);

  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container) return;

    const handleResize = () => updateScrollState();
    const handleScroll = () => updateScrollState();

    window.addEventListener('resize', handleResize);
    container.addEventListener('scroll', handleScroll, { passive: true });

    let observer: ResizeObserver | null = null;
    if ('ResizeObserver' in window) {
      observer = new ResizeObserver(() => updateScrollState());
      observer.observe(container);
    }

    return () => {
      window.removeEventListener('resize', handleResize);
      container.removeEventListener('scroll', handleScroll);
      observer?.disconnect();
    };
  }, [updateScrollState]);

  useEffect(() => {
    if (!activeSessionId) return;

    const container = scrollContainerRef.current;
    if (!container) return;

    const nextTab = container.querySelector<HTMLElement>(`[data-session-tab-id="${activeSessionId}"]`);
    if (!nextTab) return;

    nextTab.scrollIntoView({
      block: 'nearest',
      inline: 'nearest',
      behavior: 'smooth',
    });
  }, [activeSessionId, sessions]);

  const canCloseOthersBySession = useMemo(() => {
    const ids = sessions.map((session) => session.id);
    return new Set(ids);
  }, [sessions]);

  return (
    <div className="relative">
      {showScrollButtons ? (
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className={cn(
            'absolute left-1 top-1/2 z-10 h-7 w-7 -translate-y-1/2 border border-muted bg-card/95 shadow-sm',
            !canScrollLeft && 'pointer-events-none opacity-0'
          )}
          onClick={() => {
            scrollContainerRef.current?.scrollBy({ left: -SCROLL_STEP, behavior: 'smooth' });
          }}
          aria-label="Tabs nach links"
          title="Tabs nach links"
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
      ) : null}

      <div
        ref={scrollContainerRef}
        className={cn(
          'overflow-x-auto overflow-y-hidden rounded-md border border-muted bg-card/60 p-1',
          showScrollButtons && 'px-9'
        )}
      >
        <div className="flex min-w-max items-center gap-1">
          {sessions.map((session) => (
            <SessionTab
              key={session.id}
              session={session}
              isActive={session.id === activeSessionId}
              canCloseOthers={canCloseOthersBySession.size > 1}
              onSelect={onSelectSession}
              onClose={onCloseSession}
              onCloseOthers={onCloseOtherSessions}
              onRename={onRenameSession}
            />
          ))}

          <Button
            type="button"
            variant="outline"
            className="h-10 shrink-0 gap-1 border-muted bg-background/90 px-3 text-xs"
            onClick={onCreateSession}
            disabled={isCreatingSession}
            aria-label="Neuen Chat erstellen"
            title="Neuen Chat erstellen"
          >
            <Plus className="h-3.5 w-3.5" />
            {isCreatingSession ? 'Erstelle…' : 'Neuer Chat'}
          </Button>
        </div>
      </div>

      {showScrollButtons ? (
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className={cn(
            'absolute right-1 top-1/2 z-10 h-7 w-7 -translate-y-1/2 border border-muted bg-card/95 shadow-sm',
            !canScrollRight && 'pointer-events-none opacity-0'
          )}
          onClick={() => {
            scrollContainerRef.current?.scrollBy({ left: SCROLL_STEP, behavior: 'smooth' });
          }}
          aria-label="Tabs nach rechts"
          title="Tabs nach rechts"
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
      ) : null}
    </div>
  );
}
