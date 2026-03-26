/**
 * Session types for agent conversations
 */

import type { ThinkingLevel } from './settings.js';
import type { ReasoningEffort } from './provider.js';

export interface AgentSession {
  id: string;
  name: string;
  description?: string;
  projectPath: string;
  createdAt: string;
  updatedAt: string;
  messageCount: number;
  isArchived: boolean;
  isDirty?: boolean; // Indicates session has completed work that needs review
  tags?: string[];
  status?: 'idle' | 'running' | 'failed' | 'stopped';
  lastError?: string;
  totalElapsedMs?: number; // Accumulated running time in milliseconds
  lastStartedAt?: string; // ISO timestamp of when the session last started running
  model?: string; // Model alias or ID used for this session (e.g. 'sonnet', 'opus')
  thinkingLevel?: ThinkingLevel; // Thinking level for Claude models
  reasoningEffort?: ReasoningEffort; // Reasoning effort for Codex models
}

export interface SessionListItem extends AgentSession {
  preview?: string; // Last message preview
}

export interface CreateSessionParams {
  name: string;
  projectPath: string;
  workingDirectory?: string;
}

export interface UpdateSessionParams {
  id: string;
  name?: string;
  tags?: string[];
}
