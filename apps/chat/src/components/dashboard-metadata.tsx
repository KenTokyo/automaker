import { Info } from 'lucide-react';
import type { DashboardMetadata } from '../stores/dashboard-types';

interface DashboardMetadataFooterProps {
  metadata: DashboardMetadata;
  model: string;
}

function toModelShortLabel(model: string): string {
  const normalized = model.trim().toLowerCase();
  if (normalized.includes('sonnet')) return 'Sonnet';
  if (normalized.includes('haiku')) return 'Haiku';
  if (normalized.includes('opus')) return 'Opus';
  return model;
}

export function DashboardMetadataFooter({ metadata, model }: DashboardMetadataFooterProps) {
  const durationSec = (metadata.durationMs / 1000).toFixed(1);

  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 rounded-md border border-muted bg-muted/20 px-3 py-1.5 text-[10px] text-muted-foreground">
      <span>{metadata.filesAnalysed} Dateien analysiert</span>
      <span>{durationSec}s</span>
      {metadata.gitAvailable ? <span>Git</span> : null}
      <span>{toModelShortLabel(model)}</span>
      {metadata.truncated ? (
        <span className="flex items-center gap-0.5 text-amber-500">
          <Info className="h-3 w-3" />
          Daten gekürzt
        </span>
      ) : null}
    </div>
  );
}
