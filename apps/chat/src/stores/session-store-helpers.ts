import type { PhaseModelEntry } from '@automaker/types';
import type { SessionListItem } from '@/types/electron';
import type {
  CreateSessionStateInput,
  PersistedSessionMetadata,
  PersistedSessionStoreSnapshot,
  SessionDraftTextFile,
  SessionImageAttachment,
  SessionMessage,
  SessionState,
} from './types';

export const DEFAULT_IDLE_SESSION_LIMIT = 5;
export const DEFAULT_MODEL = 'claude-sonnet-4-6';
export const DEFAULT_THINKING_LEVEL = 'medium';
export const DEFAULT_REASONING_EFFORT = 'medium';
export const EMPTY_IDS: string[] = [];
export const EMPTY_MESSAGES: SessionMessage[] = [];
export const EMPTY_IMAGES: SessionImageAttachment[] = [];
export const EMPTY_TEXT_FILES: SessionDraftTextFile[] = [];

export const nowIso = (): string => new Date().toISOString();

export function toIsoDate(value: string | undefined, fallback: string): string {
  if (!value) return fallback;
  const parsed = Date.parse(value);
  return Number.isNaN(parsed) ? fallback : new Date(parsed).toISOString();
}

export function sanitizeModelEntry(entry: PhaseModelEntry): {
  model: string;
  thinkingLevel: string;
  reasoningEffort: string;
} {
  return {
    model: entry.model || DEFAULT_MODEL,
    thinkingLevel: entry.thinkingLevel || DEFAULT_THINKING_LEVEL,
    reasoningEffort: entry.reasoningEffort || DEFAULT_REASONING_EFFORT,
  };
}

export function createSessionState(input: CreateSessionStateInput): SessionState {
  const now = nowIso();
  const model = sanitizeModelEntry(input.defaultModel);

  return {
    id: input.id,
    serverSessionId: input.serverSessionId || input.id,
    name: input.name,
    preview: input.preview || '',
    createdAt: toIsoDate(input.createdAt, now),
    updatedAt: toIsoDate(input.updatedAt, now),
    projectPath: input.projectPath,
    workingDirectory: input.workingDirectory,
    isArchived: false,
    isRunning: false,
    processStatus: 'idle',
    model: model.model,
    thinkingLevel: model.thinkingLevel,
    reasoningEffort: model.reasoningEffort,
    messageCount: 0,
    totalTokensInput: 0,
    totalTokensOutput: 0,
    totalCost: 0,
    messages: EMPTY_MESSAGES,
    draftMessage: '',
    draftImages: EMPTY_IMAGES,
    draftTextFiles: EMPTY_TEXT_FILES,
    orchestratorMode: false,
    orchestratorRunId: null,
    orchestratorIteration: 0,
    title: null,
    description: input.description ?? null,
  };
}

export function updatePreviewFromMessages(messages: SessionMessage[]): string {
  if (messages.length === 0) return '';
  const lastMessage = messages[messages.length - 1];
  if (!lastMessage) return '';
  return lastMessage.content.replace(/\s+/g, ' ').trim().slice(0, 160);
}

function hasDraft(session: SessionState): boolean {
  return (
    session.draftMessage.trim().length > 0 ||
    session.draftImages.length > 0 ||
    session.draftTextFiles.length > 0
  );
}

export function sessionSortByUpdatedAt(a: SessionState, b: SessionState): number {
  const aTime = Date.parse(a.updatedAt);
  const bTime = Date.parse(b.updatedAt);
  const left = Number.isNaN(aTime) ? 0 : aTime;
  const right = Number.isNaN(bTime) ? 0 : bTime;
  return right - left;
}

export function removeId(order: string[], targetId: string): string[] {
  if (!order.includes(targetId)) return order;
  return order.filter((sessionId) => sessionId !== targetId);
}

export function prependId(order: string[], targetId: string): string[] {
  const withoutId = removeId(order, targetId);
  return [targetId, ...withoutId];
}

export function normalizeOrder(order: string[], sessions: Record<string, SessionState>): string[] {
  return order.filter((id) => sessions[id] && !sessions[id].isArchived);
}

export function getSessionFromServer(
  serverSession: SessionListItem,
  existing: SessionState | undefined,
  projectPath: string,
  workingDirectory: string,
  defaultModel: PhaseModelEntry
): SessionState {
  if (!existing) {
    const created = createSessionState({
      id: serverSession.id,
      serverSessionId: serverSession.id,
      name: serverSession.name,
      projectPath,
      workingDirectory,
      createdAt: serverSession.createdAt,
      updatedAt: serverSession.updatedAt,
      defaultModel,
      preview: serverSession.preview,
      description: serverSession.description ?? null,
    });

    created.messageCount = serverSession.messageCount;
    created.preview = serverSession.preview;
    created.isArchived = serverSession.isArchived;
    return created;
  }

  return {
    ...existing,
    serverSessionId: serverSession.id,
    name: serverSession.name,
    preview: serverSession.preview || existing.preview,
    projectPath,
    workingDirectory: existing.workingDirectory || workingDirectory,
    createdAt: toIsoDate(serverSession.createdAt, existing.createdAt),
    updatedAt: toIsoDate(serverSession.updatedAt, existing.updatedAt),
    isArchived: serverSession.isArchived,
    messageCount: Math.max(existing.messageCount, serverSession.messageCount),
    description: serverSession.description ?? existing.description,
  };
}

