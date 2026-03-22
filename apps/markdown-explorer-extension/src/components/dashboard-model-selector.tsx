import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

export type DashboardModelAlias = 'sonnet' | 'haiku' | 'opus';

interface DashboardModelSelectorProps {
  value: DashboardModelAlias;
  onChange: (value: DashboardModelAlias) => void;
  disabled?: boolean;
}

const MODEL_OPTIONS: Array<{
  value: DashboardModelAlias;
  label: string;
  hint: string;
}> = [
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
