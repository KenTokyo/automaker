import type {
  PersistedSessionMetadata,
  PersistedSessionStoreSnapshot,
  SessionMessage,
  SessionProcessStatus,
} from '../stores/types';
import { sanitizeThinkingBlock } from './thinking-utils';
import { sanitizeToolCallGroup } from './tool-call-utils';

export const SESSION_PERSISTENCE_SCHEMA_VERSION = 1;
export const LEGACY_SESSION_STORE_KEY = 'automaker:chat:session-store:v1';

export interface PersistedSessionMetaStore {
  schemaVersion: number;
  savedAt: string;
  sessions: Record<string, PersistedSessionMetadata>;
  sessionOrder: string[];
  activeSessionId: string | null;
  activeProjectPath: string | null;
  activeWorkingDirectory: string | null;
  maxIdleSessions: number;
}

const VALID_PROCESS_STATUS = new Set<SessionProcessStatus>(['idle', 'running', 'error', 'stopped']);

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function toNonEmptyString(value: unknown, fallback: string): string {
  if (typeof value !== 'string') return fallback;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : fallback;
}

function toNullableString(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function toIsoDate(value: unknown, fallbackIso: string): string {
  if (typeof value !== 'string') return fallbackIso;
  const parsed = Date.parse(value);
  if (Number.isNaN(parsed)) return fallbackIso;
  return new Date(parsed).toISOString();
}

function toBoolean(value: unknown): boolean {
  return value === true;
}

function toNumber(value: unknown, fallback: number): number {
  if (typeof value !== 'number' || Number.isNaN(value)) return fallback;
  return value;
}

function toSessionProcessStatus(value: unknown, isArchived: boolean): SessionProcessStatus {
  if (typeof value === 'string' && VALID_PROCESS_STATUS.has(value as SessionProcessStatus)) {
    if (value === 'running') return 'idle';
    return value as SessionProcessStatus;
  }

  return isArchived ? 'stopped' : 'idle';
}

function sanitizeToolCalls(value: unknown): SessionMessage['toolCalls'] {
  if (!Array.isArray(value) || value.length === 0) return undefined;

  const next = value
    .filter((entry): entry is { name?: unknown; input?: unknown } => isRecord(entry))
    .map((entry) => {
      const name = typeof entry.name === 'string' ? entry.name : 'tool';
      return { name, input: entry.input };
    });

  return next.length > 0 ? next : undefined;
}

function sanitizeMessage(
  messageId: string,
  raw: unknown,
  fallbackTimestamp: string,
  maxMessageLength: number
): SessionMessage {
  if (!isRecord(raw)) {
    return {
      id: messageId,
      role: 'assistant',
      content: '',
      timestamp: fallbackTimestamp,
    };
  }

  const role = raw.role === 'assistant' ? 'assistant' : 'user';
  const content = typeof raw.content === 'string' ? raw.content.slice(0, maxMessageLength) : '';
  const timestamp = toIsoDate(raw.timestamp, fallbackTimestamp);
  const toolCalls = sanitizeToolCalls(raw.toolCalls);
  const toolCallGroup = sanitizeToolCallGroup(raw.toolCallGroup);
  const thinking = typeof raw.thinking === 'string' ? raw.thinking.slice(0, maxMessageLength) : undefined;
  const thinkingBlock = sanitizeThinkingBlock(raw.thinkingBlock);

  return {
    id: toNonEmptyString(raw.id, messageId),
    role,
    content,
    timestamp,
    isError: toBoolean(raw.isError) || undefined,
    toolCalls,
    toolCallGroup,
    thinking,
    thinkingBlock,
  };
}

function sanitizeMessages(
  rawMessages: unknown,
  maxMessagesPerSession: number,
  maxMessageLength: number
): SessionMessage[] {
  if (!Array.isArray(rawMessages) || rawMessages.length === 0) return [];

  const limitedMessages = rawMessages.slice(-maxMessagesPerSession);
  const fallbackTimestamp = new Date().toISOString();

  return limitedMessages.map((rawMessage, index) =>
    sanitizeMessage(`restored-${index + 1}`, rawMessage, fallbackTimestamp, maxMessageLength)
  );
}

function sanitizeMetadataEntry(
  sessionId: string,
  raw: unknown,
  fallbackNow: string,
  messages: SessionMessage[]
): PersistedSessionMetadata {
  const value = isRecord(raw) ? raw : {};

  const isArchived = toBoolean(value.isArchived);
  const name = toNonEmptyString(value.name, 'Chat');
  const previewSource = typeof value.preview === 'string' ? value.preview : messages.at(-1)?.content ?? '';
  const preview = previewSource.replace(/\s+/g, ' ').trim().slice(0, 160);

  return {
    id: sessionId,
    serverSessionId: toNonEmptyString(value.serverSessionId, sessionId),
    name,
    preview,
    createdAt: toIsoDate(value.createdAt, fallbackNow),
    updatedAt: toIsoDate(value.updatedAt, fallbackNow),
    projectPath: toNonEmptyString(value.projectPath, ''),
    workingDirectory: toNonEmptyString(value.workingDirectory, toNonEmptyString(value.projectPath, '')),
    isArchived,
    isRunning: false,
    processStatus: toSessionProcessStatus(value.processStatus, isArchived),
    model: toNonEmptyString(value.model, 'claude-sonnet-4-6'),
    thinkingLevel: toNonEmptyString(value.thinkingLevel, 'medium'),
    reasoningEffort: toNonEmptyString(value.reasoningEffort, 'medium'),
    messageCount: Math.max(0, Math.round(toNumber(value.messageCount, messages.length))),
    totalTokensInput: Math.max(0, toNumber(value.totalTokensInput, 0)),
    totalTokensOutput: Math.max(0, toNumber(value.totalTokensOutput, 0)),
    totalCost: Math.max(0, toNumber(value.totalCost, 0)),
    draftMessage: typeof value.draftMessage === 'string' ? value.draftMessage : '',
    orchestratorMode: toBoolean(value.orchestratorMode),
    orchestratorRunId: toNullableString(value.orchestratorRunId),
    orchestratorIteration: Math.max(0, Math.round(toNumber(value.orchestratorIteration, 0))),
    title: toNullableString(value.title),
    description: toNullableString(value.description),
  };
}

function normalizeSessionOrder(order: unknown, sessions: Record<string, PersistedSessionMetadata>): string[] {
  if (!Array.isArray(order)) return [];

  const knownIds = new Set(Object.keys(sessions));
  const normalized = order
    .filter((entry): entry is string => typeof entry === 'string' && knownIds.has(entry))
    .filter((sessionId, index, all) => all.indexOf(sessionId) === index);

  return normalized;
}

function clampIdleLimit(value: unknown): number {
  if (typeof value !== 'number' || Number.isNaN(value)) return 5;
  return Math.max(1, Math.min(20, Math.round(value)));
}

export function parsePersistedSessionMeta(raw: unknown): PersistedSessionMetaStore | null {
  if (!isRecord(raw)) return null;
  if (raw.schemaVersion !== SESSION_PERSISTENCE_SCHEMA_VERSION) return null;

  const fallbackNow = new Date().toISOString();
  const sessionEntries = isRecord(raw.sessions) ? raw.sessions : {};
  const sessions: Record<string, PersistedSessionMetadata> = {};

  for (const [sessionId, sessionValue] of Object.entries(sessionEntries)) {
    const metadata = sanitizeMetadataEntry(sessionId, sessionValue, fallbackNow, []);
    sessions[sessionId] = metadata;
  }

  const sessionOrder = normalizeSessionOrder(raw.sessionOrder, sessions);
  const activeSessionId =
    typeof raw.activeSessionId === 'string' && sessions[raw.activeSessionId] ? raw.activeSessionId : null;

  return {
    schemaVersion: SESSION_PERSISTENCE_SCHEMA_VERSION,
    savedAt: toIsoDate(raw.savedAt, fallbackNow),
    sessions,
    sessionOrder,
    activeSessionId,
    activeProjectPath: toNullableString(raw.activeProjectPath),
    activeWorkingDirectory: toNullableString(raw.activeWorkingDirectory),
    maxIdleSessions: clampIdleLimit(raw.maxIdleSessions),
  };
}

export function parsePersistedSessionMessages(
  raw: unknown,
  maxMessagesPerSession: number,
  maxMessageLength: number
): SessionMessage[] {
  if (!isRecord(raw)) return [];
  if (raw.schemaVersion !== SESSION_PERSISTENCE_SCHEMA_VERSION) return [];
  return sanitizeMessages(raw.messages, maxMessagesPerSession, maxMessageLength);
}

function createSnapshotFromLegacyState(
  rawState: Record<string, unknown>,
  maxMessagesPerSession: number,
  maxMessageLength: number
): PersistedSessionStoreSnapshot | null {
  const rawSessions = isRecord(rawState.sessions) ? rawState.sessions : {};
  const fallbackNow = new Date().toISOString();

  const sessions: Record<string, PersistedSessionMetadata> = {};
  const sessionMessages: Record<string, SessionMessage[]> = {};

  for (const [sessionId, rawSession] of Object.entries(rawSessions)) {
    const sessionRecord = isRecord(rawSession) ? rawSession : {};
    const messages = sanitizeMessages(
      sessionRecord.messages,
      maxMessagesPerSession,
      maxMessageLength
    );
    sessionMessages[sessionId] = messages;
    sessions[sessionId] = sanitizeMetadataEntry(sessionId, sessionRecord, fallbackNow, messages);
  }

  if (Object.keys(sessions).length === 0) return null;

  const sessionOrder = normalizeSessionOrder(rawState.sessionOrder, sessions);
  const activeSessionId =
    typeof rawState.activeSessionId === 'string' && sessions[rawState.activeSessionId]
      ? rawState.activeSessionId
      : sessionOrder[0] ?? null;

  return {
    schemaVersion: SESSION_PERSISTENCE_SCHEMA_VERSION,
    savedAt: fallbackNow,
    sessions,
    sessionMessages,
    sessionOrder,
    activeSessionId,
    activeProjectPath: toNullableString(rawState.activeProjectPath),
    activeWorkingDirectory: toNullableString(rawState.activeWorkingDirectory),
    maxIdleSessions: clampIdleLimit(rawState.maxIdleSessions),
  };
}

export function migrateLegacySessionStore(
  raw: unknown,
  maxMessagesPerSession: number,
  maxMessageLength: number
): PersistedSessionStoreSnapshot | null {
  if (!isRecord(raw)) return null;

  const maybeDirectSnapshot = createSnapshotFromLegacyState(raw, maxMessagesPerSession, maxMessageLength);
  if (maybeDirectSnapshot) {
    return maybeDirectSnapshot;
  }

  if (isRecord(raw.state)) {
    return createSnapshotFromLegacyState(raw.state, maxMessagesPerSession, maxMessageLength);
  }

  return null;
}
