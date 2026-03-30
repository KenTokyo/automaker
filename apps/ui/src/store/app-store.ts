import { create } from 'zustand';
// Note: persist middleware removed - settings now sync via API (use-settings-sync.ts)
import type { Project, TrashedProject } from '@/lib/electron';
import { saveProjects, saveTrashedProjects } from '@/lib/electron';
import { getHttpApiClient } from '@/lib/http-api-client';
import { createLogger } from '@automaker/utils/logger';
import { setItem, getItem, getJSON, setJSON, removeItem } from '@/lib/storage';
// Note: setItem/getItem also available in ./utils/theme-utils.ts
import {
  UI_SANS_FONT_OPTIONS,
  UI_MONO_FONT_OPTIONS,
  DEFAULT_FONT_VALUE,
} from '@/config/ui-font-options';
import type {
  Feature as BaseFeature,
  FeatureImagePath,
  FeatureTextFilePath,
  ModelAlias,
  PlanningMode,
  ThinkingLevel,
  ReasoningEffort,
  ModelProvider,
  CursorModelId,
  CodexModelId,
  OpencodeModelId,
  GeminiModelId,
  CopilotModelId,
  PhaseModelConfig,
  PhaseModelKey,
  PhaseModelEntry,
  MCPServerConfig,
  FeatureStatusWithPipeline,
  PipelineConfig,
  PipelineStep,
  PromptCustomization,
  ModelDefinition,
  ServerLogLevel,
  EventHook,
  ClaudeApiProfile,
  ClaudeCompatibleProvider,
  EditorThemeSettings,
  HeadingStyle,
  TableThemeStyles,
  SidebarStyle,
  ParsedTask,
  PlanSpec,
} from '@automaker/types';
import {
  getAllCursorModelIds,
  getAllCodexModelIds,
  getAllOpencodeModelIds,
  getAllGeminiModelIds,
  getAllCopilotModelIds,
  migratePhaseModelEntry,
  DEFAULT_PHASE_MODELS,
  DEFAULT_OPENCODE_MODEL,
  DEFAULT_GEMINI_MODEL,
  DEFAULT_COPILOT_MODEL,
  DEFAULT_MAX_CONCURRENCY,
  DEFAULT_EDITOR_THEME,
  DEFAULT_GLOBAL_SETTINGS,
} from '@automaker/types';

// Import types from modular type files
import {
  // UI types
  type ViewMode,
  type ThemeMode,
  type BoardViewMode,
  type ShortcutKey,
  type KeyboardShortcuts,
  type BackgroundSettings,
  type BrowserTab,
  type RecentDoc,
  type RightPanelMode,
  // Settings types
  type ApiKeys,
  // Chat types
  type ImageAttachment,
  type TextFileAttachment,
  type ChatMessage,
  type ChatSession,
  type FeatureImage,
  // Terminal types
  type TerminalPanelContent,
  type TerminalTab,
  type TerminalState,
  type PersistedTerminalPanel,
  type PersistedTerminalTab,
  type PersistedTerminalState,
  type PersistedTerminalSettings,
  generateSplitId,
  // Project types
  type ClaudeModel,
  type Feature,
  type FileTreeNode,
  type ProjectAnalysis,
  // State types
  type InitScriptState,
  type AutoModeActivity,
  type AppState,
  type AppActions,
  // Usage types
  type ClaudeUsage,
  type ClaudeUsageResponse,
  type CodexPlanType,
  type CodexRateLimitWindow,
  type CodexUsage,
  type CodexUsageResponse,
} from './types';

// Import utility functions from modular utils files
import {
  THEME_STORAGE_KEY,
  getStoredTheme,
  getStoredFontSans,
  getStoredFontMono,
  parseShortcut,
  formatShortcut,
  DEFAULT_KEYBOARD_SHORTCUTS,
  isClaudeUsageAtLimit,
} from './utils';

// Import default values from modular defaults files
import { defaultBackgroundSettings, defaultTerminalState, MAX_INIT_OUTPUT_LINES } from './defaults';

// Import internal theme utils (not re-exported publicly)
import {
  getEffectiveFont,
  saveThemeToStorage,
  saveFontSansToStorage,
  saveFontMonoToStorage,
  persistEffectiveThemeForProject,
} from './utils/theme-utils';

const logger = createLogger('AppStore');
const OPENCODE_BEDROCK_PROVIDER_ID = 'amazon-bedrock';
const OPENCODE_BEDROCK_MODEL_PREFIX = `${OPENCODE_BEDROCK_PROVIDER_ID}/`;
const FAVORITE_MODELS_STORAGE_KEY = 'automaker:favoriteModels';
const SELECTED_AGENT_MODEL_STORAGE_KEY = 'automaker:selectedAgentModel';
const DEFAULT_SELECTED_AGENT_MODEL: PhaseModelEntry = {
  model: 'claude-opus',
  thinkingLevel: 'high',
};

// Re-export types from @automaker/types for convenience
export type {
  ModelAlias,
  PlanningMode,
  ThinkingLevel,
  ReasoningEffort,
  ModelProvider,
  ServerLogLevel,
  FeatureTextFilePath,
  FeatureImagePath,
  ParsedTask,
  PlanSpec,
};

// Re-export all types from ./types for backward compatibility
export type {
  ViewMode,
  ThemeMode,
  BoardViewMode,
  ShortcutKey,
  KeyboardShortcuts,
  BackgroundSettings,
  ApiKeys,
  ImageAttachment,
  TextFileAttachment,
  ChatMessage,
  ChatSession,
  FeatureImage,
  TerminalPanelContent,
  TerminalTab,
  TerminalState,
  PersistedTerminalPanel,
  PersistedTerminalTab,
  PersistedTerminalState,
  PersistedTerminalSettings,
  ClaudeModel,
  Feature,
  FileTreeNode,
  ProjectAnalysis,
  InitScriptState,
  AutoModeActivity,
  AppState,
  AppActions,
  ClaudeUsage,
  ClaudeUsageResponse,
  CodexPlanType,
  CodexRateLimitWindow,
  CodexUsage,
  CodexUsageResponse,
  BrowserTab,
  RecentDoc,
};

// Re-export values from ./types for backward compatibility
export { generateSplitId };

// Re-export utilities from ./utils for backward compatibility
export {
  THEME_STORAGE_KEY,
  getStoredTheme,
  getStoredFontSans,
  getStoredFontMono,
  parseShortcut,
  formatShortcut,
  DEFAULT_KEYBOARD_SHORTCUTS,
  isClaudeUsageAtLimit,
};

// Re-export defaults from ./defaults for backward compatibility
export { defaultBackgroundSettings, defaultTerminalState, MAX_INIT_OUTPUT_LINES } from './defaults';

// Browser Panel storage keys (custom extension, not in upstream modules)
export const BROWSER_TABS_STORAGE_KEY = 'automaker:browser-tabs-by-project';
export const ACTIVE_BROWSER_TAB_STORAGE_KEY = 'automaker:active-browser-tab-by-project';
export const EXPANDED_ORCHESTRATOR_RUNS_STORAGE_KEY = 'automaker:expanded-orchestrator-runs';
export const TERMINAL_LAYOUT_BY_PROJECT_STORAGE_KEY = 'automaker:terminal-layout-by-project';
export const TERMINAL_LAST_ACTIVE_PROJECT_PATH_STORAGE_KEY =
  'automaker:terminal-last-active-project-path';

type BrowserTabsByProject = Record<string, BrowserTab[]>;
type ActiveBrowserTabByProject = Record<string, string>;

function isObjectRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function normalizeStoredBrowserTab(tab: unknown): BrowserTab | null {
  if (!isObjectRecord(tab)) return null;

  const id = typeof tab.id === 'string' ? tab.id : '';
  const url = typeof tab.url === 'string' ? tab.url : '';
  const title =
    typeof tab.title === 'string' && tab.title.length > 0 ? tab.title : url || 'New Tab';
  const port =
    typeof tab.port === 'number' && Number.isInteger(tab.port) && tab.port >= 0 ? tab.port : null;

  if (!id) return null;
  return { id, url, title, port };
}

function getStoredBrowserTabsByProject(): BrowserTabsByProject {
  const stored = getJSON<unknown>(BROWSER_TABS_STORAGE_KEY);
  if (!isObjectRecord(stored)) return {};

  const parsed: BrowserTabsByProject = {};

  for (const [projectPath, rawTabs] of Object.entries(stored)) {
    if (!Array.isArray(rawTabs)) continue;

    const tabs = rawTabs
      .map((rawTab) => normalizeStoredBrowserTab(rawTab))
      .filter((tab): tab is BrowserTab => tab !== null);

    if (tabs.length > 0) {
      parsed[projectPath] = tabs;
    }
  }

  return parsed;
}

function getStoredActiveBrowserTabsByProject(): ActiveBrowserTabByProject {
  const stored = getJSON<unknown>(ACTIVE_BROWSER_TAB_STORAGE_KEY);
  if (!isObjectRecord(stored)) return {};

  const parsed: ActiveBrowserTabByProject = {};
  for (const [projectPath, activeTabId] of Object.entries(stored)) {
    if (typeof activeTabId === 'string' && activeTabId.length > 0) {
      parsed[projectPath] = activeTabId;
    }
  }

  return parsed;
}

function sanitizeBrowserPanelState(
  browserTabsByProject: BrowserTabsByProject,
  activeBrowserTabByProject: ActiveBrowserTabByProject
): {
  tabsByProject: BrowserTabsByProject;
  activeByProject: ActiveBrowserTabByProject;
} {
  const tabsByProject: BrowserTabsByProject = {};
  const activeByProject: ActiveBrowserTabByProject = {};

  for (const [projectPath, tabs] of Object.entries(browserTabsByProject)) {
    if (!Array.isArray(tabs) || tabs.length === 0) continue;

    const validTabs = tabs
      .map((tab) => normalizeStoredBrowserTab(tab))
      .filter((tab): tab is BrowserTab => tab !== null);

    if (validTabs.length === 0) continue;

    tabsByProject[projectPath] = validTabs;

    const requestedActiveId = activeBrowserTabByProject[projectPath];
    const hasRequestedActive =
      typeof requestedActiveId === 'string' &&
      validTabs.some((tab) => tab.id === requestedActiveId);
    const fallbackActiveId = validTabs[validTabs.length - 1]?.id;
    const resolvedActiveId = hasRequestedActive ? requestedActiveId : fallbackActiveId;

    if (resolvedActiveId) {
      activeByProject[projectPath] = resolvedActiveId;
    }
  }

  return { tabsByProject, activeByProject };
}

function getStoredBrowserPanelState(): {
  tabsByProject: BrowserTabsByProject;
  activeByProject: ActiveBrowserTabByProject;
} {
  return sanitizeBrowserPanelState(
    getStoredBrowserTabsByProject(),
    getStoredActiveBrowserTabsByProject()
  );
}

function normalizeStoredTerminalPanel(panel: unknown): PersistedTerminalPanel | null {
  if (!isObjectRecord(panel)) return null;
  if (panel.type === 'terminal') {
    const size =
      typeof panel.size === 'number' && Number.isFinite(panel.size) ? panel.size : undefined;
    const fontSize =
      typeof panel.fontSize === 'number' && Number.isFinite(panel.fontSize)
        ? panel.fontSize
        : undefined;
    const sessionId = typeof panel.sessionId === 'string' ? panel.sessionId : undefined;
    const branchName = typeof panel.branchName === 'string' ? panel.branchName : undefined;
    return {
      type: 'terminal',
      size,
      fontSize,
      sessionId,
      branchName,
    };
  }

  if (panel.type === 'testRunner') {
    const size =
      typeof panel.size === 'number' && Number.isFinite(panel.size) ? panel.size : undefined;
    const sessionId = typeof panel.sessionId === 'string' ? panel.sessionId : undefined;
    const worktreePath = typeof panel.worktreePath === 'string' ? panel.worktreePath : undefined;
    return {
      type: 'testRunner',
      size,
      sessionId,
      worktreePath,
    };
  }

  if (panel.type === 'split') {
    const direction = panel.direction;
    if (direction !== 'horizontal' && direction !== 'vertical') return null;
    if (!Array.isArray(panel.panels)) return null;

    const panels = panel.panels
      .map((child) => normalizeStoredTerminalPanel(child))
      .filter((child): child is PersistedTerminalPanel => child !== null);

    if (panels.length === 0) return null;

    const size =
      typeof panel.size === 'number' && Number.isFinite(panel.size) ? panel.size : undefined;
    const id = typeof panel.id === 'string' ? panel.id : undefined;

    return {
      type: 'split',
      id,
      direction,
      panels,
      size,
    };
  }

  return null;
}

function normalizeStoredTerminalState(state: unknown): PersistedTerminalState | null {
  if (!isObjectRecord(state)) return null;
  if (!Array.isArray(state.tabs)) return null;

  const tabs: PersistedTerminalTab[] = state.tabs
    .map((tab, index): PersistedTerminalTab | null => {
      if (!isObjectRecord(tab)) return null;
      const id = typeof tab.id === 'string' && tab.id.length > 0 ? tab.id : `tab-${index + 1}`;
      const name =
        typeof tab.name === 'string' && tab.name.length > 0 ? tab.name : `Terminal ${index + 1}`;

      const rawLayout =
        tab.layout === null || tab.layout === undefined
          ? null
          : normalizeStoredTerminalPanel(tab.layout);

      return {
        id,
        name,
        layout: rawLayout,
      };
    })
    .filter((tab): tab is PersistedTerminalTab => tab !== null);

  const defaultFontSize =
    typeof state.defaultFontSize === 'number' && Number.isFinite(state.defaultFontSize)
      ? state.defaultFontSize
      : defaultTerminalState.defaultFontSize;

  const activeTabIndex =
    typeof state.activeTabIndex === 'number' &&
    Number.isInteger(state.activeTabIndex) &&
    state.activeTabIndex >= 0 &&
    state.activeTabIndex < tabs.length
      ? state.activeTabIndex
      : tabs.length > 0
        ? 0
        : -1;

  const normalized: PersistedTerminalState = {
    tabs,
    activeTabIndex,
    defaultFontSize,
  };

  if (typeof state.defaultRunScript === 'string') {
    normalized.defaultRunScript = state.defaultRunScript;
  }
  if (typeof state.screenReaderMode === 'boolean') {
    normalized.screenReaderMode = state.screenReaderMode;
  }
  if (typeof state.fontFamily === 'string') {
    normalized.fontFamily = state.fontFamily;
  }
  if (typeof state.scrollbackLines === 'number' && Number.isFinite(state.scrollbackLines)) {
    normalized.scrollbackLines = state.scrollbackLines;
  }
  if (typeof state.lineHeight === 'number' && Number.isFinite(state.lineHeight)) {
    normalized.lineHeight = state.lineHeight;
  }

  return normalized;
}

