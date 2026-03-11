import { createLogger } from '@automaker/utils/logger';
import type { StoreApi, UseBoundStore } from 'zustand';
import type {
  PersistedSessionMetadata,
  PersistedSessionStoreSnapshot,
  SessionMessage,
  SessionState,
  SessionStoreState,
} from '../stores/types';
import { sanitizeToolCallGroup } from './tool-call-utils';
import { sanitizeThinkingBlock } from './thinking-utils';
import {
  LEGACY_SESSION_STORE_KEY,
  SESSION_PERSISTENCE_SCHEMA_VERSION,
  type PersistedSessionMetaStore,
  migrateLegacySessionStore,
  parsePersistedSessionMessages,
  parsePersistedSessionMeta,
} from './session-migration';

const logger = createLogger('SessionPersistence');

const SESSION_META_KEY = 'automaker:chat:sessions:meta:v1';
const SESSION_META_BACKUP_KEY = 'automaker:chat:sessions:meta:v1:backup';
const SESSION_MESSAGES_KEY_PREFIX = 'automaker:chat:sessions:messages:v1:';

const SAVE_DEBOUNCE_MS = 500;
const MAX_MESSAGES_PER_SESSION = 180;
const MAX_MESSAGE_TEXT_LENGTH = 20000;
const MAX_IDLE_SESSION_LIMIT = 20;
const MIN_IDLE_SESSION_LIMIT = 1;

interface PersistedSessionMessagesStore {
  schemaVersion: number;
  savedAt: string;
  sessionId: string;
  messages: SessionMessage[];
}

export interface LoadPersistedSessionStoreResult {
  snapshot: PersistedSessionStoreSnapshot | null;
  notice: string | null;
}

