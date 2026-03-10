import { createContext, useCallback, useContext, useState, type ReactNode } from 'react';
import { GraphicsDialog } from '@/components/dialogs/graphics-dialog';
import { useAppStore } from '@/store/app-store';
import type { Theme } from '@/config/theme-options';

interface GraphicsDialogContextValue {
  openGraphicsDialog: () => void;
  closeGraphicsDialog: () => void;
  isGraphicsDialogOpen: boolean;
}

const GraphicsDialogContext = createContext<GraphicsDialogContextValue | null>(null);

export function GraphicsDialogProvider({ children }: { children: ReactNode }) {
  const [isGraphicsDialogOpen, setIsGraphicsDialogOpen] = useState(false);
  const theme = useAppStore((state) => state.theme);
  const setTheme = useAppStore((state) => state.setTheme);

  const openGraphicsDialog = useCallback(() => {
    setIsGraphicsDialogOpen(true);
  }, []);

  const closeGraphicsDialog = useCallback(() => {
    setIsGraphicsDialogOpen(false);
  }, []);

  return (
    <GraphicsDialogContext.Provider
      value={{ openGraphicsDialog, closeGraphicsDialog, isGraphicsDialogOpen }}
    >
      {children}
      <GraphicsDialog
        open={isGraphicsDialogOpen}
        onOpenChange={setIsGraphicsDialogOpen}
        effectiveTheme={theme as Theme}
        onThemeChange={(nextTheme) => setTheme(nextTheme as typeof theme)}
      />
    </GraphicsDialogContext.Provider>
  );
}

const hmrFallback: GraphicsDialogContextValue = {
  openGraphicsDialog: () => {
    console.warn('[HMR] GraphicsDialogContext not available');
  },
  closeGraphicsDialog: () => {},
  isGraphicsDialogOpen: false,
};

export function useGraphicsDialog() {
  const context = useContext(GraphicsDialogContext);

  if (!context) {
    if (import.meta.hot) {
      return hmrFallback;
    }
    throw new Error('useGraphicsDialog must be used within GraphicsDialogProvider');
  }

  return context;
}
