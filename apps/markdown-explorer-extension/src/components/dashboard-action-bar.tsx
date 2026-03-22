import { RefreshCw, Sparkles, Wand2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { DashboardMode, DashboardOverviewData } from '../stores/dashboard-types';

interface DashboardActionBarProps {
  data: DashboardOverviewData | null;
  isGenerating: boolean;
  onAction: (mode: DashboardMode) => void;
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

function toModelShortLabel(model: string): string {
  const normalized = model.trim().toLowerCase();
  if (normalized.includes('sonnet')) return 'Sonnet';
  if (normalized.includes('haiku')) return 'Haiku';
  if (normalized.includes('opus')) return 'Opus';
  return model;
}
