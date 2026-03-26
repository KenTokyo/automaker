/**
 * Codex SDK client - Executes Codex queries via official @openai/codex-sdk
 *
 * Used for programmatic control of Codex from within the application.
 * Provides cleaner integration than spawning CLI processes.
 */

import { Codex } from '@openai/codex-sdk';
import { formatHistoryAsText, classifyError, getUserFriendlyErrorMessage } from '@automaker/utils';
import { supportsReasoningEffort } from '@automaker/types';
import type { ExecuteOptions, ProviderMessage, ProviderTokenUsage } from './types.js';

const OPENAI_API_KEY_ENV = 'OPENAI_API_KEY';
const SDK_HISTORY_HEADER = 'Current request:\n';
const DEFAULT_RESPONSE_TEXT = '';
const SDK_ERROR_DETAILS_LABEL = 'Details:';
const INPUT_TOKEN_KEYS = ['input_tokens', 'inputTokens', 'prompt_tokens', 'promptTokens'] as const;
const OUTPUT_TOKEN_KEYS = [
  'output_tokens',
  'outputTokens',
  'completion_tokens',
  'completionTokens',
] as const;
const TOTAL_TOKEN_KEYS = ['total_tokens', 'totalTokens', 'token_count', 'tokenCount'] as const;
const CACHE_READ_TOKEN_KEYS = [
  'cache_read_input_tokens',
  'cacheReadInputTokens',
  'cached_input_tokens',
  'cachedInputTokens',
] as const;
const CACHE_CREATE_TOKEN_KEYS = [
  'cache_creation_input_tokens',
  'cacheCreationInputTokens',
  'cache_write_input_tokens',
  'cacheWriteInputTokens',
] as const;
const REASONING_TOKEN_KEYS = [
  'reasoning_tokens',
  'reasoningTokens',
  'reasoning_output_tokens',
  'reasoningOutputTokens',
] as const;
const INPUT_TOKEN_DETAIL_CONTAINER_KEYS = [
  'input_tokens_details',
  'inputTokensDetails',
  'input_token_details',
] as const;
const OUTPUT_TOKEN_DETAIL_CONTAINER_KEYS = [
  'output_tokens_details',
  'outputTokensDetails',
  'output_token_details',
] as const;
const CACHE_READ_DETAIL_KEYS = ['cached_tokens', 'cache_read_tokens', 'cacheReadTokens'] as const;
const CACHE_CREATE_DETAIL_KEYS = [
  'cache_creation_tokens',
  'cacheCreationTokens',
  'cache_write_tokens',
  'cacheWriteTokens',
] as const;
const TOKEN_USAGE_CONTAINER_KEYS = [
  'usage',
  'token_usage',
  'tokenUsage',
  'stats',
  'metrics',
  'usage_stats',
  'token_usage_info',
  'tokenUsageInfo',
  // Prefer "last" usage over running totals for context-related UI values.
  'last_token_usage',
  'lastTokenUsage',
  'last',
  'total_token_usage',
  'totalTokenUsage',
  'total',
] as const;
const TOKEN_USAGE_PARENT_KEYS = [
  'result',
  'response',
  'turn',
  'item',
  'data',
  'payload',
  'info',
] as const;
const TOKEN_USAGE_LIKE_KEY_PATTERN = /(usage|token)/i;

type PromptBlock = {
  type: string;
  text?: string;
  source?: {
    type?: string;
    media_type?: string;
    data?: string;
  };
};

function resolveApiKey(): string {
  const apiKey = process.env[OPENAI_API_KEY_ENV];
  if (!apiKey) {
    throw new Error('OPENAI_API_KEY is not set.');
  }
  return apiKey;
}

function normalizePromptBlocks(prompt: ExecuteOptions['prompt']): PromptBlock[] {
  if (Array.isArray(prompt)) {
    return prompt as PromptBlock[];
  }
  return [{ type: 'text', text: prompt }];
}

