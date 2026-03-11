import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
} from 'react';
import { cn } from '@/lib/utils';

const MIN_SIDEBAR_WIDTH = 250;
const MAX_SIDEBAR_WIDTH = 500;
const DESKTOP_BREAKPOINT = 1024;

function getMaxSidebarWidth(viewportWidth: number): number {
  return Math.min(MAX_SIDEBAR_WIDTH, Math.floor(viewportWidth * 0.4));
}

function clampSidebarWidth(width: number, viewportWidth: number): number {
  const maxWidth = getMaxSidebarWidth(viewportWidth);
  return Math.max(MIN_SIDEBAR_WIDTH, Math.min(maxWidth, Math.round(width)));
}

interface ChatLayoutV2Props {
  header: ReactNode;
  leftSidebar: ReactNode;
  center: ReactNode;
  rightSidebar: ReactNode;
  statusBar: ReactNode;
  leftOpen: boolean;
  rightOpen: boolean;
  leftWidth: number;
  rightWidth: number;
  onLeftOpenChange: (open: boolean) => void;
  onRightOpenChange: (open: boolean) => void;
  onLeftWidthChange: (width: number) => void;
  onRightWidthChange: (width: number) => void;
}

type ResizeSide = 'left' | 'right';

interface ResizeState {
  side: ResizeSide;
  startX: number;
  startWidth: number;
}

export function ChatLayoutV2({
  header,
  leftSidebar,
  center,
  rightSidebar,
  statusBar,
  leftOpen,
  rightOpen,
  leftWidth,
  rightWidth,
  onLeftOpenChange,
  onRightOpenChange,
  onLeftWidthChange,
  onRightWidthChange,
}: ChatLayoutV2Props) {
  const [viewportWidth, setViewportWidth] = useState<number>(() =>
    typeof window === 'undefined' ? 1440 : window.innerWidth
  );
  const resizeStateRef = useRef<ResizeState | null>(null);

  const isMobile = viewportWidth < DESKTOP_BREAKPOINT;
  const mobileSidebarWidth = Math.min(360, Math.max(260, Math.floor(viewportWidth * 0.82)));

  useEffect(() => {
    const updateViewportWidth = () => {
      setViewportWidth(window.innerWidth);
    };

    updateViewportWidth();
    window.addEventListener('resize', updateViewportWidth);
    return () => window.removeEventListener('resize', updateViewportWidth);
  }, []);

  useEffect(() => {
    if (isMobile) return;

    const maxWidth = getMaxSidebarWidth(viewportWidth);
    if (leftWidth > maxWidth) {
      onLeftWidthChange(clampSidebarWidth(leftWidth, viewportWidth));
    }
    if (rightWidth > maxWidth) {
      onRightWidthChange(clampSidebarWidth(rightWidth, viewportWidth));
    }
  }, [isMobile, leftWidth, rightWidth, viewportWidth, onLeftWidthChange, onRightWidthChange]);

  const handlePointerDown = useCallback(
    (side: ResizeSide, event: ReactPointerEvent<HTMLDivElement>) => {
      if (isMobile) return;

      const startWidth = side === 'left' ? leftWidth : rightWidth;
      resizeStateRef.current = {
        side,
        startX: event.clientX,
        startWidth,
      };
    },
    [isMobile, leftWidth, rightWidth]
  );

  useEffect(() => {
    const handlePointerMove = (event: PointerEvent) => {
      const resizeState = resizeStateRef.current;
      if (!resizeState) return;

      const delta = event.clientX - resizeState.startX;
      const rawWidth =
        resizeState.side === 'left'
          ? resizeState.startWidth + delta
          : resizeState.startWidth - delta;
      const width = clampSidebarWidth(rawWidth, window.innerWidth);

      if (resizeState.side === 'left') {
        onLeftWidthChange(width);
      } else {
        onRightWidthChange(width);
      }
    };

    const handlePointerUp = () => {
      resizeStateRef.current = null;
    };

    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', handlePointerUp);
    return () => {
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
    };
  }, [onLeftWidthChange, onRightWidthChange]);

  return (
    <div className="flex h-full min-h-0 w-full flex-col bg-background">
      {header}

      <div className="relative flex min-h-0 flex-1">
        {isMobile ? (
          <>
            <div className="min-w-0 flex-1">{center}</div>

            {leftOpen && (
              <>
                <button
                  type="button"
                  className="fixed inset-0 z-40 bg-black/40"
                  onClick={() => onLeftOpenChange(false)}
                  aria-label="Verlauf schließen"
                />
                <aside
                  className={cn(
                    'fixed inset-y-0 left-0 z-50 border-r border-muted bg-card',
                    'shadow-xl transition-transform duration-200 ease-out'
                  )}
                  style={{ width: mobileSidebarWidth }}
                >
                  {leftSidebar}
                </aside>
              </>
            )}

            {rightOpen && (
              <>
                <button
                  type="button"
                  className="fixed inset-0 z-40 bg-black/40"
                  onClick={() => onRightOpenChange(false)}
                  aria-label="Datei-Bereich schließen"
                />
                <aside
                  className={cn(
                    'fixed inset-y-0 right-0 z-50 border-l border-muted bg-card',
                    'shadow-xl transition-transform duration-200 ease-out'
                  )}
                  style={{ width: mobileSidebarWidth }}
                >
                  {rightSidebar}
                </aside>
              </>
            )}
          </>
        ) : (
          <>
            {leftOpen && (
              <>
                <aside
                  className="flex h-full shrink-0 flex-col border-r border-muted bg-card/90"
                  style={{ width: leftWidth }}
                >
                  {leftSidebar}
                </aside>
                <div
                  role="separator"
                  aria-orientation="vertical"
                  className="w-1 shrink-0 cursor-col-resize bg-muted/30 transition-colors hover:bg-muted"
                  onPointerDown={(event) => handlePointerDown('left', event)}
                />
              </>
            )}

            <main className="min-w-[400px] flex-1 overflow-hidden">{center}</main>

            {rightOpen && (
              <>
                <div
                  role="separator"
                  aria-orientation="vertical"
                  className="w-1 shrink-0 cursor-col-resize bg-muted/30 transition-colors hover:bg-muted"
                  onPointerDown={(event) => handlePointerDown('right', event)}
                />
                <aside
                  className="flex h-full shrink-0 flex-col border-l border-muted bg-card/90"
                  style={{ width: rightWidth }}
                >
                  {rightSidebar}
                </aside>
              </>
            )}
          </>
        )}
      </div>

      {statusBar}
    </div>
  );
}
