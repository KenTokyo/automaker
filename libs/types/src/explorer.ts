/**
 * Markdown Explorer Types
 *
 * Shared types for the project file explorer / markdown browser.
 * Used by server (file search service) and UI (display & filtering).
 */

// ---------------------------------------------------------------------------
// Search Types
// ---------------------------------------------------------------------------

/** A single search result entry */
export interface ExplorerSearchResult {
  name: string;
  path: string;
  isDirectory: boolean;
  /** Line number (1-based) of first match when searching content */
  matchLine?: number;
  /** Short excerpt around the match */
  snippet?: string;
}

/** Options for a project file search */
export interface ExplorerSearchOptions {
  projectPath: string;
  query: string;
  /** Also search file contents, not just filenames */
  searchContent?: boolean;
  /** Max results to return (default 100) */
  limit?: number;
  /** Only include files modified within the last N hours (0 = all) */
  sinceHours?: number;
}

// ---------------------------------------------------------------------------
// Time-Filtered Files
// ---------------------------------------------------------------------------

/** A file entry returned by the time-based filter */
export interface ExplorerTimeFilteredFile {
  name: string;
  path: string;
  /** Last modified timestamp (ms since epoch) */
  modified: number;
  /** File size in bytes */
  size: number;
}
