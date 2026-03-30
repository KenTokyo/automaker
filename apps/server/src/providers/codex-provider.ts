/**
 * Codex Provider - Executes queries using Codex CLI
 *
 * Spawns the Codex CLI and converts JSONL output into ProviderMessage format.
 */

import path from 'path';
import { BaseProvider } from './base-provider.js';
import {
  spawnJSONLProcess,
  spawnProcess,
  findCodexCliPath,
  getCodexAuthIndicators,
  secureFs,
  getDataDirectory,
  getCodexConfigDir,
} from '@automaker/platform';
import { checkCodexAuthentication } from '../lib/codex-auth.js';
import {
  formatHistoryAsText,
  extractTextFromContent,
  classifyError,
  getUserFriendlyErrorMessage,
  createLogger,
} from '@automaker/utils';
import type {
  ExecuteOptions,
  ProviderMessage,
  InstallationStatus,
  ModelDefinition,
  ProviderTokenUsage,
} from './types.js';
import {
  CODEX_MODEL_MAP,
  supportsReasoningEffort,
  validateBareModelId,
  calculateReasoningTimeout,
  DEFAULT_TIMEOUT_MS,
  type CodexApprovalPolicy,
  type CodexSandboxMode,
  type CodexAuthStatus,
} from '@automaker/types';
import { CodexConfigManager } from './codex-config-manager.js';
import { executeCodexSdkQuery } from './codex-sdk-client.js';
import {
  resolveCodexToolCall,
  extractCodexTodoItems,
  getCodexTodoToolName,
} from './codex-tool-mapping.js';
import { SettingsService } from '../services/settings-service.js';
import { createTempEnvOverride } from '../lib/auth-utils.js';
import { checkSandboxCompatibility } from '../lib/sdk-options.js';
import { CODEX_MODELS } from './codex-models.js';

const CODEX_COMMAND = 'codex';
const CODEX_EXEC_SUBCOMMAND = 'exec';
const CODEX_JSON_FLAG = '--json';
const CODEX_MODEL_FLAG = '--model';
const CODEX_VERSION_FLAG = '--version';
const CODEX_SANDBOX_FLAG = '--sandbox';
const CODEX_APPROVAL_FLAG = '--ask-for-approval';
const CODEX_SEARCH_FLAG = '--search';
const CODEX_OUTPUT_SCHEMA_FLAG = '--output-schema';
const CODEX_CONFIG_FLAG = '--config';
const CODEX_COMPAT_MODEL_REASONING_EFFORT = 'model_reasoning_effort=high';
const CODEX_IMAGE_FLAG = '--image';
const CODEX_ADD_DIR_FLAG = '--add-dir';
const CODEX_SKIP_GIT_REPO_CHECK_FLAG = '--skip-git-repo-check';
const CODEX_RESUME_FLAG = 'resume';
const CODEX_REASONING_EFFORT_KEY = 'reasoning_effort';
const CODEX_YOLO_FLAG = '--dangerously-bypass-approvals-and-sandbox';
const OPENAI_API_KEY_ENV = 'OPENAI_API_KEY';
const CODEX_EXECUTION_MODE_CLI = 'cli';
const CODEX_EXECUTION_MODE_SDK = 'sdk';
const ERROR_CODEX_CLI_REQUIRED =
  'Codex CLI is required for tool-enabled requests. Please install Codex CLI and run `codex login`.';
const ERROR_CODEX_AUTH_REQUIRED = "Codex authentication is required. Please run 'codex login'.";
const ERROR_CODEX_SDK_AUTH_REQUIRED = 'OpenAI API key required for Codex SDK execution.';

const CODEX_EVENT_TYPES = {
  itemCompleted: 'item.completed',
  itemStarted: 'item.started',
  itemUpdated: 'item.updated',
  turnStarted: 'turn.started',
  turnCompleted: 'turn.completed',
  error: 'error',
} as const;

const CODEX_ITEM_TYPES = {
  reasoning: 'reasoning',
  agentMessage: 'agent_message',
  commandExecution: 'command_execution',
  todoList: 'todo_list',
} as const;

const SYSTEM_PROMPT_LABEL = 'System instructions';
const HISTORY_HEADER = 'Current request:\n';
const TEXT_ENCODING = 'utf-8';
/**
 * Default timeout for Codex CLI operations in milliseconds.
 * This is the "no output" timeout - if the CLI doesn't produce any JSONL output
 * for this duration, the process is killed. For reasoning models with high
 * reasoning effort, this timeout is dynamically extended via calculateReasoningTimeout().
 *
 * For feature generation (which can generate 50+ features), we use a much longer
 * base timeout (5 minutes) since Codex models are slower at generating large JSON responses.
 *
 * @see calculateReasoningTimeout from @automaker/types
 */
const CODEX_CLI_TIMEOUT_MS = DEFAULT_TIMEOUT_MS;
const CODEX_FEATURE_GENERATION_BASE_TIMEOUT_MS = 300000; // 5 minutes for feature generation
const CONTEXT_WINDOW_256K = 256000;
const MAX_OUTPUT_32K = 32000;
const MAX_OUTPUT_16K = 16000;
const SYSTEM_PROMPT_SEPARATOR = '\n\n';
const CODEX_INSTRUCTIONS_DIR = '.codex';
const CODEX_INSTRUCTIONS_SECTION = 'Codex Project Instructions';
const CODEX_INSTRUCTIONS_PATH_LABEL = 'Path';
const CODEX_INSTRUCTIONS_SOURCE_LABEL = 'Source';
const CODEX_INSTRUCTIONS_USER_SOURCE = 'User instructions';
const CODEX_INSTRUCTIONS_PROJECT_SOURCE = 'Project instructions';
const CODEX_USER_INSTRUCTIONS_FILE = 'AGENTS.md';
const CODEX_PROJECT_INSTRUCTIONS_FILES = ['AGENTS.md'] as const;
const CODEX_SETTINGS_DIR_FALLBACK = './data';
const DEFAULT_CODEX_AUTO_LOAD_AGENTS = false;
const DEFAULT_CODEX_SANDBOX_MODE: CodexSandboxMode = 'workspace-write';
const DEFAULT_CODEX_APPROVAL_POLICY: CodexApprovalPolicy = 'on-request';
const TOOL_USE_ID_PREFIX = 'codex-tool-';
const ITEM_ID_KEYS = ['id', 'item_id', 'call_id', 'tool_use_id', 'command_id'] as const;
const EVENT_ID_KEYS = ['id', 'event_id', 'request_id'] as const;
const COMMAND_OUTPUT_FIELDS = ['output', 'stdout', 'stderr', 'result'] as const;
const COMMAND_OUTPUT_SEPARATOR = '\n';
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
const LAST_TOKEN_USAGE_KEYS = ['last_token_usage', 'lastTokenUsage', 'last'] as const;
const TOKEN_USAGE_PARENT_KEYS = [
  'result',
  'response',
  'turn',
  'item',
  'data',
  'payload',
  'info',
  'event',
  'message',
  'output',
] as const;
const TOKEN_USAGE_LIKE_KEY_PATTERN = /(usage|token)/i;
const IN_PROCESS_STREAM_LAG_PATTERN =
  /\bin-process app-server event stream lagged; dropped \d+ events?\b/i;
