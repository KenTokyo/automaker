// Browser Panel Tab
export interface BrowserTab {
  id: string; // Unique tab ID (uuid)
  url: string; // Current URL (e.g. "http://localhost:3000")
  title: string; // Tab title (from page or manual)
  port: number | null; // Configured port (e.g. 3000)
}

// Recently opened document (with usage tracking & favorites)
export interface RecentDoc {
  path: string;
  name: string;
  absolutePath: string;
  /** ISO timestamp of when this doc was last accessed */
  lastAccessedAt: string;
  /** How often this doc was referenced / copied */
  accessCount: number;
  /** Whether the user has pinned this doc as a favorite */
  isFavorite: boolean;
  /** Source of the entry: 'docs' = opened in docs viewer, 'clipboard' = copied path from tree */
  source: 'docs' | 'clipboard';
}

export type ViewMode =
  | 'welcome'
  | 'setup'
  | 'spec'
  | 'board'
  | 'agent'
  | 'settings'
  | 'interview'
  | 'context'
  | 'running-agents'
  | 'terminal'
  | 'wiki'
  | 'ideation';

export type ThemeMode =
  // Special modes
  | 'system'
  // Dark themes
  | 'dark'
  | 'retro'
  | 'dracula'
  | 'nord'
  | 'monokai'
  | 'tokyonight'
  | 'solarized'
  | 'gruvbox'
  | 'catppuccin'
  | 'onedark'
  | 'synthwave'
  | 'red'
  | 'sunset'
  | 'gray'
  | 'forest'
  | 'ocean'
  | 'ember'
  | 'ayu-dark'
  | 'ayu-mirage'
  | 'matcha'
  // Light themes
  | 'light'
  | 'cream'
  | 'solarizedlight'
  | 'github'
  | 'paper'
  | 'rose'
  | 'mint'
  | 'lavender'
  | 'sand'
  | 'sky'
  | 'peach'
  | 'snow'
  | 'sepia'
  | 'gruvboxlight'
  | 'nordlight'
  | 'blossom'
  | 'ayu-light'
  | 'onelight'
  | 'bluloco'
  | 'feather';

export type BoardViewMode = 'kanban' | 'graph';

/** Which content the right panel shows in Agent View */
export type RightPanelMode = 'files' | 'terminal' | 'dashboard' | 'git';

/** Font size limits for right-panel content areas */
export const RIGHT_PANEL_FONT_SIZE_MIN = 10;
export const RIGHT_PANEL_FONT_SIZE_MAX = 20;
export const RIGHT_PANEL_FONT_SIZE_DEFAULT = 13;

/** Default split size (primary panel percentage) */
export const RIGHT_PANEL_SPLIT_SIZE_DEFAULT = 50;

/** Which content the left panel shows in Agent View */
export type LeftPanelTab = 'sessions' | 'overview' | 'completed' | 'tasks';

// Keyboard Shortcut with optional modifiers
export interface ShortcutKey {
  key: string; // The main key (e.g., "K", "N", "1")
  shift?: boolean; // Shift key modifier
  cmdCtrl?: boolean; // Cmd on Mac, Ctrl on Windows/Linux
  alt?: boolean; // Alt/Option key modifier
}

// Chat display settings
export interface ChatDisplaySettings {
  fontSize: number; // 10-20px
  fontWeight: number; // 300-600
  fontOpacity: number; // 0.5-1.0
  lineHeight: number; // 1.2-2.0
  codeBlockRelativeSize: number; // offset in px relative to fontSize
  fontColorGray: number; // 400-900 gray shade (400=lighter, 900=darker)
  headingScale: number; // 0.7-1.3 scale factor for heading sizes (1.0 = default)
}

export type ChatDisplayPresetName = 'standard' | 'gedaempft' | 'kraeftig' | 'kompakt' | 'gross';

export interface ChatDisplayPreset {
  name: ChatDisplayPresetName;
  label: string;
  settings: ChatDisplaySettings;
}

export const DEFAULT_CHAT_DISPLAY_SETTINGS: ChatDisplaySettings = {
  fontSize: 14,
  fontWeight: 400,
  fontOpacity: 1.0,
  lineHeight: 1.5,
  codeBlockRelativeSize: 0,
  fontColorGray: 900,
  headingScale: 1.0,
};

export const CHAT_DISPLAY_PRESETS: ChatDisplayPreset[] = [
  {
    name: 'standard',
    label: 'Standard',
    settings: {
      fontSize: 14,
      fontWeight: 400,
      fontOpacity: 1.0,
      lineHeight: 1.5,
      codeBlockRelativeSize: 0,
      fontColorGray: 900,
      headingScale: 1.0,
    },
  },
  {
    name: 'gedaempft',
    label: 'Gedämpft',
    settings: {
      fontSize: 13,
      fontWeight: 400,
      fontOpacity: 0.8,
      lineHeight: 1.5,
      codeBlockRelativeSize: 0,
      fontColorGray: 600,
      headingScale: 0.9,
    },
  },
  {
    name: 'kraeftig',
    label: 'Kräftig',
    settings: {
      fontSize: 14,
      fontWeight: 500,
      fontOpacity: 1.0,
      lineHeight: 1.45,
      codeBlockRelativeSize: 0,
      fontColorGray: 900,
      headingScale: 1.0,
    },
  },
  {
    name: 'kompakt',
    label: 'Kompakt',
    settings: {
      fontSize: 12,
      fontWeight: 400,
      fontOpacity: 0.9,
      lineHeight: 1.35,
      codeBlockRelativeSize: 0,
      fontColorGray: 800,
      headingScale: 0.85,
    },
  },
  {
    name: 'gross',
    label: 'Groß & Lesbar',
    settings: {
      fontSize: 16,
      fontWeight: 400,
      fontOpacity: 1.0,
      lineHeight: 1.65,
      codeBlockRelativeSize: 0,
      fontColorGray: 900,
      headingScale: 1.1,
    },
  },
];

// Board background settings
export interface BackgroundSettings {
  imagePath: string | null;
  imageVersion?: number;
  cardOpacity: number;
  columnOpacity: number;
  columnBorderEnabled: boolean;
  cardGlassmorphism: boolean;
  cardBorderEnabled: boolean;
  cardBorderOpacity: number;
  hideScrollbar: boolean;
}

// Keyboard Shortcuts - stored as strings like "K", "Shift+N", "Cmd+K"
export interface KeyboardShortcuts {
  // Navigation shortcuts
  board: string;
  graph: string;
  agent: string;
  projectOverview: string;
  spec: string;
  context: string;
  memory: string;
  settings: string;
  projectSettings: string;
  terminal: string;
  ideation: string;
  notifications: string;
  githubIssues: string;
  githubPrs: string;

  // UI shortcuts
  toggleSidebar: string;

  // Action shortcuts
  addFeature: string;
  addContextFile: string;
  startNext: string;
  newSession: string;
  openProject: string;
  projectPicker: string;
  cyclePrevProject: string;
  cycleNextProject: string;

  // Terminal shortcuts
  splitTerminalRight: string;
  splitTerminalDown: string;
  closeTerminal: string;
  newTerminalTab: string;
}