function buildPromptText(options: ExecuteOptions, systemPrompt: string | null): string {
  const historyText =
    options.conversationHistory && options.conversationHistory.length > 0
      ? formatHistoryAsText(options.conversationHistory)
      : '';

  const promptBlocks = normalizePromptBlocks(options.prompt);
  const promptTexts: string[] = [];

  for (const block of promptBlocks) {
    if (block.type === 'text' && typeof block.text === 'string' && block.text.trim()) {
      promptTexts.push(block.text);
    }
  }

  const promptContent = promptTexts.join('\n\n');
  if (!promptContent.trim()) {
    throw new Error('Codex SDK prompt is empty.');
  }

  const parts: string[] = [];
  if (systemPrompt) {
    parts.push(`System: ${systemPrompt}`);
  }
  if (historyText) {
    parts.push(historyText);
  }
  parts.push(`${SDK_HISTORY_HEADER}${promptContent}`);

  return parts.join('\n\n');
}

function buildSdkErrorMessage(rawMessage: string, userMessage: string): string {
  if (!rawMessage) {
    return userMessage;
  }
  if (!userMessage || rawMessage === userMessage) {
    return rawMessage;
  }
  return `${userMessage}\n\n${SDK_ERROR_DETAILS_LABEL} ${rawMessage}`;
}

function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return null;
  }
  return value as Record<string, unknown>;
}

function toTokenCount(value: unknown): number | undefined {
  if (typeof value !== 'number' || !Number.isFinite(value)) return undefined;
  const normalized = Math.max(0, Math.round(value));
  return normalized > 0 ? normalized : undefined;
}

function readTokenField(
  record: Record<string, unknown>,
  keys: readonly string[]
): number | undefined {
  for (const key of keys) {
    const tokenCount = toTokenCount(record[key]);
    if (typeof tokenCount === 'number') {
      return tokenCount;
    }
  }
  return undefined;
}

function normalizeTokenUsage(record: Record<string, unknown>): ProviderTokenUsage | undefined {
  const inputTokens = readTokenField(record, INPUT_TOKEN_KEYS);
  const outputTokens = readTokenField(record, OUTPUT_TOKEN_KEYS);
  const totalTokens = readTokenField(record, TOTAL_TOKEN_KEYS);
  const cacheReadInputTokens =
    readTokenField(record, CACHE_READ_TOKEN_KEYS) ??
    readTokenFieldFromContainers(record, INPUT_TOKEN_DETAIL_CONTAINER_KEYS, CACHE_READ_DETAIL_KEYS);
  const cacheCreationInputTokens =
    readTokenField(record, CACHE_CREATE_TOKEN_KEYS) ??
    readTokenFieldFromContainers(
      record,
      INPUT_TOKEN_DETAIL_CONTAINER_KEYS,
      CACHE_CREATE_DETAIL_KEYS
    );
  const reasoningTokens =
    readTokenField(record, REASONING_TOKEN_KEYS) ??
    readTokenFieldFromContainers(record, OUTPUT_TOKEN_DETAIL_CONTAINER_KEYS, REASONING_TOKEN_KEYS);

  if (
    !inputTokens &&
    !outputTokens &&
    !totalTokens &&
    !cacheReadInputTokens &&
    !cacheCreationInputTokens &&
    !reasoningTokens
  ) {
    return undefined;
  }

  return {
    inputTokens,
    outputTokens,
    totalTokens,
    cacheReadInputTokens,
    cacheCreationInputTokens,
    reasoningTokens,
  };
}

function readTokenFieldFromContainers(
  record: Record<string, unknown>,
  containerKeys: readonly string[],
  tokenKeys: readonly string[]
): number | undefined {
  for (const containerKey of containerKeys) {
    const container = asRecord(record[containerKey]);
    if (!container) continue;
    const tokenCount = readTokenField(container, tokenKeys);
    if (typeof tokenCount === 'number') {
      return tokenCount;
    }
  }
  return undefined;
}

