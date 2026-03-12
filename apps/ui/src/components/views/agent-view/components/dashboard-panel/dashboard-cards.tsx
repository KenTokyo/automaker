/**
 * Dashboard card components: OverviewCards, SummaryCard, StatsBar, SectionCard.
 *
 * Adapted from apps/chat/src/components/dashboard-*.tsx.
 * Uses @automaker/types for shared dashboard types.
 */

import { useState } from 'react';
import {
  Bug,
  ChevronDown,
  FileText,
  GitCommitHorizontal,
  Minus,
  Pin,
  Plus,
  Rocket,
  Wrench,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  DASHBOARD_TIME_RANGES,
  type DashboardMode,
  type DashboardOverviewData,
  type DashboardSection,
  type DashboardStats,
} from '@automaker/types';
import { DashboardDetails } from './dashboard-details';

// ---------------------------------------------------------------------------
// OverviewCards (main content)
// ---------------------------------------------------------------------------

interface DashboardOverviewCardsProps {
  data: DashboardOverviewData;
  projectPath: string | null;
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

export function DashboardOverviewCards({ data, projectPath }: DashboardOverviewCardsProps) {
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

      <SummaryCard
        summary={data.summary}
        timeRangeLabel={timeRangeLabel}
        generatedAt={data.generatedAt}
      />

      <StatsBar stats={data.stats} />

      {data.sections.length > 0 ? (
        <div className="space-y-2">
          {data.sections.map((section, i) => (
            <SectionCard key={i} section={section} defaultOpen={i < 3} />
          ))}
        </div>
      ) : null}

      <DashboardDetails
        improvements={data.improvements}
        security={data.security}
        metadata={data.metadata}
        model={data.model}
        projectPath={projectPath}
      />
    </div>
  );
}

// ---------------------------------------------------------------------------
// SummaryCard
// ---------------------------------------------------------------------------

function SummaryCard({
  summary,
  timeRangeLabel,
  generatedAt,
}: {
  summary: string;
  timeRangeLabel: string;
  generatedAt: string;
}) {
  const formattedDate = new Date(generatedAt).toLocaleString('de-DE', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  return (
    <div className="rounded-lg border border-muted bg-gradient-to-r from-sky-500/10 to-emerald-500/10 p-4">
      <div className="mb-2 flex items-center justify-between">
        <span className="text-xs font-medium text-muted-foreground">Letzte {timeRangeLabel}</span>
        <span className="text-[10px] text-muted-foreground">{formattedDate}</span>
      </div>
      <p className="text-sm leading-relaxed text-foreground">{summary}</p>
    </div>
  );
}

// ---------------------------------------------------------------------------
// StatsBar
// ---------------------------------------------------------------------------

function formatNumber(n: number): string {
  if (n >= 1000) return `${(n / 1000).toFixed(1)}k`;
  return String(n);
}

function StatsBar({ stats }: { stats: DashboardStats }) {
  return (
    <div className="flex gap-2">
      <StatBox
        icon={<FileText className="h-3.5 w-3.5" />}
        value={formatNumber(stats.filesChanged)}
        label="Dateien"
      />
      <StatBox
        icon={<GitCommitHorizontal className="h-3.5 w-3.5" />}
        value={formatNumber(stats.commits)}
        label="Commits"
      />
      <StatBox
        icon={<Plus className="h-3.5 w-3.5 text-emerald-500" />}
        value={formatNumber(stats.linesAdded)}
        label="Zeilen"
        valueClass="text-emerald-500"
      />
      <StatBox
        icon={<Minus className="h-3.5 w-3.5 text-red-400" />}
        value={formatNumber(stats.linesRemoved)}
        label="Zeilen"
        valueClass="text-red-400"
      />
    </div>
  );
}

function StatBox({
  icon,
  value,
  label,
  valueClass,
}: {
  icon: React.ReactNode;
  value: string;
  label: string;
  valueClass?: string;
}) {
  return (
    <div className="flex flex-1 flex-col items-center gap-0.5 rounded-md border border-muted bg-muted/30 px-2 py-2">
      <div className="flex items-center gap-1">
        {icon}
        <span className={`text-sm font-semibold ${valueClass ?? 'text-foreground'}`}>{value}</span>
      </div>
      <span className="text-[10px] text-muted-foreground">{label}</span>
    </div>
  );
}

// ---------------------------------------------------------------------------
// SectionCard
// ---------------------------------------------------------------------------

const TYPE_ICONS: Record<string, React.ReactNode> = {
  feature: <Rocket className="h-3.5 w-3.5 text-blue-400" />,
  feat: <Rocket className="h-3.5 w-3.5 text-blue-400" />,
  bugfix: <Bug className="h-3.5 w-3.5 text-red-400" />,
  bug: <Bug className="h-3.5 w-3.5 text-red-400" />,
  fix: <Bug className="h-3.5 w-3.5 text-red-400" />,
  refactor: <Wrench className="h-3.5 w-3.5 text-amber-400" />,
  docs: <FileText className="h-3.5 w-3.5 text-emerald-400" />,
  doc: <FileText className="h-3.5 w-3.5 text-emerald-400" />,
};

function guessIcon(title: string): React.ReactNode {
  const lower = title.toLowerCase();
  for (const [key, icon] of Object.entries(TYPE_ICONS)) {
    if (lower.includes(key)) return icon;
  }
  return <Pin className="h-3.5 w-3.5 text-muted-foreground" />;
}

function SectionCard({
  section,
  defaultOpen = true,
}: {
  section: DashboardSection;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div className="rounded-lg border border-muted">
      <button
        type="button"
        className="flex w-full items-center gap-2 px-3 py-2 text-left transition-colors hover:bg-muted/40"
        onClick={() => setOpen((prev) => !prev)}
      >
        <ChevronDown
          className={cn(
            'h-3.5 w-3.5 shrink-0 text-muted-foreground transition-transform duration-200',
            !open && '-rotate-90'
          )}
        />
        <span className="flex-1 text-xs font-medium text-foreground">{section.title}</span>
        <span className="text-[10px] text-muted-foreground">{section.items.length}</span>
      </button>

      <div
        className={cn(
          'overflow-hidden transition-all duration-200',
          open ? 'max-h-[2000px] opacity-100' : 'max-h-0 opacity-0'
        )}
      >
        <div className="space-y-1 px-3 pb-2">
          {section.items.map((item, i) => (
            <div key={i} className="flex items-start gap-2 py-0.5">
              {guessIcon(item.text)}
              <div className="min-w-0 flex-1">
                <p className="text-xs leading-relaxed text-foreground/90">{item.text}</p>
                {item.file && (
                  <p className="truncate text-[10px] text-muted-foreground">{item.file}</p>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