function getStoredTerminalLayoutByProject(): Record<string, PersistedTerminalState> {
  const stored = getJSON<unknown>(TERMINAL_LAYOUT_BY_PROJECT_STORAGE_KEY);
  if (!isObjectRecord(stored)) return {};

  const parsed: Record<string, PersistedTerminalState> = {};
  for (const [projectPath, rawState] of Object.entries(stored)) {
    if (typeof projectPath !== 'string' || projectPath.length === 0) continue;
    const normalizedState = normalizeStoredTerminalState(rawState);
    if (normalizedState) {
      parsed[projectPath] = normalizedState;
    }
  }

  return parsed;
}

function persistTerminalLayoutByProject(
  layoutByProject: Record<string, PersistedTerminalState>
): void {
  setJSON(TERMINAL_LAYOUT_BY_PROJECT_STORAGE_KEY, layoutByProject);
}

function getStoredTerminalLastActiveProjectPath(): string | null {
  const value = getItem(TERMINAL_LAST_ACTIVE_PROJECT_PATH_STORAGE_KEY);
  return value && value.length > 0 ? value : null;
}

function persistTerminalLastActiveProjectPath(projectPath: string | null): void {
  if (projectPath) {
    setItem(TERMINAL_LAST_ACTIVE_PROJECT_PATH_STORAGE_KEY, projectPath);
  } else {
    removeItem(TERMINAL_LAST_ACTIVE_PROJECT_PATH_STORAGE_KEY);
  }
}

function getStoredFavoriteModels(): string[] {
  const stored = getJSON<unknown>(FAVORITE_MODELS_STORAGE_KEY);
  if (!Array.isArray(stored)) return [];
  return stored.filter((id): id is string => typeof id === 'string' && id.length > 0);
}

function getStoredSelectedAgentModel(): PhaseModelEntry {
  const stored = getJSON<unknown>(SELECTED_AGENT_MODEL_STORAGE_KEY);
  if (!stored || typeof stored !== 'object' || Array.isArray(stored)) {
    return DEFAULT_SELECTED_AGENT_MODEL;
  }

  const parsed = stored as Partial<PhaseModelEntry>;
  if (typeof parsed.model !== 'string' || parsed.model.length === 0) {
    return DEFAULT_SELECTED_AGENT_MODEL;
  }

  return migratePhaseModelEntry(parsed as PhaseModelEntry);
}

function getStoredExpandedOrchestratorRuns(): Record<string, boolean> {
  const stored = getJSON<unknown>(EXPANDED_ORCHESTRATOR_RUNS_STORAGE_KEY);
  if (!isObjectRecord(stored)) return {};

  const parsed: Record<string, boolean> = {};
  for (const [runId, expanded] of Object.entries(stored)) {
    if (
      typeof runId === 'string' &&
      runId.length > 0 &&
      typeof expanded === 'boolean' &&
      expanded
    ) {
      parsed[runId] = true;
    }
  }

  return parsed;
}

function persistBrowserPanelState(
  browserTabsByProject: BrowserTabsByProject,
  activeBrowserTabByProject: ActiveBrowserTabByProject
): void {
  const sanitized = sanitizeBrowserPanelState(browserTabsByProject, activeBrowserTabByProject);

  if (Object.keys(sanitized.tabsByProject).length > 0) {
    setJSON(BROWSER_TABS_STORAGE_KEY, sanitized.tabsByProject);
  } else {
    removeItem(BROWSER_TABS_STORAGE_KEY);
  }

  if (Object.keys(sanitized.activeByProject).length > 0) {
    setJSON(ACTIVE_BROWSER_TAB_STORAGE_KEY, sanitized.activeByProject);
  } else {
    removeItem(ACTIVE_BROWSER_TAB_STORAGE_KEY);
  }
}

// NOTE: Type definitions moved to ./types/ directory, utilities moved to ./utils/ directory
// The following inline types have been replaced with imports above:
// - ViewMode, ThemeMode, BoardViewMode (./types/ui-types.ts)
// - ShortcutKey, KeyboardShortcuts (./types/ui-types.ts)
// - ApiKeys (./types/settings-types.ts)
// - ImageAttachment, TextFileAttachment, ChatMessage, ChatSession, FeatureImage (./types/chat-types.ts)
// - Terminal types (./types/terminal-types.ts)
// - ClaudeModel, Feature, FileTreeNode, ProjectAnalysis (./types/project-types.ts)
// - InitScriptState, AutoModeActivity, AppState, AppActions (./types/state-types.ts)
// - Claude/Codex usage types (./types/usage-types.ts)
// The following utility functions have been moved to ./utils/:
// - Theme utilities: THEME_STORAGE_KEY, getStoredTheme, getStoredFontSans, getStoredFontMono, etc. (./utils/theme-utils.ts)
// - Shortcut utilities: parseShortcut, formatShortcut, DEFAULT_KEYBOARD_SHORTCUTS (./utils/shortcut-utils.ts)
// - Usage utilities: isClaudeUsageAtLimit (./utils/usage-utils.ts)
// The following default values have been moved to ./defaults/:
// - MAX_INIT_OUTPUT_LINES (./defaults/constants.ts)
// - defaultBackgroundSettings (./defaults/background-settings.ts)
// - defaultTerminalState (./defaults/terminal-defaults.ts)

const storedBrowserPanelState = getStoredBrowserPanelState();
const RIGHT_PANEL_MODES: readonly RightPanelMode[] = ['files', 'terminal', 'dashboard', 'git'];

function isRightPanelMode(value: string): value is RightPanelMode {
  return RIGHT_PANEL_MODES.includes(value as RightPanelMode);
}

function getStoredRightPanelSecondaryMode(): RightPanelMode | null {
  const stored = getItem('automaker:rightPanelSecondaryMode');
  if (!stored) return null;

  if (isRightPanelMode(stored)) {
    return stored;
  }

  // Legacy migration: old persisted "browser" mode is disabled now.
  const fallbackMode: RightPanelMode = 'terminal';
  setItem('automaker:rightPanelSecondaryMode', fallbackMode);
  return fallbackMode;
}

const initialState: AppState = {
  projects: [],
  currentProject: null,
  trashedProjects: [],
  projectHistory: [],
  projectHistoryIndex: -1,
  currentView: 'welcome',
  sidebarOpen: true,
  sidebarStyle: 'unified',
  collapsedNavSections: {},
  mobileSidebarHidden: false,
  lastSelectedSessionByProject: {},
  theme: getStoredTheme() || 'dark',
  fontFamilySans: getStoredFontSans(),
  fontFamilyMono: getStoredFontMono(),
  features: [],
  appSpec: '',
  ipcConnected: false,
  apiKeys: {
    anthropic: '',
    google: '',
    openai: '',
  },
  chatSessions: [],
  currentChatSession: null,
  chatHistoryOpen: false,
  expandedOrchestratorRuns: getStoredExpandedOrchestratorRuns(),
  autoModeByWorktree: {},
  autoModeActivityLog: [],
  maxConcurrency: DEFAULT_MAX_CONCURRENCY,
  boardViewMode: 'kanban',
  defaultSkipTests: true,
  enableDependencyBlocking: true,
  skipVerificationInAutoMode: false,
  enableAiCommitMessages: true,
  planUseSelectedWorktreeBranch: true,
  addFeatureUseSelectedWorktreeBranch: false,
  useWorktrees: true,
  currentWorktreeByProject: {},
  worktreesByProject: {},
  keyboardShortcuts: DEFAULT_KEYBOARD_SHORTCUTS,
  muteDoneSound: false,
  notificationSoundVolume: 0.5,
  notificationSoundFile: 'notification.mp3',
  allPhasesCompleteSoundFile: 'notification.mp3',
  disableSplashScreen: false,
  serverLogLevel: 'info',
  enableRequestLogging: true,
  showQueryDevtools: false,
  enhancementModel: 'claude-sonnet',
  validationModel: 'claude-opus',
  phaseModels: DEFAULT_PHASE_MODELS,
  favoriteModels: getStoredFavoriteModels(),
  enabledCursorModels: getAllCursorModelIds(),
  cursorDefaultModel: 'cursor-auto',
  enabledCodexModels: getAllCodexModelIds(),
  codexDefaultModel: 'codex-gpt-5.3-codex',
  codexAutoLoadAgents: false,
  codexSandboxMode: 'workspace-write',
  codexApprovalPolicy: 'on-request',
  codexEnableWebSearch: false,
  codexEnableImages: false,
  enabledOpencodeModels: getAllOpencodeModelIds(),
  opencodeDefaultModel: DEFAULT_OPENCODE_MODEL,
  dynamicOpencodeModels: [],
  enabledDynamicModelIds: [],
  cachedOpencodeProviders: [],
  opencodeModelsLoading: false,
  opencodeModelsError: null,
  opencodeModelsLastFetched: null,
  opencodeModelsLastFailedAt: null,
  enabledGeminiModels: getAllGeminiModelIds(),
  geminiDefaultModel: DEFAULT_GEMINI_MODEL,
  enabledCopilotModels: getAllCopilotModelIds(),
  copilotDefaultModel: DEFAULT_COPILOT_MODEL,
  disabledProviders: [],
  autoLoadClaudeMd: false,
  skipSandboxWarning: false,
  mcpServers: [],
  defaultEditorCommand: null,
  defaultTerminalId: null,
  enableSkills: true,
  skillsSources: ['user', 'project'] as Array<'user' | 'project'>,
  enableSubagents: true,
  subagentsSources: ['user', 'project'] as Array<'user' | 'project'>,
  promptCustomization: {},
  eventHooks: [],
  claudeCompatibleProviders: [],
  claudeApiProfiles: [],
  activeClaudeApiProfileId: null,
  projectAnalysis: null,
  isAnalyzing: false,
  boardBackgroundByProject: {},
  previewTheme: null,
  terminalState: {
    ...defaultTerminalState,
    lastActiveProjectPath: getStoredTerminalLastActiveProjectPath(),
  },
  terminalLayoutByProject: getStoredTerminalLayoutByProject(),
  specCreatingForProject: null,
  defaultPlanningMode: 'skip' as PlanningMode,
  defaultRequirePlanApproval: false,
  defaultFeatureModel: DEFAULT_GLOBAL_SETTINGS.defaultFeatureModel,
  selectedAgentModel: getStoredSelectedAgentModel(),
  pendingPlanApproval: null,
  claudeRefreshInterval: 60,
  claudeUsage: null,
  claudeUsageLastUpdated: null,
  codexUsage: null,
  codexUsageLastUpdated: null,
  codexModels: [],
  codexModelsLoading: false,
  codexModelsError: null,
  codexModelsLastFetched: null,
  codexModelsLastFailedAt: null,
  pipelineConfigByProject: {},
  worktreePanelVisibleByProject: {},
  showInitScriptIndicatorByProject: {},
  defaultDeleteBranchByProject: {},
  autoDismissInitScriptIndicatorByProject: {},
  useWorktreesByProject: {},
  worktreePanelCollapsed: false,
  lastProjectDir: '',
  recentFolders: [],
  initScriptState: {},
  // Left Panel State
  leftPanelTab: 'sessions' as const,
  currentDocPath: null,
  docsViewMode: (getItem('automaker:docsViewMode') as 'rendered' | 'raw') || 'rendered',
  recentDocs: JSON.parse(getItem('automaker:recentDocs') || '[]'),
  // Docs Editor Theme
  editorTheme: JSON.parse(getItem('automaker:editorTheme') || 'null') || DEFAULT_EDITOR_THEME,
  // Session History Limit
  maxSessionsPerProject: parseInt(getItem('automaker:maxSessionsPerProject') || '15', 10),
  // Session List Scope
  singleProjectHistoryView:
    (getItem('automaker:singleProjectHistoryView') ?? 'true').toLowerCase() === 'true',
  // Skip clear chat confirmation dialog
  skipClearChatConfirm: getItem('automaker:skipClearChatConfirm') === 'true',
  // Session Panel Font Size
  sessionFontSize: parseInt(getItem('automaker:sessionFontSize') || '14', 10),
  // Docs Auto-Save
  docsAutoSave: getItem('automaker:docsAutoSave') !== 'false', // default true
  docsAutoSaveDelay: parseInt(getItem('automaker:docsAutoSaveDelay') || '3000', 10),
  // Right Panel State
  rightPanelMode: 'files' as const,
  rightPanelSecondaryMode: getStoredRightPanelSecondaryMode(),
  rightPanelSplitSize: parseInt(getItem('automaker:rightPanelSplitSize') || '50', 10),
  // Right Panel Font Sizes
  filesPanelFontSize: parseInt(getItem('automaker:filesPanelFontSize') || '13', 10),
  dashboardPanelFontSize: parseInt(getItem('automaker:dashboardPanelFontSize') || '13', 10),
  // Browser Panel State
  browserPanelOpen: true,
  browserTabsByProject: storedBrowserPanelState.tabsByProject,
  activeBrowserTabByProject: storedBrowserPanelState.activeByProject,
  browserPanelSize: 35,

  // Completed Tasks (Done Tab)
  completedTasks: [],
  completedTasksLoading: false,
  completedTasksError: null,
  completedTasksFilter: {},
  completedTasksSortField: 'date',
  completedTasksSortOrder: 'desc',
  completedTasksAutoCapture: false,

  // Tasks (Tasks Tab)
  tasks: [],
  tasksLoading: false,
  tasksError: null,
  tasksFilter: {},
  tasksSortField: 'date',
  tasksSortOrder: 'desc',
};

