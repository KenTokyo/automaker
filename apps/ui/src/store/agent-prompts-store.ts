/**
 * Agent Prompts Store
 *
 * Manages custom agent prompts that can be prepended to messages.
 * Prompts are stored as .md files in .automaker/agents/ directory.
 */

import { create } from 'zustand';
import { getElectronAPI } from '@/lib/electron';
import { createLogger } from '@automaker/utils/logger';
import { setItem, getItem } from '@/lib/storage';

const logger = createLogger('AgentPromptsStore');

// Storage key for selected prompts (persisted locally)
const SELECTED_PROMPTS_KEY = 'automaker:selected-agent-prompts';

/**
 * Agent prompt interface
 */
export interface AgentPrompt {
  id: string;
  name: string;
  prompt: string;
  createdAt?: string;
  updatedAt?: string;
}

/**
 * Agent prompts store state
 */
interface AgentPromptsState {
  // All available prompts
  prompts: AgentPrompt[];
  // Selected prompt IDs
  selectedPromptIds: string[];
  // Loading state
  isLoading: boolean;
  // Error message
  error: string | null;
  // Current project path
  projectPath: string | null;

  // Actions
  setProjectPath: (path: string | null) => void;
  loadPrompts: () => Promise<void>;
  addPrompt: (name: string, prompt: string) => Promise<AgentPrompt | null>;
  updatePrompt: (id: string, name: string, prompt: string) => Promise<boolean>;
  deletePrompt: (id: string) => Promise<boolean>;
  togglePromptSelection: (id: string) => void;
  selectPrompt: (id: string) => void;
  deselectPrompt: (id: string) => void;
  clearSelection: () => void;
  getSelectedPromptsText: () => string;
}

/**
 * Sanitize name to create a valid file ID
 */
function sanitizeName(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-_]/g, '')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

/**
 * Parse agent prompt from markdown content
 */
function parsePromptContent(content: string, filename: string): AgentPrompt | null {
  const lines = content.split('\n');
  let name = '';
  let promptStart = 0;

  // Try to find header: # Agent: Name or # Name
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (line.startsWith('# ')) {
      const headerContent = line.substring(2).trim();
      if (headerContent.toLowerCase().startsWith('agent:')) {
        name = headerContent.substring(6).trim();
      } else {
        name = headerContent;
      }
      promptStart = i + 1;
      break;
    }
  }

  // If no header found, use filename as name
  if (!name) {
    name = filename.replace(/\.md$/, '').replace(/-/g, ' ');
    name = name.charAt(0).toUpperCase() + name.slice(1);
  }

  // Get prompt content (everything after header)
  const prompt = lines.slice(promptStart).join('\n').trim();

  if (!prompt) {
    return null;
  }

  const id = sanitizeName(name) || filename.replace(/\.md$/, '');

  return {
    id,
    name,
    prompt,
  };
}

/**
 * Format agent prompt as markdown
 */
function formatPromptContent(name: string, prompt: string): string {
  return `# Agent: ${name}\n\n${prompt}`;
}

/**
 * Get agents directory path for a project
 */
function getAgentsDir(projectPath: string): string {
  return `${projectPath}/.automaker/agents`;
}

/**
 * Load selected prompts from local storage
 */
function loadSelectedPrompts(): string[] {
  const stored = getItem(SELECTED_PROMPTS_KEY);
  if (stored) {
    try {
      return JSON.parse(stored);
    } catch {
      return [];
    }
  }
  return [];
}

/**
 * Save selected prompts to local storage
 */
function saveSelectedPrompts(ids: string[]): void {
  setItem(SELECTED_PROMPTS_KEY, JSON.stringify(ids));
}