const PARSE_OUTPUT_PREFIX = 'Failed to parse output:';
const OUTPUT_SCHEMA_FILENAME = 'output-schema.json';
const OUTPUT_SCHEMA_INDENT_SPACES = 2;
const IMAGE_TEMP_DIR = '.codex-images';
const IMAGE_FILE_PREFIX = 'image-';
const IMAGE_FILE_EXT = '.png';
const DEFAULT_ALLOWED_TOOLS = [
  'Read',
  'Write',
  'Edit',
  'Glob',
  'Grep',
  'Bash',
  'WebSearch',
  'WebFetch',
] as const;
const SEARCH_TOOL_NAMES = new Set(['WebSearch', 'WebFetch']);
const MIN_MAX_TURNS = 1;
const CONFIG_KEY_MAX_TURNS = 'max_turns';
const CONSTRAINTS_SECTION_TITLE = 'Codex Execution Constraints';
const CONSTRAINTS_MAX_TURNS_LABEL = 'Max turns';
const CONSTRAINTS_ALLOWED_TOOLS_LABEL = 'Allowed tools';
const CONSTRAINTS_OUTPUT_SCHEMA_LABEL = 'Output format';
const CONSTRAINTS_SESSION_ID_LABEL = 'Session ID';
const CONSTRAINTS_NO_TOOLS_VALUE = 'none';
const CONSTRAINTS_OUTPUT_SCHEMA_VALUE = 'Respond with JSON that matches the provided schema.';

type CodexExecutionMode = typeof CODEX_EXECUTION_MODE_CLI | typeof CODEX_EXECUTION_MODE_SDK;
type CodexExecutionPlan = {
  mode: CodexExecutionMode;
  cliPath: string | null;
  openAiApiKey?: string | null;
};

const ALLOWED_ENV_VARS = [
  OPENAI_API_KEY_ENV,
  'PATH',
  'HOME',
  'SHELL',
  'TERM',
  'USER',
  'LANG',
  'LC_ALL',
];

function buildEnv(): Record<string, string> {
  const env: Record<string, string> = {};
  for (const key of ALLOWED_ENV_VARS) {
    const value = process.env[key];
    if (value) {
      env[key] = value;
    }
  }
  return env;
}

async function resolveOpenAiApiKey(): Promise<string | null> {
  const envKey = process.env[OPENAI_API_KEY_ENV];
  if (envKey) {
    return envKey;
  }

  try {
    const settingsService = new SettingsService(getCodexSettingsDir());
    const credentials = await settingsService.getCredentials();
    const storedKey = credentials.apiKeys.openai?.trim();
    return storedKey ? storedKey : null;
  } catch {
    return null;
  }
}

function hasMcpServersConfigured(options: ExecuteOptions): boolean {
  return Boolean(options.mcpServers && Object.keys(options.mcpServers).length > 0);
}

function isNoToolsRequested(options: ExecuteOptions): boolean {
  return Array.isArray(options.allowedTools) && options.allowedTools.length === 0;
}

function isSdkEligible(options: ExecuteOptions): boolean {
  return isNoToolsRequested(options) && !hasMcpServersConfigured(options);
}

async function resolveCodexExecutionPlan(options: ExecuteOptions): Promise<CodexExecutionPlan> {
  const cliPath = await findCodexCliPath();
  const authIndicators = await getCodexAuthIndicators();
  const openAiApiKey = await resolveOpenAiApiKey();
  const hasApiKey = Boolean(openAiApiKey);
  const cliAuthenticated = authIndicators.hasOAuthToken || authIndicators.hasApiKey || hasApiKey;
  const sdkEligible = isSdkEligible(options);
  const cliAvailable = Boolean(cliPath);

  if (hasApiKey) {
    return {
      mode: CODEX_EXECUTION_MODE_SDK,
      cliPath,
      openAiApiKey,
    };
  }

  if (sdkEligible) {
    if (!cliAvailable) {
      throw new Error(ERROR_CODEX_SDK_AUTH_REQUIRED);
    }
  }

  if (!cliAvailable) {
    throw new Error(ERROR_CODEX_CLI_REQUIRED);
  }

  if (!cliAuthenticated) {
    throw new Error(ERROR_CODEX_AUTH_REQUIRED);
  }

  return {
    mode: CODEX_EXECUTION_MODE_CLI,
    cliPath,
    openAiApiKey,
  };
}

