import { memo, useCallback, useMemo, useRef, useState, useEffect } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  RefreshCw,
  Globe,
  X,
  Plus,
  Loader2,
  AlertCircle,
  ExternalLink,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useAppStore, type BrowserTab } from '@/store/app-store';
import { useShallow } from 'zustand/react/shallow';
import { getElectronAPI } from '@/lib/electron';

interface BrowserPanelProps {
  projectPath: string;
}

/** Common localhost ports for quick access */
const QUICK_PORTS = [3000, 3001, 5173, 8080] as const;

/** Maximum number of tabs per project */
const MAX_TABS = 8;

/**
 * Normalize user input to a full URL.
 * - Pure number → http://localhost:{port}
 * - localhost:PORT → http://localhost:PORT
 * - Already has protocol → use as-is
 */
function normalizeUrl(input: string): string {
  const trimmed = input.trim();
  if (!trimmed) return '';

  // Pure port number
  if (/^\d+$/.test(trimmed)) {
    return `http://localhost:${trimmed}`;
  }

  // localhost:PORT without protocol
  if (/^localhost:\d+/.test(trimmed)) {
    return `http://${trimmed}`;
  }

  // Already has protocol
  if (/^https?:\/\//.test(trimmed)) {
    return trimmed;
  }

  // Fallback: prepend http://
  return `http://${trimmed}`;
}

/** Extract port from a URL string, or null */
function extractPort(url: string): number | null {
  try {
    const parsed = new URL(url);
    if (parsed.port) return parseInt(parsed.port, 10);
    // Default ports
    if (parsed.protocol === 'http:') return 80;
    if (parsed.protocol === 'https:') return 443;
  } catch {
    // invalid URL
  }
  return null;
}

/** Get a short display label for a tab */
function getTabLabel(tab: BrowserTab): string {
  if (tab.port && tab.port !== 80 && tab.port !== 443) {
    return `localhost:${tab.port}`;
  }
  try {
    const parsed = new URL(tab.url);
    return parsed.host;
  } catch {
    return tab.url || 'New Tab';
  }
}

// ─── BrowserTabBar ────────────────────────────────────────────────────

interface BrowserTabBarProps {
  tabs: BrowserTab[];
  activeTabId: string;
  onSelectTab: (tabId: string) => void;
  onCloseTab: (tabId: string) => void;
  onNewTab: () => void;
  canAddTab: boolean;
}

const BrowserTabBar = memo(function BrowserTabBar({
  tabs,
  activeTabId,
  onSelectTab,
  onCloseTab,
  onNewTab,
  canAddTab,
}: BrowserTabBarProps) {
  if (tabs.length === 0) return null;

  return (
    <div className="flex items-center gap-0 bg-muted/30 border-b shrink-0 overflow-x-auto">
      {tabs.map((tab) => {
        const isActive = tab.id === activeTabId;
        return (
          <div
            key={tab.id}
            className={`group flex items-center gap-1.5 px-3 py-1.5 text-xs cursor-pointer border-r border-border min-w-0 max-w-[180px] ${
              isActive
                ? 'bg-background text-foreground border-b-2 border-b-primary'
                : 'text-muted-foreground hover:bg-muted/50 hover:text-foreground'
            }`}
            onClick={() => onSelectTab(tab.id)}
          >
            <Globe className="w-3 h-3 shrink-0" />
            <span className="truncate flex-1">{getTabLabel(tab)}</span>
            <button
              className="shrink-0 rounded-sm p-0.5 opacity-0 group-hover:opacity-100 hover:bg-muted transition-opacity"
              onClick={(e) => {
                e.stopPropagation();
                onCloseTab(tab.id);
              }}
            >
              <X className="w-3 h-3" />
            </button>
          </div>
        );
      })}

      {/* New tab button */}
      {canAddTab && (
        <TooltipProvider delayDuration={300}>
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                className="flex items-center justify-center w-7 h-7 shrink-0 text-muted-foreground hover:text-foreground hover:bg-muted/50 rounded-sm mx-0.5"
                onClick={onNewTab}
              >
                <Plus className="w-3.5 h-3.5" />
              </button>
            </TooltipTrigger>
            <TooltipContent side="bottom" className="text-xs">
              New Tab
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      )}
    </div>
  );
});

