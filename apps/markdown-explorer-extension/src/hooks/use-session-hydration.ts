import { useEffect, useRef } from 'react';
import { createLogger } from '@automaker/utils/logger';
import { toast } from 'sonner';
import {
  loadPersistedSessionStore,
  startSessionStorePersistence,
} from '../services/session-persistence';
import { useSessionStore } from '../stores/session-store';

const logger = createLogger('SessionHydration');

export function useSessionHydration(): boolean {
  const hasHydratedFromDisk = useSessionStore((state) => state.hasHydratedFromDisk);
  const initStartedRef = useRef(false);

  useEffect(() => {
    if (initStartedRef.current) return;
    initStartedRef.current = true;

    const { snapshot, notice } = loadPersistedSessionStore();
    useSessionStore.getState().hydrateFromPersistence(snapshot);

    if (notice) {
      logger.info('Session hydration notice', { notice });
      toast.info(notice);
    }

    const controller = startSessionStorePersistence(useSessionStore);
    return () => {
      controller.stop();
    };
  }, []);

  return hasHydratedFromDisk;
}
