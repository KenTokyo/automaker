import type { PhaseModelEntry, ReasoningEffort, ThinkingLevel } from '@automaker/types';
import type { Message } from '@/types/electron';
import type { SessionMessage, SessionState } from '../stores/types';

export const LEFT_OPEN_STORAGE_KEY = 'automaker:chat:v2:left-open';
export const RIGHT_OPEN_STORAGE_KEY = 'automaker:chat:v2:right-open';
export const LEFT_WIDTH_STORAGE_KEY = 'automaker:chat:v2:left-width';
export const RIGHT_WIDTH_STORAGE_KEY = 'automaker:chat:v2:right-width';
export const DEFAULT_SIDEBAR_WIDTH = 320;
export const MIN_SIDEBAR_WIDTH = 250;
export const MAX_SIDEBAR_WIDTH = 500;

const THINKING_LEVELS: ThinkingLevel[] = ['none', 'low', 'medium', 'high', 'ultrathink'];
const REASONING_EFFORTS: ReasoningEffort[] = ['none', 'minimal', 'low', 'medium', 'high', 'xhigh'];

export interface UsageEstimate {
  inputTokens: number;
  outputTokens: number;
  cost: number;
}

export function readStoredBoolean(key: string, fallback: boolean): boolean {
  if (typeof window === 'undefined') return fallback;
  const value = window.localStorage.getItem(key);
  if (value === 'true') return true;
  if (value === 'false') return false;
  return fallback;
}

export function readStoredWidth(key: string, fallback: number): number {
  if (typeof window === 'undefined') return fallback;
  const value = Number(window.localStorage.getItem(key));
  if (!Number.isFinite(value)) return fallback;
  return Math.max(MIN_SIDEBAR_WIDTH, Math.min(MAX_SIDEBAR_WIDTH, Math.round(value)));
}

export function normalizeThinkingLevel(value?: null | string): ThinkingLevel {
  return THINKING_LEVELS.includes(value as ThinkingLevel) ? (value as ThinkingLevel) : 'none';
}

export function normalizeReasoningEffort(value?: null | string): ReasoningEffort {
  return REASONING_EFFORTS.includes(value as ReasoningEffort) ? (value as ReasoningEffort) : 'none';
}

export function isSameModel(left: PhaseModelEntry, right: PhaseModelEntry): boolean {
  return (
    left.model === right.model &&
    (left.thinkingLevel ?? 'none') === (right.thinkingLevel ?? 'none') &&
    (left.reasoningEffort ?? 'none') === (right.reasoningEffort ?? 'none') &&
    (left.providerId ?? null) === (right.providerId ?? null)
  );
}

export function sanitizeDocumentName(name: string): string {
  const cleaned = name
    .replace(/[<>:"/\\|?*\x00-\x1f]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .trim();
  return cleaned.length > 0 ? cleaned.slice(0, 80) : 'Chat';
}

export function estimateUsage(messages: Message[]): UsageEstimate {
  let inputTokens = 0;
  let outputTokens = 0;

  for (const message of messages) {
    const tokenGuess = Math.ceil(message.content.length / 4);
    if (message.role === 'user') {
      inputTokens += tokenGuess;
    } else {
      outputTokens += tokenGuess;
    }
  }

  // Grobe Schätzung mit Sonnet-ähnlichen Preisen je 1M Tokens.
  const cost = inputTokens * 0.000003 + outputTokens * 0.000015;
  return { inputTokens, outputTokens, cost };
}

export function toSessionMessage(message: Message): SessionMessage {
  return {
    ...message,
  };
}

export function getMessageTimestamp(): string {
  return new Date().toISOString();
}

export function toHistoryName(session: SessionState): string {
  return session.title?.trim() || session.name;
}

export function isTypingTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  const tagName = target.tagName.toLowerCase();
  if (tagName === 'input' || tagName === 'textarea' || tagName === 'select') {
    return true;
  }
  return target.isContentEditable;
}
