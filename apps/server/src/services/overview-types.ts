/**
 * Overview Service Types
 *
 * Re-exports shared dashboard types from @automaker/types.
 * This file exists for backward compatibility — all types are now
 * defined in the shared types package.
 */

export type {
  DashboardTimeRange,
  DashboardMode,
  OverviewMarkdownData,
  OverviewGitData,
  OverviewGitCommit,
  GenerateOverviewOptions,
  DashboardSection,
  DashboardItem,
  DashboardImprovement,
  DashboardSecurityItem,
  DashboardStats,
  DashboardMetadata,
  DashboardOverviewData,
  OverviewStatusEntry,
  OverviewStatusMap,
} from '@automaker/types';
