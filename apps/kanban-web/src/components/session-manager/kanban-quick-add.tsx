/**
 * KanbanQuickAdd - Inline input for quickly adding a task to a Kanban column.
 */

import { useCallback, useRef, useState } from 'react';
import { Check, X } from 'lucide-react';
import { Button } from '@ui/components/ui/button';
import { Input } from '@ui/components/ui/input';

interface KanbanQuickAddProps {
  onSubmit: (title: string) => Promise<void> | void;
  onCancel: () => void;
  placeholder?: string;
}

export function KanbanQuickAdd({ onSubmit, onCancel, placeholder }: KanbanQuickAddProps) {
  const [value, setValue] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleSubmit = useCallback(async () => {
    const trimmed = value.trim();
    if (!trimmed || submitting) return;

    setSubmitting(true);
    try {
      await onSubmit(trimmed);
      setValue('');
      // Re-focus for rapid entry
      inputRef.current?.focus();
    } finally {
      setSubmitting(false);
    }
  }, [value, submitting, onSubmit]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        void handleSubmit();
      } else if (e.key === 'Escape') {
        onCancel();
      }
    },
    [handleSubmit, onCancel]
  );

  return (
    <div className="flex items-center gap-1">
      <Input
        ref={inputRef}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={placeholder ?? 'Neuer Task...'}
        className="h-7 flex-1 text-xs bg-zinc-900 border-white/5 text-zinc-300 placeholder:text-zinc-600 focus:ring-cyan-500/30 focus:border-cyan-500/30"
        autoFocus
        disabled={submitting}
      />
      <Button
        variant="ghost"
        size="sm"
        className="h-7 w-7 shrink-0 p-0 text-cyan-400 hover:text-cyan-300 hover:bg-cyan-500/10"
        onClick={() => void handleSubmit()}
        disabled={!value.trim() || submitting}
        title="Erstellen"
      >
        <Check className="h-3.5 w-3.5" />
      </Button>
      <Button
        variant="ghost"
        size="sm"
        className="h-7 w-7 shrink-0 p-0 text-zinc-600 hover:text-zinc-400 hover:bg-white/5"
        onClick={onCancel}
        title="Abbrechen"
      >
        <X className="h-3.5 w-3.5" />
      </Button>
    </div>
  );
}
