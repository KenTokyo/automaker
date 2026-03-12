/**
 * Dashboard control components: TimeTabs, ActionBar, ModelSelector, Loading, EmptyState.
 *
 * Adapted from apps/chat/src/components/dashboard-*.tsx.
 * Uses @automaker/types for shared dashboard types.
 */

import { BarChart3, Loader2, RefreshCw, Sparkles, Wand2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';
import {
  DASHBOARD_TIME_RANGES,
  type DashboardMode,
  type DashboardOverviewData,
  type DashboardTimeRange,
} from '@automaker/types';

// ---------------------------------------------------------------------------
// TimeTabs
// ---------------------------------------------------------------------------

interface DashboardTimeTabsProps {
  activeTab: DashboardTimeRange;
  onTabChange: (tab: DashboardTimeRange) => void;
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

// ---------------------------------------------------------------------------
// ActionBar
// ---------------------------------------------------------------------------

interface DashboardActionBarProps {
  data: DashboardOverviewData | null;
  isGenerating: boolean;
  onAction: (mode: DashboardMode) => void;
}

function toModelShortLabel(model: string): string {
  const normalized = model.trim().toLowerCase();
  if (normalized.includes('sonnet')) return 'Sonnet';
  if (normalized.includes('haiku')) return 'Haiku';
  if (normalized.includes('opus')) return 'Opus';
  return model;
}

function getModeLabel(mode: DashboardMode): string {
  if (mode === 'simplify') return 'Vereinfacht';
  if (mode === 'detail') return 'Mehr Details';
  return 'Standard';
}

export function DashboardActionBar({ data, isGenerating, onAction }: DashboardActionBarProps) {
  const activeMode: DashboardMode = data?.mode ?? 'standard';
  const generatedAt = data ? new Date(data.generatedAt).toLocaleString('de-DE') : null;

  if (!data) {
    return (
      <div className="px-3 pb-3">
        <Button
          size="sm"
          onClick={() => onAction('standard')}
          disabled={isGenerating}
          className="w-full gap-1.5"
          aria-label="Übersicht generieren"
          title="Erstellt eine neue Übersicht"
        >
          <RefreshCw className="h-3.5 w-3.5" />
          Übersicht generieren
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-2 px-3 pb-3">
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
        <Button
          variant={activeMode === 'standard' ? 'default' : 'outline'}
          size="sm"
          onClick={() => onAction('standard')}
          disabled={isGenerating}
          aria-label="Übersicht neu generieren"
          aria-pressed={activeMode === 'standard'}
          title="Erstellt eine neue Standard-Übersicht"
          className="gap-1.5 text-xs"
        >
          <RefreshCw className="h-3.5 w-3.5" />
          Neu generieren
        </Button>

        <Button
          variant={activeMode === 'simplify' ? 'default' : 'outline'}
          size="sm"
          onClick={() => onAction('simplify')}
          disabled={isGenerating}
          aria-label="Übersicht vereinfachen"
          aria-pressed={activeMode === 'simplify'}
          title="Erklärt die Übersicht in einfachen Worten"
          className="gap-1.5 text-xs"
        >
          <Wand2 className="h-3.5 w-3.5" />
          Vereinfachen
        </Button>

        <Button
          variant={activeMode === 'detail' ? 'default' : 'outline'}
          size="sm"
          onClick={() => onAction('detail')}
          disabled={isGenerating}
          aria-label="Mehr Details zur Übersicht"
          aria-pressed={activeMode === 'detail'}
          title="Zeigt mehr Kontext und mehr Details"
          className="gap-1.5 text-xs"
        >
          <Sparkles className="h-3.5 w-3.5" />
          Mehr Details
        </Button>
      </div>

      <div className="space-y-0.5 text-[11px] text-muted-foreground">
        <p>
          Aktiver Modus:{' '}
          <span className="font-medium text-foreground">{getModeLabel(activeMode)}</span>
        </p>
        <p>
          Generiert mit{' '}
          <span className="font-medium text-foreground">{toModelShortLabel(data.model)}</span>
          {generatedAt ? ` am ${generatedAt}` : ''}
        </p>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// ModelSelector
// ---------------------------------------------------------------------------

export type DashboardModelAlias = 'sonnet' | 'haiku' | 'opus';

interface DashboardModelSelectorProps {
  value: DashboardModelAlias;
  onChange: (value: DashboardModelAlias) => void;
  disabled?: boolean;
}

const MODEL_OPTIONS: Array<{ value: DashboardModelAlias; label: string; hint: string }> = [
  { value: 'sonnet', label: 'Sonnet', hint: 'Standard' },
  { value: 'haiku', label: 'Haiku', hint: 'Schnell' },
  { value: 'opus', label: 'Opus', hint: 'Mehr Details' },
];

export function DashboardModelSelector({
  value,
  onChange,
  disabled = false,
}: DashboardModelSelectorProps) {
  return (
    <div className="flex min-w-[150px] items-center gap-1.5">
      <span className="text-[11px] text-muted-foreground">Modell</span>
      <Select
        value={value}
        onValueChange={(next) => onChange(next as DashboardModelAlias)}
        disabled={disabled}
      >
        <SelectTrigger
          className="h-7 rounded-md border-muted bg-muted/20 px-2 text-xs"
          aria-label="Modell für Übersicht wählen"
        >
          <SelectValue placeholder="Modell wählen" />
        </SelectTrigger>
        <SelectContent>
          {MODEL_OPTIONS.map((option) => (
            <SelectItem key={option.value} value={option.value} className="text-xs">
              {option.label} ({option.hint})
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Loading
// ---------------------------------------------------------------------------

interface DashboardLoadingProps {
  phase: string;
  onCancel?: () => void;
}

export function DashboardLoading({ phase, onCancel }: DashboardLoadingProps) {
  return (
    <div
      className="flex flex-col items-center justify-center gap-4 px-6 py-12 text-center"
      aria-live="polite"
    >
      <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      <div className="space-y-1">
        <p className="text-sm font-medium">Übersicht wird erstellt…</p>
        {phase ? <p className="animate-pulse text-xs text-muted-foreground">{phase}</p> : null}
      </div>
      {onCancel ? (
        <Button variant="outline" size="sm" onClick={onCancel} className="gap-1.5">
          Abbrechen
        </Button>
      ) : null}
    </div>
  );
}

// ---------------------------------------------------------------------------
// EmptyState
// ---------------------------------------------------------------------------

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
