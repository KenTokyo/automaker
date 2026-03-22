import { Lightbulb } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { DashboardImprovement } from '../stores/dashboard-types';

interface DashboardImprovementsProps {
  improvements: DashboardImprovement[];
}

const PRIORITY_STYLES: Record<
  DashboardImprovement['priority'],
  { border: string; badge: string; label: string }
> = {
  high: { border: 'border-l-red-500', badge: 'bg-red-500/15 text-red-400', label: 'Hoch' },
  medium: {
    border: 'border-l-amber-500',
    badge: 'bg-amber-500/15 text-amber-400',
    label: 'Mittel',
  },
  low: {
    border: 'border-l-emerald-500',
    badge: 'bg-emerald-500/15 text-emerald-400',
    label: 'Niedrig',
  },
};

export function DashboardImprovements({ improvements }: DashboardImprovementsProps) {
  if (improvements.length === 0) return null;

  return (
    <div className="space-y-1.5">
      <div className="flex items-center gap-1.5 px-1">
        <Lightbulb className="h-3.5 w-3.5 text-amber-400" />
        <span className="text-xs font-medium text-foreground">Verbesserungen</span>
        <span className="text-[10px] text-muted-foreground">({improvements.length})</span>
      </div>

      {improvements.map((item, i) => {
        const style = PRIORITY_STYLES[item.priority];
        return (
          <div
            key={i}
            className={cn(
              'rounded-md border border-muted border-l-4 bg-card/50 px-3 py-2',
              style.border
            )}
          >
            <div className="flex items-center gap-2">
              <span className="flex-1 text-xs font-medium text-foreground">{item.title}</span>
              <span
                className={cn('rounded-full px-1.5 py-0.5 text-[10px] font-medium', style.badge)}
              >
                {style.label}
              </span>
            </div>
            <p className="mt-0.5 text-[11px] leading-relaxed text-muted-foreground">
              {item.description}
            </p>
          </div>
        );
      })}
    </div>
  );
}
