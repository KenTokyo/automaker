/**
 * Completed Task Types - Data model for the "Done" tab
 *
 * Defines types for tracking completed work items displayed as cards
 * in the completed tasks panel. Each entry documents a finished piece
 * of work (feature, bugfix, improvement, etc.) with optional links
 * to history files and chat sessions.
 */

// ============================================================================
// Category & Badge Types
// ============================================================================

/**
 * CompletedTaskCategory - The type of work that was completed
 */
export type CompletedTaskCategory =
  | 'feature'
  | 'bugfix'
  | 'improvement'
  | 'config'
  | 'refactor'
  | 'docs';

/**
 * CompletedTaskBadge - Additional tags for filtering completed tasks
 */
export type CompletedTaskBadge =
  | 'frontend'
  | 'backend'
  | 'urgent'
  | 'breaking-change'
  | 'performance'
  | 'security'
  | 'testing'
  | 'ui'
  | 'api'
  | 'database';

// ============================================================================
// Core Task Interface
// ============================================================================

/**
 * CompletedTask - A single completed work item
 *
 * Represents a finished piece of work displayed as a card in the Done tab.
 * Each task has a category, optional badges for filtering, and optional
 * links to related files and sessions.
 */
export interface CompletedTask {
  /** Unique identifier (UUID) */
  id: string;
  /** Short, descriptive title (like a git commit message) */
  title: string;
  /** Longer description of what was done */
  description: string;
  /** Type of work */
  category: CompletedTaskCategory;
  /** Additional filter tags */
  badges: CompletedTaskBadge[];
  /** ISO timestamp when the task was completed */
  completedAt: string;
  /** Absolute path to the project this task belongs to */
  projectPath: string;
  /** Relative path to the history file (optional) */
  historyFile?: string;
  /** List of files that were changed (optional) */
  relatedFiles?: string[];
  /** Associated chat session ID (optional) */
  chatSessionId?: string;
  /** Associated feature ID from the Kanban board (optional) */
  featureId?: string;
  /** AI-generated summary (optional) */
  summary?: string;
  /** Associated git commit hash (optional) */
  commitHash?: string;
}

// ============================================================================
// File Storage Types
// ============================================================================

/**
 * CompletedTasksFile - Structure of the completed-tasks.json file
 *
 * Stored at `.automaker/completed-tasks.json` within each project.
 */
export interface CompletedTasksFile {
  /** Schema version for future migrations */
  version: number;
  /** All completed task entries */
  tasks: CompletedTask[];
  /** ISO timestamp of the last update */
  lastUpdated: string;
}

// ============================================================================
// Input & Filter Types
// ============================================================================

/**
 * CreateCompletedTaskInput - Input for creating a new completed task
 *
 * Omits auto-generated fields (id, completedAt).
 */
export interface CreateCompletedTaskInput {
  title: string;
  description: string;
  category: CompletedTaskCategory;
  badges?: CompletedTaskBadge[];
  projectPath: string;
  historyFile?: string;
  relatedFiles?: string[];
  chatSessionId?: string;
  featureId?: string;
  summary?: string;
  commitHash?: string;
}

/**
 * CompletedTaskFilter - Filter options for querying completed tasks
 */
export interface CompletedTaskFilter {
  /** Free-text search across title and description */
  search?: string;
  /** Filter by categories */
  categories?: CompletedTaskCategory[];
  /** Filter by badges */
  badges?: CompletedTaskBadge[];
  /** Only entries after this ISO timestamp */
  since?: string;
  /** Only entries before this ISO timestamp */
  until?: string;
  /** Maximum number of results */
  limit?: number;
}

/**
 * CompletedTaskSortField - Fields available for sorting
 */
export type CompletedTaskSortField = 'completedAt' | 'title' | 'category';

/**
 * CompletedTaskSortOrder - Sort direction
 */
export type CompletedTaskSortOrder = 'asc' | 'desc';

// ============================================================================
// Constants
// ============================================================================

/** Current version of the completed tasks file schema */
export const COMPLETED_TASKS_VERSION = 1;

/** Default empty completed tasks file */
export const DEFAULT_COMPLETED_TASKS_FILE: CompletedTasksFile = {
  version: COMPLETED_TASKS_VERSION,
  tasks: [],
  lastUpdated: new Date().toISOString(),
};

/** Human-readable labels for each category */
export const COMPLETED_TASK_CATEGORIES: Record<CompletedTaskCategory, string> = {
  feature: 'Neues Feature',
  bugfix: 'Bug-Fix',
  improvement: 'Verbesserung',
  config: 'Konfiguration',
  refactor: 'Refactoring',
  docs: 'Dokumentation',
};

/** Available badge options with labels */
export const COMPLETED_TASK_BADGE_OPTIONS: Record<CompletedTaskBadge, string> = {
  frontend: 'Frontend',
  backend: 'Backend',
  urgent: 'Dringend',
  'breaking-change': 'Breaking Change',
  performance: 'Performance',
  security: 'Sicherheit',
  testing: 'Testing',
  ui: 'UI/Design',
  api: 'API',
  database: 'Datenbank',
};