function collectSdkUsageCandidates(
  resultRecord: Record<string, unknown>
): Record<string, unknown>[] {
  const candidates: Record<string, unknown>[] = [];
  const seenCandidates = new Set<Record<string, unknown>>();
  const seenNodes = new Set<Record<string, unknown>>();
  const pushCandidate = (value: unknown) => {
    const candidate = asRecord(value);
    if (candidate && !seenCandidates.has(candidate)) {
      seenCandidates.add(candidate);
      candidates.push(candidate);
    }
  };

  const queue: Array<{ record: Record<string, unknown>; depth: number }> = [
    { record: resultRecord, depth: 0 },
  ];
  const maxDepth = 3;

  while (queue.length > 0) {
    const current = queue.shift();
    if (!current) continue;
    const { record, depth } = current;
    if (seenNodes.has(record)) continue;
    seenNodes.add(record);

    pushCandidate(record);
    for (const key of TOKEN_USAGE_CONTAINER_KEYS) {
      pushCandidate(record[key]);
    }
    for (const [key, value] of Object.entries(record)) {
      if (TOKEN_USAGE_LIKE_KEY_PATTERN.test(key)) {
        pushCandidate(value);
      }
    }

    if (depth >= maxDepth) continue;
    for (const key of TOKEN_USAGE_PARENT_KEYS) {
      const nested = asRecord(record[key]);
      if (nested && !seenNodes.has(nested)) {
        queue.push({ record: nested, depth: depth + 1 });
      }
    }
  }

  return candidates;
}

function extractSdkTokenUsage(result: unknown): ProviderTokenUsage | undefined {
  const resultRecord = asRecord(result);
  if (!resultRecord) return undefined;

  const candidates = collectSdkUsageCandidates(resultRecord);
  for (const candidate of candidates) {
    const normalized = normalizeTokenUsage(candidate);
    if (normalized) return normalized;
  }

  return normalizeTokenUsage(resultRecord);
}

/**
 * Execute a query using the official Codex SDK
 *
 * The SDK provides a cleaner interface than spawning CLI processes:
 * - Handles authentication automatically
 * - Provides TypeScript types
 * - Supports thread management and resumption
 * - Better error handling
 */
export async function* executeCodexSdkQuery(
  options: ExecuteOptions,
  systemPrompt: string | null
): AsyncGenerator<ProviderMessage> {
  try {
    const apiKey = resolveApiKey();
    const codex = new Codex({ apiKey });

    // Resume existing thread or start new one
    let thread;
    if (options.sdkSessionId) {
      try {
        thread = codex.resumeThread(options.sdkSessionId);
      } catch {
        // If resume fails, start a new thread
        thread = codex.startThread();
      }
    } else {
      thread = codex.startThread();
    }

    const promptText = buildPromptText(options, systemPrompt);

    // Build run options with reasoning effort if supported
    const runOptions: {
      signal?: AbortSignal;
      reasoning?: { effort: string };
    } = {
      signal: options.abortController?.signal,
    };

    // Add reasoning effort if model supports it and reasoningEffort is specified
    if (
      options.reasoningEffort &&
      supportsReasoningEffort(options.model) &&
      options.reasoningEffort !== 'none'
    ) {
      runOptions.reasoning = { effort: options.reasoningEffort };
    }

    // Run the query
    const result = await thread.run(promptText, runOptions);
    const usage = extractSdkTokenUsage(result);

    // Extract response text (from finalResponse property)
    const outputText = result.finalResponse ?? DEFAULT_RESPONSE_TEXT;

    // Get thread ID (may be null if not populated yet)
    const threadId = thread.id ?? undefined;

    // Yield assistant message
    yield {
      type: 'assistant',
      session_id: threadId,
      message: {
        role: 'assistant',
        content: [{ type: 'text', text: outputText }],
      },
      usage,
    };

    // Yield result
    yield {
      type: 'result',
      subtype: 'success',
      session_id: threadId,
      result: outputText,
      usage,
    };
  } catch (error) {
    const errorInfo = classifyError(error);
    const userMessage = getUserFriendlyErrorMessage(error);
    const combinedMessage = buildSdkErrorMessage(errorInfo.message, userMessage);
    console.error('[CodexSDK] executeQuery() error during execution:', {
      type: errorInfo.type,
      message: errorInfo.message,
      isRateLimit: errorInfo.isRateLimit,
      retryAfter: errorInfo.retryAfter,
      stack: error instanceof Error ? error.stack : undefined,
    });
    yield { type: 'error', error: combinedMessage };
  }
}
