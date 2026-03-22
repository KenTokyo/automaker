import { Clock3 } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';

interface SessionTimeFilterDropdownProps {
  selectedHours: number | null;
  onChange: (hours: number | null) => void;
}

const TIME_FILTER_OPTIONS: Array<{ label: string; value: string; hours: number | null }> = [
  { label: 'All Time', value: 'all', hours: null },
  { label: 'Last 1h', value: '1', hours: 1 },
  { label: 'Last 6h', value: '6', hours: 6 },
  { label: 'Last 12h', value: '12', hours: 12 },
  { label: 'Last 24h', value: '24', hours: 24 },
];

export function SessionTimeFilterDropdown({
  selectedHours,
  onChange,
}: SessionTimeFilterDropdownProps) {
  const selectedValue = selectedHours === null ? 'all' : String(selectedHours);

  return (
    <Select
      value={selectedValue}
      onValueChange={(value) => {
        const option = TIME_FILTER_OPTIONS.find((entry) => entry.value === value);
        onChange(option?.hours ?? null);
      }}
    >
      <SelectTrigger
        className={cn(
          'h-6 w-[76px] shrink-0 gap-0.5 px-1.5 text-[10px]',
          selectedHours !== null && 'border-primary/50'
        )}
        aria-label="Filter by recent activity"
      >
        <span className="flex items-center gap-0.5">
          <Clock3 className="h-2.5 w-2.5 shrink-0" />
          <SelectValue />
        </span>
      </SelectTrigger>
      <SelectContent align="start">
        {TIME_FILTER_OPTIONS.map((option) => (
          <SelectItem key={option.value} value={option.value} className="text-xs">
            {option.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
