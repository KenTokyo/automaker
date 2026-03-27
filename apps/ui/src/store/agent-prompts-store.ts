/**
 * Agent Prompts Store
 *
 * Manages custom agent prompts that can be prepended to messages.
 * Supports two scopes:
 * - Global: Stored in DATA_DIR/agents/, available across all projects
 * - Local (Project): Stored in {projectPath}/.automaker/agents/, project-specific
 *
 * Uses HTTP API to communicate with the server (agent-prompts-service).
 */

import { create } from 'zustand';
import { getHttpApiClient } from '@/lib/http-api-client';
import { createLogger } from '@automaker/utils/logger';
import { setItem, getItem } from '@/lib/storage';

const logger = createLogger('AgentPromptsStore');

// Storage key for selected prompts (persisted locally)
const SELECTED_PROMPTS_KEY = 'automaker:selected-agent-prompts';
// Storage key for favorite prompt keys (persisted locally)
const FAVORITE_PROMPTS_KEY = 'automaker:favorite-agent-prompts';

export type AgentPromptScope = 'global' | 'local';

/**
 * Agent prompt interface with scope information
 */
export interface AgentPrompt {
  id: string;
  name: string;
  prompt: string;
  scope: AgentPromptScope;
  createdAt?: string;
  updatedAt?: string;
}

/**
 * Unique key for a prompt (scope + id) to avoid collisions
 * between global and local prompts with the same name
 */
export function getPromptKey(scope: AgentPromptScope, id: string): string {
  return `${scope}:${id}`;
}

interface AgentPromptsState {
  globalPrompts: AgentPrompt[];
  localPrompts: AgentPrompt[];
  // Selected prompt keys (format: "scope:id")
  selectedPromptKeys: string[];
  // Favorite prompt keys (format: "scope:id") – shown as quick-toggle buttons
  favoritePromptKeys: string[];
  isLoading: boolean;
  error: string | null;
  projectPath: string | null;

  // Actions
  setProjectPath: (path: string | null) => void;
  loadPrompts: () => Promise<void>;
  addPrompt: (name: string, prompt: string, scope: AgentPromptScope) => Promise<AgentPrompt | null>;
  updatePrompt: (
    id: string,
    name: string,
    prompt: string,
    scope: AgentPromptScope
  ) => Promise<boolean>;
  deletePrompt: (id: string, scope: AgentPromptScope) => Promise<boolean>;
  togglePromptSelection: (id: string, scope: AgentPromptScope) => void;
  selectPrompt: (id: string, scope: AgentPromptScope) => void;
  deselectPrompt: (id: string, scope: AgentPromptScope) => void;
  clearSelection: () => void;
  getSelectedPromptsText: () => string;
  /** Get all prompts (global + local merged) */
  getAllPrompts: () => AgentPrompt[];
  /** Check if a prompt is selected */
  isSelected: (id: string, scope: AgentPromptScope) => boolean;
  /** Toggle a prompt as favorite (shown as quick-toggle button) */
  toggleFavorite: (id: string, scope: AgentPromptScope) => void;
  /** Check if a prompt is favorited */
  isFavorite: (id: string, scope: AgentPromptScope) => boolean;
  /** Get favorite prompts sorted by their key order */
  getFavoritePrompts: () => AgentPrompt[];
}

function loadSelectedKeys(): string[] {
  const stored = getItem(SELECTED_PROMPTS_KEY);
  if (stored) {
    try {
      const parsed = JSON.parse(stored);
      // Migration: old format stored plain IDs without scope prefix
      if (Array.isArray(parsed)) {
        return parsed.map((item: string) => (item.includes(':') ? item : `local:${item}`));
      }
      return [];
    } catch {
      return [];
    }
  }
  return [];
}

function saveSelectedKeys(keys: string[]): void {
  setItem(SELECTED_PROMPTS_KEY, JSON.stringify(keys));
}

function loadFavoriteKeys(): string[] {
  const stored = getItem(FAVORITE_PROMPTS_KEY);
  if (stored) {
    try {
      const parsed = JSON.parse(stored);
      if (Array.isArray(parsed)) return parsed;
      return [];
    } catch {
      return [];
    }
  }
  return [];
}

function saveFavoriteKeys(keys: string[]): void {
  setItem(FAVORITE_PROMPTS_KEY, JSON.stringify(keys));
}

