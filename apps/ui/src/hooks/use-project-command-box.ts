import { useState, useCallback } from 'react';

/**
 * Hook for managing ProjectCommandBox open/close state.
 * The keyboard shortcut registration is handled externally
 * (in the sidebar's useNavigation hook).
 */
export function useProjectCommandBox() {
  const [isOpen, setIsOpen] = useState(false);

  const open = useCallback(() => setIsOpen(true), []);
  const close = useCallback(() => setIsOpen(false), []);
  const toggle = useCallback(() => setIsOpen((prev) => !prev), []);

  return {
    isOpen,
    setIsOpen,
    open,
    close,
    toggle,
  };
}
