/**
 * Agent Prompts Service - Manages custom agent prompts for AI conversations
 *
 * Provides CRUD operations for agent prompts stored as .md files.
 * Supports both global prompts (stored in DATA_DIR/agents/) and
 * project-specific prompts (stored in {projectPath}/.automaker/agents/).
 */

import path from 'path';
import { createLogger } from '@automaker/utils';
import {
  getGlobalAgentsDir,
  getProjectAgentsDir,
  ensureGlobalAgentsDir,
  ensureProjectAgentsDir,
  getDataDirectory,
  secureFs,
} from '@automaker/platform';

const logger = createLogger('AgentPromptsService');

/**
 * Scope of an agent prompt
 * - 'global': Available across all projects
 * - 'local': Available only in the specific project
 */
export type AgentPromptScope = 'global' | 'local';

/**
 * Agent prompt data structure
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
 * Result of loading agent prompts
 */
export interface LoadPromptsResult {
  globalPrompts: AgentPrompt[];
  localPrompts: AgentPrompt[];
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
function parsePromptContent(content: string, filename: string): Omit<AgentPrompt, 'scope'> | null {
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
 * Scan a directory for agent prompt .md files
 */
async function scanAgentsDirectory(
  agentsDir: string,
  scope: AgentPromptScope
): Promise<AgentPrompt[]> {
  const prompts: AgentPrompt[] = [];

  try {
    // Check if directory exists
    try {
      await secureFs.access(agentsDir);
    } catch {
      // Directory doesn't exist, return empty array
      return prompts;
    }

    // Read directory contents
    const entries = await secureFs.readdir(agentsDir, { withFileTypes: true });

    // Filter for .md files
    const mdFiles = entries.filter((entry) => !entry.isDirectory() && entry.name.endsWith('.md'));

    // Load each prompt file
    for (const file of mdFiles) {
      try {
        const filePath = path.join(agentsDir, file.name);
        const content = (await secureFs.readFile(filePath, 'utf-8')) as string;
        const parsed = parsePromptContent(content, file.name);
        if (parsed) {
          prompts.push({
            ...parsed,
            scope,
          });
        }
      } catch (err) {
        logger.warn(`Failed to load prompt file: ${file.name}`, err);
      }
    }

    // Sort by name
    prompts.sort((a, b) => a.name.localeCompare(b.name));
  } catch (err) {
    logger.error(`Failed to scan agents directory: ${agentsDir}`, err);
  }

  return prompts;
}

/**
 * Load all agent prompts (both global and local)
 */
export async function loadAgentPrompts(projectPath?: string): Promise<LoadPromptsResult> {
  const dataDir = getDataDirectory();

  // Load global prompts
  let globalPrompts: AgentPrompt[] = [];
  if (dataDir) {
    const globalAgentsDir = getGlobalAgentsDir(dataDir);
    globalPrompts = await scanAgentsDirectory(globalAgentsDir, 'global');
    logger.debug(`Loaded ${globalPrompts.length} global agent prompts`);
  }

  // Load local prompts if project path provided
  let localPrompts: AgentPrompt[] = [];
  if (projectPath) {
    const projectAgentsDir = getProjectAgentsDir(projectPath);
    localPrompts = await scanAgentsDirectory(projectAgentsDir, 'local');
    logger.debug(`Loaded ${localPrompts.length} local agent prompts`);
  }

  return { globalPrompts, localPrompts };
}

/**
 * Add a new agent prompt
 */
export async function addAgentPrompt(
  name: string,
  prompt: string,
  scope: AgentPromptScope,
  projectPath?: string
): Promise<AgentPrompt | null> {
  const dataDir = getDataDirectory();

  // Determine directory based on scope
  let agentsDir: string;
  if (scope === 'global') {
    if (!dataDir) {
      logger.error('Cannot add global agent prompt: DATA_DIR not configured');
      return null;
    }
    agentsDir = await ensureGlobalAgentsDir(dataDir);
  } else {
    if (!projectPath) {
      logger.error('Cannot add local agent prompt: projectPath not provided');
      return null;
    }
    agentsDir = await ensureProjectAgentsDir(projectPath);
  }

  // Generate ID from name
  const id = sanitizeName(name);
  if (!id) {
    logger.error('Invalid agent name');
    return null;
  }

  // Check for duplicate
  const filePath = path.join(agentsDir, `${id}.md`);
  try {
    await secureFs.access(filePath);
    logger.error(`Agent prompt with ID "${id}" already exists`);
    return null;
  } catch {
    // File doesn't exist, we can proceed
  }

  // Write file
  const content = formatPromptContent(name, prompt);
  await secureFs.writeFile(filePath, content, 'utf-8');

  const newPrompt: AgentPrompt = {
    id,
    name,
    prompt,
    scope,
    createdAt: new Date().toISOString(),
  };

  logger.info(`Added ${scope} agent prompt: ${name}`);
  return newPrompt;
}

/**
 * Update an existing agent prompt
 */
export async function updateAgentPrompt(
  id: string,
  name: string,
  prompt: string,
  scope: AgentPromptScope,
  projectPath?: string
): Promise<AgentPrompt | null> {
  const dataDir = getDataDirectory();

  // Determine directory based on scope
  let agentsDir: string;
  if (scope === 'global') {
    if (!dataDir) {
      logger.error('Cannot update global agent prompt: DATA_DIR not configured');
      return null;
    }
    agentsDir = getGlobalAgentsDir(dataDir);
  } else {
    if (!projectPath) {
      logger.error('Cannot update local agent prompt: projectPath not provided');
      return null;
    }
    agentsDir = getProjectAgentsDir(projectPath);
  }

  const newId = sanitizeName(name);
  if (!newId) {
    logger.error('Invalid agent name');
    return null;
  }

  // If ID changed, check for duplicate and delete old file
  if (newId !== id) {
    const newFilePath = path.join(agentsDir, `${newId}.md`);
    try {
      await secureFs.access(newFilePath);
      logger.error(`Agent prompt with ID "${newId}" already exists`);
      return null;
    } catch {
      // New file doesn't exist, we can proceed
    }

    // Delete old file
    const oldFilePath = path.join(agentsDir, `${id}.md`);
    try {
      await secureFs.unlink(oldFilePath);
    } catch (err) {
      logger.warn(`Failed to delete old agent prompt file: ${id}.md`, err);
    }
  }

  // Write new/updated file
  const filePath = path.join(agentsDir, `${newId}.md`);
  const content = formatPromptContent(name, prompt);
  await secureFs.writeFile(filePath, content, 'utf-8');

  const updatedPrompt: AgentPrompt = {
    id: newId,
    name,
    prompt,
    scope,
    updatedAt: new Date().toISOString(),
  };

  logger.info(`Updated ${scope} agent prompt: ${name}`);
  return updatedPrompt;
}

/**
 * Delete an agent prompt
 */
export async function deleteAgentPrompt(
  id: string,
  scope: AgentPromptScope,
  projectPath?: string
): Promise<boolean> {
  const dataDir = getDataDirectory();

  // Determine directory based on scope
  let agentsDir: string;
  if (scope === 'global') {
    if (!dataDir) {
      logger.error('Cannot delete global agent prompt: DATA_DIR not configured');
      return false;
    }
    agentsDir = getGlobalAgentsDir(dataDir);
  } else {
    if (!projectPath) {
      logger.error('Cannot delete local agent prompt: projectPath not provided');
      return false;
    }
    agentsDir = getProjectAgentsDir(projectPath);
  }

  const filePath = path.join(agentsDir, `${id}.md`);

  try {
    await secureFs.unlink(filePath);
    logger.info(`Deleted ${scope} agent prompt: ${id}`);
    return true;
  } catch (err) {
    logger.error(`Failed to delete agent prompt: ${id}`, err);
    return false;
  }
}