export const useAgentPromptsStore = create<AgentPromptsState>((set, get) => ({
  globalPrompts: [],
  localPrompts: [],
  selectedPromptKeys: loadSelectedKeys(),
  favoritePromptKeys: loadFavoriteKeys(),
  isLoading: false,
  error: null,
  projectPath: null,

  setProjectPath: (path) => {
    const current = get().projectPath;
    if (current === path) return;
    set({ projectPath: path, localPrompts: [], error: null });
    if (path) {
      get().loadPrompts();
    }
  },

  loadPrompts: async () => {
    const { projectPath } = get();

    set({ isLoading: true, error: null });

    try {
      const api = getHttpApiClient();
      const result = await api.agentPrompts.list(projectPath ?? undefined);

      if (!result.success) {
        set({
          globalPrompts: [],
          localPrompts: [],
          isLoading: false,
          error: 'Failed to load agent prompts',
        });
        return;
      }

      const globalPrompts: AgentPrompt[] = result.globalPrompts.map((p) => ({
        ...p,
        scope: 'global' as const,
      }));
      const localPrompts: AgentPrompt[] = result.localPrompts.map((p) => ({
        ...p,
        scope: 'local' as const,
      }));

      set({ globalPrompts, localPrompts, isLoading: false });

      // Clean up selected keys that no longer exist
      const { selectedPromptKeys, favoritePromptKeys } = get();
      const allKeys = new Set([
        ...globalPrompts.map((p) => getPromptKey('global', p.id)),
        ...localPrompts.map((p) => getPromptKey('local', p.id)),
      ]);
      const cleanedKeys = selectedPromptKeys.filter((k) => allKeys.has(k));
      if (cleanedKeys.length !== selectedPromptKeys.length) {
        set({ selectedPromptKeys: cleanedKeys });
        saveSelectedKeys(cleanedKeys);
      }
      // Clean up favorite keys that no longer exist
      const cleanedFavKeys = favoritePromptKeys.filter((k) => allKeys.has(k));
      if (cleanedFavKeys.length !== favoritePromptKeys.length) {
        set({ favoritePromptKeys: cleanedFavKeys });
        saveFavoriteKeys(cleanedFavKeys);
      }
    } catch (err) {
      logger.error('Failed to load prompts:', err);
      set({
        globalPrompts: [],
        localPrompts: [],
        isLoading: false,
        error: 'Failed to load agent prompts',
      });
    }
  },

  addPrompt: async (name, prompt, scope) => {
    const { projectPath } = get();
    if (scope === 'local' && !projectPath) {
      set({ error: 'No project selected' });
      return null;
    }

    try {
      const api = getHttpApiClient();
      const result = await api.agentPrompts.add(name, prompt, scope, projectPath ?? undefined);

      if (!result.success || !result.prompt) {
        set({ error: 'Failed to add agent prompt' });
        return null;
      }

      const newPrompt: AgentPrompt = { ...result.prompt, scope };

      // Update the correct array
      if (scope === 'global') {
        const updated = [...get().globalPrompts, newPrompt].sort((a, b) =>
          a.name.localeCompare(b.name)
        );
        set({ globalPrompts: updated, error: null });
      } else {
        const updated = [...get().localPrompts, newPrompt].sort((a, b) =>
          a.name.localeCompare(b.name)
        );
        set({ localPrompts: updated, error: null });
      }

      return newPrompt;
    } catch (err) {
      logger.error('Failed to add prompt:', err);
      const msg = err instanceof Error ? err.message : 'Failed to add agent prompt';
      set({ error: msg });
      return null;
    }
  },

  updatePrompt: async (id, name, prompt, scope) => {
    const { projectPath, selectedPromptKeys } = get();
    if (scope === 'local' && !projectPath) {
      set({ error: 'No project selected' });
      return false;
    }

    try {
      const api = getHttpApiClient();
      const result = await api.agentPrompts.update(
        id,
        name,
        prompt,
        scope,
        projectPath ?? undefined
      );

      if (!result.success || !result.prompt) {
        set({ error: 'Failed to update agent prompt' });
        return false;
      }

      const updatedPrompt: AgentPrompt = { ...result.prompt, scope };
      const oldKey = getPromptKey(scope, id);
      const newKey = getPromptKey(scope, updatedPrompt.id);

      // Update the correct array
      const arrayKey = scope === 'global' ? 'globalPrompts' : 'localPrompts';
      const currentArray = get()[arrayKey];
      const updatedArray = currentArray
        .map((p) => (p.id === id ? updatedPrompt : p))
        .sort((a, b) => a.name.localeCompare(b.name));

      // Update selection if ID changed
      let updatedKeys = selectedPromptKeys;
      if (oldKey !== newKey && selectedPromptKeys.includes(oldKey)) {
        updatedKeys = selectedPromptKeys.map((k) => (k === oldKey ? newKey : k));
        saveSelectedKeys(updatedKeys);
      }

      // Update favorites if ID changed
      const { favoritePromptKeys } = get();
      let updatedFavKeys = favoritePromptKeys;
      if (oldKey !== newKey && favoritePromptKeys.includes(oldKey)) {
        updatedFavKeys = favoritePromptKeys.map((k) => (k === oldKey ? newKey : k));
        saveFavoriteKeys(updatedFavKeys);
      }

      set({
        [arrayKey]: updatedArray,
        selectedPromptKeys: updatedKeys,
        favoritePromptKeys: updatedFavKeys,
        error: null,
      });
      return true;
    } catch (err) {
      logger.error('Failed to update prompt:', err);
      const msg = err instanceof Error ? err.message : 'Failed to update agent prompt';
      set({ error: msg });
      return false;
    }
  },

  deletePrompt: async (id, scope) => {
    const { projectPath, selectedPromptKeys } = get();
    if (scope === 'local' && !projectPath) {
      set({ error: 'No project selected' });
      return false;
    }

    try {
      const api = getHttpApiClient();
      const result = await api.agentPrompts.delete(id, scope, projectPath ?? undefined);

      if (!result.success) {
        set({ error: 'Failed to delete agent prompt' });
        return false;
      }

      const key = getPromptKey(scope, id);
      const arrayKey = scope === 'global' ? 'globalPrompts' : 'localPrompts';
      const currentArray = get()[arrayKey];
      const updatedArray = currentArray.filter((p) => p.id !== id);
      const updatedKeys = selectedPromptKeys.filter((k) => k !== key);
      const updatedFavKeys = get().favoritePromptKeys.filter((k) => k !== key);

      set({
        [arrayKey]: updatedArray,
        selectedPromptKeys: updatedKeys,
        favoritePromptKeys: updatedFavKeys,
        error: null,
      });
      saveSelectedKeys(updatedKeys);
      saveFavoriteKeys(updatedFavKeys);

      return true;
    } catch (err) {
      logger.error('Failed to delete prompt:', err);
      const msg = err instanceof Error ? err.message : 'Failed to delete agent prompt';
      set({ error: msg });
      return false;
    }
  },

  togglePromptSelection: (id, scope) => {
    const key = getPromptKey(scope, id);
    const { selectedPromptKeys } = get();

    // Verify prompt exists
    const allPrompts = get().getAllPrompts();
    if (!allPrompts.some((p) => p.id === id && p.scope === scope)) return;

    let updatedKeys: string[];
    if (selectedPromptKeys.includes(key)) {
      updatedKeys = selectedPromptKeys.filter((k) => k !== key);
    } else {
      updatedKeys = [...selectedPromptKeys, key];
    }

    set({ selectedPromptKeys: updatedKeys });
    saveSelectedKeys(updatedKeys);
  },

  selectPrompt: (id, scope) => {
    const key = getPromptKey(scope, id);
    const { selectedPromptKeys } = get();
    if (selectedPromptKeys.includes(key)) return;

    const allPrompts = get().getAllPrompts();
    if (!allPrompts.some((p) => p.id === id && p.scope === scope)) return;

    const updatedKeys = [...selectedPromptKeys, key];
    set({ selectedPromptKeys: updatedKeys });
    saveSelectedKeys(updatedKeys);
  },

  deselectPrompt: (id, scope) => {
    const key = getPromptKey(scope, id);
    const { selectedPromptKeys } = get();
    if (!selectedPromptKeys.includes(key)) return;

    const updatedKeys = selectedPromptKeys.filter((k) => k !== key);
    set({ selectedPromptKeys: updatedKeys });
    saveSelectedKeys(updatedKeys);
  },

  clearSelection: () => {
    set({ selectedPromptKeys: [] });
    saveSelectedKeys([]);
  },

  getSelectedPromptsText: () => {
    const { globalPrompts, localPrompts, selectedPromptKeys } = get();
    const allPrompts = [...globalPrompts, ...localPrompts];
    const selected = allPrompts.filter((p) =>
      selectedPromptKeys.includes(getPromptKey(p.scope, p.id))
    );

    if (selected.length === 0) return '';
    return selected.map((p) => p.prompt).join('\n\n---\n\n');
  },

  getAllPrompts: () => {
    const { globalPrompts, localPrompts } = get();
    return [...globalPrompts, ...localPrompts];
  },

  isSelected: (id, scope) => {
    return get().selectedPromptKeys.includes(getPromptKey(scope, id));
  },

  toggleFavorite: (id, scope) => {
    const key = getPromptKey(scope, id);
    const { favoritePromptKeys } = get();

    // Verify prompt exists
    const allPrompts = get().getAllPrompts();
    if (!allPrompts.some((p) => p.id === id && p.scope === scope)) return;

    let updatedKeys: string[];
    if (favoritePromptKeys.includes(key)) {
      updatedKeys = favoritePromptKeys.filter((k) => k !== key);
    } else {
      updatedKeys = [...favoritePromptKeys, key];
    }

    set({ favoritePromptKeys: updatedKeys });
    saveFavoriteKeys(updatedKeys);
  },

  isFavorite: (id, scope) => {
    return get().favoritePromptKeys.includes(getPromptKey(scope, id));
  },

  getFavoritePrompts: () => {
    const { globalPrompts, localPrompts, favoritePromptKeys } = get();
    const allPrompts = [...globalPrompts, ...localPrompts];
    // Return in the order they were favorited
    return favoritePromptKeys
      .map((key) => allPrompts.find((p) => getPromptKey(p.scope, p.id) === key))
      .filter((p): p is AgentPrompt => p !== undefined);
  },
}));