export const useAppStore = create<AppState & AppActions>()((set, get) => ({
  ...initialState,

  // Project actions
  setProjects: (projects) => set({ projects }),

  addProject: (project) => {
    const projects = get().projects;
    const existing = projects.findIndex((p) => p.path === project.path);
    if (existing >= 0) {
      const updated = [...projects];
      updated[existing] = project;
      set({ projects: updated });
    } else {
      set({ projects: [...projects, project] });
    }
  },

  removeProject: (projectId) =>
    set((state) => ({
      projects: state.projects.filter((p) => p.id !== projectId),
    })),

  moveProjectToTrash: (projectId: string) => {
    const project = get().projects.find((p) => p.id === projectId);
    if (!project) return;

    const trashedProject: TrashedProject = {
      ...project,
      trashedAt: new Date().toISOString(),
    };

    set((state) => ({
      projects: state.projects.filter((p) => p.id !== projectId),
      trashedProjects: [...state.trashedProjects, trashedProject],
      currentProject: state.currentProject?.id === projectId ? null : state.currentProject,
    }));

    // Persist to storage
    saveProjects(get().projects);
    saveTrashedProjects(get().trashedProjects);
  },

  restoreTrashedProject: (projectId: string) => {
    const trashedProject = get().trashedProjects.find((p) => p.id === projectId);
    if (!trashedProject) return;

    // Remove trashedAt from the project
    const { trashedAt, ...restoredProject } = trashedProject;
    void trashedAt; // Explicitly ignore trashedAt to satisfy linter

    set((state) => ({
      projects: [...state.projects, restoredProject as Project],
      trashedProjects: state.trashedProjects.filter((p) => p.id !== projectId),
    }));

    // Persist to storage
    saveProjects(get().projects);
    saveTrashedProjects(get().trashedProjects);
  },

  deleteTrashedProject: (projectId: string) => {
    set((state) => ({
      trashedProjects: state.trashedProjects.filter((p) => p.id !== projectId),
    }));

    // Persist to storage
    saveTrashedProjects(get().trashedProjects);
  },

  emptyTrash: () => {
    set({ trashedProjects: [] });

    // Persist to storage
    saveTrashedProjects([]);
  },

  setCurrentProject: (project) => {
    const currentId = get().currentProject?.id;
    const newId = project?.id;

    // If we're switching to a different project, add the new one to history
    if (newId && newId !== currentId) {
      set((state) => {
        // Remove the new project from history if it exists
        const filteredHistory = state.projectHistory.filter((id) => id !== newId);
        // Add new project at the front (most recent)
        const newHistory = [newId, ...filteredHistory];
        // Limit history size to prevent unbounded growth
        const MAX_HISTORY = 50;

        // Persist effective theme for the new project to localStorage
        persistEffectiveThemeForProject(project, state.theme);

        return {
          currentProject: project,
          projectHistory: newHistory.slice(0, MAX_HISTORY),
          projectHistoryIndex: 0, // Reset index to start of history
        };
      });
    } else {
      // Same project or null - just update without affecting history
      set({ currentProject: project });

      // Still persist theme for project changes
      if (project) {
        persistEffectiveThemeForProject(project, get().theme);
      }
    }
  },

  upsertAndSetCurrentProject: (path: string, name: string, theme?: ThemeMode) => {
    const existingProject = get().projects.find((p) => p.path === path);
    if (existingProject) {
      get().setCurrentProject(existingProject);
      return existingProject;
    }

    // Create new project
    const newProject: Project = {
      id: crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).slice(2),
      name,
      path,
      isFavorite: false, // New projects start as non-favorites
      ...(theme ? { theme } : {}),
    };

    // Add and set as current
    get().addProject(newProject);
    get().setCurrentProject(newProject);

    // Persist to storage (small delay to ensure state is updated)
    setTimeout(() => {
      saveProjects(get().projects);
    }, 0);

    return newProject;
  },

  reorderProjects: (oldIndex: number, newIndex: number) => {
    set((state) => {
      const projects = [...state.projects];
      const [removed] = projects.splice(oldIndex, 1);
      projects.splice(newIndex, 0, removed);
      return { projects };
    });
  },

  cyclePrevProject: () => {
    set((state) => {
      const { projectHistory, projectHistoryIndex, projects } = state;
      if (projectHistory.length === 0) return state;

      // Move back in history (to older project)
      const newIndex = Math.min(projectHistoryIndex + 1, projectHistory.length - 1);
      if (newIndex === projectHistoryIndex) return state; // Already at oldest

      const projectId = projectHistory[newIndex];
      const project = projects.find((p) => p.id === projectId);

      if (!project) {
        // Project no longer exists, remove from history and try again
        const filteredHistory = projectHistory.filter((id) => id !== projectId);
        return { projectHistory: filteredHistory, projectHistoryIndex: state.projectHistoryIndex };
      }

      // Persist effective theme for the cycled-to project
      persistEffectiveThemeForProject(project, state.theme);

      return {
        currentProject: project,
        projectHistoryIndex: newIndex,
      };
    });
  },

  cycleNextProject: () => {
    set((state) => {
      const { projectHistory, projectHistoryIndex, projects } = state;
      if (projectHistory.length === 0 || projectHistoryIndex === 0) return state; // Already at most recent

      // Move forward in history (to newer project)
      const newIndex = Math.max(projectHistoryIndex - 1, 0);
      const projectId = projectHistory[newIndex];
      const project = projects.find((p) => p.id === projectId);

      if (!project) {
        // Project no longer exists, remove from history and try again
        const filteredHistory = projectHistory.filter((id) => id !== projectId);
        return { projectHistory: filteredHistory, projectHistoryIndex: state.projectHistoryIndex };
      }

      // Persist effective theme for the cycled-to project
      persistEffectiveThemeForProject(project, state.theme);

      return {
        currentProject: project,
        projectHistoryIndex: newIndex,
      };
    });
  },

  clearProjectHistory: () => {
    const currentId = get().currentProject?.id;
    set({
      projectHistory: currentId ? [currentId] : [],
      projectHistoryIndex: 0,
    });
  },

  toggleProjectFavorite: (projectId: string) => {
    set((state) => ({
      projects: state.projects.map((p) =>
        p.id === projectId ? { ...p, isFavorite: !p.isFavorite } : p
      ),
    }));

    // Persist to storage
    saveProjects(get().projects);
  },

  toggleProjectHidden: (projectId: string) => {
    set((state) => ({
      projects: state.projects.map((p) =>
        p.id === projectId ? { ...p, isHidden: !p.isHidden } : p
      ),
      // Also update currentProject if it's the one being modified
      currentProject:
        state.currentProject?.id === projectId
          ? { ...state.currentProject, isHidden: !state.currentProject.isHidden }
          : state.currentProject,
    }));

    // Persist to storage
    saveProjects(get().projects);
  },

  setProjectIcon: (projectId: string, icon: string | null) => {
    set((state) => ({
      projects: state.projects.map((p) =>
        p.id === projectId ? { ...p, icon: icon ?? undefined } : p
      ),
      // Also update currentProject if it's the one being modified
      currentProject:
        state.currentProject?.id === projectId
          ? { ...state.currentProject, icon: icon ?? undefined }
          : state.currentProject,
    }));

    // Persist to storage
    saveProjects(get().projects);
  },

  setProjectCustomIcon: (projectId: string, customIconPath: string | null) => {
    set((state) => ({
      projects: state.projects.map((p) =>
        p.id === projectId ? { ...p, customIconPath: customIconPath ?? undefined } : p
      ),
      // Also update currentProject if it's the one being modified
      currentProject:
        state.currentProject?.id === projectId
          ? { ...state.currentProject, customIconPath: customIconPath ?? undefined }
          : state.currentProject,
    }));

    // Persist to storage
    saveProjects(get().projects);
  },

  setProjectName: (projectId: string, name: string) => {
    set((state) => ({
      projects: state.projects.map((p) => (p.id === projectId ? { ...p, name } : p)),
      // Also update currentProject if it's the one being renamed
      currentProject:
        state.currentProject?.id === projectId
          ? { ...state.currentProject, name }
          : state.currentProject,
    }));

    // Persist to storage
    saveProjects(get().projects);
  },

  setProjectBadgeColor: (projectId, badgeColor) => {
    set((state) => ({
      projects: state.projects.map((p) =>
        p.id === projectId ? { ...p, badgeColor: badgeColor === null ? undefined : badgeColor } : p
      ),
      currentProject:
        state.currentProject?.id === projectId
          ? { ...state.currentProject, badgeColor: badgeColor === null ? undefined : badgeColor }
          : state.currentProject,
    }));
    saveProjects(get().projects);
  },

  setProjectBackgroundColor: (projectId, backgroundColor) => {
    set((state) => ({
      projects: state.projects.map((p) =>
        p.id === projectId
          ? { ...p, backgroundColor: backgroundColor === null ? undefined : backgroundColor }
          : p
      ),
      currentProject:
        state.currentProject?.id === projectId
          ? {
              ...state.currentProject,
              backgroundColor: backgroundColor === null ? undefined : backgroundColor,
            }
          : state.currentProject,
    }));
    saveProjects(get().projects);
  },

  setProjectTextColor: (projectId, textColor) => {
    set((state) => ({
      projects: state.projects.map((p) =>
        p.id === projectId ? { ...p, textColor: textColor === null ? undefined : textColor } : p
      ),
      currentProject:
        state.currentProject?.id === projectId
          ? { ...state.currentProject, textColor: textColor === null ? undefined : textColor }
          : state.currentProject,
    }));
    saveProjects(get().projects);
  },

  setProjectIconColor: (projectId, iconColor) => {
    set((state) => ({
      projects: state.projects.map((p) =>
        p.id === projectId ? { ...p, iconColor: iconColor === null ? undefined : iconColor } : p
      ),
      currentProject:
        state.currentProject?.id === projectId
          ? { ...state.currentProject, iconColor: iconColor === null ? undefined : iconColor }
          : state.currentProject,
    }));
    saveProjects(get().projects);
  },

  setProjectChatBackgroundColor: (projectId, chatBackgroundColor) => {
    set((state) => ({
      projects: state.projects.map((p) =>
        p.id === projectId
          ? {
              ...p,
              chatBackgroundColor: chatBackgroundColor === null ? undefined : chatBackgroundColor,
            }
          : p
      ),
      currentProject:
        state.currentProject?.id === projectId
          ? {
              ...state.currentProject,
              chatBackgroundColor: chatBackgroundColor === null ? undefined : chatBackgroundColor,
            }
          : state.currentProject,
    }));
    saveProjects(get().projects);
  },

  setProjectChatBubbleColor: (projectId, chatBubbleColor) => {
    set((state) => ({
      projects: state.projects.map((p) =>
        p.id === projectId
          ? {
              ...p,
              chatBubbleColor: chatBubbleColor === null ? undefined : chatBubbleColor,
            }
          : p
      ),
      currentProject:
        state.currentProject?.id === projectId
          ? {
              ...state.currentProject,
              chatBubbleColor: chatBubbleColor === null ? undefined : chatBubbleColor,
            }
          : state.currentProject,
    }));
    saveProjects(get().projects);
  },

  setProjectUserBubbleColor: (projectId, userBubbleColor) => {
    set((state) => ({
      projects: state.projects.map((p) =>
        p.id === projectId
          ? {
              ...p,
              userBubbleColor: userBubbleColor === null ? undefined : userBubbleColor,
            }
          : p
      ),
      currentProject:
        state.currentProject?.id === projectId
          ? {
              ...state.currentProject,
              userBubbleColor: userBubbleColor === null ? undefined : userBubbleColor,
            }
          : state.currentProject,
    }));
    saveProjects(get().projects);
  },

  // View actions
  setCurrentView: (view) => set({ currentView: view }),
  toggleSidebar: () => set((state) => ({ sidebarOpen: !state.sidebarOpen })),
  setSidebarOpen: (open) => set({ sidebarOpen: open }),
  setSidebarStyle: (style) => set({ sidebarStyle: style }),
  setCollapsedNavSections: (sections) => set({ collapsedNavSections: sections }),
  toggleNavSection: (sectionLabel) =>
    set((state) => ({
      collapsedNavSections: {
        ...state.collapsedNavSections,
        [sectionLabel]: !state.collapsedNavSections[sectionLabel],
      },
    })),
  toggleMobileSidebarHidden: () =>
    set((state) => ({ mobileSidebarHidden: !state.mobileSidebarHidden })),
  setMobileSidebarHidden: (hidden) => set({ mobileSidebarHidden: hidden }),

  // Theme actions
  setTheme: (theme) => {
    set({ theme });
    saveThemeToStorage(theme);
  },
  setProjectTheme: (projectId: string, theme: ThemeMode | null) => {
    set((state) => ({
      projects: state.projects.map((p) =>
        p.id === projectId ? { ...p, theme: theme ?? undefined } : p
      ),
      // Also update currentProject if it's the one being changed
      currentProject:
        state.currentProject?.id === projectId
          ? { ...state.currentProject, theme: theme ?? undefined }
          : state.currentProject,
    }));

    // Update localStorage with new effective theme if this is the current project
    const currentProject = get().currentProject;
    if (currentProject?.id === projectId) {
      persistEffectiveThemeForProject(
        { ...currentProject, theme: theme ?? undefined },
        get().theme
      );
    }

    // Persist to storage
    saveProjects(get().projects);
  },
  getEffectiveTheme: () => {
    const state = get();
    // If there's a preview theme, use it (for hover preview)
    if (state.previewTheme) return state.previewTheme;
    // Otherwise, use project theme if set, or fall back to global theme
    const projectTheme = state.currentProject?.theme as ThemeMode | undefined;
    return projectTheme ?? state.theme;
  },
  setPreviewTheme: (theme) => set({ previewTheme: theme }),

  // Font actions
  setFontSans: (fontFamily) => {
    set({ fontFamilySans: fontFamily });
    saveFontSansToStorage(fontFamily);
  },
  setFontMono: (fontFamily) => {
    set({ fontFamilyMono: fontFamily });
    saveFontMonoToStorage(fontFamily);
  },
  setProjectFontSans: (projectId: string, fontFamily: string | null) => {
    set((state) => ({
      projects: state.projects.map((p) =>
        p.id === projectId ? { ...p, fontSans: fontFamily ?? undefined } : p
      ),
      // Also update currentProject if it's the one being changed
      currentProject:
        state.currentProject?.id === projectId
          ? { ...state.currentProject, fontSans: fontFamily ?? undefined }
          : state.currentProject,
    }));

    // Persist to storage
    saveProjects(get().projects);
  },
  setProjectFontMono: (projectId: string, fontFamily: string | null) => {
    set((state) => ({
      projects: state.projects.map((p) =>
        p.id === projectId ? { ...p, fontMono: fontFamily ?? undefined } : p
      ),
      // Also update currentProject if it's the one being changed
      currentProject:
        state.currentProject?.id === projectId
          ? { ...state.currentProject, fontMono: fontFamily ?? undefined }
          : state.currentProject,
    }));

    // Persist to storage
    saveProjects(get().projects);
  },
  getEffectiveFontSans: () => {
    const state = get();
    const projectFont = state.currentProject?.fontFamilySans;
    return getEffectiveFont(projectFont, state.fontFamilySans, UI_SANS_FONT_OPTIONS);
  },
  getEffectiveFontMono: () => {
    const state = get();
    const projectFont = state.currentProject?.fontFamilyMono;
    return getEffectiveFont(projectFont, state.fontFamilyMono, UI_MONO_FONT_OPTIONS);
  },

  // Claude API Profile actions (per-project override)
  setProjectClaudeApiProfile: (projectId: string, profileId: string | null | undefined) => {
    set((state) => ({
      projects: state.projects.map((p) =>
        p.id === projectId ? { ...p, claudeApiProfileId: profileId } : p
      ),
      // Also update currentProject if it's the one being changed
      currentProject:
        state.currentProject?.id === projectId
          ? { ...state.currentProject, claudeApiProfileId: profileId }
          : state.currentProject,
    }));

    // Persist to storage
    saveProjects(get().projects);
  },

  // Project Phase Model Overrides
  setProjectPhaseModelOverride: (
    projectId: string,
    phase: PhaseModelKey,
    entry: PhaseModelEntry | null
  ) => {
    set((state) => {
      const updatePhaseModels = (project: Project): Project => {
        const currentOverrides = project.phaseModelOverrides || {};
        const newOverrides = { ...currentOverrides };
        if (entry === null) {
          delete newOverrides[phase];
        } else {
          newOverrides[phase] = entry;
        }
        return {
          ...project,
          phaseModelOverrides: Object.keys(newOverrides).length > 0 ? newOverrides : undefined,
        };
      };

      return {
        projects: state.projects.map((p) => (p.id === projectId ? updatePhaseModels(p) : p)),
        currentProject:
          state.currentProject?.id === projectId
            ? updatePhaseModels(state.currentProject)
            : state.currentProject,
      };
    });

    // Persist to storage
    saveProjects(get().projects);
  },

  clearAllProjectPhaseModelOverrides: (projectId: string) => {
    set((state) => {
      const clearOverrides = (project: Project): Project => ({
        ...project,
        phaseModelOverrides: undefined,
      });

      return {
        projects: state.projects.map((p) => (p.id === projectId ? clearOverrides(p) : p)),
        currentProject:
          state.currentProject?.id === projectId
            ? clearOverrides(state.currentProject)
            : state.currentProject,
      };
    });

    // Persist to storage
    saveProjects(get().projects);
  },

  // Project Default Feature Model Override
  setProjectDefaultFeatureModel: (projectId: string, entry: PhaseModelEntry | null) => {
    set((state) => {
      const updateDefaultFeatureModel = (project: Project): Project => ({
        ...project,
        defaultFeatureModel: entry ?? undefined,
      });

      return {
        projects: state.projects.map((p) =>
          p.id === projectId ? updateDefaultFeatureModel(p) : p
        ),
        currentProject:
          state.currentProject?.id === projectId
            ? updateDefaultFeatureModel(state.currentProject)
            : state.currentProject,
      };
    });

    // Persist to storage
    saveProjects(get().projects);
  },

  // Feature actions
  setFeatures: (features) => set({ features }),
  updateFeature: (id, updates) =>
    set((state) => ({
      features: state.features.map((f) => (f.id === id ? { ...f, ...updates } : f)),
    })),
  addFeature: (feature) => {
    const id = feature.id ?? `feature-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    const newFeature = { ...feature, id } as Feature;
    set((state) => ({ features: [...state.features, newFeature] }));
    return newFeature;
  },
  removeFeature: (id) => set((state) => ({ features: state.features.filter((f) => f.id !== id) })),
  moveFeature: (id, newStatus) =>
    set((state) => ({
      features: state.features.map((f) => (f.id === id ? { ...f, status: newStatus } : f)),
    })),

  // App spec actions
  setAppSpec: (spec) => set({ appSpec: spec }),

  // IPC actions
  setIpcConnected: (connected) => set({ ipcConnected: connected }),

  // API Keys actions
  setApiKeys: (keys) => set((state) => ({ apiKeys: { ...state.apiKeys, ...keys } })),

  // Chat Session actions
  createChatSession: (title) => {
    const currentProject = get().currentProject;
    const newSession: ChatSession = {
      id: `session-${Date.now()}-${Math.random().toString(36).slice(2)}`,
      title: title || 'New Chat',
      projectId: currentProject?.id || '',
      messages: [],
      createdAt: new Date(),
      updatedAt: new Date(),
      archived: false,
    };
    set((state) => ({
      chatSessions: [...state.chatSessions, newSession],
      currentChatSession: newSession,
    }));
    return newSession;
  },
  updateChatSession: (sessionId, updates) =>
    set((state) => ({
      chatSessions: state.chatSessions.map((s) =>
        s.id === sessionId ? { ...s, ...updates, updatedAt: new Date() } : s
      ),
      currentChatSession:
        state.currentChatSession?.id === sessionId
          ? { ...state.currentChatSession, ...updates, updatedAt: new Date() }
          : state.currentChatSession,
    })),
  addMessageToSession: (sessionId, message) =>
    set((state) => ({
      chatSessions: state.chatSessions.map((s) =>
        s.id === sessionId ? { ...s, messages: [...s.messages, message], updatedAt: new Date() } : s
      ),
      currentChatSession:
        state.currentChatSession?.id === sessionId
          ? {
              ...state.currentChatSession,
              messages: [...state.currentChatSession.messages, message],
              updatedAt: new Date(),
            }
          : state.currentChatSession,
    })),
  setCurrentChatSession: (session) => set({ currentChatSession: session }),
  archiveChatSession: (sessionId) =>
    set((state) => ({
      chatSessions: state.chatSessions.map((s) =>
        s.id === sessionId ? { ...s, archived: true } : s
      ),
    })),
  unarchiveChatSession: (sessionId) =>
    set((state) => ({
      chatSessions: state.chatSessions.map((s) =>
        s.id === sessionId ? { ...s, archived: false } : s
      ),
    })),
  deleteChatSession: (sessionId) =>
    set((state) => ({
      chatSessions: state.chatSessions.filter((s) => s.id !== sessionId),
      currentChatSession:
        state.currentChatSession?.id === sessionId ? null : state.currentChatSession,
    })),
  setChatHistoryOpen: (open) => set({ chatHistoryOpen: open }),
  toggleChatHistory: () => set((state) => ({ chatHistoryOpen: !state.chatHistoryOpen })),
  toggleOrchestratorRunExpanded: (runId) => {
    const normalizedRunId = runId.trim();
    if (!normalizedRunId) return;

    set((state) => {
      const currentlyExpanded = !!state.expandedOrchestratorRuns[normalizedRunId];
      const nextExpandedRuns = { ...state.expandedOrchestratorRuns };

      if (currentlyExpanded) {
        delete nextExpandedRuns[normalizedRunId];
      } else {
        nextExpandedRuns[normalizedRunId] = true;
      }

      setJSON(EXPANDED_ORCHESTRATOR_RUNS_STORAGE_KEY, nextExpandedRuns);
      return { expandedOrchestratorRuns: nextExpandedRuns };
    });
  },
  setOrchestratorRunExpanded: (runId, expanded) => {
    const normalizedRunId = runId.trim();
    if (!normalizedRunId) return;

    set((state) => {
      const nextExpandedRuns = { ...state.expandedOrchestratorRuns };
      if (expanded) {
        nextExpandedRuns[normalizedRunId] = true;
      } else {
        delete nextExpandedRuns[normalizedRunId];
      }

      setJSON(EXPANDED_ORCHESTRATOR_RUNS_STORAGE_KEY, nextExpandedRuns);
      return { expandedOrchestratorRuns: nextExpandedRuns };
    });
  },

  // Auto Mode actions (per-worktree)
  getWorktreeKey: (projectId: string, branchName: string | null) =>
    `${projectId}::${branchName ?? '__main__'}`,

  setAutoModeRunning: (
    projectId: string,
    branchName: string | null,
    running: boolean,
    maxConcurrency?: number,
    runningTasks?: string[]
  ) => {
    const key = get().getWorktreeKey(projectId, branchName);
    set((state) => ({
      autoModeByWorktree: {
        ...state.autoModeByWorktree,
        [key]: {
          isRunning: running,
          runningTasks: runningTasks ?? state.autoModeByWorktree[key]?.runningTasks ?? [],
          branchName,
          maxConcurrency: maxConcurrency ?? state.autoModeByWorktree[key]?.maxConcurrency,
        },
      },
    }));
  },

  addRunningTask: (projectId: string, branchName: string | null, taskId: string) => {
    const key = get().getWorktreeKey(projectId, branchName);
    set((state) => {
      const current = state.autoModeByWorktree[key] || {
        isRunning: true,
        runningTasks: [],
        branchName,
      };
      return {
        autoModeByWorktree: {
          ...state.autoModeByWorktree,
          [key]: {
            ...current,
            runningTasks: [...current.runningTasks, taskId],
          },
        },
      };
    });
  },

  removeRunningTask: (projectId: string, branchName: string | null, taskId: string) => {
    const key = get().getWorktreeKey(projectId, branchName);
    set((state) => {
      const current = state.autoModeByWorktree[key];
      if (!current) return state;
      return {
        autoModeByWorktree: {
          ...state.autoModeByWorktree,
          [key]: {
            ...current,
            runningTasks: current.runningTasks.filter((id) => id !== taskId),
          },
        },
      };
    });
  },

  clearRunningTasks: (projectId: string, branchName: string | null) => {
    const key = get().getWorktreeKey(projectId, branchName);
    set((state) => {
      const current = state.autoModeByWorktree[key];
      if (!current) return state;
      return {
        autoModeByWorktree: {
          ...state.autoModeByWorktree,
          [key]: {
            ...current,
            runningTasks: [],
          },
        },
      };
    });
  },

  getAutoModeState: (projectId: string, branchName: string | null) => {
    const key = get().getWorktreeKey(projectId, branchName);
    const worktreeState = get().autoModeByWorktree[key];
    return (
      worktreeState || {
        isRunning: false,
        runningTasks: [],
        branchName,
      }
    );
  },

  addAutoModeActivity: (activity) =>
    set((state) => ({
      autoModeActivityLog: [
        { ...activity, id: Math.random().toString(36).slice(2), timestamp: new Date() },
        ...state.autoModeActivityLog.slice(0, 99), // Keep last 100 activities
      ],
    })),

  clearAutoModeActivity: () => set({ autoModeActivityLog: [] }),

  setMaxConcurrency: (max) => set({ maxConcurrency: max }),

  getMaxConcurrencyForWorktree: (projectId: string, branchName: string | null) => {
    const key = get().getWorktreeKey(projectId, branchName);
    const worktreeState = get().autoModeByWorktree[key];
    return worktreeState?.maxConcurrency ?? get().maxConcurrency;
  },

  setMaxConcurrencyForWorktree: (
    projectId: string,
    branchName: string | null,
    maxConcurrency: number
  ) => {
    const key = get().getWorktreeKey(projectId, branchName);
    set((state) => ({
      autoModeByWorktree: {
        ...state.autoModeByWorktree,
        [key]: {
          ...state.autoModeByWorktree[key],
          isRunning: state.autoModeByWorktree[key]?.isRunning ?? false,
          runningTasks: state.autoModeByWorktree[key]?.runningTasks ?? [],
          branchName,
          maxConcurrency,
        },
      },
    }));
  },

  // Kanban Card Settings actions
  setBoardViewMode: (mode) => set({ boardViewMode: mode }),

  // Feature Default Settings actions
  setDefaultSkipTests: (skip) => set({ defaultSkipTests: skip }),
  setEnableDependencyBlocking: (enabled) => set({ enableDependencyBlocking: enabled }),
  setSkipVerificationInAutoMode: async (enabled) => {
    set({ skipVerificationInAutoMode: enabled });
    // Sync to server
    try {
      const httpApi = getHttpApiClient();
      await httpApi.put('/api/settings', { skipVerificationInAutoMode: enabled });
    } catch (error) {
      logger.error('Failed to sync skipVerificationInAutoMode:', error);
    }
  },
  setEnableAiCommitMessages: async (enabled) => {
    set({ enableAiCommitMessages: enabled });
    // Sync to server
    try {
      const httpApi = getHttpApiClient();
      await httpApi.put('/api/settings', { enableAiCommitMessages: enabled });
    } catch (error) {
      logger.error('Failed to sync enableAiCommitMessages:', error);
    }
  },
  setPlanUseSelectedWorktreeBranch: async (enabled) => {
    set({ planUseSelectedWorktreeBranch: enabled });
    // Sync to server
    try {
      const httpApi = getHttpApiClient();
      await httpApi.put('/api/settings', { planUseSelectedWorktreeBranch: enabled });
    } catch (error) {
      logger.error('Failed to sync planUseSelectedWorktreeBranch:', error);
    }
  },
  setAddFeatureUseSelectedWorktreeBranch: async (enabled) => {
    set({ addFeatureUseSelectedWorktreeBranch: enabled });
    // Sync to server
    try {
      const httpApi = getHttpApiClient();
      await httpApi.put('/api/settings', { addFeatureUseSelectedWorktreeBranch: enabled });
    } catch (error) {
      logger.error('Failed to sync addFeatureUseSelectedWorktreeBranch:', error);
    }
  },

  // Worktree Settings actions
  setUseWorktrees: (enabled) => set({ useWorktrees: enabled }),
  setCurrentWorktree: (projectPath, worktreePath, branch) =>
    set((state) => ({
      currentWorktreeByProject: {
        ...state.currentWorktreeByProject,
        [projectPath]: { path: worktreePath, branch },
      },
    })),
  setWorktrees: (projectPath, worktrees) =>
    set((state) => ({
      worktreesByProject: {
        ...state.worktreesByProject,
        [projectPath]: worktrees,
      },
    })),
  getCurrentWorktree: (projectPath) => get().currentWorktreeByProject[projectPath] ?? null,
  getWorktrees: (projectPath) => get().worktreesByProject[projectPath] ?? [],
  isPrimaryWorktreeBranch: (projectPath: string, branchName: string) => {
    const worktrees = get().worktreesByProject[projectPath] ?? [];
    const mainWorktree = worktrees.find((w) => w.isMain);
    return mainWorktree?.branch === branchName;
  },
  getPrimaryWorktreeBranch: (projectPath: string) => {
    const worktrees = get().worktreesByProject[projectPath] ?? [];
    const mainWorktree = worktrees.find((w) => w.isMain);
    return mainWorktree?.branch ?? null;
  },

  // Keyboard Shortcuts actions
  setKeyboardShortcut: (key, value) =>
    set((state) => ({
      keyboardShortcuts: { ...state.keyboardShortcuts, [key]: value },
    })),
  setKeyboardShortcuts: (shortcuts) =>
    set((state) => ({
      keyboardShortcuts: { ...state.keyboardShortcuts, ...shortcuts },
    })),
  resetKeyboardShortcuts: () => set({ keyboardShortcuts: DEFAULT_KEYBOARD_SHORTCUTS }),

  // Audio Settings actions
  setMuteDoneSound: (muted) => set({ muteDoneSound: muted }),
  setNotificationSoundVolume: (volume) =>
    set({ notificationSoundVolume: Math.max(0, Math.min(1, volume)) }),
  setNotificationSoundFile: (soundFile) => set({ notificationSoundFile: soundFile }),
  setAllPhasesCompleteSoundFile: (soundFile) => set({ allPhasesCompleteSoundFile: soundFile }),

  // Splash Screen actions
  setDisableSplashScreen: (disabled) => set({ disableSplashScreen: disabled }),

  // Server Log Level actions
  setServerLogLevel: (level) => set({ serverLogLevel: level }),
  setEnableRequestLogging: (enabled) => set({ enableRequestLogging: enabled }),

  // Developer Tools actions
  setShowQueryDevtools: (show) => set({ showQueryDevtools: show }),

  // Enhancement Model actions
  setEnhancementModel: (model) => set({ enhancementModel: model }),

  // Validation Model actions
  setValidationModel: (model) => set({ validationModel: model }),

  // Phase Model actions
  setPhaseModel: async (phase, entry) => {
    set((state) => ({
      phaseModels: { ...state.phaseModels, [phase]: entry },
    }));
    // Sync to server
    try {
      const httpApi = getHttpApiClient();
      await httpApi.put('/api/settings', { phaseModels: get().phaseModels });
    } catch (error) {
      logger.error('Failed to sync phase model:', error);
    }
  },
  setPhaseModels: async (models) => {
    set((state) => ({
      phaseModels: { ...state.phaseModels, ...models },
    }));
    // Sync to server
    try {
      const httpApi = getHttpApiClient();
      await httpApi.put('/api/settings', { phaseModels: get().phaseModels });
    } catch (error) {
      logger.error('Failed to sync phase models:', error);
    }
  },
  resetPhaseModels: async () => {
    set({ phaseModels: DEFAULT_PHASE_MODELS });
    // Sync to server
    try {
      const httpApi = getHttpApiClient();
      await httpApi.put('/api/settings', { phaseModels: DEFAULT_PHASE_MODELS });
    } catch (error) {
      logger.error('Failed to sync phase models reset:', error);
    }
  },
  toggleFavoriteModel: (modelId) => {
    const current = get().favoriteModels;
    const updated = current.includes(modelId)
      ? current.filter((id) => id !== modelId)
      : [...current, modelId];
    set({ favoriteModels: updated });
    setJSON(FAVORITE_MODELS_STORAGE_KEY, updated);
  },

  setSelectedAgentModel: (entry) => {
    set({ selectedAgentModel: entry });
    setJSON(SELECTED_AGENT_MODEL_STORAGE_KEY, entry);
  },
  // Cursor CLI Settings actions
  setEnabledCursorModels: (models) => set({ enabledCursorModels: models }),
  setCursorDefaultModel: (model) => set({ cursorDefaultModel: model }),
  toggleCursorModel: (model, enabled) =>
    set((state) => ({
      enabledCursorModels: enabled
        ? [...state.enabledCursorModels, model]
        : state.enabledCursorModels.filter((m) => m !== model),
    })),

  // Codex CLI Settings actions
  setEnabledCodexModels: (models) => set({ enabledCodexModels: models }),
  setCodexDefaultModel: (model) => set({ codexDefaultModel: model }),
  toggleCodexModel: (model, enabled) =>
    set((state) => ({
      enabledCodexModels: enabled
        ? [...state.enabledCodexModels, model]
        : state.enabledCodexModels.filter((m) => m !== model),
    })),
  setCodexAutoLoadAgents: async (enabled) => {
    set({ codexAutoLoadAgents: enabled });
    try {
      const httpApi = getHttpApiClient();
      await httpApi.put('/api/settings', { codexAutoLoadAgents: enabled });
    } catch (error) {
      logger.error('Failed to sync codexAutoLoadAgents:', error);
    }
  },
  setCodexSandboxMode: async (mode) => {
    set({ codexSandboxMode: mode });
    try {
      const httpApi = getHttpApiClient();
      await httpApi.put('/api/settings', { codexSandboxMode: mode });
    } catch (error) {
      logger.error('Failed to sync codexSandboxMode:', error);
    }
  },
  setCodexApprovalPolicy: async (policy) => {
    set({ codexApprovalPolicy: policy });
    try {
      const httpApi = getHttpApiClient();
      await httpApi.put('/api/settings', { codexApprovalPolicy: policy });
    } catch (error) {
      logger.error('Failed to sync codexApprovalPolicy:', error);
    }
  },
  setCodexEnableWebSearch: async (enabled) => {
    set({ codexEnableWebSearch: enabled });
    try {
      const httpApi = getHttpApiClient();
      await httpApi.put('/api/settings', { codexEnableWebSearch: enabled });
    } catch (error) {
      logger.error('Failed to sync codexEnableWebSearch:', error);
    }
  },
  setCodexEnableImages: async (enabled) => {
    set({ codexEnableImages: enabled });
    try {
      const httpApi = getHttpApiClient();
      await httpApi.put('/api/settings', { codexEnableImages: enabled });
    } catch (error) {
      logger.error('Failed to sync codexEnableImages:', error);
    }
  },

  // OpenCode CLI Settings actions
  setEnabledOpencodeModels: (models) => set({ enabledOpencodeModels: models }),
  setOpencodeDefaultModel: (model) => set({ opencodeDefaultModel: model }),
  toggleOpencodeModel: (model, enabled) =>
    set((state) => ({
      enabledOpencodeModels: enabled
        ? [...state.enabledOpencodeModels, model]
        : state.enabledOpencodeModels.filter((m) => m !== model),
    })),
  setDynamicOpencodeModels: (models) => set({ dynamicOpencodeModels: models }),
  setEnabledDynamicModelIds: (ids) => set({ enabledDynamicModelIds: ids }),
  toggleDynamicModel: (modelId, enabled) =>
    set((state) => ({
      enabledDynamicModelIds: enabled
        ? [...state.enabledDynamicModelIds, modelId]
        : state.enabledDynamicModelIds.filter((id) => id !== modelId),
    })),
  setCachedOpencodeProviders: (providers) => set({ cachedOpencodeProviders: providers }),

  // Gemini CLI Settings actions
  setEnabledGeminiModels: (models) => set({ enabledGeminiModels: models }),
  setGeminiDefaultModel: (model) => set({ geminiDefaultModel: model }),
  toggleGeminiModel: (model, enabled) =>
    set((state) => ({
      enabledGeminiModels: enabled
        ? [...state.enabledGeminiModels, model]
        : state.enabledGeminiModels.filter((m) => m !== model),
    })),

  // Copilot SDK Settings actions
  setEnabledCopilotModels: (models) => set({ enabledCopilotModels: models }),
  setCopilotDefaultModel: (model) => set({ copilotDefaultModel: model }),
  toggleCopilotModel: (model, enabled) =>
    set((state) => ({
      enabledCopilotModels: enabled
        ? [...state.enabledCopilotModels, model]
        : state.enabledCopilotModels.filter((m) => m !== model),
    })),

  // Provider Visibility Settings actions
  setDisabledProviders: (providers) => set({ disabledProviders: providers }),
  toggleProviderDisabled: (provider, disabled) =>
    set((state) => ({
      disabledProviders: disabled
        ? [...state.disabledProviders, provider]
        : state.disabledProviders.filter((p) => p !== provider),
    })),
  isProviderDisabled: (provider) => get().disabledProviders.includes(provider),

  // Claude Agent SDK Settings actions
  setAutoLoadClaudeMd: async (enabled) => {
    set({ autoLoadClaudeMd: enabled });
    try {
      const httpApi = getHttpApiClient();
      await httpApi.put('/api/settings', { autoLoadClaudeMd: enabled });
    } catch (error) {
      logger.error('Failed to sync autoLoadClaudeMd:', error);
    }
  },
  setSkipSandboxWarning: async (skip) => {
    set({ skipSandboxWarning: skip });
    try {
      const httpApi = getHttpApiClient();
      await httpApi.put('/api/settings', { skipSandboxWarning: skip });
    } catch (error) {
      logger.error('Failed to sync skipSandboxWarning:', error);
    }
  },

  // Editor Configuration actions
  setDefaultEditorCommand: (command) => set({ defaultEditorCommand: command }),

  // Terminal Configuration actions
  setDefaultTerminalId: (terminalId) => set({ defaultTerminalId: terminalId }),

  // Prompt Customization actions
  setPromptCustomization: async (customization) => {
    set({ promptCustomization: customization });
    try {
      const httpApi = getHttpApiClient();
      await httpApi.put('/api/settings', { promptCustomization: customization });
    } catch (error) {
      logger.error('Failed to sync prompt customization:', error);
    }
  },

  // Event Hook actions
  setEventHooks: (hooks) => set({ eventHooks: hooks }),

  // Claude-Compatible Provider actions (new system)
  addClaudeCompatibleProvider: async (provider) => {
    set((state) => ({
      claudeCompatibleProviders: [...state.claudeCompatibleProviders, provider],
    }));
    try {
      const httpApi = getHttpApiClient();
      await httpApi.put('/api/settings', {
        claudeCompatibleProviders: get().claudeCompatibleProviders,
      });
    } catch (error) {
      logger.error('Failed to sync Claude-compatible providers:', error);
    }
  },
  updateClaudeCompatibleProvider: async (id, updates) => {
    set((state) => ({
      claudeCompatibleProviders: state.claudeCompatibleProviders.map((p) =>
        p.id === id ? { ...p, ...updates } : p
      ),
    }));
    try {
      const httpApi = getHttpApiClient();
      await httpApi.put('/api/settings', {
        claudeCompatibleProviders: get().claudeCompatibleProviders,
      });
    } catch (error) {
      logger.error('Failed to sync Claude-compatible providers:', error);
    }
  },
  deleteClaudeCompatibleProvider: async (id) => {
    set((state) => ({
      claudeCompatibleProviders: state.claudeCompatibleProviders.filter((p) => p.id !== id),
    }));
    try {
      const httpApi = getHttpApiClient();
      await httpApi.put('/api/settings', {
        claudeCompatibleProviders: get().claudeCompatibleProviders,
      });
    } catch (error) {
      logger.error('Failed to sync Claude-compatible providers:', error);
    }
  },
  setClaudeCompatibleProviders: async (providers) => {
    set({ claudeCompatibleProviders: providers });
    try {
      const httpApi = getHttpApiClient();
      await httpApi.put('/api/settings', { claudeCompatibleProviders: providers });
    } catch (error) {
      logger.error('Failed to sync Claude-compatible providers:', error);
    }
  },
  toggleClaudeCompatibleProviderEnabled: async (id) => {
    set((state) => ({
      claudeCompatibleProviders: state.claudeCompatibleProviders.map((p) =>
        p.id === id ? { ...p, enabled: !p.enabled } : p
      ),
    }));
    try {
      const httpApi = getHttpApiClient();
      await httpApi.put('/api/settings', {
        claudeCompatibleProviders: get().claudeCompatibleProviders,
      });
    } catch (error) {
      logger.error('Failed to sync Claude-compatible providers:', error);
    }
  },

  // Claude API Profile actions (deprecated)
  addClaudeApiProfile: async (profile) => {
    set((state) => ({
      claudeApiProfiles: [...state.claudeApiProfiles, profile],
    }));
    try {
      const httpApi = getHttpApiClient();
      await httpApi.put('/api/settings', { claudeApiProfiles: get().claudeApiProfiles });
    } catch (error) {
      logger.error('Failed to sync Claude API profiles:', error);
    }
  },
  updateClaudeApiProfile: async (id, updates) => {
    set((state) => ({
      claudeApiProfiles: state.claudeApiProfiles.map((p) =>
        p.id === id ? { ...p, ...updates } : p
      ),
    }));
    try {
      const httpApi = getHttpApiClient();
      await httpApi.put('/api/settings', { claudeApiProfiles: get().claudeApiProfiles });
    } catch (error) {
      logger.error('Failed to sync Claude API profiles:', error);
    }
  },
  deleteClaudeApiProfile: async (id) => {
    set((state) => ({
      claudeApiProfiles: state.claudeApiProfiles.filter((p) => p.id !== id),
      activeClaudeApiProfileId:
        state.activeClaudeApiProfileId === id ? null : state.activeClaudeApiProfileId,
    }));
    try {
      const httpApi = getHttpApiClient();
      await httpApi.put('/api/settings', {
        claudeApiProfiles: get().claudeApiProfiles,
        activeClaudeApiProfileId: get().activeClaudeApiProfileId,
      });
    } catch (error) {
      logger.error('Failed to sync Claude API profiles:', error);
    }
  },
  setActiveClaudeApiProfile: async (id) => {
    set({ activeClaudeApiProfileId: id });
    try {
      const httpApi = getHttpApiClient();
      await httpApi.put('/api/settings', { activeClaudeApiProfileId: id });
    } catch (error) {
      logger.error('Failed to sync active Claude API profile:', error);
    }
  },
  setClaudeApiProfiles: async (profiles) => {
    set({ claudeApiProfiles: profiles });
    try {
      const httpApi = getHttpApiClient();
      await httpApi.put('/api/settings', { claudeApiProfiles: profiles });
    } catch (error) {
      logger.error('Failed to sync Claude API profiles:', error);
    }
  },

  // MCP Server actions
  addMCPServer: (server) =>
    set((state) => ({
      mcpServers: [
        ...state.mcpServers,
        { ...server, id: `mcp-${Date.now()}-${Math.random().toString(36).slice(2)}` },
      ],
    })),
  updateMCPServer: (id, updates) =>
    set((state) => ({
      mcpServers: state.mcpServers.map((s) => (s.id === id ? { ...s, ...updates } : s)),
    })),
  removeMCPServer: (id) =>
    set((state) => ({
      mcpServers: state.mcpServers.filter((s) => s.id !== id),
    })),
  reorderMCPServers: (oldIndex, newIndex) =>
    set((state) => {
      const servers = [...state.mcpServers];
      const [removed] = servers.splice(oldIndex, 1);
      servers.splice(newIndex, 0, removed);
      return { mcpServers: servers };
    }),

  // Project Analysis actions
  setProjectAnalysis: (analysis) => set({ projectAnalysis: analysis }),
  setIsAnalyzing: (analyzing) => set({ isAnalyzing: analyzing }),
  clearAnalysis: () => set({ projectAnalysis: null, isAnalyzing: false }),

  // Agent Session actions
  setLastSelectedSession: (projectPath, sessionId) =>
    set((state) => ({
      lastSelectedSessionByProject: {
        ...state.lastSelectedSessionByProject,
        [projectPath]: sessionId ?? undefined,
      } as Record<string, string>,
    })),
  getLastSelectedSession: (projectPath) => get().lastSelectedSessionByProject[projectPath] ?? null,

  // Board Background actions
  setBoardBackground: (projectPath, imagePath) =>
    set((state) => ({
      boardBackgroundByProject: {
        ...state.boardBackgroundByProject,
        [projectPath]: {
          ...(state.boardBackgroundByProject[projectPath] ?? defaultBackgroundSettings),
          imagePath,
          imageVersion: Date.now(), // Bust cache on image change
        },
      },
    })),
  setCardOpacity: (projectPath, opacity) =>
    set((state) => ({
      boardBackgroundByProject: {
        ...state.boardBackgroundByProject,
        [projectPath]: {
          ...(state.boardBackgroundByProject[projectPath] ?? defaultBackgroundSettings),
          cardOpacity: opacity,
        },
      },
    })),
  setColumnOpacity: (projectPath, opacity) =>
    set((state) => ({
      boardBackgroundByProject: {
        ...state.boardBackgroundByProject,
        [projectPath]: {
          ...(state.boardBackgroundByProject[projectPath] ?? defaultBackgroundSettings),
          columnOpacity: opacity,
        },
      },
    })),
  setColumnBorderEnabled: (projectPath, enabled) =>
    set((state) => ({
      boardBackgroundByProject: {
        ...state.boardBackgroundByProject,
        [projectPath]: {
          ...(state.boardBackgroundByProject[projectPath] ?? defaultBackgroundSettings),
          columnBorderEnabled: enabled,
        },
      },
    })),
  getBoardBackground: (projectPath) =>
    get().boardBackgroundByProject[projectPath] ?? defaultBackgroundSettings,
  setCardGlassmorphism: (projectPath, enabled) =>
    set((state) => ({
      boardBackgroundByProject: {
        ...state.boardBackgroundByProject,
        [projectPath]: {
          ...(state.boardBackgroundByProject[projectPath] ?? defaultBackgroundSettings),
          cardGlassmorphism: enabled,
        },
      },
    })),
  setCardBorderEnabled: (projectPath, enabled) =>
    set((state) => ({
      boardBackgroundByProject: {
        ...state.boardBackgroundByProject,
        [projectPath]: {
          ...(state.boardBackgroundByProject[projectPath] ?? defaultBackgroundSettings),
          cardBorderEnabled: enabled,
        },
      },
    })),
  setCardBorderOpacity: (projectPath, opacity) =>
    set((state) => ({
      boardBackgroundByProject: {
        ...state.boardBackgroundByProject,
        [projectPath]: {
          ...(state.boardBackgroundByProject[projectPath] ?? defaultBackgroundSettings),
          cardBorderOpacity: opacity,
        },
      },
    })),
  setHideScrollbar: (projectPath, hide) =>
    set((state) => ({
      boardBackgroundByProject: {
        ...state.boardBackgroundByProject,
        [projectPath]: {
          ...(state.boardBackgroundByProject[projectPath] ?? defaultBackgroundSettings),
          hideScrollbar: hide,
        },
      },
    })),
  clearBoardBackground: (projectPath) =>
    set((state) => {
      const newBackgrounds = { ...state.boardBackgroundByProject };
      delete newBackgrounds[projectPath];
      return { boardBackgroundByProject: newBackgrounds };
    }),

  // Terminal actions
  setTerminalUnlocked: (unlocked, token) =>
    set((state) => ({
      terminalState: {
        ...state.terminalState,
        isUnlocked: unlocked,
        authToken: token ?? state.terminalState.authToken,
      },
    })),

  setActiveTerminalSession: (sessionId) =>
    set((state) => ({
      terminalState: {
        ...state.terminalState,
        activeSessionId: sessionId,
      },
    })),

  toggleTerminalMaximized: (sessionId) =>
    set((state) => ({
      terminalState: {
        ...state.terminalState,
        maximizedSessionId: state.terminalState.maximizedSessionId === sessionId ? null : sessionId,
      },
    })),

  addTerminalToLayout: (sessionId, direction = 'horizontal', _targetSessionId, branchName) => {
    set((state) => {
      const { tabs, activeTabId } = state.terminalState;

      // If no tabs exist, create a new one
      if (tabs.length === 0) {
        const newTabId = `tab-${Date.now()}-${Math.random().toString(36).slice(2)}`;
        return {
          terminalState: {
            ...state.terminalState,
            tabs: [
              {
                id: newTabId,
                name: 'Terminal 1',
                layout: { type: 'terminal' as const, sessionId, branchName },
              },
            ],
            activeTabId: newTabId,
            activeSessionId: sessionId,
          },
        };
      }

      // Find active tab
      const activeTab = tabs.find((t) => t.id === activeTabId);
      if (!activeTab) return state;

      // If tab has no layout, add terminal directly
      if (!activeTab.layout) {
        return {
          terminalState: {
            ...state.terminalState,
            tabs: tabs.map((t) =>
              t.id === activeTabId
                ? { ...t, layout: { type: 'terminal' as const, sessionId, branchName } }
                : t
            ),
            activeSessionId: sessionId,
          },
        };
      }

      // Add new terminal to split
      const newLayout: TerminalPanelContent = {
        type: 'split',
        id: generateSplitId(),
        direction,
        panels: [activeTab.layout, { type: 'terminal' as const, sessionId, branchName }],
      };

      return {
        terminalState: {
          ...state.terminalState,
          tabs: tabs.map((t) => (t.id === activeTabId ? { ...t, layout: newLayout } : t)),
          activeSessionId: sessionId,
        },
      };
    });
  },

  removeTerminalFromLayout: (sessionId) => {
    set((state) => {
      const { tabs } = state.terminalState;

      const removeFromLayout = (
        layout: TerminalPanelContent | null
      ): TerminalPanelContent | null => {
        if (!layout) return null;
        if (layout.type === 'terminal' && layout.sessionId === sessionId) return null;
        if (layout.type === 'testRunner' && layout.sessionId === sessionId) return null;
        if (layout.type === 'split') {
          const remainingPanels = layout.panels
            .map(removeFromLayout)
            .filter((p): p is TerminalPanelContent => p !== null);
          if (remainingPanels.length === 0) return null;
          if (remainingPanels.length === 1) return remainingPanels[0];
          return { ...layout, panels: remainingPanels };
        }
        return layout;
      };

      const updatedTabs = tabs.map((t) => ({
        ...t,
        layout: removeFromLayout(t.layout),
      }));

      // Find a new active session if the removed one was active
      let newActiveSessionId = state.terminalState.activeSessionId;
      if (newActiveSessionId === sessionId) {
        // Find the first available session in any tab
        for (const tab of updatedTabs) {
          const findFirstSession = (layout: TerminalPanelContent | null): string | null => {
            if (!layout) return null;
            if (layout.type === 'terminal' || layout.type === 'testRunner') return layout.sessionId;
            if (layout.type === 'split') {
              for (const panel of layout.panels) {
                const found = findFirstSession(panel);
                if (found) return found;
              }
            }
            return null;
          };
          const found = findFirstSession(tab.layout);
          if (found) {
            newActiveSessionId = found;
            break;
          }
        }
        if (newActiveSessionId === sessionId) newActiveSessionId = null;
      }

      return {
        terminalState: {
          ...state.terminalState,
          tabs: updatedTabs,
          activeSessionId: newActiveSessionId,
          maximizedSessionId:
            state.terminalState.maximizedSessionId === sessionId
              ? null
              : state.terminalState.maximizedSessionId,
        },
      };
    });
  },

  swapTerminals: (sessionId1, sessionId2) => {
    set((state) => {
      const { tabs } = state.terminalState;

      const swapInLayout = (layout: TerminalPanelContent | null): TerminalPanelContent | null => {
        if (!layout) return null;
        if (
          (layout.type === 'terminal' || layout.type === 'testRunner') &&
          layout.sessionId === sessionId1
        ) {
          return { ...layout, sessionId: sessionId2 };
        }
        if (
          (layout.type === 'terminal' || layout.type === 'testRunner') &&
          layout.sessionId === sessionId2
        ) {
          return { ...layout, sessionId: sessionId1 };
        }
        if (layout.type === 'split') {
          return {
            ...layout,
            panels: layout.panels
              .map(swapInLayout)
              .filter((p): p is TerminalPanelContent => p !== null),
          };
        }
        return layout;
      };

      return {
        terminalState: {
          ...state.terminalState,
          tabs: tabs.map((t) => ({ ...t, layout: swapInLayout(t.layout) })),
        },
      };
    });
  },

  clearTerminalState: () =>
    set((state) => ({
      terminalState: {
        ...state.terminalState,
        tabs: [],
        activeTabId: null,
        activeSessionId: null,
        maximizedSessionId: null,
      },
    })),

  setTerminalPanelFontSize: (sessionId, fontSize) => {
    set((state) => {
      const { tabs } = state.terminalState;

      const updateFontSize = (layout: TerminalPanelContent | null): TerminalPanelContent | null => {
        if (!layout) return null;
        if (layout.type === 'terminal' && layout.sessionId === sessionId) {
          return { ...layout, fontSize };
        }
        if (layout.type === 'split') {
          return {
            ...layout,
            panels: layout.panels
              .map(updateFontSize)
              .filter((p): p is TerminalPanelContent => p !== null),
          };
        }
        return layout;
      };

      return {
        terminalState: {
          ...state.terminalState,
          tabs: tabs.map((t) => ({ ...t, layout: updateFontSize(t.layout) })),
        },
      };
    });
  },

  setTerminalDefaultFontSize: (fontSize) =>
    set((state) => ({
      terminalState: { ...state.terminalState, defaultFontSize: fontSize },
    })),

  setTerminalDefaultRunScript: (script) =>
    set((state) => ({
      terminalState: { ...state.terminalState, defaultRunScript: script },
    })),

  setTerminalScreenReaderMode: (enabled) =>
    set((state) => ({
      terminalState: { ...state.terminalState, screenReaderMode: enabled },
    })),

  setTerminalFontFamily: (fontFamily) =>
    set((state) => ({
      terminalState: { ...state.terminalState, fontFamily },
    })),

  setTerminalScrollbackLines: (lines) =>
    set((state) => ({
      terminalState: { ...state.terminalState, scrollbackLines: lines },
    })),

  setTerminalLineHeight: (lineHeight) =>
    set((state) => ({
      terminalState: { ...state.terminalState, lineHeight },
    })),

  setTerminalMaxSessions: (maxSessions) =>
    set((state) => ({
      terminalState: { ...state.terminalState, maxSessions },
    })),

  setTerminalLastActiveProjectPath: (projectPath) => {
    persistTerminalLastActiveProjectPath(projectPath);
    set((state) => ({
      terminalState: { ...state.terminalState, lastActiveProjectPath: projectPath },
    }));
  },

  setOpenTerminalMode: (mode) =>
    set((state) => ({
      terminalState: { ...state.terminalState, openTerminalMode: mode },
    })),

  addTerminalTab: (name) => {
    const newTabId = `tab-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    const tabNumber = get().terminalState.tabs.length + 1;
    set((state) => ({
      terminalState: {
        ...state.terminalState,
        tabs: [
          ...state.terminalState.tabs,
          { id: newTabId, name: name || `Terminal ${tabNumber}`, layout: null },
        ],
        activeTabId: newTabId,
      },
    }));
    return newTabId;
  },

  removeTerminalTab: (tabId) => {
    set((state) => {
      const tabIndex = state.terminalState.tabs.findIndex((t) => t.id === tabId);
      const newTabs = state.terminalState.tabs.filter((t) => t.id !== tabId);

      let newActiveTabId = state.terminalState.activeTabId;
      if (newActiveTabId === tabId && newTabs.length > 0) {
        // Select adjacent tab
        const newIndex = Math.min(tabIndex, newTabs.length - 1);
        newActiveTabId = newTabs[newIndex].id;
      } else if (newTabs.length === 0) {
        newActiveTabId = null;
      }

      // Find new active session from new active tab
      let newActiveSessionId = state.terminalState.activeSessionId;
      if (newActiveTabId) {
        const newActiveTab = newTabs.find((t) => t.id === newActiveTabId);
        if (newActiveTab?.layout) {
          const findFirstSession = (layout: TerminalPanelContent): string | null => {
            if (layout.type === 'terminal' || layout.type === 'testRunner') return layout.sessionId;
            if (layout.type === 'split') {
              for (const panel of layout.panels) {
                const found = findFirstSession(panel);
                if (found) return found;
              }
            }
            return null;
          };
          newActiveSessionId = findFirstSession(newActiveTab.layout);
        } else {
          newActiveSessionId = null;
        }
      } else {
        newActiveSessionId = null;
      }

      return {
        terminalState: {
          ...state.terminalState,
          tabs: newTabs,
          activeTabId: newActiveTabId,
          activeSessionId: newActiveSessionId,
        },
      };
    });
  },

  setActiveTerminalTab: (tabId) => {
    set((state) => {
      const tab = state.terminalState.tabs.find((t) => t.id === tabId);
      if (!tab) return state;

      // Find first session in the tab's layout
      let newActiveSessionId = state.terminalState.activeSessionId;
      if (tab.layout) {
        const findFirstSession = (layout: TerminalPanelContent): string | null => {
          if (layout.type === 'terminal' || layout.type === 'testRunner') return layout.sessionId;
          if (layout.type === 'split') {
            for (const panel of layout.panels) {
              const found = findFirstSession(panel);
              if (found) return found;
            }
          }
          return null;
        };
        newActiveSessionId = findFirstSession(tab.layout);
      } else {
        newActiveSessionId = null;
      }

      return {
        terminalState: {
          ...state.terminalState,
          activeTabId: tabId,
          activeSessionId: newActiveSessionId,
        },
      };
    });
  },

  renameTerminalTab: (tabId, name) =>
    set((state) => ({
      terminalState: {
        ...state.terminalState,
        tabs: state.terminalState.tabs.map((t) => (t.id === tabId ? { ...t, name } : t)),
      },
    })),

  reorderTerminalTabs: (fromTabId, toTabId) =>
    set((state) => {
      const tabs = [...state.terminalState.tabs];
      const fromIndex = tabs.findIndex((t) => t.id === fromTabId);
      const toIndex = tabs.findIndex((t) => t.id === toTabId);
      if (fromIndex === -1 || toIndex === -1) return state;

      const [removed] = tabs.splice(fromIndex, 1);
      tabs.splice(toIndex, 0, removed);

      return {
        terminalState: { ...state.terminalState, tabs },
      };
    }),

  moveTerminalToTab: (sessionId, targetTabId) => {
    set((state) => {
      const { tabs } = state.terminalState;

      // Find the terminal panel to move
      let panelToMove: TerminalPanelContent | null = null;
      let sourceTabId: string | null = null;

      for (const tab of tabs) {
        const findPanel = (layout: TerminalPanelContent | null): TerminalPanelContent | null => {
          if (!layout) return null;
          if (
            (layout.type === 'terminal' || layout.type === 'testRunner') &&
            layout.sessionId === sessionId
          ) {
            return layout;
          }
          if (layout.type === 'split') {
            for (const panel of layout.panels) {
              const found = findPanel(panel);
              if (found) return found;
            }
          }
          return null;
        };
        const found = findPanel(tab.layout);
        if (found) {
          panelToMove = found;
          sourceTabId = tab.id;
          break;
        }
      }

      if (!panelToMove || !sourceTabId) return state;

      // Remove from source tab
      const removeFromLayout = (
        layout: TerminalPanelContent | null
      ): TerminalPanelContent | null => {
        if (!layout) return null;
        if (
          (layout.type === 'terminal' || layout.type === 'testRunner') &&
          layout.sessionId === sessionId
        ) {
          return null;
        }
        if (layout.type === 'split') {
          const remainingPanels = layout.panels
            .map(removeFromLayout)
            .filter((p): p is TerminalPanelContent => p !== null);
          if (remainingPanels.length === 0) return null;
          if (remainingPanels.length === 1) return remainingPanels[0];
          return { ...layout, panels: remainingPanels };
        }
        return layout;
      };

      let newTabs = tabs.map((t) =>
        t.id === sourceTabId ? { ...t, layout: removeFromLayout(t.layout) } : t
      );

      // Add to target tab (or create new tab)
      if (targetTabId === 'new') {
        const newTabId = `tab-${Date.now()}-${Math.random().toString(36).slice(2)}`;
        const tabNumber = newTabs.length + 1;
        newTabs = [
          ...newTabs,
          { id: newTabId, name: `Terminal ${tabNumber}`, layout: panelToMove },
        ];
        return {
          terminalState: {
            ...state.terminalState,
            tabs: newTabs,
            activeTabId: newTabId,
            activeSessionId: sessionId,
          },
        };
      } else {
        newTabs = newTabs.map((t) => {
          if (t.id !== targetTabId) return t;
          if (!t.layout) {
            return { ...t, layout: panelToMove };
          }
          return {
            ...t,
            layout: {
              type: 'split' as const,
              id: generateSplitId(),
              direction: 'horizontal' as const,
              panels: [t.layout, panelToMove!],
            },
          };
        });
        return {
          terminalState: {
            ...state.terminalState,
            tabs: newTabs,
            activeTabId: targetTabId,
            activeSessionId: sessionId,
          },
        };
      }
    });
  },

  addTerminalToTab: (sessionId, tabId, direction = 'horizontal', branchName) => {
    set((state) => {
      const { tabs } = state.terminalState;
      const targetTab = tabs.find((t) => t.id === tabId);
      if (!targetTab) return state;

      const newPanel: TerminalPanelContent = { type: 'terminal', sessionId, branchName };

      if (!targetTab.layout) {
        return {
          terminalState: {
            ...state.terminalState,
            tabs: tabs.map((t) => (t.id === tabId ? { ...t, layout: newPanel } : t)),
            activeTabId: tabId,
            activeSessionId: sessionId,
          },
        };
      }

      const newLayout: TerminalPanelContent = {
        type: 'split',
        id: generateSplitId(),
        direction,
        panels: [targetTab.layout, newPanel],
      };

      return {
        terminalState: {
          ...state.terminalState,
          tabs: tabs.map((t) => (t.id === tabId ? { ...t, layout: newLayout } : t)),
          activeTabId: tabId,
          activeSessionId: sessionId,
        },
      };
    });
  },

  setTerminalTabLayout: (tabId, layout, activeSessionId) =>
    set((state) => ({
      terminalState: {
        ...state.terminalState,
        tabs: state.terminalState.tabs.map((t) => (t.id === tabId ? { ...t, layout } : t)),
        activeSessionId: activeSessionId ?? state.terminalState.activeSessionId,
      },
    })),

  updateTerminalPanelSizes: (tabId, panelKeys, sizes) => {
    set((state) => {
      const { tabs } = state.terminalState;
      const tab = tabs.find((t) => t.id === tabId);
      if (!tab?.layout) return state;

      const updateSizes = (layout: TerminalPanelContent): TerminalPanelContent => {
        if (layout.type === 'split') {
          // Find matching panels and update sizes
          const updatedPanels = layout.panels.map((panel, index) => {
            // Generate key for this panel
            const panelKey =
              panel.type === 'split'
                ? panel.id
                : panel.type === 'terminal' || panel.type === 'testRunner'
                  ? panel.sessionId
                  : '';
            const keyIndex = panelKeys.indexOf(panelKey);
            if (keyIndex !== -1 && sizes[keyIndex] !== undefined) {
              return { ...panel, size: sizes[keyIndex] };
            }
            // Recursively update nested splits
            if (panel.type === 'split') {
              return updateSizes(panel);
            }
            return panel;
          });
          return { ...layout, panels: updatedPanels };
        }
        return layout;
      };

      return {
        terminalState: {
          ...state.terminalState,
          tabs: tabs.map((t) => (t.id === tabId ? { ...t, layout: updateSizes(t.layout!) } : t)),
        },
      };
    });
  },

  saveTerminalLayout: (projectPath) => {
    const state = get();
    const { terminalState } = state;

    const persistLayout = (layout: TerminalPanelContent | null): PersistedTerminalPanel | null => {
      if (!layout) return null;
      if (layout.type === 'terminal') {
        return {
          type: 'terminal',
          size: layout.size,
          fontSize: layout.fontSize,
          sessionId: layout.sessionId,
          branchName: layout.branchName,
        };
      }
      if (layout.type === 'testRunner') {
        return {
          type: 'testRunner',
          size: layout.size,
          sessionId: layout.sessionId,
          worktreePath: layout.worktreePath,
        };
      }
      if (layout.type === 'split') {
        return {
          type: 'split',
          id: layout.id,
          direction: layout.direction,
          panels: layout.panels
            .map(persistLayout)
            .filter((p): p is PersistedTerminalPanel => p !== null),
          size: layout.size,
        };
      }
      return null;
    };

    const persistedState: PersistedTerminalState = {
      tabs: terminalState.tabs.map((t) => ({
        id: t.id,
        name: t.name,
        layout: persistLayout(t.layout),
      })),
      activeTabIndex: terminalState.tabs.findIndex((t) => t.id === terminalState.activeTabId),
      defaultFontSize: terminalState.defaultFontSize,
      defaultRunScript: terminalState.defaultRunScript,
      screenReaderMode: terminalState.screenReaderMode,
      fontFamily: terminalState.fontFamily,
      scrollbackLines: terminalState.scrollbackLines,
      lineHeight: terminalState.lineHeight,
    };

    const nextLayouts = {
      ...state.terminalLayoutByProject,
      [projectPath]: persistedState,
    };

    persistTerminalLayoutByProject(nextLayouts);
    set({ terminalLayoutByProject: nextLayouts });
  },

  getPersistedTerminalLayout: (projectPath) => get().terminalLayoutByProject[projectPath] ?? null,

  clearPersistedTerminalLayout: (projectPath) => {
    const newLayouts = { ...get().terminalLayoutByProject };
    delete newLayouts[projectPath];
    persistTerminalLayoutByProject(newLayouts);
    set({ terminalLayoutByProject: newLayouts });
  },

  // Spec Creation actions
  setSpecCreatingForProject: (projectPath) => set({ specCreatingForProject: projectPath }),
  isSpecCreatingForProject: (projectPath) => get().specCreatingForProject === projectPath,

  setDefaultPlanningMode: (mode) => set({ defaultPlanningMode: mode }),
  setDefaultRequirePlanApproval: (require) => set({ defaultRequirePlanApproval: require }),
  setDefaultFeatureModel: (entry) => set({ defaultFeatureModel: entry }),

  // Plan Approval actions
  setPendingPlanApproval: (approval) => set({ pendingPlanApproval: approval }),

  // Pipeline actions
  setPipelineConfig: (projectPath, config) =>
    set((state) => ({
      pipelineConfigByProject: {
        ...state.pipelineConfigByProject,
        [projectPath]: config,
      },
    })),
  getPipelineConfig: (projectPath) => get().pipelineConfigByProject[projectPath] ?? null,
  addPipelineStep: (projectPath, step) => {
    const newStep: PipelineStep = {
      ...step,
      id: `step-${Date.now()}-${Math.random().toString(36).slice(2)}`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    set((state) => {
      const config = state.pipelineConfigByProject[projectPath] ?? {
        steps: [],
        version: 1,
      };
      return {
        pipelineConfigByProject: {
          ...state.pipelineConfigByProject,
          [projectPath]: {
            ...config,
            steps: [...config.steps, newStep],
          },
        },
      };
    });
    return newStep;
  },
  updatePipelineStep: (projectPath, stepId, updates) =>
    set((state) => {
      const config = state.pipelineConfigByProject[projectPath];
      if (!config) return state;
      return {
        pipelineConfigByProject: {
          ...state.pipelineConfigByProject,
          [projectPath]: {
            ...config,
            steps: config.steps.map((s) =>
              s.id === stepId ? { ...s, ...updates, updatedAt: new Date().toISOString() } : s
            ),
          },
        },
      };
    }),
  deletePipelineStep: (projectPath, stepId) =>
    set((state) => {
      const config = state.pipelineConfigByProject[projectPath];
      if (!config) return state;
      return {
        pipelineConfigByProject: {
          ...state.pipelineConfigByProject,
          [projectPath]: {
            ...config,
            steps: config.steps.filter((s) => s.id !== stepId),
          },
        },
      };
    }),
  reorderPipelineSteps: (projectPath, stepIds) =>
    set((state) => {
      const config = state.pipelineConfigByProject[projectPath];
      if (!config) return state;
      const stepMap = new Map(config.steps.map((s) => [s.id, s]));
      const reorderedSteps = stepIds
        .map((id) => stepMap.get(id))
        .filter((s): s is PipelineStep => !!s);
      return {
        pipelineConfigByProject: {
          ...state.pipelineConfigByProject,
          [projectPath]: {
            ...config,
            steps: reorderedSteps,
          },
        },
      };
    }),

  // Worktree Panel Visibility actions
  setWorktreePanelVisible: (projectPath, visible) =>
    set((state) => ({
      worktreePanelVisibleByProject: {
        ...state.worktreePanelVisibleByProject,
        [projectPath]: visible,
      },
    })),
  getWorktreePanelVisible: (projectPath) =>
    get().worktreePanelVisibleByProject[projectPath] ?? true,

  // Init Script Indicator Visibility actions
  setShowInitScriptIndicator: (projectPath, visible) =>
    set((state) => ({
      showInitScriptIndicatorByProject: {
        ...state.showInitScriptIndicatorByProject,
        [projectPath]: visible,
      },
    })),
  getShowInitScriptIndicator: (projectPath) =>
    get().showInitScriptIndicatorByProject[projectPath] ?? true,

  // Default Delete Branch actions
  setDefaultDeleteBranch: (projectPath, deleteBranch) =>
    set((state) => ({
      defaultDeleteBranchByProject: {
        ...state.defaultDeleteBranchByProject,
        [projectPath]: deleteBranch,
      },
    })),
  getDefaultDeleteBranch: (projectPath) => get().defaultDeleteBranchByProject[projectPath] ?? false,

  // Auto-dismiss Init Script Indicator actions
  setAutoDismissInitScriptIndicator: (projectPath, autoDismiss) =>
    set((state) => ({
      autoDismissInitScriptIndicatorByProject: {
        ...state.autoDismissInitScriptIndicatorByProject,
        [projectPath]: autoDismiss,
      },
    })),
  getAutoDismissInitScriptIndicator: (projectPath) =>
    get().autoDismissInitScriptIndicatorByProject[projectPath] ?? true,

  // Use Worktrees Override actions
  setProjectUseWorktrees: (projectPath, useWorktrees) =>
    set((state) => ({
      useWorktreesByProject: {
        ...state.useWorktreesByProject,
        [projectPath]: useWorktrees ?? undefined,
      },
    })),
  getProjectUseWorktrees: (projectPath) => get().useWorktreesByProject[projectPath],
  getEffectiveUseWorktrees: (projectPath) => {
    const projectOverride = get().useWorktreesByProject[projectPath];
    return projectOverride !== undefined ? projectOverride : get().useWorktrees;
  },

  // UI State actions
  setWorktreePanelCollapsed: (collapsed) => set({ worktreePanelCollapsed: collapsed }),
  setLastProjectDir: (dir) => set({ lastProjectDir: dir }),
  setRecentFolders: (folders) => set({ recentFolders: folders }),
  addRecentFolder: (folder) =>
    set((state) => {
      const filtered = state.recentFolders.filter((f) => f !== folder);
      return { recentFolders: [folder, ...filtered].slice(0, 10) };
    }),

  // Claude Usage Tracking actions
  setClaudeRefreshInterval: (interval) => set({ claudeRefreshInterval: interval }),
  setClaudeUsageLastUpdated: (timestamp) => set({ claudeUsageLastUpdated: timestamp }),
  setClaudeUsage: (usage) => set({ claudeUsage: usage, claudeUsageLastUpdated: Date.now() }),

  // Codex Usage Tracking actions
  setCodexUsage: (usage) => set({ codexUsage: usage, codexUsageLastUpdated: Date.now() }),

  // Codex Models actions
  fetchCodexModels: async (forceRefresh = false) => {
    const state = get();
    const now = Date.now();
    const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes
    const RETRY_DELAY = 30 * 1000; // 30 seconds after failure

    // Skip if already loading
    if (state.codexModelsLoading) return;

    // Skip if recently fetched (unless force refresh)
    if (
      !forceRefresh &&
      state.codexModelsLastFetched &&
      now - state.codexModelsLastFetched < CACHE_DURATION
    ) {
      return;
    }

    // Skip if recently failed (unless force refresh)
    if (
      !forceRefresh &&
      state.codexModelsLastFailedAt &&
      now - state.codexModelsLastFailedAt < RETRY_DELAY
    ) {
      return;
    }

    set({ codexModelsLoading: true, codexModelsError: null });

    try {
      const httpApi = getHttpApiClient();
      const data = await httpApi.get<{
        success: boolean;
        models?: Array<{
          id: string;
          label: string;
          description: string;
          hasThinking: boolean;
          supportsVision: boolean;
          tier: 'premium' | 'standard' | 'basic';
          isDefault: boolean;
        }>;
        error?: string;
      }>('/api/codex/models');

      if (data.success && data.models) {
        set({
          codexModels: data.models,
          codexModelsLoading: false,
          codexModelsLastFetched: now,
          codexModelsError: null,
        });
      } else {
        set({
          codexModelsLoading: false,
          codexModelsError: data.error || 'Failed to fetch Codex models',
          codexModelsLastFailedAt: now,
        });
      }
    } catch (error) {
      set({
        codexModelsLoading: false,
        codexModelsError: error instanceof Error ? error.message : 'Unknown error',
        codexModelsLastFailedAt: now,
      });
    }
  },
  setCodexModels: (models) => set({ codexModels: models }),

  // OpenCode Models actions
  fetchOpencodeModels: async (forceRefresh = false) => {
    const state = get();
    const now = Date.now();
    const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes
    const RETRY_DELAY = 30 * 1000; // 30 seconds after failure

    // Skip if already loading
    if (state.opencodeModelsLoading) return;

    // Skip if recently fetched (unless force refresh)
    if (
      !forceRefresh &&
      state.opencodeModelsLastFetched &&
      now - state.opencodeModelsLastFetched < CACHE_DURATION
    ) {
      return;
    }

    // Skip if recently failed (unless force refresh)
    if (
      !forceRefresh &&
      state.opencodeModelsLastFailedAt &&
      now - state.opencodeModelsLastFailedAt < RETRY_DELAY
    ) {
      return;
    }

    set({ opencodeModelsLoading: true, opencodeModelsError: null });

    try {
      const httpApi = getHttpApiClient();
      const data = await httpApi.get<{
        success: boolean;
        models?: ModelDefinition[];
        providers?: Array<{
          id: string;
          name: string;
          authenticated: boolean;
          authMethod?: string;
        }>;
        error?: string;
      }>('/api/setup/opencode/models');

      if (data.success && data.models) {
        // Filter out Bedrock models
        const filteredModels = data.models.filter(
          (m) => !m.id.startsWith(OPENCODE_BEDROCK_MODEL_PREFIX)
        );

        set({
          dynamicOpencodeModels: filteredModels,
          cachedOpencodeProviders: data.providers ?? [],
          opencodeModelsLoading: false,
          opencodeModelsLastFetched: now,
          opencodeModelsError: null,
        });
      } else {
        set({
          opencodeModelsLoading: false,
          opencodeModelsError: data.error || 'Failed to fetch OpenCode models',
          opencodeModelsLastFailedAt: now,
        });
      }
    } catch (error) {
      set({
        opencodeModelsLoading: false,
        opencodeModelsError: error instanceof Error ? error.message : 'Unknown error',
        opencodeModelsLastFailedAt: now,
      });
    }
  },

  // Init Script State actions
  setInitScriptState: (projectPath, branch, state) => {
    const key = `${projectPath}::${branch}`;
    set((s) => ({
      initScriptState: {
        ...s.initScriptState,
        [key]: {
          ...s.initScriptState[key],
          branch,
          output: s.initScriptState[key]?.output ?? [],
          status: s.initScriptState[key]?.status ?? 'idle',
          ...state,
        },
      },
    }));
  },
  appendInitScriptOutput: (projectPath, branch, content) => {
    const key = `${projectPath}::${branch}`;
    set((s) => {
      const current = s.initScriptState[key];
      if (!current) return s;
      // Split content by newlines and add each line
      const newLines = content.split('\n').filter((line) => line.length > 0);
      const combinedOutput = [...current.output, ...newLines];
      // Limit to MAX_INIT_OUTPUT_LINES
      const limitedOutput = combinedOutput.slice(-MAX_INIT_OUTPUT_LINES);
      return {
        initScriptState: {
          ...s.initScriptState,
          [key]: {
            ...current,
            output: limitedOutput,
          },
        },
      };
    });
  },
  clearInitScriptState: (projectPath, branch) => {
    const key = `${projectPath}::${branch}`;
    set((s) => {
      const newState = { ...s.initScriptState };
      delete newState[key];
      return { initScriptState: newState };
    });
  },
  getInitScriptState: (projectPath, branch) => {
    const key = `${projectPath}::${branch}`;
    return get().initScriptState[key] ?? null;
  },
  getInitScriptStatesForProject: (projectPath) => {
    const prefix = `${projectPath}::`;
    const states = get().initScriptState;
    return Object.entries(states)
      .filter(([key]) => key.startsWith(prefix))
      .map(([key, state]) => ({ key, state }));
  },

  // Left Panel actions
  setLeftPanelTab: (tab) => set({ leftPanelTab: tab }),
  setCurrentDocPath: (path) => set({ currentDocPath: path }),
  setDocsViewMode: (mode) => {
    set({ docsViewMode: mode });
    setItem('automaker:docsViewMode', mode);
  },
  addRecentDoc: (doc) => {
    const { recentDocs } = get();
    const filtered = recentDocs.filter((d) => d.path !== doc.path);
    const updated = [doc, ...filtered].slice(0, 10);
    set({ recentDocs: updated });
    setItem('automaker:recentDocs', JSON.stringify(updated));
  },

  // Docs Editor Theme actions
  setEditorTheme: (partial) => {
    const current = get().editorTheme;
    const updated = { ...current, ...partial };
    set({ editorTheme: updated });
    setItem('automaker:editorTheme', JSON.stringify(updated));
  },
  setHeadingStyle: (level, style) => {
    const current = get().editorTheme;
    const updated = {
      ...current,
      headingStyles: {
        ...current.headingStyles,
        [level]: { ...current.headingStyles[level], ...style },
      },
    };
    set({ editorTheme: updated });
    setItem('automaker:editorTheme', JSON.stringify(updated));
  },
  setTableStyles: (styles) => {
    const current = get().editorTheme;
    const updated = {
      ...current,
      tableStyles: { ...current.tableStyles, ...styles },
    };
    set({ editorTheme: updated });
    setItem('automaker:editorTheme', JSON.stringify(updated));
  },
  resetEditorTheme: () => {
    set({ editorTheme: DEFAULT_EDITOR_THEME });
    setItem('automaker:editorTheme', JSON.stringify(DEFAULT_EDITOR_THEME));
  },

  // Session History Limit actions
  setMaxSessionsPerProject: (max) => {
    const clamped = Math.max(0, Math.min(100, max));
    set({ maxSessionsPerProject: clamped });
    setItem('automaker:maxSessionsPerProject', String(clamped));
  },

  // Session list scope actions
  setSingleProjectHistoryView: (enabled) => {
    set({ singleProjectHistoryView: enabled });
    setItem('automaker:singleProjectHistoryView', String(enabled));
  },

  // Clear chat confirmation actions
  setSkipClearChatConfirm: (skip) => {
    set({ skipClearChatConfirm: skip });
    setItem('automaker:skipClearChatConfirm', String(skip));
  },

  // Session Panel Font Size actions
  setSessionFontSize: (size) => {
    const clamped = Math.max(10, Math.min(18, size));
    set({ sessionFontSize: clamped });
    setItem('automaker:sessionFontSize', String(clamped));
  },

  // Docs Auto-Save actions
  setDocsAutoSave: (enabled) => {
    set({ docsAutoSave: enabled });
    setItem('automaker:docsAutoSave', String(enabled));
  },
  setDocsAutoSaveDelay: (ms) => {
    set({ docsAutoSaveDelay: ms });
    setItem('automaker:docsAutoSaveDelay', String(ms));
  },

  // Right Panel actions
  setRightPanelMode: (mode) => {
    const state = get();
    // If selecting the same mode as secondary, swap primary and secondary
    if (state.rightPanelSecondaryMode === mode) {
      const oldPrimary = state.rightPanelMode;
      set({ rightPanelMode: mode, rightPanelSecondaryMode: oldPrimary });
      setItem('automaker:rightPanelSecondaryMode', oldPrimary);
    } else {
      set({ rightPanelMode: mode });
    }
  },

  setRightPanelSecondaryMode: (mode) => {
    set({ rightPanelSecondaryMode: mode });
    if (mode) {
      setItem('automaker:rightPanelSecondaryMode', mode);
    } else {
      removeItem('automaker:rightPanelSecondaryMode');
    }
  },

  setRightPanelSplitSize: (size) => {
    const clamped = Math.max(15, Math.min(85, size));
    set({ rightPanelSplitSize: clamped });
    setItem('automaker:rightPanelSplitSize', String(clamped));
  },

  toggleRightPanelSplit: () => {
    const state = get();
    if (state.rightPanelSecondaryMode) {
      // Close split
      set({ rightPanelSecondaryMode: null });
      removeItem('automaker:rightPanelSecondaryMode');
    } else {
      // Open split with a sensible default:
      // - terminal -> files
      // - files/dashboard/git -> terminal
      const defaultSecondary: RightPanelMode =
        state.rightPanelMode === 'terminal' ? 'files' : 'terminal';
      set({ rightPanelSecondaryMode: defaultSecondary });
      setItem('automaker:rightPanelSecondaryMode', defaultSecondary);
    }
  },

  setFilesPanelFontSize: (size) => {
    const clamped = Math.max(10, Math.min(20, size));
    set({ filesPanelFontSize: clamped });
    setItem('automaker:filesPanelFontSize', String(clamped));
  },

  setDashboardPanelFontSize: (size) => {
    const clamped = Math.max(10, Math.min(20, size));
    set({ dashboardPanelFontSize: clamped });
    setItem('automaker:dashboardPanelFontSize', String(clamped));
  },

  // Browser Panel actions
  setBrowserPanelOpen: (open) => set({ browserPanelOpen: open }),
  toggleBrowserPanel: () => set({ browserPanelOpen: !get().browserPanelOpen }),
  addBrowserTab: (projectPath, tab) => {
    const state = get();
    const tabs = state.browserTabsByProject[projectPath] || [];
    const browserTabsByProject = {
      ...state.browserTabsByProject,
      [projectPath]: [...tabs, tab],
    };
    const activeBrowserTabByProject = {
      ...state.activeBrowserTabByProject,
      [projectPath]: tab.id,
    };

    persistBrowserPanelState(browserTabsByProject, activeBrowserTabByProject);

    set({
      browserTabsByProject,
      activeBrowserTabByProject,
    });
  },
  removeBrowserTab: (projectPath, tabId) => {
    const state = get();
    const tabs = state.browserTabsByProject[projectPath] || [];
    const filtered = tabs.filter((t) => t.id !== tabId);
    const activeId = state.activeBrowserTabByProject[projectPath];
    const stillHasActive =
      typeof activeId === 'string' &&
      activeId.length > 0 &&
      filtered.some((tab) => tab.id === activeId);
    const newActive =
      activeId === tabId || !stillHasActive ? (filtered[filtered.length - 1]?.id ?? '') : activeId;

    const browserTabsByProject = { ...state.browserTabsByProject };
    if (filtered.length > 0) {
      browserTabsByProject[projectPath] = filtered;
    } else {
      delete browserTabsByProject[projectPath];
    }

    const activeBrowserTabByProject = { ...state.activeBrowserTabByProject };
    if (filtered.length > 0 && newActive) {
      activeBrowserTabByProject[projectPath] = newActive;
    } else {
      delete activeBrowserTabByProject[projectPath];
    }

    persistBrowserPanelState(browserTabsByProject, activeBrowserTabByProject);

    set({
      browserTabsByProject,
      activeBrowserTabByProject,
    });
  },
  setActiveBrowserTab: (projectPath, tabId) => {
    const state = get();
    const tabs = state.browserTabsByProject[projectPath] || [];
    if (tabs.length === 0) return;
    if (!tabs.some((tab) => tab.id === tabId)) return;

    const activeBrowserTabByProject = {
      ...state.activeBrowserTabByProject,
      [projectPath]: tabId,
    };

    persistBrowserPanelState(state.browserTabsByProject, activeBrowserTabByProject);

    set({
      activeBrowserTabByProject,
    });
  },
  updateBrowserTab: (projectPath, tabId, updates) => {
    const state = get();
    const tabs = state.browserTabsByProject[projectPath] || [];
    if (tabs.length === 0) return;

    const browserTabsByProject = {
      ...state.browserTabsByProject,
      [projectPath]: tabs.map((t) => (t.id === tabId ? { ...t, ...updates } : t)),
    };

    persistBrowserPanelState(browserTabsByProject, state.activeBrowserTabByProject);

    set({
      browserTabsByProject,
    });
  },
  getBrowserTabs: (projectPath) => {
    return get().browserTabsByProject[projectPath] || [];
  },
  getActiveBrowserTab: (projectPath) => {
    const tabs = get().browserTabsByProject[projectPath] || [];
    const activeId = get().activeBrowserTabByProject[projectPath];
    return tabs.find((t) => t.id === activeId) || null;
  },
  setBrowserPanelSize: (size) => set({ browserPanelSize: size }),

  // Completed Tasks actions (Done Tab)
  setCompletedTasks: (tasks) => set({ completedTasks: tasks }),
  addCompletedTask: (task) => set((state) => ({ completedTasks: [task, ...state.completedTasks] })),
  removeCompletedTask: (filename) =>
    set((state) => ({
      completedTasks: state.completedTasks.filter((t) => t.filename !== filename),
    })),
  setCompletedTasksLoading: (loading) => set({ completedTasksLoading: loading }),
  setCompletedTasksError: (error) => set({ completedTasksError: error }),
  setCompletedTasksFilter: (filter) => set({ completedTasksFilter: filter }),
  setCompletedTasksSortField: (field) => set({ completedTasksSortField: field }),
  setCompletedTasksSortOrder: (order) => set({ completedTasksSortOrder: order }),
  setCompletedTasksAutoCapture: (enabled) => set({ completedTasksAutoCapture: enabled }),

  // Tasks actions (Tasks Tab)
  setTasks: (tasks) => set({ tasks }),
  addTask: (task) => set((state) => ({ tasks: [task, ...state.tasks] })),
  updateTaskInStore: (filename, updates) =>
    set((state) => ({
      tasks: state.tasks.map((t) => (t.filename === filename ? { ...t, ...updates } : t)),
    })),
  removeTask: (filename) =>
    set((state) => ({
      tasks: state.tasks.filter((t) => t.filename !== filename),
    })),
  setTasksLoading: (loading) => set({ tasksLoading: loading }),
  setTasksError: (error) => set({ tasksError: error }),
  setTasksFilter: (filter) => set({ tasksFilter: filter }),
  setTasksSortField: (field) => set({ tasksSortField: field }),
  setTasksSortOrder: (order) => set({ tasksSortOrder: order }),

  // Reset
  reset: () => set(initialState),
}));
