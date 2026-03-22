import type { SessionMessage } from '../stores/types';

export type OrchestratorPhaseStatus = 'running' | 'done' | 'error' | 'complete';

export interface OrchestratorPhaseInfo {
  iteration: number;
  status: OrchestratorPhaseStatus;
  startMessageIndex: number;
  endMessageIndex: number;
  summary?: string;
}

export interface OrchestratorRunInfo {
  runId: string | null;
  isActive: boolean;
  currentIteration: number;
  phases: OrchestratorPhaseInfo[];
  isAllComplete: boolean;
  totalPhases: number;
  completedPhases: number;
}

const NEXT_PHASE_MARKER = 'NEXT_PHASE_READY';
const ALL_COMPLETE_MARKER = 'ALL_PHASES_COMPLETE';

function extractPhaseSummary(content: string): string | undefined {
  const lines = content.split('\n');
  for (const line of lines) {
    const trimmed = line.trim();
    if (
      trimmed.length > 10 &&
      !trimmed.startsWith(NEXT_PHASE_MARKER) &&
      !trimmed.startsWith(ALL_COMPLETE_MARKER) &&
      !trimmed.startsWith('---') &&
      !trimmed.startsWith('#')
    ) {
      return trimmed.length > 120 ? `${trimmed.slice(0, 117)}...` : trimmed;
    }
  }
  return undefined;
}

export function detectPhases(
  messages: SessionMessage[],
  orchestratorMode: boolean,
  orchestratorIteration: number,
  orchestratorRunId: string | null
): OrchestratorRunInfo {
  const empty: OrchestratorRunInfo = {
    runId: orchestratorRunId,
    isActive: orchestratorMode,
    currentIteration: orchestratorIteration,
    phases: [],
    isAllComplete: false,
    totalPhases: 0,
    completedPhases: 0,
  };

  if (!orchestratorMode || messages.length === 0) {
    return empty;
  }

  const phases: OrchestratorPhaseInfo[] = [];
  let currentPhaseStart = 0;
  let currentIteration = 1;
  let isAllComplete = false;

  for (let i = 0; i < messages.length; i++) {
    const message = messages[i];
    if (message.role !== 'assistant') continue;

    const content = message.content;

    if (content.includes(ALL_COMPLETE_MARKER)) {
      phases.push({
        iteration: currentIteration,
        status: 'complete',
        startMessageIndex: currentPhaseStart,
        endMessageIndex: i,
        summary: extractPhaseSummary(content),
      });
      isAllComplete = true;
      currentPhaseStart = i + 1;
      currentIteration++;
    } else if (content.includes(NEXT_PHASE_MARKER)) {
      phases.push({
        iteration: currentIteration,
        status: 'done',
        startMessageIndex: currentPhaseStart,
        endMessageIndex: i,
        summary: extractPhaseSummary(content),
      });
      currentPhaseStart = i + 1;
      currentIteration++;
    }
  }

  // If there are messages after the last phase marker, there's a running phase
  if (currentPhaseStart < messages.length && !isAllComplete) {
    const hasError = messages.some((m, idx) => idx >= currentPhaseStart && m.isError);
    phases.push({
      iteration: currentIteration,
      status: hasError ? 'error' : 'running',
      startMessageIndex: currentPhaseStart,
      endMessageIndex: messages.length - 1,
    });
  }

  const completedPhases = phases.filter(
    (p) => p.status === 'done' || p.status === 'complete'
  ).length;

  return {
    runId: orchestratorRunId,
    isActive: orchestratorMode,
    currentIteration: Math.max(orchestratorIteration, currentIteration),
    phases,
    isAllComplete,
    totalPhases: phases.length,
    completedPhases,
  };
}

/**
 * Returns the set of message indices where a phase divider should appear BEFORE.
 */
export function getPhaseDividerIndices(
  phases: OrchestratorPhaseInfo[]
): Map<number, OrchestratorPhaseInfo> {
  const dividers = new Map<number, OrchestratorPhaseInfo>();
  for (let i = 1; i < phases.length; i++) {
    const phase = phases[i];
    dividers.set(phase.startMessageIndex, phases[i - 1]);
  }
  return dividers;
}

export function formatRunId(runId: string | null): string {
  if (!runId) return '—';
  if (runId.length <= 12) return runId;
  return `${runId.slice(0, 10)}…`;
}