export interface SessionPersistenceController {
  stop: () => void;
  flush: () => void;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function canUseLocalStorage(): boolean {
  return typeof window !== 'undefined' && typeof window.localStorage !== 'undefined';
}

function toMessageStorageKey(sessionId: string): string {
  return `${SESSION_MESSAGES_KEY_PREFIX}${sessionId}`;
}

function safeGetItem(key: string): string | null {
  if (!canUseLocalStorage()) return null;

  try {
    return window.localStorage.getItem(key);
  } catch (error) {
    logger.warn('Reading from localStorage failed', { key, error });
    return null;
  }
}

function safeSetItem(key: string, value: string): boolean {
  if (!canUseLocalStorage()) return false;

  try {
    window.localStorage.setItem(key, value);
    return true;
  } catch (error) {
    logger.warn('Writing to localStorage failed', { key, error });
    return false;
  }
}

function safeRemoveItem(key: string): void {
  if (!canUseLocalStorage()) return;

  try {
    window.localStorage.removeItem(key);
  } catch (error) {
    logger.warn('Removing localStorage key failed', { key, error });
  }
}

function safeParseJson(raw: string): unknown | null {
  try {
    return JSON.parse(raw) as unknown;
  } catch {
    return null;
  }
}

function backupCorruptValue(key: string, raw: string): void {
  const backupKey = `${key}:corrupt:${Date.now()}`;
  safeSetItem(backupKey, raw.slice(0, 500_000));
}

function toIsoDate(value: string | undefined, fallback: string): string {
  if (!value) return fallback;
  const parsed = Date.parse(value);
  if (Number.isNaN(parsed)) return fallback;
  return new Date(parsed).toISOString();
}

function sanitizeToolCalls(value: SessionMessage['toolCalls']): SessionMessage['toolCalls'] {
  if (!Array.isArray(value) || value.length === 0) return undefined;
  const next = value
    .filter((entry) => isRecord(entry))
    .map((entry) => ({
      name: typeof entry.name === 'string' ? entry.name : 'tool',
      input: entry.input,
    }));
  return next.length > 0 ? next : undefined;
}

function sanitizeMessages(messages: SessionMessage[]): SessionMessage[] {
  if (!Array.isArray(messages) || messages.length === 0) return [];

  const limited = messages.slice(-MAX_MESSAGES_PER_SESSION);
  const now = new Date().toISOString();

  return limited.map((message, index) => ({
    id:
      typeof message.id === 'string' && message.id.trim().length > 0
        ? message.id
        : `restored-${index + 1}`,
    role: message.role === 'assistant' ? 'assistant' : 'user',
    content:
      typeof message.content === 'string' ? message.content.slice(0, MAX_MESSAGE_TEXT_LENGTH) : '',
    timestamp: toIsoDate(message.timestamp, now),
    isError: message.isError === true || undefined,
    toolCalls: sanitizeToolCalls(message.toolCalls),
    toolCallGroup: sanitizeToolCallGroup(message.toolCallGroup),
    thinking:
      typeof message.thinking === 'string'
        ? message.thinking.slice(0, MAX_MESSAGE_TEXT_LENGTH)
        : undefined,
    thinkingBlock: sanitizeThinkingBlock(message.thinkingBlock),
  }));
}

function createPersistedMetadata(session: SessionState): PersistedSessionMetadata {
  return {
    id: session.id,
    serverSessionId: session.serverSessionId || session.id,
    name: session.name || 'Chat',
    preview: session.preview,
    createdAt: session.createdAt,
    updatedAt: session.updatedAt,
    projectPath: session.projectPath,
    workingDirectory: session.workingDirectory,
    isArchived: session.isArchived,
    isRunning: false,
    processStatus: session.isArchived
      ? 'stopped'
      : session.processStatus === 'running'
        ? 'idle'
        : session.processStatus,
    model: session.model,
    thinkingLevel: session.thinkingLevel,
    reasoningEffort: session.reasoningEffort,
    messageCount: session.messageCount,
    totalTokensInput: session.totalTokensInput,
    totalTokensOutput: session.totalTokensOutput,
    totalCost: session.totalCost,
    draftMessage: session.draftMessage,
    orchestratorMode: session.orchestratorMode,
    orchestratorRunId: session.orchestratorRunId,
    orchestratorIteration: session.orchestratorIteration,
    title: session.title,
    description: session.description,
  };
}

function createMetaStoreFromState(state: SessionStoreState): PersistedSessionMetaStore {
  const sessions: Record<string, PersistedSessionMetadata> = {};

  for (const [sessionId, session] of Object.entries(state.sessions)) {
    sessions[sessionId] = createPersistedMetadata(session);
  }

  return {
    schemaVersion: SESSION_PERSISTENCE_SCHEMA_VERSION,
    savedAt: new Date().toISOString(),
    sessions,
    sessionOrder: state.sessionOrder.filter((sessionId) => Boolean(sessions[sessionId])),
    activeSessionId:
      state.activeSessionId && sessions[state.activeSessionId] ? state.activeSessionId : null,
    activeProjectPath: state.activeProjectPath,
    activeWorkingDirectory: state.activeWorkingDirectory,
    maxIdleSessions: Math.max(
      MIN_IDLE_SESSION_LIMIT,
      Math.min(MAX_IDLE_SESSION_LIMIT, Math.round(state.maxIdleSessions))
    ),
  };
}

function createMessageStore(
  sessionId: string,
  messages: SessionMessage[]
): PersistedSessionMessagesStore {
  return {
    schemaVersion: SESSION_PERSISTENCE_SCHEMA_VERSION,
    savedAt: new Date().toISOString(),
    sessionId,
    messages: sanitizeMessages(messages),
  };
}

function toSnapshot(
  meta: PersistedSessionMetaStore,
  messageMap: Record<string, SessionMessage[]>
): PersistedSessionStoreSnapshot {
  return {
    schemaVersion: meta.schemaVersion,
    savedAt: meta.savedAt,
    sessions: meta.sessions,
    sessionMessages: messageMap,
    sessionOrder: meta.sessionOrder,
    activeSessionId: meta.activeSessionId,
    activeProjectPath: meta.activeProjectPath,
    activeWorkingDirectory: meta.activeWorkingDirectory,
    maxIdleSessions: meta.maxIdleSessions,
  };
}

function loadMessagesForMeta(meta: PersistedSessionMetaStore): Record<string, SessionMessage[]> {
  const sessionMessages: Record<string, SessionMessage[]> = {};

  for (const sessionId of Object.keys(meta.sessions)) {
    const raw = safeGetItem(toMessageStorageKey(sessionId));
    if (!raw) {
      sessionMessages[sessionId] = [];
      continue;
    }

    const parsed = safeParseJson(raw);
    if (!parsed) {
      backupCorruptValue(toMessageStorageKey(sessionId), raw);
      sessionMessages[sessionId] = [];
      continue;
    }

    sessionMessages[sessionId] = parsePersistedSessionMessages(
      parsed,
      MAX_MESSAGES_PER_SESSION,
      MAX_MESSAGE_TEXT_LENGTH
    );
  }

  return sessionMessages;
}

function loadMetaFromKey(key: string): PersistedSessionMetaStore | null {
  const raw = safeGetItem(key);
  if (!raw) return null;

  const parsed = safeParseJson(raw);
  if (!parsed) {
    backupCorruptValue(key, raw);
    return null;
  }

  return parsePersistedSessionMeta(parsed);
}

function persistSnapshotImmediately(snapshot: PersistedSessionStoreSnapshot): void {
  const meta: PersistedSessionMetaStore = {
    schemaVersion: SESSION_PERSISTENCE_SCHEMA_VERSION,
    savedAt: snapshot.savedAt,
    sessions: snapshot.sessions,
    sessionOrder: snapshot.sessionOrder,
    activeSessionId: snapshot.activeSessionId,
    activeProjectPath: snapshot.activeProjectPath,
    activeWorkingDirectory: snapshot.activeWorkingDirectory,
    maxIdleSessions: snapshot.maxIdleSessions,
  };

  const metaSerialized = JSON.stringify(meta);
  const previousMeta = safeGetItem(SESSION_META_KEY);
  if (previousMeta) {
    safeSetItem(SESSION_META_BACKUP_KEY, previousMeta);
  }
  safeSetItem(SESSION_META_KEY, metaSerialized);

  for (const [sessionId, messages] of Object.entries(snapshot.sessionMessages)) {
    const payload = createMessageStore(sessionId, messages);
    safeSetItem(toMessageStorageKey(sessionId), JSON.stringify(payload));
  }
}

function loadLegacySnapshot(): PersistedSessionStoreSnapshot | null {
  const rawLegacy = safeGetItem(LEGACY_SESSION_STORE_KEY);
  if (!rawLegacy) return null;

  const parsed = safeParseJson(rawLegacy);
  if (!parsed) {
    backupCorruptValue(LEGACY_SESSION_STORE_KEY, rawLegacy);
    return null;
  }

  return migrateLegacySessionStore(parsed, MAX_MESSAGES_PER_SESSION, MAX_MESSAGE_TEXT_LENGTH);
}

export function loadPersistedSessionStore(): LoadPersistedSessionStoreResult {
  if (!canUseLocalStorage()) {
    return {
      snapshot: null,
      notice: null,
    };
  }

  const primaryMeta = loadMetaFromKey(SESSION_META_KEY);
  if (primaryMeta) {
    const messages = loadMessagesForMeta(primaryMeta);
    return {
      snapshot: toSnapshot(primaryMeta, messages),
      notice: null,
    };
  }

  const backupMeta = loadMetaFromKey(SESSION_META_BACKUP_KEY);
  if (backupMeta) {
    const messages = loadMessagesForMeta(backupMeta);
    return {
      snapshot: toSnapshot(backupMeta, messages),
      notice: 'Gespeicherte Chats wurden aus einer Sicherheitskopie geladen.',
    };
  }

  const migratedLegacySnapshot = loadLegacySnapshot();
  if (migratedLegacySnapshot) {
    persistSnapshotImmediately(migratedLegacySnapshot);
    safeRemoveItem(LEGACY_SESSION_STORE_KEY);

    return {
      snapshot: migratedLegacySnapshot,
      notice: 'Alte Chat-Daten wurden in das neue Speicherformat übertragen.',
    };
  }

  return {
    snapshot: null,
    notice: null,
  };
}

type SessionStore = UseBoundStore<StoreApi<SessionStoreState>>;

export function startSessionStorePersistence(store: SessionStore): SessionPersistenceController {
  if (!canUseLocalStorage()) {
    return {
      stop: () => undefined,
      flush: () => undefined,
    };
  }

  let timeoutId: number | null = null;
  let unsubscribed = false;
  let lastMetaSerialized = '';
  const lastMessages = new Map<string, string>();

  const clearDebounce = () => {
    if (timeoutId === null) return;
    window.clearTimeout(timeoutId);
    timeoutId = null;
  };

  const flush = () => {
    if (unsubscribed) return;
    clearDebounce();

    const state = store.getState();
    if (!state.hasHydratedFromDisk) return;

    const meta = createMetaStoreFromState(state);
    const nextMetaSerialized = JSON.stringify(meta);

    if (nextMetaSerialized !== lastMetaSerialized) {
      const previousMeta = safeGetItem(SESSION_META_KEY);
      if (previousMeta) {
        safeSetItem(SESSION_META_BACKUP_KEY, previousMeta);
      }
      safeSetItem(SESSION_META_KEY, nextMetaSerialized);
      lastMetaSerialized = nextMetaSerialized;
    }

    const currentSessionIds = new Set(Object.keys(meta.sessions));

    for (const sessionId of currentSessionIds) {
      const session = state.sessions[sessionId];
      const payload = createMessageStore(sessionId, session?.messages ?? []);
      const serialized = JSON.stringify(payload);

      if (serialized === lastMessages.get(sessionId)) {
        continue;
      }

      safeSetItem(toMessageStorageKey(sessionId), serialized);
      lastMessages.set(sessionId, serialized);
    }

    for (const knownSessionId of Array.from(lastMessages.keys())) {
      if (currentSessionIds.has(knownSessionId)) continue;
      safeRemoveItem(toMessageStorageKey(knownSessionId));
      lastMessages.delete(knownSessionId);
    }
  };

  const scheduleFlush = () => {
    if (unsubscribed) return;
    clearDebounce();
    timeoutId = window.setTimeout(flush, SAVE_DEBOUNCE_MS);
  };

  const unsubscribe = store.subscribe((state) => {
    if (!state.hasHydratedFromDisk) return;
    scheduleFlush();
  });

  const handleBeforeUnload = () => {
    flush();
  };

  window.addEventListener('beforeunload', handleBeforeUnload);

  return {
    stop: () => {
      if (unsubscribed) return;
      flush();
      clearDebounce();
      unsubscribe();
      window.removeEventListener('beforeunload', handleBeforeUnload);
      unsubscribed = true;
    },
    flush,
  };
}
