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
      placeholder="Search chats..."
      value={value}
      onChange={(e) => onChange(e.target.value)}
      aria-label="Search chats"
      className="h-8 text-xs"
      startAddon={<Search className="w-3.5 h-3.5" />}
      endAddon={
        value ? (
          <Button
            variant="ghost"
            size="sm"
            className="h-5 w-5 p-0 hover:bg-transparent"
            onClick={onClear}
            aria-label="Clear search"
          >
            <X className="w-3 h-3" />
          </Button>
        ) : undefined
      }
    />
  );
}
