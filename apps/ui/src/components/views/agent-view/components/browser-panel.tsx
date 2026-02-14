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

export const BrowserPanel = memo(function BrowserPanel({ projectPath }: BrowserPanelProps) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [hasError, setHasError] = useState(false);
  // The URL currently loaded in the iframe — separate from store URL to avoid re-render loops.
  // Store URL changes (e.g. from same-origin tracking) must NOT cause iframe src reset.
  const [iframeSrc, setIframeSrc] = useState('');

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
      setIframeSrc(url);
      setIsLoading(true);
      setHasError(false);
    },
    [projectPath, addBrowserTab, tabs.length]
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
      setIframeSrc(url);
      setIsLoading(true);
      setHasError(false);
    },
    [activeTab, projectPath, createTab, updateBrowserTab]
  );

  /** Handle selecting a quick port (from EmptyState or new tab) */
  const handlePortSelect = useCallback(
    (port: number) => {
      const url = `http://localhost:${port}`;
      createTab(url);
    },
    [createTab]
  );

  /** Switch to a different tab */
  const handleSelectTab = useCallback(
    (tabId: string) => {
      setActiveBrowserTab(projectPath, tabId);
      const switchedTab = tabs.find((t) => t.id === tabId);
      setIframeSrc(switchedTab?.url ?? '');
      setIsLoading(false);
      setHasError(false);
    },
    [projectPath, setActiveBrowserTab, tabs]
  );

  /** Close a tab */
  const handleCloseTab = useCallback(
    (tabId: string) => {
      removeBrowserTab(projectPath, tabId);
      setHasError(false);
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
    setIsLoading(false);
    setHasError(false);
  }, [projectPath, addBrowserTab, tabs.length]);

  /** Refresh iframe with debounce (min 500ms between reloads) */
  const lastRefreshRef = useRef(0);
  const handleRefresh = useCallback(() => {
    if (iframeRef.current && activeTab) {
      const now = Date.now();
      if (now - lastRefreshRef.current < 500) return;
      lastRefreshRef.current = now;
      setIsLoading(true);
      setHasError(false);
      // Force reload by resetting src
      const src = iframeRef.current.src;
      iframeRef.current.src = '';
      iframeRef.current.src = src;
    }
  }, [activeTab]);

  /** Back/Forward: best-effort for same-origin iframes */
  const handleBack = useCallback(() => {
    try {
      iframeRef.current?.contentWindow?.history.back();
    } catch {
      // cross-origin, ignore
    }
  }, []);

  const handleForward = useCallback(() => {
    try {
      iframeRef.current?.contentWindow?.history.forward();
    } catch {
      // cross-origin, ignore
    }
  }, []);

  /** Open current URL in system browser */
  const handleOpenExternal = useCallback(() => {
    const url = activeTab?.url;
    if (!url) return;
    const api = getElectronAPI();
    api.openExternalLink(url);
  }, [activeTab?.url]);

  /** iframe load handler — also tracks URL for same-origin iframes */
  const handleIframeLoad = useCallback(() => {
    setIsLoading(false);
    setHasError(false);

    // Try to read the current URL from the iframe (same-origin only)
    if (iframeRef.current && activeTab) {
      try {
        const currentHref = iframeRef.current.contentWindow?.location.href;
        if (currentHref && currentHref !== 'about:blank' && currentHref !== activeTab.url) {
          updateBrowserTab(projectPath, activeTab.id, {
            url: currentHref,
            port: extractPort(currentHref),
          });
        }
      } catch {
        // cross-origin — cannot read location, keep existing URL
      }
    }
  }, [activeTab, projectPath, updateBrowserTab]);

  /** iframe error handler */
  const handleIframeError = useCallback(() => {
    setIsLoading(false);
    setHasError(true);
  }, []);

  // Sync iframeSrc when the active tab changes (mount, tab switch from outside)
  // Only update if iframeSrc doesn't already match the active tab's URL
  const activeTabUrl = activeTab?.url ?? '';
  useEffect(() => {
    if (activeTabUrl && !iframeSrc) {
      setIframeSrc(activeTabUrl);
    }
  }, [activeTabId]); // eslint-disable-line react-hooks/exhaustive-deps

  // Timeout: if iframe takes >10s, show error
  useEffect(() => {
    if (!isLoading) return;
    const timer = setTimeout(() => {
      setIsLoading(false);
      setHasError(true);
    }, 10000);
    return () => clearTimeout(timer);
  }, [isLoading, activeTab?.url]);

  const hasUrl = !!iframeSrc;

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
        isLoading={isLoading}
      />

      {/* Content area */}
      <div className="flex-1 relative overflow-hidden">
        {!hasUrl ? (
          <EmptyState onPortSelect={handlePortSelect} />
        ) : hasError ? (
          <ErrorState url={iframeSrc} onRetry={handleRefresh} />
        ) : (
          <>
            {isLoading && <LoadingOverlay url={iframeSrc} />}
            <iframe
              ref={iframeRef}
              src={iframeSrc}
              className="w-full h-full border-0"
              sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-modals"
              onLoad={handleIframeLoad}
              onError={handleIframeError}
              title={activeTab?.title || 'Browser Preview'}
            />
          </>
        )}
      </div>
    </div>
  );
});
