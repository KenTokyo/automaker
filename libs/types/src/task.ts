/**
 * Task Types - Data model for the "Tasks" tab
 *
 * Defines types for tracking work items displayed as cards in the
 * tasks panel. Each entry is stored as a `.automaker/tasks/*.md`
 * file with YAML frontmatter and a Markdown body.
 */

// ============================================================================
// Status & Priority Types
// ============================================================================

export const TASK_STATUSES = ['open', 'in_progress', 'done'] as const;
export type TaskStatus = (typeof TASK_STATUSES)[number];

export const TASK_PRIORITIES = ['P1', 'P2', 'P3', 'P4', ''] as const;
export type TaskPriority = (typeof TASK_PRIORITIES)[number];

// ============================================================================
// Core Task Interface
// ============================================================================

/**
 * Task - A single work item
 *
 * Represents a task displayed as a card in the Tasks tab.
 * Each task is stored as a Markdown file in `.automaker/tasks/` with YAML frontmatter.
 */
export interface Task {
  /** Filename in .automaker/tasks/ (e.g. "2026-03-18_refactor-auth.md") */
  filename: string;
  /** Short, descriptive title */
  title: string;
  /** Brief description of what needs to be done */
  description: string;
  /** Date in YYYY-MM-DD format (creation date) */
  date: string;
  /** Current status: open | in_progress | done */
  status: TaskStatus;
  /** Priority level: P1-P4 or empty */
  priority: TaskPriority;
  /** Tags for filtering and categorization */
  tags: string[];
  /** Markdown body (detailed description, notes, acceptance criteria) */
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
 * TaskFilter - Filter options for querying tasks
 */
export interface TaskFilter {
  /** Free-text search across title, description, and summary */
  search?: string;
  /** Filter by tags */
  tags?: string[];
  /** Filter by status */
  status?: TaskStatus[];
  /** Filter by priority */
  priority?: TaskPriority[];
  /** Only entries on or after this date (YYYY-MM-DD) */
  since?: string;
  /** Only entries on or before this date (YYYY-MM-DD) */
  until?: string;
  /** Maximum number of results */
  limit?: number;
}

/**
 * TaskSortField - Fields available for sorting
 */
export type TaskSortField = 'date' | 'title' | 'priority' | 'status';

/**
 * TaskSortOrder - Sort direction
 */
export type TaskSortOrder = 'asc' | 'desc';
