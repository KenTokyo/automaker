import { useMemo } from 'react';
import {
  useKeyboardShortcuts,
  useKeyboardShortcutsConfig,
  type KeyboardShortcut,
} from '@/hooks/use-keyboard-shortcuts';
import { useAppStore } from '@/store/app-store';
import { useExplorerStore } from '@/store/explorer-store';
import type { RightPanelMode } from '@/store/types/ui-types';
import type { QuickCreateSessionArgs } from '@/components/session-manager';

interface UseAgentShortcutsOptions {
  currentProject: { path: string; name: string } | null;
  quickCreateSessionRef: React.MutableRefObject<
    ((options?: QuickCreateSessionArgs) => Promise<boolean>) | null
  >;
}

export function useAgentShortcuts({
  currentProject,
  quickCreateSessionRef,
}: UseAgentShortcutsOptions): void {
  const shortcuts = useKeyboardShortcutsConfig();
  const leftPanelTab = useAppStore((s) => s.leftPanelTab);
  const setLeftPanelTab = useAppStore((s) => s.setLeftPanelTab);
  const toggleBrowserPanel = useAppStore((s) => s.toggleBrowserPanel);
  const rightPanelMode = useAppStore((s) => s.rightPanelMode);
  const setRightPanelMode = useAppStore((s) => s.setRightPanelMode);

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

      // Toggle docs panel (cycles sessions -> docs -> sessions)
      shortcutsList.push({
        key: 'ctrl+shift+d',
        action: () => {
          setLeftPanelTab(leftPanelTab === 'docs' ? 'sessions' : 'docs');
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

      // Switch right panel to terminal tab
      shortcutsList.push({
        key: 'ctrl+shift+t',
        action: () => {
          setRightPanelMode(
            rightPanelMode === 'terminal' ? 'files' : ('terminal' as RightPanelMode)
          );
        },
        description: 'Switch to terminal tab',
      });

      // Switch right panel to files tab
      shortcutsList.push({
        key: 'ctrl+shift+f',
        action: () => {
          setRightPanelMode('files' as RightPanelMode);
        },
        description: 'Switch to files tab',
      });

      // Toggle embedded terminal in files panel
      shortcutsList.push({
        key: 'ctrl+shift+e',
        action: () => {
          const projectPath = currentProject.path;
          const store = useExplorerStore.getState();
          const isOpen = store.terminalOpenByProject[projectPath] ?? false;
          store.setTerminalOpen(projectPath, !isOpen);
          // Also switch to files tab if not already there
          if (!isOpen) {
            setRightPanelMode('files' as RightPanelMode);
          }
        },
        description: 'Toggle embedded terminal in files panel',
      });
    }

    return shortcutsList;
  }, [
    currentProject,
    shortcuts,
    quickCreateSessionRef,
    leftPanelTab,
    setLeftPanelTab,
    toggleBrowserPanel,
    rightPanelMode,
    setRightPanelMode,
  ]);

  // Register keyboard shortcuts
  useKeyboardShortcuts(agentShortcuts);
}
