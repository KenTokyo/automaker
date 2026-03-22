import { cn } from '@/lib/utils';
import { DASHBOARD_TIME_RANGES } from '../stores/dashboard-types';
import type { DashboardTimeRange } from '../stores/dashboard-types';

interface DashboardTimeTabsProps {
  activeTab: DashboardTimeRange;
  onTabChange: (tab: DashboardTimeRange) => void;
  /** Which tabs already have generated data (show indicator dot) */
  hasData: (tab: DashboardTimeRange) => boolean;
}

export function DashboardTimeTabs({ activeTab, onTabChange, hasData }: DashboardTimeTabsProps) {
  return (
    <div className="flex items-center gap-1 border-b border-muted px-2 py-1.5">
      {DASHBOARD_TIME_RANGES.map((range) => {
        const isActive = range.id === activeTab;
        const hasCachedData = hasData(range.id);

        return (
          <button
            key={range.id}
            type="button"
            className={cn(
              'relative flex items-center gap-1 rounded-sm px-2.5 py-1 text-xs transition-colors',
              isActive
                ? 'bg-muted text-foreground font-medium'
                : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
            )}
            onClick={() => onTabChange(range.id)}
            title={`Zeitraum: ${range.label}`}
          >
            {range.label}
            {hasCachedData && (
              <span
                className={cn(
                  'h-1.5 w-1.5 rounded-full',
                  isActive ? 'bg-emerald-500' : 'bg-emerald-500/60'
                )}
                title="Daten vorhanden"
              />
            )}
          </button>
        );
      })}
    </div>
  );
}
