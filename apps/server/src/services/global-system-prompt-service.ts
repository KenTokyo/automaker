/**
 * Global System Prompt Service
 *
 * Manages a single global system prompt that is always prepended to every
 * agent chat session. Stored as a markdown file in DATA_DIR/global-system-prompt.md.
 *
 * Unlike regular agent prompts, the global system prompt:
 * - Is always active (no toggle needed)
 * - Has exactly one instance (not a collection)
 * - Is editable via the Agent Prompts panel
 */

import path from 'path';
import { createLogger } from '@automaker/utils';
import { getDataDirectory, secureFs } from '@automaker/platform';

const logger = createLogger('GlobalSystemPromptService');

const FILENAME = 'global-system-prompt.md';

/**
 * Get the file path for the global system prompt
 */
function getFilePath(): string | null {
  const dataDir = getDataDirectory();
  if (!dataDir) {
    logger.warn('DATA_DIR not configured, cannot access global system prompt');
    return null;
  }
  return path.join(dataDir, FILENAME);
}

/**
 * Load the global system prompt content.
 * Returns empty string if file doesn't exist yet.
 */
export async function loadGlobalSystemPrompt(): Promise<string> {
  const filePath = getFilePath();
  if (!filePath) return '';

  try {
    await secureFs.access(filePath);
    const content = (await secureFs.readFile(filePath, 'utf-8')) as string;
    logger.debug('Loaded global system prompt', { length: content.length });
    return content;
  } catch {
    // File doesn't exist yet — that's fine
    logger.debug('No global system prompt file found, returning empty');
    return '';
  }
}

/**
 * Save the global system prompt content.
 * Creates the file if it doesn't exist.
 */
export async function saveGlobalSystemPrompt(content: string): Promise<boolean> {
  const filePath = getFilePath();
  if (!filePath) {
    logger.error('Cannot save global system prompt: DATA_DIR not configured');
    return false;
  }

  try {
    await secureFs.writeFile(filePath, content, 'utf-8');
    logger.info('Saved global system prompt', { length: content.length });
    return true;
  } catch (err) {
    logger.error('Failed to save global system prompt', err);
    return false;
  }
}
