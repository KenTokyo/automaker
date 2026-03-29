/**
 * RightPanelShell - Container for the right panel with mode tabs and optional split.
 *
 * Wraps FilesPanel, TerminalView, DashboardPanel and GitPanel.
 *
 * Legacy note:
 * BrowserPanel is intentionally disabled for now to reduce UI overhead.
 * The old Browser code is kept in browser-panel.tsx as deprecated legacy code.
 * with a top-level mode switcher.
 * The active mode is stored in app-store (rightPanelMode).
 *
 * Split mode: when rightPanelSecondaryMode is set, the content area
 * splits vertically with a resizable divider. Each half can show a
 * different panel. A toggle button in the tab bar activates/deactivates
 * the split.
 *
 * Each panel section can have its own font-size stepper control.
 *
 * At narrow widths (< 360px) the tab bar switches to icon-only mode
 * with tooltips showing the full label.
 */

import { lazy, memo, Suspense, useCallback, useEffect, useRef, useState } from 'react';
import { BarChart3, Columns2, FolderOpen, GitBranch, Terminal, X } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { useShallow } from 'zustand/react/shallow';
import { useAppStore } from '@/store/app-store';
import { cn } from '@/lib/utils';
import { Spinner } from '@/components/ui/spinner';
import { FontSizeStepper } from '@/components/ui/font-size-stepper';
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from '@/components/ui/resizable';
import type { RightPanelMode } from '@/store/types/ui-types';
import { RIGHT_PANEL_FONT_SIZE_MAX, RIGHT_PANEL_FONT_SIZE_MIN } from '@/store/types/ui-types';
import { DashboardPanel } from './dashboard-panel';
import { FilesPanel } from './files-panel';
import { GitPanel } from './git-panel';

const LazyTerminalView = lazy(async () => {
  const module = await import('@/components/views/terminal-view');
  return { default: module.TerminalView };
});

interface RightPanelShellProps {
  projectPath: string;
}

const ICON_ONLY_BREAKPOINT = 360;

const MODE_TABS: { mode: RightPanelMode; label: string; icon: LucideIcon }[] = [
  // Legacy (disabled): { mode: 'browser', label: 'Browser', icon: Globe },
  { mode: 'files', label: 'Dateien', icon: FolderOpen },
  { mode: 'terminal', label: 'Terminal', icon: Terminal },
  { mode: 'dashboard', label: 'Übersicht', icon: BarChart3 },
  { mode: 'git', label: 'Git', icon: GitBranch },
];

// ---------------------------------------------------------------------------
// Panel content renderer (reused for primary and secondary)
// ---------------------------------------------------------------------------

function PanelContent({ mode, projectPath }: { mode: RightPanelMode; projectPath: string }) {
  switch (mode) {
    case 'files':
      return <FilesPanel projectPath={projectPath} />;
    case 'terminal':
      return (
        <Suspense
          fallback={
            <div className="flex h-full items-center justify-center">
              <Spinner size="lg" />
            </div>
          }
        >
          <LazyTerminalView />
        </Suspense>
      );
    case 'dashboard':
      return <DashboardPanel />;
    case 'git':
      return <GitPanel projectPath={projectPath} />;
    default:
      return null;
  }
}

// ---------------------------------------------------------------------------
// Font size control per panel mode
// ---------------------------------------------------------------------------

function PanelFontSizeControl({ mode }: { mode: RightPanelMode }) {
  const {
    filesFontSize,
    dashboardFontSize,
    terminalFontSize,
    setFilesFontSize,
    setDashboardFontSize,
    setTerminalFontSize,
  } = useAppStore(
    useShallow((s) => ({
      filesFontSize: s.filesPanelFontSize,
      dashboardFontSize: s.dashboardPanelFontSize,
      terminalFontSize: s.terminalState.defaultFontSize,
      setFilesFontSize: s.setFilesPanelFontSize,
      setDashboardFontSize: s.setDashboardPanelFontSize,
      setTerminalFontSize: s.setTerminalDefaultFontSize,
    }))
  );

  switch (mode) {
    case 'files':
      return (
        <FontSizeStepper
          value={filesFontSize}
          onChange={setFilesFontSize}
          min={RIGHT_PANEL_FONT_SIZE_MIN}
          max={RIGHT_PANEL_FONT_SIZE_MAX}
          label="Schriftgröße Dateien"
        />
      );
    case 'dashboard':
      return (
        <FontSizeStepper
          value={dashboardFontSize}
          onChange={setDashboardFontSize}
          min={RIGHT_PANEL_FONT_SIZE_MIN}
          max={RIGHT_PANEL_FONT_SIZE_MAX}
          label="Schriftgröße Übersicht"
        />
      );
    case 'terminal':
      return (
        <FontSizeStepper
          value={terminalFontSize}
          onChange={setTerminalFontSize}
          min={8}
          max={28}
          label="Schriftgröße Terminal"
        />
      );
    case 'git':
      return null;
    default:
      return null;
  }
}

