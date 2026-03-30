/**
 * Global System Prompt Store
 *
 * Manages a single global system prompt that is always included
 * in every agent chat session. Unlike regular agent prompts,
 * this prompt is not selectable — it's always active.
 *
 * Stored as DATA_DIR/global-system-prompt.md on the server.
 */

import { create } from 'zustand';
import { getHttpApiClient } from '@/lib/http-api-client';
import { createLogger } from '@automaker/utils/logger';

const logger = createLogger('GlobalSystemPromptStore');

interface GlobalSystemPromptState {
  /** The current content of the global system prompt */
  content: string;
  /** Whether content has been loaded from server */
  isLoaded: boolean;
  /** Loading indicator */
  isLoading: boolean;
  /** Saving indicator */
  isSaving: boolean;
  /** Error message */
  error: string | null;

  // Actions
  loadPrompt: () => Promise<void>;
  savePrompt: (content: string) => Promise<boolean>;
}

export const useGlobalSystemPromptStore = create<GlobalSystemPromptState>((set, get) => ({
  content: '',
  isLoaded: false,
  isLoading: false,
  isSaving: false,
  error: null,

  loadPrompt: async () => {
    // Skip if already loaded or currently loading
    if (get().isLoaded || get().isLoading) return;

    set({ isLoading: true, error: null });

    try {
      const api = getHttpApiClient();
      const result = await api.globalSystemPrompt.load();

      if (result.success) {
        set({
          content: result.content,
          isLoaded: true,
          isLoading: false,
        });
        logger.debug('Loaded global system prompt', { length: result.content.length });
      } else {
        set({ isLoading: false, error: 'Failed to load global system prompt' });
      }
    } catch (err) {
      logger.error('Failed to load global system prompt:', err);
      set({
        isLoading: false,
        error: 'Failed to load global system prompt',
      });
    }
  },

  savePrompt: async (content: string) => {
    set({ isSaving: true, error: null });

    try {
      const api = getHttpApiClient();
      const result = await api.globalSystemPrompt.save(content);

      if (result.success) {
        set({ content, isSaving: false });
        logger.info('Saved global system prompt', { length: content.length });
        return true;
      } else {
        set({ isSaving: false, error: 'Failed to save global system prompt' });
        return false;
      }
    } catch (err) {
      logger.error('Failed to save global system prompt:', err);
      set({
        isSaving: false,
        error: 'Failed to save global system prompt',
      });
      return false;
    }
  },
}));