// ─── BrowserToolbar ──────────────────────────────────────────────────

interface BrowserToolbarProps {
  url: string;
  onNavigate: (url: string) => void;
  onRefresh: () => void;
  onBack: () => void;
  onForward: () => void;
  onOpenExternal: () => void;
  isLoading: boolean;
}

const BrowserToolbar = memo(function BrowserToolbar({
  url,
  onNavigate,
  onRefresh,
  onBack,
  onForward,
  onOpenExternal,
  isLoading,
}: BrowserToolbarProps) {
  const [inputValue, setInputValue] = useState(url);

  // Sync external URL changes into the input
  useEffect(() => {
    setInputValue(url);
  }, [url]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      const normalized = normalizeUrl(inputValue);
      if (normalized) {
        onNavigate(normalized);
      }
    }
  };

  return (
    <div className="flex items-center gap-1 px-2 py-1.5 border-b bg-card shrink-0">
      <TooltipProvider delayDuration={300}>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onBack}>
              <ArrowLeft className="w-3.5 h-3.5" />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="bottom" className="text-xs">
            Back
          </TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onForward}>
              <ArrowRight className="w-3.5 h-3.5" />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="bottom" className="text-xs">
            Forward
          </TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onRefresh}>
              <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="bottom" className="text-xs">
            Refresh
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>

      {/* URL input */}
      <div className="flex-1 flex items-center gap-1.5 h-7 rounded-md border border-border bg-input px-2 text-sm">
        <Globe className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
        <input
          type="text"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Enter URL or port (e.g. 3000)"
          className="flex-1 bg-transparent outline-none text-foreground placeholder:text-muted-foreground/60 min-w-0"
        />
      </div>

      {/* Open in Browser */}
      <TooltipProvider delayDuration={300}>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={onOpenExternal}
              disabled={!url}
            >
              <ExternalLink className="w-3.5 h-3.5" />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="bottom" className="text-xs">
            Open in Browser
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    </div>
  );
});

// ─── Empty State ─────────────────────────────────────────────────────

interface EmptyStateProps {
  onPortSelect: (port: number) => void;
}

function EmptyState({ onPortSelect }: EmptyStateProps) {
  const [portInput, setPortInput] = useState('');

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      const port = parseInt(portInput, 10);
      if (port > 0 && port <= 65535) {
        onPortSelect(port);
      }
    }
  };

  return (
    <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground p-6 gap-4">
      <Globe className="w-12 h-12 opacity-30" />
      <p className="text-sm font-medium">Enter a URL or port to preview</p>

      {/* Port input */}
      <div className="flex items-center gap-2">
        <input
          type="text"
          value={portInput}
          onChange={(e) => setPortInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Port number"
          className="h-8 w-28 rounded-md border border-border bg-input px-2 text-sm text-foreground outline-none placeholder:text-muted-foreground/60 focus:border-ring focus:ring-ring/50 focus:ring-[3px]"
        />
        <Button
          variant="outline"
          size="sm"
          className="h-8"
          onClick={() => {
            const port = parseInt(portInput, 10);
            if (port > 0 && port <= 65535) {
              onPortSelect(port);
            }
          }}
        >
          Go
        </Button>
      </div>

      {/* Quick port buttons */}
      <div className="flex items-center gap-2">
        {QUICK_PORTS.map((port) => (
          <Button
            key={port}
            variant="outline"
            size="sm"
            className="h-7 text-xs"
            onClick={() => onPortSelect(port)}
          >
            :{port}
          </Button>
        ))}
      </div>
    </div>
  );
}

// ─── Loading Overlay ─────────────────────────────────────────────────

function LoadingOverlay({ url }: { url: string }) {
  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center bg-background/80 z-10">
      <Loader2 className="w-8 h-8 animate-spin text-muted-foreground mb-2" />
      <p className="text-sm text-muted-foreground">Connecting to {url}...</p>
    </div>
  );
}

// ─── Error State ─────────────────────────────────────────────────────

