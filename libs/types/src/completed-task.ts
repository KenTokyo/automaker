/**
 * Completed Task Types - Data model for the "Done" tab
 *
 * Defines types for tracking completed work items displayed as cards
 * in the completed tasks panel. Each entry is stored as a `.completed/*.md`
 * file with YAML frontmatter and a Markdown body.
 */

// ============================================================================
// Tag, Effort & Status Types
// ============================================================================

export const COMPLETED_TASK_TAGS = [
  'feature',
  'bugfix',
  'refactor',
  'docs',
  'ui',
  'performance',
  'security',
  'test',
  'config',
  'cleanup',
] as const;
export type CompletedTaskTag = (typeof COMPLETED_TASK_TAGS)[number];

export const COMPLETED_TASK_EFFORTS = ['S', 'M', 'L', 'XL'] as const;
export type CompletedTaskEffort = (typeof COMPLETED_TASK_EFFORTS)[number];

export const COMPLETED_TASK_STATUSES = ['success', 'partial', 'failed'] as const;
export type CompletedTaskStatus = (typeof COMPLETED_TASK_STATUSES)[number];

// ============================================================================
// Core Task Interface
// ============================================================================

/**
 * CompletedTask - A single completed work item
 *
 * Represents a finished piece of work displayed as a card in the Done tab.
 * Each task is stored as a Markdown file in `.completed/` with YAML frontmatter.
 */
export interface CompletedTask {
  /** Filename in .completed/ (e.g. "2026-03-17_session-tabs.md") */
  filename: string;
  /** Short, descriptive title */
  title: string;
  /** Longer description of what was done */
  description: string;
  /** Date in YYYY-MM-DD format */
  date: string;
  /** Outcome status */
  status: CompletedTaskStatus;
  /** Size estimate */
  effort: '' | CompletedTaskEffort;
  /** Attempt number (default 1) */
  attempt: number;
  /** AI provider used (claude, gemini, opencode, or empty) */
  provider: string;
  /** List of files that were changed */
  files: string[];
  /** Tags for filtering */
  tags: string[];
  /** Markdown body (summary, notes, learnings) */
  summary: string;
  /** Project path (set in multi-project mode) */
  projectPath?: string;
  /** Project display name (set in multi-project mode) */
  projectName?: string;
}

// ============================================================================
// Filter & Sort Types
// ============================================================================

/**
 * CompletedTaskFilter - Filter options for querying completed tasks
 */
export interface CompletedTaskFilter {
  /** Free-text search across title, description, and summary */
  search?: string;
  /** Filter by tags */
  tags?: string[];
  /** Filter by status */
  status?: CompletedTaskStatus[];
  /** Filter by effort */
  effort?: CompletedTaskEffort[];
  /** Only entries on or after this date (YYYY-MM-DD) */
  since?: string;
  /** Only entries on or before this date (YYYY-MM-DD) */
  until?: string;
  /** Maximum number of results */
  limit?: number;
}

/**
 * CompletedTaskSortField - Fields available for sorting
 */
export type CompletedTaskSortField = 'date' | 'title' | 'effort';

/**
 * CompletedTaskSortOrder - Sort direction
 */
export type CompletedTaskSortOrder = 'asc' | 'desc';
