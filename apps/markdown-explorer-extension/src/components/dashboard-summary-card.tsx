interface DashboardSummaryCardProps {
  summary: string;
  timeRangeLabel: string;
  generatedAt: string;
}

export function DashboardSummaryCard({
  summary,
  timeRangeLabel,
  generatedAt,
}: DashboardSummaryCardProps) {
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
