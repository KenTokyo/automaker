import { BarChart3 } from 'lucide-react';

interface DashboardEmptyStateProps {
  timeRangeLabel: string;
}

export function DashboardEmptyState({ timeRangeLabel }: DashboardEmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center gap-4 px-6 py-10 text-center">
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted">
        <BarChart3 className="h-6 w-6 text-muted-foreground" />
      </div>

      <div className="space-y-1.5">
        <p className="text-sm font-medium text-foreground">Noch keine Übersicht</p>
        <p className="max-w-[240px] text-xs leading-relaxed text-muted-foreground">
          Erstelle jetzt eine Übersicht für die letzten{' '}
          <span className="font-medium text-foreground">{timeRangeLabel}</span>.
        </p>
      </div>
    </div>
  );
}
