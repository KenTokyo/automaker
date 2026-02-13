import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';

interface ShortcutEntry {
  keys: string[];
  description: string;
}

interface ShortcutGroup {
  title: string;
  shortcuts: ShortcutEntry[];
}

const SHORTCUT_GROUPS: ShortcutGroup[] = [
  {
    title: 'General',
    shortcuts: [
      { keys: ['Ctrl', 'E'], description: 'Toggle edit mode' },
      { keys: ['Ctrl', 'S'], description: 'Save document' },
      { keys: ['Ctrl', 'Shift', 'M'], description: 'Toggle source mode' },
      { keys: ['Ctrl', 'Shift', 'R'], description: 'Toggle raw/rendered view' },
      { keys: ['Ctrl', 'Shift', 'C'], description: 'Copy file path' },
      { keys: ['Ctrl', 'Shift', 'D'], description: 'Toggle Docs panel' },
      { keys: ['Ctrl', '/'], description: 'Show keyboard shortcuts' },
      { keys: ['F1'], description: 'Show keyboard shortcuts' },
      { keys: ['Esc'], description: 'Close document (view mode)' },
    ],
  },
  {
    title: 'Text Formatting',
    shortcuts: [
      { keys: ['Ctrl', 'B'], description: 'Bold' },
      { keys: ['Ctrl', 'I'], description: 'Italic' },
      { keys: ['Ctrl', 'U'], description: 'Underline' },
      { keys: ['Ctrl', 'Shift', 'X'], description: 'Strikethrough' },
      { keys: ['Ctrl', 'E'], description: 'Inline code' },
      { keys: ['Ctrl', 'K'], description: 'Insert link' },
    ],
  },
  {
    title: 'Block Types',
    shortcuts: [
      { keys: ['Alt', '0'], description: 'Normal text' },
      { keys: ['Alt', '1'], description: 'Heading 1' },
      { keys: ['Alt', '2'], description: 'Heading 2' },
      { keys: ['Alt', '3'], description: 'Heading 3' },
      { keys: ['Alt', '4'], description: 'Heading 4' },
      { keys: ['Ctrl', 'Shift', '8'], description: 'Bullet list' },
      { keys: ['Ctrl', 'Shift', '7'], description: 'Ordered list' },
      { keys: ['Ctrl', 'Shift', '9'], description: 'Task list' },
      { keys: ['Ctrl', 'Shift', 'B'], description: 'Blockquote' },
      { keys: ['Ctrl', 'Alt', 'C'], description: 'Code block' },
    ],
  },
  {
    title: 'Table',
    shortcuts: [
      { keys: ['Tab'], description: 'Next cell' },
      { keys: ['Shift', 'Tab'], description: 'Previous cell' },
      { keys: ['Enter'], description: 'New line in cell' },
    ],
  },
  {
    title: 'History',
    shortcuts: [
      { keys: ['Ctrl', 'Z'], description: 'Undo' },
      { keys: ['Ctrl', 'Y'], description: 'Redo' },
      { keys: ['Ctrl', 'Shift', 'Z'], description: 'Redo (alt)' },
    ],
  },
  {
    title: 'AI & Slash Commands',
    shortcuts: [
      { keys: ['Ctrl', 'Shift', 'A'], description: 'Open AI menu (with selection)' },
      { keys: ['/'], description: 'Slash commands (at line start)' },
    ],
  },
];

function ShortcutBadge({ keys }: { keys: string[] }) {
  return (
    <span className="flex items-center gap-0.5">
      {keys.map((key, i) => (
        <span key={i} className="flex items-center gap-0.5">
          {i > 0 && <span className="text-[10px] text-muted-foreground">+</span>}
          <kbd
            className={cn(
              'inline-flex items-center justify-center rounded border border-border',
              'bg-muted/50 px-1.5 py-0.5 text-[11px] font-mono text-muted-foreground',
              'min-w-[1.5rem] text-center'
            )}
          >
            {key}
          </kbd>
        </span>
      ))}
    </span>
  );
}

interface DocsShortcutsOverlayProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function DocsShortcutsOverlay({ open, onOpenChange }: DocsShortcutsOverlayProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg p-0">
        <DialogHeader className="px-4 pt-4 pb-2">
          <DialogTitle className="text-sm">Keyboard Shortcuts</DialogTitle>
        </DialogHeader>
        <ScrollArea className="max-h-[60vh]">
          <div className="px-4 pb-4 space-y-4">
            {SHORTCUT_GROUPS.map((group) => (
              <div key={group.title}>
                <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                  {group.title}
                </h3>
                <div className="space-y-1">
                  {group.shortcuts.map((shortcut, i) => (
                    <div
                      key={i}
                      className="flex items-center justify-between py-1 px-2 rounded hover:bg-muted/50"
                    >
                      <span className="text-xs text-foreground">{shortcut.description}</span>
                      <ShortcutBadge keys={shortcut.keys} />
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