export const useAgentPromptsStore = create<AgentPromptsState>((set, get) => ({
  prompts: [],
  selectedPromptIds: loadSelectedPrompts(),
  isLoading: false,
  error: null,
  projectPath: null,

  setProjectPath: (path) => {
    set({ projectPath: path, prompts: [], error: null });
    if (path) {
      get().loadPrompts();
    }
  },

  loadPrompts: async () => {
    const { projectPath } = get();
    if (!projectPath) {
      set({ prompts: [], error: 'No project selected' });
      return;
    }

    set({ isLoading: true, error: null });

    try {
      const api = getElectronAPI();
      const agentsDir = getAgentsDir(projectPath);

      // Check if directory exists
      const dirExists = await api.exists(agentsDir);
      if (!dirExists) {
        // Create the directory
        await api.mkdir(agentsDir);
        set({ prompts: [], isLoading: false });
        return;
      }

      // Read directory contents
      const result = await api.readdir(agentsDir);
      if (!result.success || !result.entries) {
        set({
          prompts: [],
          isLoading: false,
          error: result.error || 'Failed to read agents directory',
        });
        return;
      }

      // Filter for .md files
      const mdFiles = result.entries.filter((f) => !f.isDirectory && f.name.endsWith('.md'));

      // Load each prompt file
      const prompts: AgentPrompt[] = [];
      for (const file of mdFiles) {
        try {
          const filePath = `${agentsDir}/${file.name}`;
          const fileResult = await api.readFile(filePath);
          if (fileResult.success && fileResult.content) {
            const prompt = parsePromptContent(fileResult.content, file.name);
            if (prompt) {
              prompts.push(prompt);
            }
          }
        } catch (err) {
          logger.warn(`Failed to load prompt file: ${file.name}`, err);
        }
      }

      // Sort by name
      prompts.sort((a, b) => a.name.localeCompare(b.name));

      set({ prompts, isLoading: false });

      // Clean up selected prompts that no longer exist
      const { selectedPromptIds } = get();
      const validIds = prompts.map((p) => p.id);
      const cleanedSelection = selectedPromptIds.filter((id) => validIds.includes(id));
      if (cleanedSelection.length !== selectedPromptIds.length) {
        set({ selectedPromptIds: cleanedSelection });
        saveSelectedPrompts(cleanedSelection);
      }
    } catch (err) {
      logger.error('Failed to load prompts:', err);
      set({ prompts: [], isLoading: false, error: 'Failed to load agent prompts' });
    }
  },

  addPrompt: async (name, prompt) => {
    const { projectPath, prompts } = get();
    if (!projectPath) {
      set({ error: 'No project selected' });
      return null;
    }

    try {
      const api = getElectronAPI();
      const agentsDir = getAgentsDir(projectPath);

      // Ensure directory exists
      const dirExists = await api.exists(agentsDir);
      if (!dirExists) {
        await api.mkdir(agentsDir);
      }

      // Generate ID from name
      const id = sanitizeName(name);
      if (!id) {
        set({ error: 'Invalid agent name' });
        return null;
      }

      // Check for duplicate
      if (prompts.some((p) => p.id === id)) {
        set({ error: 'An agent with this name already exists' });
        return null;
      }

      // Write file
      const filePath = `${agentsDir}/${id}.md`;
      const content = formatPromptContent(name, prompt);
      const writeResult = await api.writeFile(filePath, content);

      if (!writeResult.success) {
        set({ error: writeResult.error || 'Failed to save agent prompt' });
        return null;
      }

      const newPrompt: AgentPrompt = {
        id,
        name,
        prompt,
        createdAt: new Date().toISOString(),
      };

      // Update state
      const updatedPrompts = [...prompts, newPrompt].sort((a, b) => a.name.localeCompare(b.name));
      set({ prompts: updatedPrompts, error: null });

      return newPrompt;
    } catch (err) {
      logger.error('Failed to add prompt:', err);
      set({ error: 'Failed to add agent prompt' });
      return null;
    }
  },

  updatePrompt: async (id, name, prompt) => {
    const { projectPath, prompts, selectedPromptIds } = get();
    if (!projectPath) {
      set({ error: 'No project selected' });
      return false;
    }

    try {
      const api = getElectronAPI();
      const agentsDir = getAgentsDir(projectPath);
      const newId = sanitizeName(name);

      if (!newId) {
        set({ error: 'Invalid agent name' });
        return false;
      }

      // Check for duplicate (if ID changed)
      if (newId !== id && prompts.some((p) => p.id === newId)) {
        set({ error: 'An agent with this name already exists' });
        return false;
      }

      // If ID changed, delete old file
      if (newId !== id) {
        const oldFilePath = `${agentsDir}/${id}.md`;
        await api.deleteFile(oldFilePath);
      }

      // Write new/updated file
      const filePath = `${agentsDir}/${newId}.md`;
      const content = formatPromptContent(name, prompt);
      const writeResult = await api.writeFile(filePath, content);

      if (!writeResult.success) {
        set({ error: writeResult.error || 'Failed to update agent prompt' });
        return false;
      }

      // Update state
      const updatedPrompts = prompts
        .map((p) =>
          p.id === id ? { ...p, id: newId, name, prompt, updatedAt: new Date().toISOString() } : p
        )
        .sort((a, b) => a.name.localeCompare(b.name));

      // Update selection if ID changed
      let updatedSelection = selectedPromptIds;
      if (newId !== id && selectedPromptIds.includes(id)) {
        updatedSelection = selectedPromptIds.map((sid) => (sid === id ? newId : sid));
        saveSelectedPrompts(updatedSelection);
      }

      set({ prompts: updatedPrompts, selectedPromptIds: updatedSelection, error: null });
      return true;
    } catch (err) {
      logger.error('Failed to update prompt:', err);
      set({ error: 'Failed to update agent prompt' });
      return false;
    }
  },

  deletePrompt: async (id) => {
    const { projectPath, prompts, selectedPromptIds } = get();
    if (!projectPath) {
      set({ error: 'No project selected' });
      return false;
    }

    try {
      const api = getElectronAPI();
      const agentsDir = getAgentsDir(projectPath);
      const filePath = `${agentsDir}/${id}.md`;

      const deleteResult = await api.deleteFile(filePath);
      if (!deleteResult.success) {
        set({ error: deleteResult.error || 'Failed to delete agent prompt' });
        return false;
      }

      // Update state
      const updatedPrompts = prompts.filter((p) => p.id !== id);
      const updatedSelection = selectedPromptIds.filter((sid) => sid !== id);

      set({ prompts: updatedPrompts, selectedPromptIds: updatedSelection, error: null });
      saveSelectedPrompts(updatedSelection);

      return true;
    } catch (err) {
      logger.error('Failed to delete prompt:', err);
      set({ error: 'Failed to delete agent prompt' });
      return false;
    }
  },

  togglePromptSelection: (id) => {
    const { selectedPromptIds, prompts } = get();
    // Only toggle if prompt exists
    if (!prompts.some((p) => p.id === id)) return;

    let updatedSelection: string[];
    if (selectedPromptIds.includes(id)) {
      updatedSelection = selectedPromptIds.filter((sid) => sid !== id);
    } else {
      updatedSelection = [...selectedPromptIds, id];
    }

    set({ selectedPromptIds: updatedSelection });
    saveSelectedPrompts(updatedSelection);
  },

  selectPrompt: (id) => {
    const { selectedPromptIds, prompts } = get();
    if (!prompts.some((p) => p.id === id)) return;
    if (selectedPromptIds.includes(id)) return;

    const updatedSelection = [...selectedPromptIds, id];
    set({ selectedPromptIds: updatedSelection });
    saveSelectedPrompts(updatedSelection);
  },

  deselectPrompt: (id) => {
    const { selectedPromptIds } = get();
    if (!selectedPromptIds.includes(id)) return;

    const updatedSelection = selectedPromptIds.filter((sid) => sid !== id);
    set({ selectedPromptIds: updatedSelection });
    saveSelectedPrompts(updatedSelection);
  },

  clearSelection: () => {
    set({ selectedPromptIds: [] });
    saveSelectedPrompts([]);
  },

  getSelectedPromptsText: () => {
    const { prompts, selectedPromptIds } = get();
    const selectedPrompts = prompts.filter((p) => selectedPromptIds.includes(p.id));

    if (selectedPrompts.length === 0) return '';

    return selectedPrompts.map((p) => p.prompt).join('\n\n---\n\n');
  },
}));
