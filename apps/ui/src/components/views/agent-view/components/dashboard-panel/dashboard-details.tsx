/**
 * Dashboard detail components: Improvements, Security, Metadata.
 *
 * Adapted from apps/chat/src/components/dashboard-*.tsx.
 * Uses @automaker/types for shared dashboard types.
 */

import { useCallback, useState } from 'react';
import { Check, Info, Lightbulb, Loader2, Plus, Shield, ShieldCheck } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useCreateFeature } from '@/hooks/mutations/use-feature-mutations';
import type {
  DashboardImprovement,
  DashboardMetadata,
  DashboardSecurityItem,
} from '@automaker/types';

// ---------------------------------------------------------------------------
// Combined Details (used by DashboardOverviewCards)
// ---------------------------------------------------------------------------

interface DashboardDetailsProps {
  improvements: DashboardImprovement[];
  security: DashboardSecurityItem[];
  metadata: DashboardMetadata;
  model: string;
  projectPath: string | null;
}

export function DashboardDetails({
  improvements,
  security,
  metadata,
  model,
  projectPath,
}: DashboardDetailsProps) {
  return (
    <>
      <Improvements improvements={improvements} projectPath={projectPath} />
      <Security security={security} />
      <MetadataFooter metadata={metadata} model={model} />
    </>
  );
}

// ---------------------------------------------------------------------------
// Improvements
// ---------------------------------------------------------------------------

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

const PRIORITY_TO_NUMBER: Record<DashboardImprovement['priority'], number> = {
  high: 1,
  medium: 2,
  low: 3,
};

function Improvements({
  improvements,
  projectPath,
}: {
  improvements: DashboardImprovement[];
  projectPath: string | null;
}) {
  const [createdFeatures, setCreatedFeatures] = useState<Set<number>>(() => new Set());
  const [loadingIndex, setLoadingIndex] = useState<number | null>(null);
  const createFeature = useCreateFeature(projectPath ?? '');

  const handleCreateFeature = useCallback(
    async (item: DashboardImprovement, index: number) => {
      if (!projectPath || createdFeatures.has(index) || loadingIndex !== null) return;

      setLoadingIndex(index);
      try {
        await createFeature.mutateAsync({
          id: crypto.randomUUID(),
          title: item.title.slice(0, 100),
          description: item.description,
          category: 'improvement',
          steps: [],
          status: 'pending',
          priority: PRIORITY_TO_NUMBER[item.priority],
        } as any);
        setCreatedFeatures((prev) => new Set(prev).add(index));
      } finally {
        setLoadingIndex(null);
      }
    },
    [projectPath, createdFeatures, loadingIndex, createFeature]
  );

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
        const isCreated = createdFeatures.has(i);
        const isLoading = loadingIndex === i;

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
            <div className="mt-1 flex items-end justify-between gap-2">
              <p className="flex-1 text-[11px] leading-relaxed text-muted-foreground">
                {item.description}
              </p>
              {projectPath ? (
                <button
                  type="button"
                  disabled={isCreated || isLoading || loadingIndex !== null}
                  onClick={() => handleCreateFeature(item, i)}
                  className={cn(
                    'flex shrink-0 items-center gap-1 rounded px-1.5 py-0.5 text-[10px] font-medium transition-colors',
                    isCreated
                      ? 'cursor-default text-emerald-400'
                      : 'text-muted-foreground hover:bg-muted/60 hover:text-foreground disabled:opacity-50'
                  )}
                >
                  {isLoading ? (
                    <Loader2 className="h-3 w-3 animate-spin" />
                  ) : isCreated ? (
                    <Check className="h-3 w-3" />
                  ) : (
                    <Plus className="h-3 w-3" />
                  )}
                  {isCreated ? 'Erstellt' : 'Als Feature'}
                </button>
              ) : null}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Security
// ---------------------------------------------------------------------------

const SEVERITY_STYLES: Record<
  DashboardSecurityItem['severity'],
  { bg: string; text: string; label: string }
> = {
  critical: { bg: 'bg-red-500/10', text: 'text-red-400', label: 'Kritisch' },
  warning: { bg: 'bg-amber-500/10', text: 'text-amber-400', label: 'Warnung' },
  info: { bg: 'bg-blue-500/10', text: 'text-blue-400', label: 'Info' },
};

function Security({ security }: { security: DashboardSecurityItem[] }) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-center gap-1.5 px-1">
        <Shield className="h-3.5 w-3.5 text-blue-400" />
        <span className="text-xs font-medium text-foreground">Sicherheit</span>
      </div>

      {security.length === 0 ? (
        <div className="flex items-center gap-2 rounded-md border border-muted bg-emerald-500/5 px-3 py-2">
          <ShieldCheck className="h-4 w-4 text-emerald-500" />
          <span className="text-xs text-muted-foreground">Keine Sicherheitsprobleme erkannt</span>
        </div>
      ) : (
        security.map((item, i) => {
          const style = SEVERITY_STYLES[item.severity];
          return (
            <div key={i} className={cn('rounded-md border border-muted px-3 py-2', style.bg)}>
              <div className="flex items-center gap-2">
                <span className={cn('flex-1 text-xs font-medium', style.text)}>{item.title}</span>
                <span className={cn('text-[10px]', style.text)}>{style.label}</span>
              </div>
              <p className="mt-0.5 text-[11px] leading-relaxed text-muted-foreground">
                {item.description}
              </p>
            </div>
          );
        })
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// MetadataFooter
// ---------------------------------------------------------------------------

function toModelShortLabel(model: string): string {
  const normalized = model.trim().toLowerCase();
  if (normalized.includes('sonnet')) return 'Sonnet';
  if (normalized.includes('haiku')) return 'Haiku';
  if (normalized.includes('opus')) return 'Opus';
  return model;
}

function MetadataFooter({ metadata, model }: { metadata: DashboardMetadata; model: string }) {
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