function getEventType(event: Record<string, unknown>): string | null {
  if (typeof event.type === 'string') {
    return event.type;
  }
  if (typeof event.event === 'string') {
    return event.event;
  }
  return null;
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

function normalizeTokenUsageFromRecord(
  record: Record<string, unknown>
): ProviderTokenUsage | undefined {
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

function collectTokenUsageCandidates(event: Record<string, unknown>): Record<string, unknown>[] {
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
    { record: event, depth: 0 },
  ];
  const maxDepth = 3;

  while (queue.length > 0) {
    const current = queue.shift();
    if (!current) continue;
    const { record, depth } = current;

    if (seenNodes.has(record)) {
      continue;
    }
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

    if (depth >= maxDepth) {
      continue;
    }

    for (const key of TOKEN_USAGE_PARENT_KEYS) {
      const nestedRecord = asRecord(record[key]);
      if (nestedRecord && !seenNodes.has(nestedRecord)) {
        queue.push({ record: nestedRecord, depth: depth + 1 });
      }
    }
  }

  return candidates;
}

function extractLastTokenUsageFromCandidate(
  candidate: Record<string, unknown>
): ProviderTokenUsage | undefined {
  for (const key of LAST_TOKEN_USAGE_KEYS) {
    const nestedRecord = asRecord(candidate[key]);
    if (!nestedRecord) continue;
    const usage = normalizeTokenUsageFromRecord(nestedRecord);
    if (usage) {
      return usage;
    }
  }
  return undefined;
}

function extractCodexTokenUsage(
  event: Record<string, unknown>
): { usage: ProviderTokenUsage; source: 'last' | 'generic' } | undefined {
  const candidates = collectTokenUsageCandidates(event);

  // Prefer explicit "last token usage" containers when present.
  for (const candidate of candidates) {
    const usage = extractLastTokenUsageFromCandidate(candidate);
    if (usage) {
      return { usage, source: 'last' };
    }
  }

  for (const candidate of candidates) {
    const usage = normalizeTokenUsageFromRecord(candidate);
    if (usage) {
      return { usage, source: 'generic' };
    }
  }

  // Fallback: some event payloads expose token fields directly on the root event.
  const fallback = normalizeTokenUsageFromRecord(event);
  return fallback ? { usage: fallback, source: 'generic' } : undefined;
}

function extractText(value: unknown): string | null {
  if (typeof value === 'string') {
    return value;
  }
  if (Array.isArray(value)) {
    return value
      .map((item) => extractText(item))
      .filter(Boolean)
      .join('\n');
  }
  if (value && typeof value === 'object') {
    const record = value as Record<string, unknown>;
    if (typeof record.text === 'string') {
      return record.text;
    }
    if (typeof record.content === 'string') {
      return record.content;
    }
    if (typeof record.message === 'string') {
      return record.message;
    }
  }
  return null;
}

function extractCommandText(item: Record<string, unknown>): string | null {
  const direct = extractText(item.command ?? item.input ?? item.content);
  if (direct) {
    return direct;
  }
  return null;
}

function extractCommandOutput(item: Record<string, unknown>): string | null {
  const outputs: string[] = [];
  for (const field of COMMAND_OUTPUT_FIELDS) {
    const value = item[field];
    const text = extractText(value);
    if (text) {
      outputs.push(text);
    }
  }

  if (outputs.length === 0) {
    return null;
  }

  const uniqueOutputs = outputs.filter((output, index) => outputs.indexOf(output) === index);
  return uniqueOutputs.join(COMMAND_OUTPUT_SEPARATOR);
}

function extractItemType(item: Record<string, unknown>): string | null {
  if (typeof item.type === 'string') {
    return item.type;
  }
  if (typeof item.kind === 'string') {
    return item.kind;
  }
  return null;
}

function isInProcessStreamLagMessage(text: string): boolean {
  return IN_PROCESS_STREAM_LAG_PATTERN.test(text.trim());
}

function normalizeLagCandidateLine(line: string): string {
  const trimmedLine = line.trim();
  if (!trimmedLine) {
    return '';
  }

  if (trimmedLine.startsWith(PARSE_OUTPUT_PREFIX)) {
    return trimmedLine.slice(PARSE_OUTPUT_PREFIX.length).trim();
  }

  return trimmedLine;
}

function stripIgnorableCodexLagOutput(text: string): {
  sanitizedText: string | null;
  removedLines: number;
} {
  const lines = text.split(/\r?\n/);
  const keptLines: string[] = [];
  let removedLines = 0;

  for (const line of lines) {
    const normalized = normalizeLagCandidateLine(line);
    if (normalized && isInProcessStreamLagMessage(normalized)) {
      removedLines += 1;
      continue;
    }
    keptLines.push(line);
  }

  const sanitized = keptLines.join('\n').trim();
  return {
    sanitizedText: sanitized.length > 0 ? sanitized : null,
    removedLines,
  };
}

function sanitizeCodexOutput(text: string): string | null {
  const { sanitizedText } = stripIgnorableCodexLagOutput(text);
  return sanitizedText;
}

function isIgnorableCodexLagOutput(text: string): boolean {
  const { sanitizedText, removedLines } = stripIgnorableCodexLagOutput(text);
  if (!sanitizedText) {
    return removedLines > 0;
  }

  return false;
}

function resolveSystemPrompt(systemPrompt?: unknown): string | null {
  if (!systemPrompt) {
    return null;
  }
  if (typeof systemPrompt === 'string') {
    return systemPrompt;
  }
  if (typeof systemPrompt === 'object' && systemPrompt !== null) {
    const record = systemPrompt as Record<string, unknown>;
    if (typeof record.append === 'string') {
      return record.append;
    }
  }
  return null;
}

function buildCombinedPrompt(options: ExecuteOptions, systemPromptText?: string | null): string {
  const promptText =
    typeof options.prompt === 'string' ? options.prompt : extractTextFromContent(options.prompt);
  const historyText = options.conversationHistory
    ? formatHistoryAsText(options.conversationHistory)
    : '';
  const resolvedSystemPrompt = systemPromptText ?? resolveSystemPrompt(options.systemPrompt);

  const systemSection = resolvedSystemPrompt
    ? `${SYSTEM_PROMPT_LABEL}:\n${resolvedSystemPrompt}\n\n`
    : '';

  return `${historyText}${systemSection}${HISTORY_HEADER}${promptText}`;
}

function formatConfigValue(value: string | number | boolean): string {
  return String(value);
}

function buildConfigOverrides(
  overrides: Array<{ key: string; value: string | number | boolean }>
): string[] {
  const args: string[] = [];
  for (const override of overrides) {
    args.push(CODEX_CONFIG_FLAG, `${override.key}=${formatConfigValue(override.value)}`);
  }
  return args;
}

function resolveMaxTurns(maxTurns?: number): number | null {
  if (typeof maxTurns !== 'number' || Number.isNaN(maxTurns) || !Number.isFinite(maxTurns)) {
    return null;
  }
  const normalized = Math.floor(maxTurns);
  return normalized >= MIN_MAX_TURNS ? normalized : null;
}

function resolveSearchEnabled(allowedTools: string[], restrictTools: boolean): boolean {
  const toolsToCheck = restrictTools ? allowedTools : Array.from(DEFAULT_ALLOWED_TOOLS);
  return toolsToCheck.some((tool) => SEARCH_TOOL_NAMES.has(tool));
}

function buildCodexConstraintsPrompt(
  options: ExecuteOptions,
  config: {
    allowedTools: string[];
    restrictTools: boolean;
    maxTurns: number | null;
    hasOutputSchema: boolean;
  }
): string | null {
  const lines: string[] = [];

  if (config.maxTurns !== null) {
    lines.push(`${CONSTRAINTS_MAX_TURNS_LABEL}: ${config.maxTurns}`);
  }

  if (config.restrictTools) {
    const allowed =
      config.allowedTools.length > 0 ? config.allowedTools.join(', ') : CONSTRAINTS_NO_TOOLS_VALUE;
    lines.push(`${CONSTRAINTS_ALLOWED_TOOLS_LABEL}: ${allowed}`);
  }

  if (config.hasOutputSchema) {
    lines.push(`${CONSTRAINTS_OUTPUT_SCHEMA_LABEL}: ${CONSTRAINTS_OUTPUT_SCHEMA_VALUE}`);
  }

  if (options.sdkSessionId) {
    lines.push(`${CONSTRAINTS_SESSION_ID_LABEL}: ${options.sdkSessionId}`);
  }

  if (lines.length === 0) {
    return null;
  }

  return `## ${CONSTRAINTS_SECTION_TITLE}\n${lines.map((line) => `- ${line}`).join('\n')}`;
}

async function writeOutputSchemaFile(
  cwd: string,
  outputFormat?: ExecuteOptions['outputFormat']
): Promise<string | null> {
  if (!outputFormat || outputFormat.type !== 'json_schema') {
    return null;
  }
  if (!outputFormat.schema || typeof outputFormat.schema !== 'object') {
    throw new Error('Codex output schema must be a JSON object.');
  }

  const schemaDir = path.join(cwd, CODEX_INSTRUCTIONS_DIR);
  await secureFs.mkdir(schemaDir, { recursive: true });
  const schemaPath = path.join(schemaDir, OUTPUT_SCHEMA_FILENAME);
  const schemaContent = JSON.stringify(outputFormat.schema, null, OUTPUT_SCHEMA_INDENT_SPACES);
  await secureFs.writeFile(schemaPath, schemaContent, TEXT_ENCODING);
  return schemaPath;
}

type ImageBlock = {
  type: 'image';
  source: {
    type: string;
    media_type: string;
    data: string;
  };
};

function extractImageBlocks(prompt: ExecuteOptions['prompt']): ImageBlock[] {
  if (typeof prompt === 'string') {
    return [];
  }
  if (!Array.isArray(prompt)) {
    return [];
  }

  const images: ImageBlock[] = [];
  for (const block of prompt) {
    if (
      block &&
      typeof block === 'object' &&
      'type' in block &&
      block.type === 'image' &&
      'source' in block &&
      block.source &&
      typeof block.source === 'object' &&
      'data' in block.source &&
      'media_type' in block.source
    ) {
      images.push(block as ImageBlock);
    }
  }
  return images;
}

async function writeImageFiles(cwd: string, imageBlocks: ImageBlock[]): Promise<string[]> {
  if (imageBlocks.length === 0) {
    return [];
  }

  const imageDir = path.join(cwd, CODEX_INSTRUCTIONS_DIR, IMAGE_TEMP_DIR);
  await secureFs.mkdir(imageDir, { recursive: true });

  const imagePaths: string[] = [];
  for (let i = 0; i < imageBlocks.length; i++) {
    const imageBlock = imageBlocks[i];
    const imageName = `${IMAGE_FILE_PREFIX}${Date.now()}-${i}${IMAGE_FILE_EXT}`;
    const imagePath = path.join(imageDir, imageName);

    // Convert base64 to buffer
    const imageData = Buffer.from(imageBlock.source.data, 'base64');
    await secureFs.writeFile(imagePath, imageData);
    imagePaths.push(imagePath);
  }

  return imagePaths;
}

function normalizeIdentifier(value: unknown): string | null {
  if (typeof value === 'string') {
    const trimmed = value.trim();
    return trimmed ? trimmed : null;
  }
  if (typeof value === 'number' && Number.isFinite(value)) {
    return String(value);
  }
  return null;
}

function getIdentifierFromRecord(
  record: Record<string, unknown>,
  keys: readonly string[]
): string | null {
  for (const key of keys) {
    const id = normalizeIdentifier(record[key]);
    if (id) {
      return id;
    }
  }
  return null;
}

function getItemIdentifier(
  event: Record<string, unknown>,
  item: Record<string, unknown>
): string | null {
  return (
    getIdentifierFromRecord(item, ITEM_ID_KEYS) ?? getIdentifierFromRecord(event, EVENT_ID_KEYS)
  );
}

class CodexToolUseTracker {
  private readonly toolUseIdsByItem = new Map<string, string>();
  private readonly anonymousToolUses: string[] = [];
  private sequence = 0;

  register(event: Record<string, unknown>, item: Record<string, unknown>): string {
    const itemId = getItemIdentifier(event, item);
    const toolUseId = this.nextToolUseId();
    if (itemId) {
      this.toolUseIdsByItem.set(itemId, toolUseId);
    } else {
      this.anonymousToolUses.push(toolUseId);
    }
    return toolUseId;
  }

  resolve(event: Record<string, unknown>, item: Record<string, unknown>): string | null {
    const itemId = getItemIdentifier(event, item);
    if (itemId) {
      const toolUseId = this.toolUseIdsByItem.get(itemId);
      if (toolUseId) {
        this.toolUseIdsByItem.delete(itemId);
        return toolUseId;
      }
    }

    if (this.anonymousToolUses.length > 0) {
      return this.anonymousToolUses.shift() || null;
    }

    return null;
  }

  private nextToolUseId(): string {
    this.sequence += 1;
    return `${TOOL_USE_ID_PREFIX}${this.sequence}`;
  }
}

type CodexCliSettings = {
  autoLoadAgents: boolean;
  sandboxMode: CodexSandboxMode;
  approvalPolicy: CodexApprovalPolicy;
  enableWebSearch: boolean;
  enableImages: boolean;
  additionalDirs: string[];
  threadId?: string;
};

function getCodexSettingsDir(): string {
  const configured = getDataDirectory() ?? process.env.DATA_DIR;
  return configured ? path.resolve(configured) : path.resolve(CODEX_SETTINGS_DIR_FALLBACK);
}

async function loadCodexCliSettings(
  overrides?: ExecuteOptions['codexSettings']
): Promise<CodexCliSettings> {
  const defaults: CodexCliSettings = {
    autoLoadAgents: DEFAULT_CODEX_AUTO_LOAD_AGENTS,
    sandboxMode: DEFAULT_CODEX_SANDBOX_MODE,
    approvalPolicy: DEFAULT_CODEX_APPROVAL_POLICY,
    enableWebSearch: false,
    enableImages: true,
    additionalDirs: [],
    threadId: undefined,
  };

  try {
    const settingsService = new SettingsService(getCodexSettingsDir());
    const settings = await settingsService.getGlobalSettings();
    const resolved: CodexCliSettings = {
      autoLoadAgents: settings.codexAutoLoadAgents ?? defaults.autoLoadAgents,
      sandboxMode: settings.codexSandboxMode ?? defaults.sandboxMode,
      approvalPolicy: settings.codexApprovalPolicy ?? defaults.approvalPolicy,
      enableWebSearch: settings.codexEnableWebSearch ?? defaults.enableWebSearch,
      enableImages: settings.codexEnableImages ?? defaults.enableImages,
      additionalDirs: settings.codexAdditionalDirs ?? defaults.additionalDirs,
      threadId: settings.codexThreadId,
    };

    if (!overrides) {
      return resolved;
    }

    return {
      autoLoadAgents: overrides.autoLoadAgents ?? resolved.autoLoadAgents,
      sandboxMode: overrides.sandboxMode ?? resolved.sandboxMode,
      approvalPolicy: overrides.approvalPolicy ?? resolved.approvalPolicy,
      enableWebSearch: overrides.enableWebSearch ?? resolved.enableWebSearch,
      enableImages: overrides.enableImages ?? resolved.enableImages,
      additionalDirs: overrides.additionalDirs ?? resolved.additionalDirs,
      threadId: overrides.threadId ?? resolved.threadId,
    };
  } catch {
    return {
      autoLoadAgents: overrides?.autoLoadAgents ?? defaults.autoLoadAgents,
      sandboxMode: overrides?.sandboxMode ?? defaults.sandboxMode,
      approvalPolicy: overrides?.approvalPolicy ?? defaults.approvalPolicy,
      enableWebSearch: overrides?.enableWebSearch ?? defaults.enableWebSearch,
      enableImages: overrides?.enableImages ?? defaults.enableImages,
      additionalDirs: overrides?.additionalDirs ?? defaults.additionalDirs,
      threadId: overrides?.threadId ?? defaults.threadId,
    };
  }
}

function buildCodexInstructionsPrompt(
  filePath: string,
  content: string,
  sourceLabel: string
): string {
  return `## ${CODEX_INSTRUCTIONS_SECTION}\n**${CODEX_INSTRUCTIONS_SOURCE_LABEL}:** ${sourceLabel}\n**${CODEX_INSTRUCTIONS_PATH_LABEL}:** \`${filePath}\`\n\n${content}`;
}

async function readCodexInstructionFile(filePath: string): Promise<string | null> {
  try {
    const raw = await secureFs.readFile(filePath, TEXT_ENCODING);
    const content = String(raw).trim();
    return content ? content : null;
  } catch {
    return null;
  }
}

async function loadCodexInstructions(cwd: string, enabled: boolean): Promise<string | null> {
  if (!enabled) {
    return null;
  }

  const sources: Array<{ path: string; content: string; sourceLabel: string }> = [];
  const userInstructionsPath = path.join(getCodexConfigDir(), CODEX_USER_INSTRUCTIONS_FILE);
  const userContent = await readCodexInstructionFile(userInstructionsPath);
  if (userContent) {
    sources.push({
      path: userInstructionsPath,
      content: userContent,
      sourceLabel: CODEX_INSTRUCTIONS_USER_SOURCE,
    });
  }

  for (const fileName of CODEX_PROJECT_INSTRUCTIONS_FILES) {
    const projectPath = path.join(cwd, CODEX_INSTRUCTIONS_DIR, fileName);
    const projectContent = await readCodexInstructionFile(projectPath);
    if (projectContent) {
      sources.push({
        path: projectPath,
        content: projectContent,
        sourceLabel: CODEX_INSTRUCTIONS_PROJECT_SOURCE,
      });
    }
  }

  if (sources.length === 0) {
    return null;
  }

  const seen = new Set<string>();
  const uniqueSources = sources.filter((source) => {
    const normalized = source.content.trim();
    if (seen.has(normalized)) {
      return false;
    }
    seen.add(normalized);
    return true;
  });

  return uniqueSources
    .map((source) => buildCodexInstructionsPrompt(source.path, source.content, source.sourceLabel))
    .join('\n\n');
}

const logger = createLogger('CodexProvider');

export class CodexProvider extends BaseProvider {
  getName(): string {
    return 'codex';
  }

  async *executeQuery(options: ExecuteOptions): AsyncGenerator<ProviderMessage> {
    // Validate that model doesn't have a provider prefix
    // AgentService should strip prefixes before passing to providers
    validateBareModelId(options.model, 'CodexProvider');

    try {
      const mcpServers = options.mcpServers ?? {};
      const hasMcpServers = Object.keys(mcpServers).length > 0;
      const codexSettings = await loadCodexCliSettings(options.codexSettings);
      const codexInstructions = await loadCodexInstructions(
        options.cwd,
        codexSettings.autoLoadAgents
      );
      const baseSystemPrompt = resolveSystemPrompt(options.systemPrompt);
      const resolvedMaxTurns = resolveMaxTurns(options.maxTurns);
      const resolvedAllowedTools = options.allowedTools ?? Array.from(DEFAULT_ALLOWED_TOOLS);
      const restrictTools = !hasMcpServers || options.mcpUnrestrictedTools === false;
      const wantsOutputSchema = Boolean(
        options.outputFormat && options.outputFormat.type === 'json_schema'
      );
      const constraintsPrompt = buildCodexConstraintsPrompt(options, {
        allowedTools: resolvedAllowedTools,
        restrictTools,
        maxTurns: resolvedMaxTurns,
        hasOutputSchema: wantsOutputSchema,
      });
      const systemPromptParts = [codexInstructions, baseSystemPrompt, constraintsPrompt].filter(
        (part): part is string => Boolean(part)
      );
      const combinedSystemPrompt = systemPromptParts.length
        ? systemPromptParts.join(SYSTEM_PROMPT_SEPARATOR)
        : null;

      const executionPlan = await resolveCodexExecutionPlan(options);
      if (executionPlan.mode === CODEX_EXECUTION_MODE_SDK) {
        const cleanupEnv = executionPlan.openAiApiKey
          ? createTempEnvOverride({ [OPENAI_API_KEY_ENV]: executionPlan.openAiApiKey })
          : null;
        try {
          yield* executeCodexSdkQuery(options, combinedSystemPrompt);
        } finally {
          cleanupEnv?.();
        }
        return;
      }

      if (hasMcpServers) {
        const configManager = new CodexConfigManager();
        await configManager.configureMcpServers(options.cwd, options.mcpServers!);
      }

      const toolUseTracker = new CodexToolUseTracker();
      const sandboxCheck = checkSandboxCompatibility(
        options.cwd,
        codexSettings.sandboxMode !== 'danger-full-access'
      );
      const resolvedSandboxMode = sandboxCheck.enabled
        ? codexSettings.sandboxMode
        : 'danger-full-access';
      if (!sandboxCheck.enabled && sandboxCheck.message) {
        console.warn(`[CodexProvider] ${sandboxCheck.message}`);
      }
      const searchEnabled =
        codexSettings.enableWebSearch || resolveSearchEnabled(resolvedAllowedTools, restrictTools);
      const outputSchemaPath = await writeOutputSchemaFile(options.cwd, options.outputFormat);
      const imageBlocks = codexSettings.enableImages ? extractImageBlocks(options.prompt) : [];
      const imagePaths = await writeImageFiles(options.cwd, imageBlocks);
      const approvalPolicy =
        hasMcpServers && options.mcpAutoApproveTools !== undefined
          ? options.mcpAutoApproveTools
            ? 'never'
            : 'on-request'
          : codexSettings.approvalPolicy;
      const promptText = buildCombinedPrompt(options, combinedSystemPrompt);
      const commandPath = executionPlan.cliPath || CODEX_COMMAND;

      // Build config overrides for max turns and reasoning effort
      const overrides: Array<{ key: string; value: string | number | boolean }> = [];
      if (resolvedMaxTurns !== null) {
        overrides.push({ key: CONFIG_KEY_MAX_TURNS, value: resolvedMaxTurns });
      }

      // Add reasoning effort if model supports it and reasoningEffort is specified
      if (
        options.reasoningEffort &&
        supportsReasoningEffort(options.model) &&
        options.reasoningEffort !== 'none'
      ) {
        overrides.push({ key: CODEX_REASONING_EFFORT_KEY, value: options.reasoningEffort });
      }

      // Add approval policy
      overrides.push({ key: 'approval_policy', value: approvalPolicy });

      // Add web search if enabled
      if (searchEnabled) {
        overrides.push({ key: 'features.web_search_request', value: true });
      }

      const configOverrides = buildConfigOverrides(overrides);
      const preExecArgs: string[] = [];

      // Add additional directories with write access
      if (codexSettings.additionalDirs && codexSettings.additionalDirs.length > 0) {
        for (const dir of codexSettings.additionalDirs) {
          preExecArgs.push(CODEX_ADD_DIR_FLAG, dir);
        }
      }

      // Model is already bare (no prefix) - validated by executeQuery
      const args = [
        CODEX_CONFIG_FLAG,
        CODEX_COMPAT_MODEL_REASONING_EFFORT,
        CODEX_EXEC_SUBCOMMAND,
        CODEX_YOLO_FLAG,
        CODEX_SKIP_GIT_REPO_CHECK_FLAG,
        ...preExecArgs,
        CODEX_MODEL_FLAG,
        options.model,
        CODEX_JSON_FLAG,
        '-', // Read prompt from stdin to avoid shell escaping issues
      ];

      const envOverrides = buildEnv();
      if (executionPlan.openAiApiKey && !envOverrides[OPENAI_API_KEY_ENV]) {
        envOverrides[OPENAI_API_KEY_ENV] = executionPlan.openAiApiKey;
      }

      // Calculate dynamic timeout based on reasoning effort.
      // Higher reasoning effort (e.g., 'xhigh' for "xtra thinking" mode) requires more time
      // for the model to generate reasoning tokens before producing output.
      // This fixes GitHub issue #530 where features would get stuck with reasoning models.
      //
      // For feature generation with 'xhigh', use the extended 5-minute base timeout
      // since generating 50+ features takes significantly longer than normal operations.
      const baseTimeout =
        options.reasoningEffort === 'xhigh'
          ? CODEX_FEATURE_GENERATION_BASE_TIMEOUT_MS
          : CODEX_CLI_TIMEOUT_MS;
      const timeout = calculateReasoningTimeout(options.reasoningEffort, baseTimeout);

      const stream = spawnJSONLProcess({
        command: commandPath,
        args,
        cwd: options.cwd,
        env: envOverrides,
        abortController: options.abortController,
        timeout,
        stdinData: promptText, // Pass prompt via stdin
      });

      let latestTokenUsage: ProviderTokenUsage | undefined;
      let latestTurnLastTokenUsage: ProviderTokenUsage | undefined;

      for await (const rawEvent of stream) {
        const event = rawEvent as Record<string, unknown>;
        const eventType = getEventType(event);
        if (eventType === CODEX_EVENT_TYPES.turnStarted) {
          latestTurnLastTokenUsage = undefined;
        }

        const eventUsageMatch = extractCodexTokenUsage(event);
        const eventUsage = eventUsageMatch?.usage;
        const eventUsageSource = eventUsageMatch?.source;
        if (eventUsage) {
          if (eventUsageSource === 'last') {
            latestTurnLastTokenUsage = eventUsage;
            latestTokenUsage = eventUsage;
          } else if (!(eventType === CODEX_EVENT_TYPES.turnCompleted && latestTurnLastTokenUsage)) {
            // codex exec can expose cumulative usage on turn.completed; keep
            // the last turn-scoped usage when available for context tracking.
            latestTokenUsage = eventUsage;
          }
        }

        // Track thread/session ID from events
        const threadId = event.thread_id;
        if (threadId && typeof threadId === 'string') {
          this._lastSessionId = threadId;
        }

        if (eventType === CODEX_EVENT_TYPES.error) {
          const rawErrorText = extractText(event.error ?? event.message) || 'Codex CLI error';
          const errorText = sanitizeCodexOutput(rawErrorText);
          if (!errorText) {
            logger.warn(
              '[CodexProvider] Suppressed in-process stream lag warning from chat output',
              {
                errorText: rawErrorText,
              }
            );
            continue;
          }
          const exitCodeMatch = errorText.match(/^Process exited with code (\d+)$/i);

          // Enhance error message with helpful context
          let enhancedError = errorText;
          if (exitCodeMatch) {
            const exitCode = exitCodeMatch[1];
            enhancedError = [
              `Codex wurde mit Code ${exitCode} beendet.`,
              'Was das für dich bedeutet: Dieser Task wurde vor der fertigen Antwort abgebrochen.',
              'Technische Details: Die Codex-CLI hat keinen genaueren Fehlertext geschickt.',
              'Häufige Gründe sind Login-Probleme, Tool-Fehler oder ein interner CLI-Abbruch.',
            ].join('\n\n');
          } else if (errorText.toLowerCase().includes('rate limit')) {
            enhancedError = `${errorText}\n\nTip: You're being rate limited. Try reducing concurrent tasks or waiting a few minutes before retrying.`;
          } else if (
            errorText.toLowerCase().includes('authentication') ||
            errorText.toLowerCase().includes('unauthorized')
          ) {
            enhancedError = `${errorText}\n\nTip: Check that your OPENAI_API_KEY is set correctly or run 'codex auth login' to authenticate.`;
          } else if (
            errorText.toLowerCase().includes('not found') ||
            errorText.toLowerCase().includes('command not found')
          ) {
            enhancedError = `${errorText}\n\nTip: Make sure the Codex CLI is installed. Run 'npm install -g @openai/codex-cli' to install.`;
          }

          console.error('[CodexProvider] CLI error event:', { errorText, event });
          yield { type: 'error', error: enhancedError };
          continue;
        }

        if (eventType === CODEX_EVENT_TYPES.turnCompleted) {
          const resultTextRaw = extractText(event.result);
          const resultText = resultTextRaw
            ? sanitizeCodexOutput(resultTextRaw) || undefined
            : undefined;
          const usage =
            eventUsageSource === 'last'
              ? eventUsage
              : (latestTurnLastTokenUsage ?? eventUsage ?? latestTokenUsage);
          yield { type: 'result', subtype: 'success', result: resultText, usage };
          latestTurnLastTokenUsage = undefined;
          continue;
        }

        if (!eventType) {
          const fallbackTextRaw = extractText(event);
          const fallbackText = fallbackTextRaw ? sanitizeCodexOutput(fallbackTextRaw) : null;
          if (fallbackText) {
            yield {
              type: 'assistant',
              usage: latestTokenUsage,
              message: {
                role: 'assistant',
                content: [{ type: 'text', text: fallbackText }],
              },
            };
          } else if (fallbackTextRaw && isIgnorableCodexLagOutput(fallbackTextRaw)) {
            logger.warn(
              '[CodexProvider] Suppressed in-process stream lag warning from fallback event'
            );
          }
          continue;
        }

        const item = (event.item ?? {}) as Record<string, unknown>;
        const itemType = extractItemType(item);

        if (
          eventType === CODEX_EVENT_TYPES.itemStarted &&
          itemType === CODEX_ITEM_TYPES.commandExecution
        ) {
          const commandText = extractCommandText(item) || '';
          const tool = resolveCodexToolCall(commandText);
          const toolUseId = toolUseTracker.register(event, item);
          yield {
            type: 'assistant',
            usage: latestTokenUsage,
            message: {
              role: 'assistant',
              content: [
                {
                  type: 'tool_use',
                  name: tool.name,
                  input: tool.input,
                  tool_use_id: toolUseId,
                },
              ],
            },
          };
          continue;
        }

        if (eventType === CODEX_EVENT_TYPES.itemUpdated && itemType === CODEX_ITEM_TYPES.todoList) {
          const todos = extractCodexTodoItems(item);
          if (todos) {
            yield {
              type: 'assistant',
              usage: latestTokenUsage,
              message: {
                role: 'assistant',
                content: [
                  {
                    type: 'tool_use',
                    name: getCodexTodoToolName(),
                    input: { todos },
                  },
                ],
              },
            };
          } else {
            const todoText = extractText(item) || '';
            const formatted = todoText ? `Updated TODO list:\n${todoText}` : 'Updated TODO list';
            yield {
              type: 'assistant',
              usage: latestTokenUsage,
              message: {
                role: 'assistant',
                content: [{ type: 'text', text: formatted }],
              },
            };
          }
          continue;
        }

        if (eventType === CODEX_EVENT_TYPES.itemCompleted) {
          if (itemType === CODEX_ITEM_TYPES.reasoning) {
            const thinkingRaw = extractText(item) || '';
            const thinkingText = sanitizeCodexOutput(thinkingRaw) || '';
            if (!thinkingText) {
              continue;
            }
            yield {
              type: 'assistant',
              usage: latestTokenUsage,
              message: {
                role: 'assistant',
                content: [{ type: 'thinking', thinking: thinkingText }],
              },
            };
            continue;
          }

          if (itemType === CODEX_ITEM_TYPES.commandExecution) {
            const commandOutputRaw =
              extractCommandOutput(item) ?? extractCommandText(item) ?? extractText(item) ?? '';
            const commandOutput = sanitizeCodexOutput(commandOutputRaw) || '';
            if (commandOutput) {
              const toolUseId = toolUseTracker.resolve(event, item);
              const toolResultBlock: {
                type: 'tool_result';
                content: string;
                tool_use_id?: string;
              } = { type: 'tool_result', content: commandOutput };
              if (toolUseId) {
                toolResultBlock.tool_use_id = toolUseId;
              }
              yield {
                type: 'assistant',
                usage: latestTokenUsage,
                message: {
                  role: 'assistant',
                  content: [toolResultBlock],
                },
              };
            } else if (commandOutputRaw && isIgnorableCodexLagOutput(commandOutputRaw)) {
              logger.warn(
                '[CodexProvider] Suppressed in-process stream lag warning from command output event'
              );
            }
            continue;
          }

          const textRaw = extractText(item) || extractText(event);
          const text = textRaw ? sanitizeCodexOutput(textRaw) : null;
          if (text) {
            yield {
              type: 'assistant',
              usage: latestTokenUsage,
              message: {
                role: 'assistant',
                content: [{ type: 'text', text }],
              },
            };
          } else if (textRaw && isIgnorableCodexLagOutput(textRaw)) {
            logger.warn(
              '[CodexProvider] Suppressed in-process stream lag warning from item-completed event'
            );
          }
        }
      }
    } catch (error) {
      const errorInfo = classifyError(error);
      const userMessage = getUserFriendlyErrorMessage(error);
      const enhancedMessage = errorInfo.isRateLimit
        ? `${userMessage}\n\nTip: If you're rate limited, try reducing concurrent tasks or waiting a few minutes.`
        : userMessage;

      console.error('[CodexProvider] executeQuery() error:', {
        type: errorInfo.type,
        message: errorInfo.message,
        isRateLimit: errorInfo.isRateLimit,
        retryAfter: errorInfo.retryAfter,
        stack: error instanceof Error ? error.stack : undefined,
      });

      yield { type: 'error', error: enhancedMessage };
    }
  }

  async detectInstallation(): Promise<InstallationStatus> {
    const cliPath = await findCodexCliPath();
    const hasApiKey = Boolean(await resolveOpenAiApiKey());
    const authIndicators = await getCodexAuthIndicators();
    const installed = !!cliPath;

    let version = '';
    if (installed) {
      try {
        const result = await spawnProcess({
          command: cliPath || CODEX_COMMAND,
          args: [CODEX_VERSION_FLAG],
          cwd: process.cwd(),
        });
        version = result.stdout.trim();
      } catch (error) {
        version = '';
      }
    }

    // Determine auth status - always verify with CLI, never assume authenticated
    const authCheck = await checkCodexAuthentication(cliPath);
    const authenticated = authCheck.authenticated;

    return {
      installed,
      path: cliPath || undefined,
      version: version || undefined,
      method: 'cli' as const, // Installation method
      hasApiKey,
      authenticated,
    };
  }

  getAvailableModels(): ModelDefinition[] {
    // Return all available Codex/OpenAI models
    return CODEX_MODELS;
  }

  /**
   * Check authentication status for Codex CLI
   */
  async checkAuth(): Promise<CodexAuthStatus> {
    const cliPath = await findCodexCliPath();
    const hasApiKey = Boolean(await resolveOpenAiApiKey());
    const authIndicators = await getCodexAuthIndicators();

    // Check for API key in environment
    if (hasApiKey) {
      return { authenticated: true, method: 'api_key' };
    }

    // Check for OAuth/token from Codex CLI
    if (authIndicators.hasOAuthToken || authIndicators.hasApiKey) {
      return { authenticated: true, method: 'oauth' };
    }

    // CLI is installed but not authenticated via indicators - try CLI command
    if (cliPath) {
      try {
        // Try 'codex login status' first (same as checkCodexAuthentication)
        const result = await spawnProcess({
          command: cliPath || CODEX_COMMAND,
          args: [CODEX_CONFIG_FLAG, CODEX_COMPAT_MODEL_REASONING_EFFORT, 'login', 'status'],
          cwd: process.cwd(),
          env: {
            ...process.env,
            TERM: 'dumb',
          },
        });

        // Check both stdout and stderr - Codex CLI outputs to stderr
        const combinedOutput = (result.stdout + result.stderr).toLowerCase();
        const isLoggedIn = combinedOutput.includes('logged in');

        if (result.exitCode === 0 && isLoggedIn) {
          return { authenticated: true, method: 'oauth' };
        }
      } catch (error) {
        logger.warn('Error running login status command during auth check:', error);
      }
    }

    return { authenticated: false, method: 'none' };
  }

  /**
   * Get the detected CLI path (public accessor for status endpoints)
   */
  async getCliPath(): Promise<string | null> {
    const path = await findCodexCliPath();
    return path || null;
  }

  /**
   * Get the last CLI session ID (for tracking across queries)
   * This can be used to resume sessions in subsequent requests
   */
  getLastSessionId(): string | null {
    return this._lastSessionId ?? null;
  }

  /**
   * Set a session ID to use for CLI session resumption
   */
  setSessionId(sessionId: string | null): void {
    this._lastSessionId = sessionId;
  }

  private _lastSessionId: string | null = null;
}
