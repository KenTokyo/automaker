import { useMemo, useState, useEffect } from 'react';
import type { NavigateOptions } from '@tanstack/react-router';
import {
  BarChart3,
  FileText,
  LayoutGrid,
  Bot,
  BookOpen,
  Terminal,
  CircleDot,
  GitPullRequest,
  Lightbulb,
  Brain,
  Network,
  Bell,
  Settings,
  Home,
  ShieldCheck,
} from 'lucide-react';
import type { NavSection, NavItem } from '../types';
import type { KeyboardShortcut } from '@/hooks/use-keyboard-shortcuts';
import type { Project } from '@/lib/electron';
import { getElectronAPI } from '@/lib/electron';

interface UseNavigationProps {
  shortcuts: {
    toggleSidebar: string;
    openProject: string;
    projectPicker: string;
    cyclePrevProject: string;
    cycleNextProject: string;
    spec: string;
    context: string;
    memory: string;
    board: string;
    graph: string;
    agent: string;
    projectOverview: string;
    terminal: string;
    settings: string;
    projectSettings: string;
    ideation: string;
    githubIssues: string;
    githubPrs: string;
    notifications: string;
  };
  hideSpecEditor: boolean;
  hideBoard: boolean;
  hideGraph: boolean;
  hideContext: boolean;
  hideTerminal: boolean;
  currentProject: Project | null;
  projects: Project[];
  projectHistory: string[];
  navigate: (opts: NavigateOptions) => void;
  toggleSidebar: () => void;
  handleOpenFolder: () => void;
  cyclePrevProject: () => void;
  cycleNextProject: () => void;
  /** Count of unviewed validations to show on GitHub Issues nav item */
  unviewedValidationsCount?: number;
  /** Count of unread notifications to show on Notifications nav item */
  unreadNotificationsCount?: number;
  /** Whether spec generation is currently running for the current project */
  isSpecGenerating?: boolean;
}

export interface HiddenNavItem {
  id: string;
  label: string;
  reason: string;
  target?: string;
}

