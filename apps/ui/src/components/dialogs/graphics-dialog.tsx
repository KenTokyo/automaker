import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { AppearanceSection } from '@/components/views/settings-view/appearance/appearance-section';
import type { Theme } from '@/config/theme-options';

interface GraphicsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  effectiveTheme: Theme;
  onThemeChange: (theme: Theme) => void;
}

/**
 * Global dialog for appearance/graphics settings.
 * Uses the same section component as the Settings page to avoid duplicated logic.
 */
export function GraphicsDialog({
  open,
  onOpenChange,
  effectiveTheme,
  onThemeChange,
}: GraphicsDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl p-0 sm:max-w-5xl" data-testid="graphics-settings-dialog">
        <DialogHeader className="sr-only">
          <DialogTitle>Graphics Settings</DialogTitle>
          <DialogDescription>
            Configure theme, fonts, startup, and sidebar layout.
          </DialogDescription>
        </DialogHeader>
        <div className="max-h-[calc(100vh-6rem)] overflow-y-auto p-4 sm:p-6">
          <AppearanceSection effectiveTheme={effectiveTheme} onThemeChange={onThemeChange} />
        </div>
      </DialogContent>
    </Dialog>
  );
}
