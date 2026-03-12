/**
 * FilesPanelTerminalToggle - Button to show/hide the terminal in the files panel.
 */

import { memo } from 'react';
import { Terminal, ChevronDown, ChevronUp } from 'lucide-react';
import { cn } from '@/lib/utils';

interface FilesPanelTerminalToggleProps {
  open: boolean;
  onToggle: () => void;
}

export const FilesPanelTerminalToggle = memo(function FilesPanelTerminalToggle({
  open,
  onToggle,
}: FilesPanelTerminalToggleProps) {
  return (
    <button
      type="button"
      className={cn(
        'flex items-center gap-1 rounded px-1.5 py-0.5 text-[10px] transition-colors',
        open
          ? 'text-foreground bg-muted'
          : 'text-muted-foreground hover:bg-muted hover:text-foreground'
      )}
      onClick={onToggle}
      title={open ? 'Terminal ausblenden' : 'Terminal einblenden'}
      aria-label={open ? 'Terminal ausblenden' : 'Terminal einblenden'}
      aria-pressed={open}
    >
      <Terminal className="h-3 w-3" />
      Terminal
      {open ? <ChevronDown className="h-2.5 w-2.5" /> : <ChevronUp className="h-2.5 w-2.5" />}
    </button>
  );
});