// ---------------------------------------------------------------------------
// Secondary panel mini-tab bar
// ---------------------------------------------------------------------------

function SecondaryTabBar({
  primaryMode,
  secondaryMode,
  onSelectSecondary,
  onSwapPanels,
  onClose,
  iconOnly,
}: {
  primaryMode: RightPanelMode;
  secondaryMode: RightPanelMode;
  onSelectSecondary: (mode: RightPanelMode) => void;
  onSwapPanels: () => void;
  onClose: () => void;
  iconOnly: boolean;
}) {
  // Show all modes including primary - selecting primary mode swaps the panels.
  const availableModes = MODE_TABS;

  return (
    <div className="flex items-center gap-0 border-b border-border bg-muted/20 shrink-0">
      {availableModes.map(({ mode, label, icon: Icon }) => {
        const isActive = secondaryMode === mode;
        const isPrimaryMode = primaryMode === mode;
        return (
          <button
            key={mode}
            type="button"
            title={iconOnly ? label : undefined}
            className={cn(
              'flex items-center gap-1 py-1 text-[11px] transition-colors',
              iconOnly ? 'px-2' : 'px-2.5',
              isActive
                ? 'bg-background text-foreground border-b-2 border-b-primary font-medium'
                : isPrimaryMode
                  ? 'text-muted-foreground/40 hover:bg-muted/30 hover:text-muted-foreground'
                  : 'text-muted-foreground hover:bg-muted/50 hover:text-foreground'
            )}
            onClick={() => (isPrimaryMode ? onSwapPanels() : onSelectSecondary(mode))}
          >
            <Icon className="h-3 w-3 shrink-0" />
            {!iconOnly && label}
          </button>
        );
      })}

      <div className="ml-auto mr-1">
        <PanelFontSizeControl mode={secondaryMode} />
      </div>

      <button
        type="button"
        className="mr-1 flex h-5 w-5 items-center justify-center rounded text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
        onClick={onClose}
        title="Aufteilung schließen"
      >
        <X className="h-3 w-3" />
      </button>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export const RightPanelShell = memo(function RightPanelShell({
  projectPath,
}: RightPanelShellProps) {
  const { rightPanelMode, rightPanelSecondaryMode, rightPanelSplitSize } = useAppStore(
    useShallow((s) => ({
      rightPanelMode: s.rightPanelMode,
      rightPanelSecondaryMode: s.rightPanelSecondaryMode,
      rightPanelSplitSize: s.rightPanelSplitSize,
    }))
  );

  const setRightPanelMode = useAppStore((s) => s.setRightPanelMode);
  const setRightPanelSecondaryMode = useAppStore((s) => s.setRightPanelSecondaryMode);
  const setRightPanelSplitSize = useAppStore((s) => s.setRightPanelSplitSize);
  const toggleRightPanelSplit = useAppStore((s) => s.toggleRightPanelSplit);

  const isSplit = rightPanelSecondaryMode != null;
  const containerRef = useRef<HTMLDivElement>(null);
  const [iconOnly, setIconOnly] = useState(false);

  useEffect(() => {
    const element = containerRef.current;
    if (!element) return;

    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        setIconOnly(entry.contentRect.width < ICON_ONLY_BREAKPOINT);
      }
    });

    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  const handleLayout = useCallback(
    (sizes: number[]) => {
      if (sizes[0] != null && Math.abs(sizes[0] - rightPanelSplitSize) > 0.5) {
        setRightPanelSplitSize(sizes[0]);
      }
    },
    [rightPanelSplitSize, setRightPanelSplitSize]
  );

  const handleSelectSecondary = useCallback(
    (mode: RightPanelMode) => {
      setRightPanelSecondaryMode(mode);
    },
    [setRightPanelSecondaryMode]
  );

  // Swap primary <-> secondary: setRightPanelMode already handles the swap
  // when the new mode equals the current secondary.
  const handleSwapPanels = useCallback(() => {
    if (!rightPanelSecondaryMode) return;
    setRightPanelMode(rightPanelSecondaryMode);
  }, [rightPanelSecondaryMode, setRightPanelMode]);

  const handleCloseSplit = useCallback(() => {
    setRightPanelSecondaryMode(null);
  }, [setRightPanelSecondaryMode]);

  return (
    <div
      ref={containerRef}
      className="flex h-full flex-col overflow-hidden"
      style={{ minWidth: 220 }}
    >
      <div
        className="flex shrink-0 items-center gap-0 border-b border-border bg-muted/30"
        role="tablist"
        aria-label="Rechtes Panel"
      >
        {MODE_TABS.map(({ mode, label, icon: Icon }) => {
          const isActive = rightPanelMode === mode;
          return (
            <button
              key={mode}
              type="button"
              role="tab"
              aria-selected={isActive}
              aria-label={label}
              title={iconOnly ? label : undefined}
              className={cn(
                'flex items-center gap-1.5 py-1.5 text-xs transition-colors',
                iconOnly ? 'px-2.5' : 'px-3',
                isActive
                  ? 'border-b-2 border-b-primary bg-background font-medium text-foreground'
                  : 'text-muted-foreground hover:bg-muted/50 hover:text-foreground'
              )}
              onClick={() => setRightPanelMode(mode)}
            >
              <Icon className="h-3.5 w-3.5 shrink-0" />
              {!iconOnly && label}
            </button>
          );
        })}

        <div className="ml-auto mr-1">
          <PanelFontSizeControl mode={rightPanelMode} />
        </div>

        <button
          type="button"
          className={cn(
            'mr-1 flex h-6 w-6 items-center justify-center rounded transition-colors',
            isSplit
              ? 'bg-primary/15 text-primary hover:bg-primary/25'
              : 'text-muted-foreground hover:bg-muted hover:text-foreground'
          )}
          onClick={toggleRightPanelSplit}
          title={isSplit ? 'Terminal ausblenden' : 'Terminal unten einblenden'}
          aria-label={isSplit ? 'Terminal ausblenden' : 'Terminal unten einblenden'}
        >
          <Columns2 className="h-3.5 w-3.5" />
        </button>
      </div>

      {isSplit ? (
        <ResizablePanelGroup
          direction="vertical"
          onLayout={handleLayout}
          className="min-h-0 flex-1"
        >
          <ResizablePanel defaultSize={rightPanelSplitSize} minSize={15} order={1}>
            <div className="h-full min-h-0 overflow-hidden" role="tabpanel">
              <PanelContent mode={rightPanelMode} projectPath={projectPath} />
            </div>
          </ResizablePanel>

          <ResizableHandle withHandle aria-label="Trennleiste zwischen den Panels" />

          <ResizablePanel
            defaultSize={100 - rightPanelSplitSize}
            minSize={15}
            maxSize={85}
            order={2}
          >
            <div className="flex h-full min-h-0 flex-col overflow-hidden">
              <SecondaryTabBar
                primaryMode={rightPanelMode}
                secondaryMode={rightPanelSecondaryMode!}
                onSelectSecondary={handleSelectSecondary}
                onSwapPanels={handleSwapPanels}
                onClose={handleCloseSplit}
                iconOnly={iconOnly}
              />
              <div className="min-h-0 flex-1 overflow-hidden" role="tabpanel">
                <PanelContent mode={rightPanelSecondaryMode!} projectPath={projectPath} />
              </div>
            </div>
          </ResizablePanel>
        </ResizablePanelGroup>
      ) : (
        <div className="min-h-0 flex-1 overflow-hidden" role="tabpanel">
          <PanelContent mode={rightPanelMode} projectPath={projectPath} />
        </div>
      )}
    </div>
  );
});
