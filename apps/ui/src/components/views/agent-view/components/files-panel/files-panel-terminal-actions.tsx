/**
 * FilesPanelTerminalActions - Small action bar above the embedded terminal.
 *
 * Shows "open in full tab" button and a label so the user knows
 * they can switch to the dedicated terminal tab for more features.
 */

import { memo } from 'react';
import { ExternalLink } from 'lucide-react';

interface FilesPanelTerminalActionsProps {
  onOpenInTab: () => void;
}

export const FilesPanelTerminalActions = memo(function FilesPanelTerminalActions({
  onOpenInTab,
}: FilesPanelTerminalActionsProps) {
  return (
    <div className="flex items-center gap-1 border-b border-border bg-muted/30 px-2 py-0.5 shrink-0">
      <span className="text-[10px] text-muted-foreground select-none">Terminal</span>
      <div className="flex-1" />
      <button
        type="button"
        className="flex items-center gap-1 rounded px-1.5 py-0.5 text-[10px] text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
        onClick={onOpenInTab}
        title="Im eigenen Tab oeffnen"
        aria-label="Terminal im eigenen Tab oeffnen"
      >
        <ExternalLink className="h-2.5 w-2.5" />
        Tab
      </button>
    </div>
  );
});
