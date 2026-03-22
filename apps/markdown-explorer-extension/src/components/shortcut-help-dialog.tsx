import { Keyboard } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

interface ShortcutHelpDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface ShortcutEntry {
  keys: string;
  label: string;
}

const SHORTCUT_CATEGORIES: { title: string; shortcuts: ShortcutEntry[] }[] = [
  {
    title: 'Chat',
    shortcuts: [
      { keys: 'Ctrl + T', label: 'Neuer Chat' },
      { keys: 'Ctrl + W', label: 'Chat schliessen' },
      { keys: 'Ctrl + Tab', label: 'Naechster Chat' },
      { keys: 'Ctrl + Shift + Tab', label: 'Vorheriger Chat' },
      { keys: 'Ctrl + 1-9', label: 'Chat nach Nummer' },
    ],
  },
  {
    title: 'Eingabe',
    shortcuts: [
      { keys: 'Enter', label: 'Senden' },
      { keys: 'Ctrl + Enter', label: 'Senden (alternativ)' },
      { keys: 'Shift + Enter', label: 'Neue Zeile' },
      { keys: 'Esc', label: 'Eingabe loeschen' },
    ],
  },
  {
    title: 'Navigation',
    shortcuts: [
      { keys: 'Ctrl + K', label: 'Suche fokussieren' },
      { keys: 'Ctrl + L', label: 'Eingabe fokussieren' },
      { keys: 'Ctrl + ,', label: 'Einstellungen' },
    ],
  },
  {
    title: 'Hilfe',
    shortcuts: [{ keys: 'Ctrl + /', label: 'Diese Uebersicht' }],
  },
];

export function ShortcutHelpDialog({ open, onOpenChange }: ShortcutHelpDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md" compact>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Keyboard className="h-5 w-5" />
            Tastenkuerzel
          </DialogTitle>
          <DialogDescription>Alle verfuegbaren Tastenkuerzel auf einen Blick.</DialogDescription>
        </DialogHeader>

        <div className="mt-4 space-y-4 max-h-[60vh] overflow-y-auto">
          {SHORTCUT_CATEGORIES.map((category) => (
            <div key={category.title}>
              <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                {category.title}
              </h3>
              <div className="space-y-1">
                {category.shortcuts.map((shortcut) => (
                  <div
                    key={shortcut.keys}
                    className="flex items-center justify-between rounded-md px-2 py-1.5 text-sm hover:bg-muted/50"
                  >
                    <span className="text-foreground">{shortcut.label}</span>
                    <kbd className="rounded border border-muted bg-muted/60 px-2 py-0.5 text-xs font-mono text-muted-foreground">
                      {shortcut.keys}
                    </kbd>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}
