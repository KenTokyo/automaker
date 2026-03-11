import { Search, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

interface HistorySearchProps {
  value: string;
  resultCount: number;
  onChange: (value: string) => void;
}

export function HistorySearch({ value, resultCount, onChange }: HistorySearchProps) {
  return (
    <div className="space-y-2">
      <div className="relative">
        <Search className="pointer-events-none absolute left-2.5 top-2 h-3.5 w-3.5 text-muted-foreground" />
        <Input
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder="Chats suchen"
          className="h-8 border-muted pl-8 pr-9 text-sm"
          aria-label="Chats suchen"
          data-focus-target="history-search"
        />

        {value.trim().length > 0 ? (
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="absolute right-1 top-1 h-6 w-6 text-muted-foreground hover:text-foreground"
            onClick={() => onChange('')}
            aria-label="Suche löschen"
            title="Suche löschen"
          >
            <X className="h-3.5 w-3.5" />
          </Button>
        ) : null}
      </div>

      <p className="text-xs text-muted-foreground">{resultCount} Treffer</p>
    </div>
  );
}
