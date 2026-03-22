/**
 * Dashboard / Overview Types
 *
 * Re-exports shared dashboard types from @automaker/types.
 * This file exists for backward compatibility — all types are now
 * defined in the shared types package.
 */

export type {
  DashboardTimeRange,
  DashboardMode,
  DashboardSection,
  DashboardItem,
  DashboardImprovement,
  DashboardSecurityItem,
  DashboardStats,
  DashboardMetadata,
  DashboardOverviewData,
  DashboardTimeRangeOption,
} from '@automaker/types';

export { DASHBOARD_TIME_RANGES, getTimeRangeHours } from '@automaker/types';
