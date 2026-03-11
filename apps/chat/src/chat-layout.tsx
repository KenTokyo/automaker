import { useState, useEffect, useCallback, useRef } from 'react';
import { useAppStore } from '@/store/app-store';
import { ChatNoProjectState } from './components/chat-no-project-state';
import { ChatView } from './components/chat-view';
import { SettingsPanel } from './components/settings-panel';

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
      {currentProject ? <ChatView onOpenSettings={openSettings} /> : <ChatNoProjectState />}

      <SettingsPanel
        open={settingsOpen}
        onOpenChange={setSettingsOpen}
        initialView={initialSettingsView}
      />
    </>
  );
}
