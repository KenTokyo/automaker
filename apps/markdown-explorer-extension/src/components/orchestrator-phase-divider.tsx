import { CheckCircle2, ChevronRight } from 'lucide-react';
import type { OrchestratorPhaseInfo } from '../services/orchestrator-utils';

interface OrchestratorPhaseDividerProps {
  completedPhase: OrchestratorPhaseInfo;
}

export function OrchestratorPhaseDivider({ completedPhase }: OrchestratorPhaseDividerProps) {
  const label =
    completedPhase.status === 'complete'
      ? `Alle Phasen abgeschlossen`
      : `Phase ${completedPhase.iteration} abgeschlossen`;

  return (
    <div className="flex items-center gap-2 py-1">
      <div className="h-px flex-1 bg-emerald-400/30" />
      <div className="flex items-center gap-1.5 rounded-full border border-emerald-400/30 bg-emerald-500/5 px-3 py-1 text-[11px] font-medium text-emerald-700">
        <CheckCircle2 className="h-3 w-3" />
        <span>{label}</span>
        <ChevronRight className="h-3 w-3 text-emerald-600/60" />
        <span className="text-emerald-600/80">Phase {completedPhase.iteration + 1}</span>
      </div>
      <div className="h-px flex-1 bg-emerald-400/30" />
    </div>
  );
}
