import { FileText, GitCommitHorizontal, Plus, Minus } from 'lucide-react';
import type { DashboardStats } from '../stores/dashboard-types';

interface DashboardStatsBarProps {
  stats: DashboardStats;
}

function formatNumber(n: number): string {
  if (n >= 1000) return `${(n / 1000).toFixed(1)}k`;
  return String(n);
}

export function DashboardStatsBar({ stats }: DashboardStatsBarProps) {
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
