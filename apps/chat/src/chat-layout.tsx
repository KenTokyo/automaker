import { useState, useEffect, useCallback, useRef } from 'react';
import { useAppStore } from '@/store/app-store';
import { AgentView } from '@/components/views/agent-view';
import { ChatNoProjectState } from './components/chat-no-project-state';
import { SettingsPanel } from './components/settings-panel';
import { Button } from '@/components/ui/button';
import { Settings2 } from 'lucide-react';

interface ChatLayoutProps {
  autoOpenSettings?: boolean;
}

export function ChatLayout({ autoOpenSettings }: ChatLayoutProps) {
  const currentProject = useAppStore((s) => s.currentProject);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const autoOpenDone = useRef(false);

  // Auto-open settings panel when setup incomplete (no API key)
  useEffect(() => {
    if (autoOpenSettings && !autoOpenDone.current) {
      autoOpenDone.current = true;
      setSettingsOpen(true);
    }
  }, [autoOpenSettings]);

  // Ctrl/Cmd+, shortcut to toggle settings
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === ',') {
        e.preventDefault();
        setSettingsOpen((prev) => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const openSettings = useCallback(() => setSettingsOpen(true), []);

  // Determine which view to show to settings when auto-opening
  const initialSettingsView = autoOpenSettings ? ('api-keys' as const) : undefined;

  return (
    <>
      {/* Floating settings button */}
      <Button
        variant="ghost"
        size="sm"
        onClick={openSettings}
        className="fixed top-2.5 right-14 z-40 h-8 w-8 p-0 text-muted-foreground hover:text-foreground"
        aria-label="Open settings (Ctrl+,)"
        title="Settings (Ctrl+,)"
      >
        <Settings2 className="w-4 h-4" />
      </Button>

      {currentProject ? <AgentView /> : <ChatNoProjectState />}

      <SettingsPanel
        open={settingsOpen}
        onOpenChange={setSettingsOpen}
        initialView={initialSettingsView}
      />
    </>
  );
}
