import { useState } from 'react';
import { Trash2 } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

interface DeleteOldSessionsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  totalSessionCount: number;
  onConfirm: (olderThanDays: number) => void;
}

export function DeleteOldSessionsDialog({
  open,
  onOpenChange,
  totalSessionCount,
  onConfirm,
}: DeleteOldSessionsDialogProps) {
  const [days, setDays] = useState(7);

  const handleConfirm = () => {
    if (days > 0) {
      onConfirm(days);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent data-testid="delete-old-sessions-dialog">
        <DialogHeader>
          <DialogTitle className="text-sm">Alte Sessions löschen</DialogTitle>
          <DialogDescription className="text-xs">
            Alle Sessions löschen, die älter als die angegebene Anzahl an Tagen sind. Diese Aktion
            kann nicht rückgängig gemacht werden.
          </DialogDescription>
        </DialogHeader>

        <div className="flex items-center gap-2 py-2">
          <span className="text-xs text-muted-foreground whitespace-nowrap">Älter als</span>
          <Input
            type="number"
            min={1}
            max={365}
            value={days}
            onChange={(e) => setDays(Math.max(1, Number.parseInt(e.target.value) || 1))}
            className="h-7 w-20 text-xs"
          />
          <span className="text-xs text-muted-foreground whitespace-nowrap">Tage</span>
        </div>

        <p className="text-[10px] text-muted-foreground">
          Insgesamt {totalSessionCount} Sessions vorhanden. Die aktuelle Session wird nicht
          gelöscht.
        </p>

        <DialogFooter>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onOpenChange(false)}
            className="h-7 text-xs"
          >
            Abbrechen
          </Button>
          <Button
            variant="destructive"
            size="sm"
            onClick={handleConfirm}
            className="h-7 text-xs"
            data-testid="confirm-delete-old-sessions"
          >
            <Trash2 className="w-3 h-3 mr-1" />
            Löschen
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
