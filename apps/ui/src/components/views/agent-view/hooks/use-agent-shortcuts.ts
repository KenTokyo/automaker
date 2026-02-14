import { useMemo } from 'react';
import {
  useKeyboardShortcuts,
  useKeyboardShortcutsConfig,
  type KeyboardShortcut,
} from '@/hooks/use-keyboard-shortcuts';
import { useAppStore } from '@/store/app-store';

interface UseAgentShortcutsOptions {
  currentProject: { path: string; name: string } | null;
  quickCreateSessionRef: React.MutableRefObject<(() => Promise<void>) | null>;
}

export function useAgentShortcuts({
  currentProject,
  quickCreateSessionRef,
}: UseAgentShortcutsOptions): void {
  const shortcuts = useKeyboardShortcutsConfig();
  const docsOpen = useAppStore((s) => s.docsOpen);
  const setDocsOpen = useAppStore((s) => s.setDocsOpen);
  const toggleBrowserPanel = useAppStore((s) => s.toggleBrowserPanel);

  // Keyboard shortcuts for agent view
  const agentShortcuts: KeyboardShortcut[] = useMemo(() => {
    const shortcutsList: KeyboardShortcut[] = [];

    // New session shortcut - only when in agent view with a project
    if (currentProject) {
      shortcutsList.push({
        key: shortcuts.newSession,
        action: () => {
          if (quickCreateSessionRef.current) {
            quickCreateSessionRef.current();
          }
        },
        description: 'Create new session',
      });

      // Toggle docs panel
      shortcutsList.push({
        key: 'ctrl+shift+d',
        action: () => {
          setDocsOpen(!docsOpen);
        },
        description: 'Toggle docs panel',
      });

      // Toggle browser panel
      shortcutsList.push({
        key: 'ctrl+shift+b',
        action: () => {
          toggleBrowserPanel();
        },
        description: 'Toggle browser panel',
      });
    }

    return shortcutsList;
  }, [currentProject, shortcuts, quickCreateSessionRef, docsOpen, setDocsOpen, toggleBrowserPanel]);

  // Register keyboard shortcuts
  useKeyboardShortcuts(agentShortcuts);
}