export function useNavigation({
  shortcuts,
  hideSpecEditor,
  hideBoard,
  hideGraph,
  hideContext,
  hideTerminal,
  currentProject,
  projects,
  projectHistory,
  navigate,
  toggleSidebar,
  handleOpenFolder,
  cyclePrevProject,
  cycleNextProject,
  unviewedValidationsCount,
  unreadNotificationsCount,
  isSpecGenerating,
}: UseNavigationProps) {
  // Track if current project has a GitHub remote
  const [hasGitHubRemote, setHasGitHubRemote] = useState(false);

  useEffect(() => {
    async function checkGitHubRemote() {
      if (!currentProject?.path) {
        setHasGitHubRemote(false);
        return;
      }

      try {
        const api = getElectronAPI();
        if (api.github) {
          const result = await api.github.checkRemote(currentProject.path);
          setHasGitHubRemote(result.success && result.hasGitHubRemote === true);
        }
      } catch {
        setHasGitHubRemote(false);
      }
    }

    checkGitHubRemote();
  }, [currentProject?.path]);

  // Build navigation sections
  const navSections: NavSection[] = useMemo(() => {
    const allToolsItems: NavItem[] = [
      {
        id: 'ideation',
        label: 'Ideation',
        icon: Lightbulb,
        shortcut: shortcuts.ideation,
      },
      {
        id: 'spec',
        label: 'Spec Editor',
        icon: FileText,
        shortcut: shortcuts.spec,
        isLoading: isSpecGenerating,
      },
      {
        id: 'context',
        label: 'Context',
        icon: BookOpen,
        shortcut: shortcuts.context,
      },
      {
        id: 'memory',
        label: 'Memory',
        icon: Brain,
        shortcut: shortcuts.memory,
      },
    ];

    // Filter out hidden items
    const visibleToolsItems = allToolsItems.filter((item) => {
      if (item.id === 'spec' && hideSpecEditor) {
        return false;
      }
      if (item.id === 'context' && hideContext) {
        return false;
      }
      return true;
    });

    const allProjectItems: NavItem[] = [
      {
        id: 'project-overview',
        label: 'Übersicht',
        icon: BarChart3,
        shortcut: shortcuts.projectOverview,
      },
      {
        id: 'board',
        label: 'Kanban Board',
        icon: LayoutGrid,
        shortcut: shortcuts.board,
      },
      {
        id: 'graph',
        label: 'Graph View',
        icon: Network,
        shortcut: shortcuts.graph,
      },
      {
        id: 'agent',
        label: 'Agent Runner',
        icon: Bot,
        shortcut: shortcuts.agent,
      },
      {
        id: 'team-rights',
        label: 'Team & Rechte',
        icon: ShieldCheck,
      },
    ];

    const projectItems = allProjectItems.filter((item) => {
      if (item.id === 'board' && hideBoard) {
        return false;
      }
      if (item.id === 'graph' && hideGraph) {
        return false;
      }
      return true;
    });

    // Add Terminal to Project section if not hidden
    if (!hideTerminal) {
      projectItems.push({
        id: 'terminal',
        label: 'Terminal',
        icon: Terminal,
        shortcut: shortcuts.terminal,
      });
    }

    const sections: NavSection[] = [
      // Dashboard - standalone at top (links to projects overview)
      {
        label: '',
        items: [
          {
            id: 'overview',
            label: 'Dashboard',
            icon: Home,
          },
        ],
      },
      // Project section - expanded by default
      {
        label: 'Project',
        items: projectItems,
        collapsible: true,
        defaultCollapsed: false,
      },
      // Tools section - collapsed by default
      {
        label: 'Tools',
        items: visibleToolsItems,
        collapsible: true,
        defaultCollapsed: true,
      },
    ];

    // Add GitHub section if project has a GitHub remote
    if (hasGitHubRemote) {
      sections.push({
        label: 'GitHub',
        items: [
          {
            id: 'github-issues',
            label: 'Issues',
            icon: CircleDot,
            shortcut: shortcuts.githubIssues,
            count: unviewedValidationsCount,
          },
          {
            id: 'github-prs',
            label: 'Pull Requests',
            icon: GitPullRequest,
            shortcut: shortcuts.githubPrs,
          },
        ],
        collapsible: true,
        defaultCollapsed: true,
      });
    }

    // Add Notifications and Project Settings as a standalone section (no label for visual separation)
    sections.push({
      label: '',
      items: [
        {
          id: 'notifications',
          label: 'Notifications',
          icon: Bell,
          shortcut: shortcuts.notifications,
          count: unreadNotificationsCount,
        },
        {
          id: 'project-settings',
          label: 'Project Settings',
          icon: Settings,
          shortcut: shortcuts.projectSettings,
        },
      ],
    });

    return sections;
  }, [
    shortcuts,
    hideSpecEditor,
    hideBoard,
    hideGraph,
    hideContext,
    hideTerminal,
    hasGitHubRemote,
    unviewedValidationsCount,
    unreadNotificationsCount,
    isSpecGenerating,
  ]);

  const hiddenNavItems: HiddenNavItem[] = useMemo(() => {
    const items: HiddenNavItem[] = [];

    if (hideBoard) {
      items.push({
        id: 'board',
        label: 'Kanban Board',
        reason: 'Veraltet. Nutze das neue Public-Kanban.',
        target: 'https://automaker-kanban.vercel.app/',
      });
    }

    if (hideGraph) {
      items.push({
        id: 'graph',
        label: 'Graph View',
        reason: 'Derzeit nicht genutzt, deshalb ausgeblendet.',
      });
    }

    if (hideSpecEditor) {
      items.push({
        id: 'spec',
        label: 'Spec Editor',
        reason: 'Aktuell entfernt, um die Oberfläche schlanker zu halten.',
      });
    }

    return items;
  }, [hideBoard, hideGraph, hideSpecEditor]);

  // Build keyboard shortcuts for navigation
  const navigationShortcuts: KeyboardShortcut[] = useMemo(() => {
    const shortcutsList: KeyboardShortcut[] = [];

    // Sidebar toggle shortcut - always available
    shortcutsList.push({
      key: shortcuts.toggleSidebar,
      action: () => toggleSidebar(),
      description: 'Toggle sidebar',
    });

    // Open project shortcut - opens the folder selection dialog directly
    shortcutsList.push({
      key: shortcuts.openProject,
      action: () => handleOpenFolder(),
      description: 'Open folder selection dialog',
    });

    // Project cycling shortcuts - only when we have project history
    if (projectHistory.length > 1) {
      shortcutsList.push({
        key: shortcuts.cyclePrevProject,
        action: () => cyclePrevProject(),
        description: 'Cycle to previous project (MRU)',
      });
      shortcutsList.push({
        key: shortcuts.cycleNextProject,
        action: () => cycleNextProject(),
        description: 'Cycle to next project (LRU)',
      });
    }

    // Only enable nav shortcuts if there's a current project
    if (currentProject) {
      navSections.forEach((section) => {
        section.items.forEach((item) => {
          if (item.shortcut) {
            shortcutsList.push({
              key: item.shortcut,
              // Cast to router path type; ids are constrained to known routes
              action: () => navigate({ to: `/${item.id}` as unknown as '/' }),
              description: `Navigate to ${item.label}`,
            });
          }
        });
      });

      // Add global settings shortcut
      shortcutsList.push({
        key: shortcuts.settings,
        action: () => navigate({ to: '/settings' }),
        description: 'Navigate to Global Settings',
      });
    }

    return shortcutsList;
  }, [
    shortcuts,
    currentProject,
    navigate,
    toggleSidebar,
    projects.length,
    handleOpenFolder,
    projectHistory.length,
    cyclePrevProject,
    cycleNextProject,
    navSections,
  ]);

  return {
    navSections,
    navigationShortcuts,
    hiddenNavItems,
  };
}
