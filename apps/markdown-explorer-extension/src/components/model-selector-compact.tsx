import type { PhaseModelEntry } from '@automaker/types';
import { AgentModelSelector } from '@/components/views/agent-view/shared/agent-model-selector';

interface ModelSelectorCompactProps {
  value: PhaseModelEntry;
  onChange: (entry: PhaseModelEntry) => void;
  disabled?: boolean;
}

export function ModelSelectorCompact({ value, onChange, disabled }: ModelSelectorCompactProps) {
  return <AgentModelSelector value={value} onChange={onChange} disabled={disabled} />;
}
