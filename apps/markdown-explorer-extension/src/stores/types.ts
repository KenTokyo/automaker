import type { PhaseModelEntry } from '@automaker/types';
import type {
  ImageAttachment as ElectronImageAttachment,
  Message as ElectronMessage,
  SessionListItem,
} from '@/types/electron';
import type { TextFileAttachment } from '@/store/app-store';
import type { ThinkingBlockData } from '../services/thinking-utils';
import type { ToolCallGroupData } from '../services/tool-call-utils';

export type SessionProcessStatus = 'idle' | 'running' | 'error' | 'stopped';

export interface SessionImageAttachment extends ElectronImageAttachment {}

export interface SessionMessage extends ElectronMessage {
  thinking?: string;
  thinkingBlock?: ThinkingBlockData;
  toolCallGroup?: ToolCallGroupData;
}

export interface SessionDraftTextFile extends TextFileAttachment {}

export interface SessionState {
  id: string;
  serverSessionId: string;
  name: string;
  preview: string;
  createdAt: string;
  updatedAt: string;
  projectPath: string;
  workingDirectory: string;
  isArchived: boolean;
  isRunning: boolean;
  processStatus: SessionProcessStatus;
  model: string;
  thinkingLevel: string;
  reasoningEffort: string;
  messageCount: number;
  totalTokensInput: number;
  totalTokensOutput: number;
  totalCost: number;
  messages: SessionMessage[];
  draftMessage: string;
  draftImages: SessionImageAttachment[];
  draftTextFiles: SessionDraftTextFile[];
  orchestratorMode: boolean;
  orchestratorRunId: string | null;
  orchestratorIteration: number;
  title: string | null;
  description: string | null;
}

export interface PersistedSessionMetadata {
  id: string;
  serverSessionId: string;
  name: string;
  preview: string;
  createdAt: string;
  updatedAt: string;
  projectPath: string;
  workingDirectory: string;
  isArchived: boolean;
  isRunning: boolean;
  processStatus: SessionProcessStatus;
  model: string;
  thinkingLevel: string;
  reasoningEffort: string;
  messageCount: number;
  totalTokensInput: number;
  totalTokensOutput: number;
  totalCost: number;
  draftMessage: string;
  orchestratorMode: boolean;
  orchestratorRunId: string | null;
  orchestratorIteration: number;
  title: string | null;
  description: string | null;
}

export interface PersistedSessionStoreSnapshot {
  schemaVersion: number;
  savedAt: string;
  sessions: Record<string, PersistedSessionMetadata>;
  sessionMessages: Record<string, SessionMessage[]>;
  sessionOrder: string[];
  activeSessionId: string | null;
  activeProjectPath: string | null;
  activeWorkingDirectory: string | null;
  maxIdleSessions: number;
}

export interface SyncSessionsFromServerInput {
  projectPath: string;
  workingDirectory: string;
  sessions: SessionListItem[];
  defaultModel: PhaseModelEntry;
}

export interface CreateSessionStateInput {
  id: string;
  serverSessionId?: string;
  name: string;
  projectPath: string;
  workingDirectory: string;
  createdAt?: string;
  updatedAt?: string;
  defaultModel: PhaseModelEntry;
  preview?: string;
  description?: string | null;
}

export interface SessionStoreState {
  sessions: Record<string, SessionState>;
  sessionOrder: string[];
  activeSessionId: string | null;
  activeProjectPath: string | null;
  activeWorkingDirectory: string | null;
  maxIdleSessions: number;
  hasHydratedFromDisk: boolean;
  hydrateFromPersistence: (snapshot: PersistedSessionStoreSnapshot | null) => void;
  setProjectContext: (projectPath: string, workingDirectory: string) => void;
  setMaxIdleSessions: (limit: number) => void;
  syncSessionsFromServer: (input: SyncSessionsFromServerInput) => void;
  upsertSession: (session: SessionState) => void;
  setActiveSessionId: (sessionId: string | null) => void;
  switchSession: (sessionId: string) => void;
  closeSession: (sessionId: string) => void;
  removeSession: (sessionId: string) => void;
  updateSession: (sessionId: string, partial: Partial<SessionState>) => void;
  setSessionRunning: (sessionId: string, isRunning: boolean, error?: string | null) => void;
  setSessionModel: (
    sessionId: string,
    model: string,
    thinkingLevel: string,
    reasoningEffort: string
  ) => void;
  setMessages: (sessionId: string, messages: SessionMessage[]) => void;
  addMessage: (sessionId: string, message: SessionMessage) => void;
  clearMessages: (sessionId: string) => void;
  setDraft: (
    sessionId: string,
    draftMessage: string,
    draftImages?: SessionImageAttachment[],
    draftTextFiles?: SessionDraftTextFile[]
  ) => void;
  setSessionTitle: (sessionId: string, title: string | null, description?: string | null) => void;
  setSessionTokens: (
    sessionId: string,
    inputTokens: number,
    outputTokens: number,
    cost: number
  ) => void;
  setOrchestratorMode: (sessionId: string, enabled: boolean, runId?: string | null) => void;
  incrementOrchestratorIteration: (sessionId: string) => void;
  markSessionTouched: (sessionId: string) => void;
  closeAllSessions: () => void;
  closeIdleSessions: (limit?: number, projectPath?: string) => string[];
}