function ErrorState({ url, onRetry }: { url: string; onRetry: () => void }) {
  return (
    <div className="flex-1 flex flex-col items-center justify-center p-6 gap-3">
      <AlertCircle className="w-10 h-10 text-destructive opacity-60" />
      <p className="text-sm font-medium text-foreground">Could not connect</p>
      <p className="text-xs text-muted-foreground text-center max-w-[250px]">
        Failed to load {url}. Make sure the development server is running.
      </p>
      <Button variant="outline" size="sm" onClick={onRetry}>
        <RefreshCw className="w-3.5 h-3.5 mr-1.5" />
        Retry
      </Button>
    </div>
  );
}

// ─── BrowserPanel (Main) ─────────────────────────────────────────────

// Stable fallback references to avoid infinite re-render loops with useShallow.
// Inline `?? []` creates a new array reference each render, which useShallow
// considers "changed", triggering another render → infinite loop.
const EMPTY_TABS: BrowserTab[] = [];

/** Per-tab loading/error state so each iframe is independent */
interface TabFrameState {
  isLoading: boolean;
  hasError: boolean;
}

export const BrowserPanel = memo(function BrowserPanel({ projectPath }: BrowserPanelProps) {
  const iframeRefs = useRef<Map<string, HTMLIFrameElement>>(new Map());
  // Per-tab loading/error state keyed by tab ID
  const [tabStates, setTabStates] = useState<Map<string, TabFrameState>>(new Map());
  // Stable src per tab — only changes on explicit navigation, not on same-origin URL tracking
  const [tabSrcs, setTabSrcs] = useState<Map<string, string>>(new Map());

  // Store bindings — use useShallow for derived arrays to prevent infinite re-renders
  const { tabs, activeTabId } = useAppStore(
    useShallow((s) => ({
      tabs: s.browserTabsByProject[projectPath] || EMPTY_TABS,
      activeTabId: s.activeBrowserTabByProject[projectPath] || '',
    }))
  );
  const addBrowserTab = useAppStore((s) => s.addBrowserTab);
  const removeBrowserTab = useAppStore((s) => s.removeBrowserTab);
  const setActiveBrowserTab = useAppStore((s) => s.setActiveBrowserTab);
  const updateBrowserTab = useAppStore((s) => s.updateBrowserTab);

  const activeTab = useMemo(
    () => tabs.find((t) => t.id === activeTabId) ?? null,
    [tabs, activeTabId]
  );

  const activeState = tabStates.get(activeTabId) ?? { isLoading: false, hasError: false };

  /** Update per-tab state helper */
  const setTabState = useCallback((tabId: string, update: Partial<TabFrameState>) => {
    setTabStates((prev) => {
      const current = prev.get(tabId) ?? { isLoading: false, hasError: false };
      const next = { ...current, ...update };
      const map = new Map(prev);
      map.set(tabId, next);
      return map;
    });
  }, []);

  // Heal legacy/incomplete persisted state: ensure projects with tabs always
  // have a valid active tab ID.
  useEffect(() => {
    if (tabs.length === 0) return;
    if (activeTabId && tabs.some((tab) => tab.id === activeTabId)) return;
    const fallbackTabId = tabs[tabs.length - 1]?.id;
    if (fallbackTabId) {
      setActiveBrowserTab(projectPath, fallbackTabId);
    }
  }, [projectPath, tabs, activeTabId, setActiveBrowserTab]);

  // Clean up stale tab states/srcs when tabs are removed
  useEffect(() => {
    const tabIds = new Set(tabs.map((t) => t.id));
    setTabStates((prev) => {
      let changed = false;
      const next = new Map(prev);
      for (const key of next.keys()) {
        if (!tabIds.has(key)) {
          next.delete(key);
          changed = true;
        }
      }
      return changed ? next : prev;
    });
    setTabSrcs((prev) => {
      let changed = false;
      const next = new Map(prev);
      for (const key of next.keys()) {
        if (!tabIds.has(key)) {
          next.delete(key);
          changed = true;
        }
      }
      return changed ? next : prev;
    });
    // Also clean up stale iframe refs
    const refs = iframeRefs.current;
    for (const key of refs.keys()) {
      if (!tabIds.has(key)) refs.delete(key);
    }
  }, [tabs]);

  // Initialize tabSrcs for tabs that were restored from persistence (e.g. page reload)
  useEffect(() => {
    setTabSrcs((prev) => {
      let changed = false;
      const next = new Map(prev);
      for (const tab of tabs) {
        if (tab.url && !next.has(tab.id)) {
          next.set(tab.id, tab.url);
          changed = true;
        }
      }
      return changed ? next : prev;
    });
  }, [tabs]);

  /** Create a new tab with a given URL and make it active */
  const createTab = useCallback(
    (url: string) => {
      if (tabs.length >= MAX_TABS) return;
      const port = extractPort(url);
      const tab: BrowserTab = {
        id: crypto.randomUUID(),
        url,
        title: url,
        port,
      };
      addBrowserTab(projectPath, tab);
      if (url) {
        setTabSrcs((prev) => new Map(prev).set(tab.id, url));
        setTabState(tab.id, { isLoading: true, hasError: false });
      }
    },
    [projectPath, addBrowserTab, tabs.length, setTabState]
  );

  /** Navigate active tab to a new URL */
  const handleNavigate = useCallback(
    (url: string) => {
      if (!activeTab) {
        createTab(url);
        return;
      }
      updateBrowserTab(projectPath, activeTab.id, {
        url,
        port: extractPort(url),
      });
      setTabSrcs((prev) => new Map(prev).set(activeTab.id, url));
      setTabState(activeTab.id, { isLoading: true, hasError: false });
    },
    [activeTab, projectPath, createTab, updateBrowserTab, setTabState]
  );

  /** Handle selecting a quick port (from EmptyState or new tab) */
  const handlePortSelect = useCallback(
    (port: number) => {
      const url = `http://localhost:${port}`;
      // If active tab has no URL (empty/new tab), navigate it instead of creating a new one
      if (activeTab && !activeTab.url) {
        updateBrowserTab(projectPath, activeTab.id, {
          url,
          port,
        });
        setTabSrcs((prev) => new Map(prev).set(activeTab.id, url));
        setTabState(activeTab.id, { isLoading: true, hasError: false });
      } else {
        createTab(url);
      }
    },
    [activeTab, projectPath, createTab, updateBrowserTab, setTabState]
  );

  /** Switch to a different tab — just change the active ID, no reload */
  const handleSelectTab = useCallback(
    (tabId: string) => {
      setActiveBrowserTab(projectPath, tabId);
    },
    [projectPath, setActiveBrowserTab]
  );

  /** Close a tab */
  const handleCloseTab = useCallback(
    (tabId: string) => {
      removeBrowserTab(projectPath, tabId);
    },
    [projectPath, removeBrowserTab]
  );

  /** Open a new empty tab (shows EmptyState) */
  const handleNewTab = useCallback(() => {
    if (tabs.length >= MAX_TABS) return;
    const tab: BrowserTab = {
      id: crypto.randomUUID(),
      url: '',
      title: 'New Tab',
      port: null,
    };
    addBrowserTab(projectPath, tab);
  }, [projectPath, addBrowserTab, tabs.length]);

  /** Refresh iframe with debounce (min 500ms between reloads) */
  const lastRefreshRef = useRef(0);
  const handleRefresh = useCallback(() => {
    const iframe = activeTabId ? iframeRefs.current.get(activeTabId) : null;
    if (iframe && activeTab?.url) {
      const now = Date.now();
      if (now - lastRefreshRef.current < 500) return;
      lastRefreshRef.current = now;
      setTabState(activeTabId, { isLoading: true, hasError: false });
      // Force reload by resetting src
      const src = iframe.src;
      iframe.src = '';
      iframe.src = src;
    }
  }, [activeTab?.url, activeTabId, setTabState]);

  /** Back/Forward: best-effort for same-origin iframes */
  const handleBack = useCallback(() => {
    try {
      const iframe = activeTabId ? iframeRefs.current.get(activeTabId) : null;
      iframe?.contentWindow?.history.back();
    } catch {
      // cross-origin, ignore
    }
  }, [activeTabId]);

  const handleForward = useCallback(() => {
    try {
      const iframe = activeTabId ? iframeRefs.current.get(activeTabId) : null;
      iframe?.contentWindow?.history.forward();
    } catch {
      // cross-origin, ignore
    }
  }, [activeTabId]);

  /** Open current URL in system browser */
  const handleOpenExternal = useCallback(() => {
    const url = activeTab?.url;
    if (!url) return;
    const api = getElectronAPI();
    api.openExternalLink(url);
  }, [activeTab?.url]);

  /** Create per-tab iframe load handler */
  const handleIframeLoad = useCallback(
    (tabId: string) => {
      setTabState(tabId, { isLoading: false, hasError: false });

      const iframe = iframeRefs.current.get(tabId);
      const tab = tabs.find((t) => t.id === tabId);
      if (iframe && tab) {
        try {
          const currentHref = iframe.contentWindow?.location.href;
          if (currentHref && currentHref !== 'about:blank' && currentHref !== tab.url) {
            updateBrowserTab(projectPath, tabId, {
              url: currentHref,
              port: extractPort(currentHref),
            });
          }
        } catch {
          // cross-origin — cannot read location
        }
      }
    },
    [tabs, projectPath, updateBrowserTab, setTabState]
  );

  /** Create per-tab iframe error handler */
  const handleIframeError = useCallback(
    (tabId: string) => {
      setTabState(tabId, { isLoading: false, hasError: true });
    },
    [setTabState]
  );

  // Timeout: if active tab iframe takes >10s, show error
  useEffect(() => {
    if (!activeState.isLoading || !activeTabId) return;
    const timer = setTimeout(() => {
      setTabState(activeTabId, { isLoading: false, hasError: true });
    }, 10000);
    return () => clearTimeout(timer);
  }, [activeState.isLoading, activeTabId, setTabState]);

  const activeTabHasUrl = !!activeTab?.url;

  return (
    <div className="h-full flex flex-col overflow-hidden">
      {/* Tab bar - visible when there are tabs */}
      <BrowserTabBar
        tabs={tabs}
        activeTabId={activeTabId}
        onSelectTab={handleSelectTab}
        onCloseTab={handleCloseTab}
        onNewTab={handleNewTab}
        canAddTab={tabs.length < MAX_TABS}
      />

      {/* Toolbar - always visible */}
      <BrowserToolbar
        url={activeTab?.url ?? ''}
        onNavigate={handleNavigate}
        onRefresh={handleRefresh}
        onBack={handleBack}
        onForward={handleForward}
        onOpenExternal={handleOpenExternal}
        isLoading={activeState.isLoading}
      />

      {/* Content area — one iframe per tab, only active one is visible */}
      <div className="flex-1 relative overflow-hidden">
        {/* Show empty state or error for the active tab */}
        {!activeTabHasUrl ? (
          <EmptyState onPortSelect={handlePortSelect} />
        ) : activeState.hasError ? (
          <ErrorState url={activeTab?.url ?? ''} onRetry={handleRefresh} />
        ) : (
          activeState.isLoading && <LoadingOverlay url={activeTab?.url ?? ''} />
        )}

        {/* Render all tab iframes — hidden tabs stay alive in the DOM */}
        {tabs.map((tab) => {
          const src = tabSrcs.get(tab.id);
          if (!src) return null;
          const isActive = tab.id === activeTabId;
          const tabState = tabStates.get(tab.id);
          // Hide iframe when tab has error (show error state instead) or is not active
          const isVisible = isActive && !tabState?.hasError;
          return (
            <iframe
              key={tab.id}
              ref={(el) => {
                if (el) iframeRefs.current.set(tab.id, el);
                else iframeRefs.current.delete(tab.id);
              }}
              src={src}
              className="w-full h-full border-0 absolute inset-0"
              style={{ visibility: isVisible ? 'visible' : 'hidden' }}
              sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-modals allow-storage-access-by-user-activation"
              onLoad={() => handleIframeLoad(tab.id)}
              onError={() => handleIframeError(tab.id)}
              title={tab.title || 'Browser Preview'}
            />
          );
        })}
      </div>
    </div>
  );
});
