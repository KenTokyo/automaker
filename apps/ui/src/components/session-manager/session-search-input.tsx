import { Search, X } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

interface SessionSearchInputProps {
  value: string;
  onChange: (value: string) => void;
  onClear: () => void;
}

export function SessionSearchInput({ value, onChange, onClear }: SessionSearchInputProps) {
  return (
    <Input
      placeholder="Search..."
      value={value}
      onChange={(e) => onChange(e.target.value)}
      aria-label="Search chats"
      className="h-6 text-[10px]"
      startAddon={<Search className="w-2.5 h-2.5" />}
      endAddon={
        value ? (
          <Button
            variant="ghost"
            size="sm"
            className="h-4 w-4 p-0 hover:bg-transparent"
            onClick={onClear}
            aria-label="Clear search"
          >
            <X className="w-2.5 h-2.5" />
          </Button>
        ) : undefined
      }
    />
  );
}
