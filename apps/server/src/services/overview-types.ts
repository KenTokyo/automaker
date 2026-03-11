/**
 * Overview Service Types
 *
 * Server-side types for collecting project data and generating
 * AI-powered dashboard overviews.
 */

// ---------------------------------------------------------------------------
// Time Range
// ---------------------------------------------------------------------------

export type DashboardTimeRange = '12h' | '24h' | '4d' | '1w';

// ---------------------------------------------------------------------------
// Data Collection Types
// ---------------------------------------------------------------------------

/** A markdown file collected for the overview prompt */
export interface OverviewMarkdownData {
  /** Relative path within the project */
  path: string;
  /** File name */
  name: string;
  /** Last modified timestamp (ms since epoch) */
  modified: number;
  /** First N lines of content (preview) */
  preview: string;
  /** File size in bytes */
  size: number;
}

/** Git data collected for the overview prompt */
export interface OverviewGitData {
  /** Whether git is available for this project */
  available: boolean;
  /** Parsed commit list (newest first) */
  commits: OverviewGitCommit[];
  /** Total number of commits found (before limit) */
  totalCommits: number;
}

/** A single git commit */
export interface OverviewGitCommit {
  hash: string;
  message: string;
  author: string;
  date: string;
}

// ---------------------------------------------------------------------------
// Overview Result Types (mirrors client dashboard-types.ts)
// ---------------------------------------------------------------------------

export type DashboardMode = 'standard' | 'simplify' | 'detail';

export interface GenerateOverviewOptions {
  mode?: DashboardMode;
  modelOverride?: string;
}

export interface DashboardSection {
  title: string;
  items: DashboardItem[];
}

export interface DashboardItem {
  text: string;
  file?: string;
}

export interface DashboardImprovement {
  title: string;
  description: string;
  priority: 'low' | 'medium' | 'high';
}

export interface DashboardSecurityItem {
  title: string;
  description: string;
  severity: 'info' | 'warning' | 'critical';
}

export interface DashboardStats {
  filesChanged: number;
  commits: number;
  linesAdded: number;
  linesRemoved: number;
}

export interface DashboardMetadata {
  gitAvailable: boolean;
  filesAnalysed: number;
  truncated: boolean;
  durationMs: number;
}

export interface DashboardOverviewData {
  timeRange: DashboardTimeRange;
  generatedAt: string;
  model: string;
  mode: DashboardMode;
  summary: string;
  sections: DashboardSection[];
  improvements: DashboardImprovement[];
  security: DashboardSecurityItem[];
  stats: DashboardStats;
  metadata: DashboardMetadata;
}

// ---------------------------------------------------------------------------
// Overview Status (for GET /api/overview/status)
// ---------------------------------------------------------------------------

export interface OverviewStatusEntry {
  exists: boolean;
  generatedAt?: string;
}

export type OverviewStatusMap = Record<DashboardTimeRange, OverviewStatusEntry>;
