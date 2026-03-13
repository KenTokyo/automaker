/**
 * CompletedTasksSearch - Search input with 300ms debounce for the Done tab.
 *
 * Follows the same pattern as session-search-input.tsx:
 * Input with Search icon start addon, X clear button end addon.
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { Search, X } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

interface CompletedTasksSearchProps {
  value: string;
  onChange: (value: string) => void;
}

export function CompletedTasksSearch({ value, onChange }: CompletedTasksSearchProps) {
  const [local, setLocal] = useState(value);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Sync external value changes
  useEffect(() => {
    setLocal(value);
  }, [value]);

  const emitChange = useCallback(
    (v: string) => {
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => onChange(v), 300);
    },
    [onChange]
  );

  // Cleanup timer on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const v = e.target.value;
      setLocal(v);
      emitChange(v);
    },
    [emitChange]
  );

  const handleClear = useCallback(() => {
    setLocal('');
    onChange('');
    if (timerRef.current) clearTimeout(timerRef.current);
  }, [onChange]);

  return (
    <Input
      className="h-8 text-xs"
      placeholder="Suchen..."
      value={local}
      onChange={handleChange}
      startAddon={<Search className="h-3.5 w-3.5" />}
      endAddon={
        local ? (
          <Button
            variant="ghost"
            size="sm"
            className="h-5 w-5 p-0"
            onClick={handleClear}
            tabIndex={-1}
          >
            <X className="h-3 w-3" />
          </Button>
        ) : undefined
      }
    />
  );
}