export function isSessionIdle(session: SessionState): boolean {
  return !session.isArchived && !session.isRunning && session.processStatus !== 'running';
}

export function isReusableIdleSession(session: SessionState): boolean {
  return isSessionIdle(session) && !hasDraft(session);
}

export function resetSessionForReuse(session: SessionState, name: string): SessionState {
  return {
    ...session,
    name,
    preview: '',
    isRunning: false,
    processStatus: 'idle',
    messageCount: 0,
    totalTokensInput: 0,
    totalTokensOutput: 0,
    totalCost: 0,
    messages: EMPTY_MESSAGES,
    draftMessage: '',
    draftImages: EMPTY_IMAGES,
    draftTextFiles: EMPTY_TEXT_FILES,
    orchestratorMode: false,
    orchestratorRunId: null,
    orchestratorIteration: 0,
    title: null,
    description: null,
    updatedAt: nowIso(),
  };
}

export const MAX_PARALLEL_SESSIONS = 3;

export function clampIdleSessionsLimit(limit: number): number {
  return Math.max(1, Math.min(20, Math.round(limit)));
}

export function getRunningSessions(sessions: Record<string, SessionState>): SessionState[] {
  return Object.values(sessions).filter((session) => session.isRunning && !session.isArchived);
}

export function getRunningSessionCount(sessions: Record<string, SessionState>): number {
  let count = 0;
  for (const session of Object.values(sessions)) {
    if (session.isRunning && !session.isArchived) count += 1;
  }
  return count;
}

export function isParallelLimitReached(sessions: Record<string, SessionState>): boolean {
  return getRunningSessionCount(sessions) >= MAX_PARALLEL_SESSIONS;
}

export function toPersistedSessionState(
  metadata: PersistedSessionMetadata,
  messages: SessionMessage[]
): SessionState {
  const now = nowIso();
  const sessionMessages = Array.isArray(messages) ? messages : EMPTY_MESSAGES;
  const normalizedPreview = metadata.preview?.trim()
    ? metadata.preview
    : updatePreviewFromMessages(sessionMessages);
  const isArchived = metadata.isArchived;

  return {
    id: metadata.id,
    serverSessionId: metadata.serverSessionId || metadata.id,
    name: metadata.name || 'Chat',
    preview: normalizedPreview,
    createdAt: toIsoDate(metadata.createdAt, now),
    updatedAt: toIsoDate(metadata.updatedAt, now),
    projectPath: metadata.projectPath || '',
    workingDirectory: metadata.workingDirectory || metadata.projectPath || '',
    isArchived,
    isRunning: false,
    processStatus: isArchived
      ? 'stopped'
      : metadata.processStatus === 'running'
        ? 'idle'
        : metadata.processStatus,
    model: metadata.model || DEFAULT_MODEL,
    thinkingLevel: metadata.thinkingLevel || DEFAULT_THINKING_LEVEL,
    reasoningEffort: metadata.reasoningEffort || DEFAULT_REASONING_EFFORT,
    messageCount: Math.max(metadata.messageCount, sessionMessages.length),
    totalTokensInput: Math.max(0, metadata.totalTokensInput),
    totalTokensOutput: Math.max(0, metadata.totalTokensOutput),
    totalCost: Math.max(0, metadata.totalCost),
    messages: sessionMessages,
    draftMessage: metadata.draftMessage ?? '',
    draftImages: EMPTY_IMAGES,
    draftTextFiles: EMPTY_TEXT_FILES,
    orchestratorMode: Boolean(metadata.orchestratorMode),
    orchestratorRunId: metadata.orchestratorRunId ?? null,
    orchestratorIteration: Math.max(0, metadata.orchestratorIteration),
    title: metadata.title ?? null,
    description: metadata.description ?? null,
  };
}

export function createSessionsFromSnapshot(
  snapshot: PersistedSessionStoreSnapshot
): Record<string, SessionState> {
  const nextSessions: Record<string, SessionState> = {};

  for (const [sessionId, metadata] of Object.entries(snapshot.sessions)) {
    nextSessions[sessionId] = toPersistedSessionState(
      metadata,
      snapshot.sessionMessages[sessionId] ?? EMPTY_MESSAGES
    );
  }

  return nextSessions;
}
