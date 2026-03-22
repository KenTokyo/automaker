import type { DashboardMode, DashboardOverviewData } from '../stores/dashboard-types';
import { DASHBOARD_TIME_RANGES } from '../stores/dashboard-types';
import { DashboardImprovements } from './dashboard-improvements';
import { DashboardMetadataFooter } from './dashboard-metadata';
import { DashboardSectionCard } from './dashboard-section-card';
import { DashboardSecurity } from './dashboard-security';
import { DashboardStatsBar } from './dashboard-stats-bar';
import { DashboardSummaryCard } from './dashboard-summary-card';

interface DashboardOverviewCardsProps {
  data: DashboardOverviewData;
}

function modeLabel(mode: DashboardMode): string {
  if (mode === 'simplify') return 'Vereinfacht';
  if (mode === 'detail') return 'Mehr Details';
  return 'Standard';
}

function modelLabel(model: string): string {
  const normalized = model.trim().toLowerCase();
  if (normalized.includes('sonnet')) return 'Sonnet';
  if (normalized.includes('haiku')) return 'Haiku';
  if (normalized.includes('opus')) return 'Opus';
  return model;
}

export function DashboardOverviewCards({ data }: DashboardOverviewCardsProps) {
  const timeRangeLabel =
    DASHBOARD_TIME_RANGES.find((r) => r.id === data.timeRange)?.label ?? data.timeRange;

  return (
    <div className="space-y-3 p-3">
      <div className="flex flex-wrap items-center gap-2 text-[11px]">
        <span className="rounded-full border border-muted bg-muted/30 px-2 py-0.5 text-muted-foreground">
          Modus: {modeLabel(data.mode)}
        </span>
        <span className="rounded-full border border-muted bg-muted/30 px-2 py-0.5 text-muted-foreground">
          Modell: {modelLabel(data.model)}
        </span>
      </div>

      <DashboardSummaryCard
        summary={data.summary}
        timeRangeLabel={timeRangeLabel}
        generatedAt={data.generatedAt}
      />

      <DashboardStatsBar stats={data.stats} />

      {data.sections.length > 0 ? (
        <div className="space-y-2">
          {data.sections.map((section, i) => (
            <DashboardSectionCard key={i} section={section} defaultOpen={i < 3} />
          ))}
        </div>
      ) : null}

      <DashboardImprovements improvements={data.improvements} />
      <DashboardSecurity security={data.security} />
      <DashboardMetadataFooter metadata={data.metadata} model={data.model} />
    </div>
  );
}
