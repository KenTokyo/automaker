import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { HistoryStatusFilter, HistoryTimeFilter } from './history-types';

interface HistoryFiltersProps {
  statusFilter: HistoryStatusFilter;
  timeFilter: HistoryTimeFilter;
  onStatusFilterChange: (value: HistoryStatusFilter) => void;
  onTimeFilterChange: (value: HistoryTimeFilter) => void;
}

const STATUS_FILTERS: Array<{ label: string; value: HistoryStatusFilter }> = [
  { label: 'Alle', value: 'all' },
  { label: 'Läuft', value: 'running' },
  { label: 'Gestoppt', value: 'stopped' },
  { label: 'Fehler', value: 'error' },
];

const TIME_FILTERS: Array<{ label: string; value: HistoryTimeFilter }> = [
  { label: 'Heute', value: 'today' },
  { label: '7 Tage', value: '7d' },
  { label: '30 Tage', value: '30d' },
  { label: 'Alle', value: 'all' },
];

function getButtonClasses(isActive: boolean): string {
  return cn(
    'h-7 rounded-full border px-2.5 text-xs transition-colors',
    isActive
      ? 'border-muted bg-accent text-foreground'
      : 'border-muted bg-background text-muted-foreground hover:bg-accent/70 hover:text-foreground'
  );
}

export function HistoryFilters({
  statusFilter,
  timeFilter,
  onStatusFilterChange,
  onTimeFilterChange,
}: HistoryFiltersProps) {
  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-1.5">
        {STATUS_FILTERS.map((filter) => (
          <Button
            key={filter.value}
            type="button"
            variant="ghost"
            className={getButtonClasses(filter.value === statusFilter)}
            onClick={() => onStatusFilterChange(filter.value)}
          >
            {filter.label}
          </Button>
        ))}
      </div>

      <div className="flex flex-wrap gap-1.5">
        {TIME_FILTERS.map((filter) => (
          <Button
            key={filter.value}
            type="button"
            variant="ghost"
            className={getButtonClasses(filter.value === timeFilter)}
            onClick={() => onTimeFilterChange(filter.value)}
          >
            {filter.label}
          </Button>
        ))}
      </div>
    </div>
  );
}
