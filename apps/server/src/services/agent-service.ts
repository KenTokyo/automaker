/**
 * Agent Service - Runs AI agents via provider architecture
 * Manages conversation sessions and streams responses via WebSocket
 */

import path from 'path';
import * as secureFs from '../lib/secure-fs.js';
import type { EventEmitter } from '../lib/events.js';
import type {
  ExecuteOptions,
  ThinkingLevel,
  ReasoningEffort,
  ProviderMessage,
  ProviderTokenUsage,
  SessionSignal,
} from '@automaker/types';
import { stripProviderPrefix, detectSessionSignal } from '@automaker/types';
import {
  initLogger as initEvlogLogger,
  createRequestLogger as createEvlogRequestLogger,
} from 'evlog';
import {
  readImageAsBase64,
  buildPromptWithImages,
  isAbortError,
  loadContextFiles,
  createLogger,
  classifyError,
  getUserFriendlyErrorMessage,
  atomicWriteJson,
  readJsonWithRecovery,
  logRecoveryWarning,
  DEFAULT_BACKUP_COUNT,
} from '@automaker/utils';
import { isFirstMessage, prependTitleInstruction, parseSessionInfo } from '../lib/session-title.js';
import { ProviderFactory } from '../providers/provider-factory.js';
import { createChatOptions, validateWorkingDirectory } from '../lib/sdk-options.js';
import { PathNotAllowedError } from '@automaker/platform';
import { getCompletedTaskCapturePrompt } from '@automaker/prompts';
import type { SettingsService } from './settings-service.js';
import {
  getAutoLoadClaudeMdSetting,
  filterClaudeMdFromContext,
  getMCPServersFromSettings,
  getPromptCustomization,
  getSkillsConfiguration,
  getSubagentsConfiguration,
  getCustomSubagents,
  getProviderByModelId,
} from '../lib/settings-helpers.js';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  images?: Array<{
    data: string;
    mimeType: string;
    filename: string;
    savedPath?: string;
  }>;
  timestamp: string;
  isError?: boolean;
  tokenUsage?: ProviderTokenUsage;
}

interface QueuedPrompt {
  id: string;
  message: string;
  imagePaths?: string[];
  model?: string;
  thinkingLevel?: ThinkingLevel;
  reasoningEffort?: ReasoningEffort;
  addedAt: string;
}

type SessionSourceType = 'manual' | 'orchestrator' | 'subagent';
type StopExecutionReason = 'manual' | 'time_limit';

interface Session {
  messages: Message[];
  isRunning: boolean;
  wasStopped: boolean; // Tracks if the session was interrupted before normal completion
  stopReason?: StopExecutionReason;
  abortController: AbortController | null;
  workingDirectory: string;
  model?: string;
  thinkingLevel?: ThinkingLevel; // Thinking level for Claude models
  reasoningEffort?: ReasoningEffort; // Reasoning effort for Codex models
  sdkSessionId?: string; // Claude SDK session ID for conversation continuity
  promptQueue: QueuedPrompt[]; // Queue of prompts to auto-run after current task
}

interface SessionMetadata {
  id: string;
  name: string;
  description?: string;
  projectPath?: string;
  workingDirectory: string;
  createdAt: string;
  updatedAt: string;
  archived?: boolean;
  isDirty?: boolean; // Session completed work that hasn't been reviewed yet
  tags?: string[];
  model?: string;
  thinkingLevel?: ThinkingLevel; // Thinking level for Claude models
  reasoningEffort?: ReasoningEffort; // Reasoning effort for Codex models
  orchestratorRunId?: string;
  sourceType?: SessionSourceType;
  parentSessionId?: string;
  parentToolUseId?: string;
  sdkSessionId?: string; // Claude SDK session ID for conversation continuity
  totalElapsedMs?: number; // Accumulated running time in milliseconds
  lastStartedAt?: string; // ISO timestamp of when the session last started running
  messageCount?: number; // Cached count for fast session list rendering
  preview?: string; // Cached preview for fast session list rendering
  lastError?: string; // Cached last error preview for fast session list rendering
  lastSignal?: SessionSignal; // Cached signal from last AI message (ALL_PHASES_COMPLETE, QUESTION)
  stopReason?: StopExecutionReason;
}

interface ActiveSubagentSessionState {
  childSessionId: string;
  parentSessionId: string;
  runInBackground: boolean;
  agentType: string;
  description: string;
  model?: string;
  startedAt: string;
  elapsedSeconds: number;
}

type AiCallOutcome = 'success' | 'error' | 'aborted';

interface AiCallWideEventParams {
  requestId: string;
  sessionId: string;
  provider: string;
  model: string;
  thinkingLevel?: ThinkingLevel;
  reasoningEffort?: ReasoningEffort;
  imageCount: number;
  startedAtMs: number;
  firstChunkAtMs: number | null;
  endedAtMs: number;
  stepCount: number;
  toolUses: Array<{ name: string; input: unknown }>;
  usage: ProviderTokenUsage | null;
  outcome: AiCallOutcome;
  status: number;
  errorMessage?: string;
}

function getLastErrorPreview(content: string | undefined): string | undefined {
  if (!content) return undefined;
  const normalized = content.replace(/^Error:\s*/i, '').trim();
  return normalized || undefined;
}

function buildSessionSummary(
  messages: Message[],
  isOrchestratorSession = false
): Pick<SessionMetadata, 'messageCount' | 'preview' | 'lastError' | 'lastSignal'> {
  const lastMessage = messages[messages.length - 1];
  const lastError = lastMessage?.isError ? getLastErrorPreview(lastMessage.content) : undefined;

  // Detect signal from the last assistant message
  const lastAssistantMessage = [...messages].reverse().find((m) => m.role === 'assistant');
  const lastSignal = detectSessionSignal(lastAssistantMessage?.content, isOrchestratorSession);

  return {
    messageCount: messages.length,
    preview: lastMessage?.content?.slice(0, 100) || '',
    lastError,
    lastSignal,
  };
}

/**
 * Recover a JSON object when the file has valid JSON at the beginning plus
 * trailing garbage content (e.g. interrupted/overlapping writes).
 */
function recoverMetadataFromCorruptedContent(
  rawContent: string
): Record<string, SessionMetadata> | null {
  let inString = false;
  let escaped = false;
  let depth = 0;
  let started = false;

  for (let index = 0; index < rawContent.length; index += 1) {
    const character = rawContent[index];

    if (escaped) {
      escaped = false;
      continue;
    }

    if (character === '\\' && inString) {
      escaped = true;
      continue;
    }

    if (character === '"') {
      inString = !inString;
      continue;
    }

    if (inString) {
      continue;
    }

    if (character === '{') {
      depth += 1;
      started = true;
      continue;
    }

    if (character !== '}') {
      continue;
    }

    depth -= 1;

    if (!started || depth !== 0) {
      continue;
    }

    const candidate = rawContent.slice(0, index + 1).trim();
    try {
      const parsed = JSON.parse(candidate) as unknown;
      if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
        return parsed as Record<string, SessionMetadata>;
      }
      return null;
    } catch {
      return null;
    }
  }

  return null;
}

const INPUT_TOKEN_KEYS = ['inputTokens', 'input_tokens', 'promptTokens', 'prompt_tokens'] as const;
const OUTPUT_TOKEN_KEYS = [
  'outputTokens',
  'output_tokens',
  'completionTokens',
  'completion_tokens',
] as const;
const TOTAL_TOKEN_KEYS = ['totalTokens', 'total_tokens', 'tokenCount', 'token_count'] as const;
const CACHE_READ_TOKEN_KEYS = [
  'cacheReadInputTokens',
  'cache_read_input_tokens',
  'cachedInputTokens',
  'cached_input_tokens',
] as const;
const CACHE_CREATE_TOKEN_KEYS = [
  'cacheCreationInputTokens',
  'cache_creation_input_tokens',
  'cacheWriteInputTokens',
  'cache_write_input_tokens',
] as const;
const REASONING_TOKEN_KEYS = [
  'reasoningTokens',
  'reasoning_tokens',
  'reasoningOutputTokens',
  'reasoning_output_tokens',
] as const;
const EVLOG_DEFAULT_SERVICE_NAME = 'automaker-server';
const EVLOG_AGENT_METHOD = 'POST';
const EVLOG_AGENT_PATH = '/api/agent/send';
const DEFAULT_AI_STEP_COUNT = 1;
const DEFAULT_LOG_STATUS_SUCCESS = 200;
const DEFAULT_LOG_STATUS_ERROR = 500;
const DEFAULT_LOG_STATUS_ABORTED = 499;
const TOKENS_PER_SECOND_DECIMALS = 2;
let evlogInitialized = false;

function ensureEvlogInitialized(): void {
  if (evlogInitialized) {
    return;
  }

  initEvlogLogger({
    env: {
      service: process.env.EVLOG_SERVICE_NAME || EVLOG_DEFAULT_SERVICE_NAME,
      environment: process.env.NODE_ENV || 'development',
      version: process.env.npm_package_version,
    },
    silent: process.env.EVLOG_SILENT === 'true',
  });
  evlogInitialized = true;
}

function resolveUsageTotalTokens(usage: ProviderTokenUsage | null): number {
  if (!usage) return 0;
  if (typeof usage.totalTokens === 'number' && usage.totalTokens > 0) {
    return usage.totalTokens;
  }

  return (
    (usage.inputTokens ?? 0) +
    (usage.outputTokens ?? 0) +
    (usage.cacheReadInputTokens ?? 0) +
    (usage.cacheCreationInputTokens ?? 0) +
    (usage.reasoningTokens ?? 0)
  );
}

function resolveTokensPerSecond(
  outputTokens: number | undefined,
  msToFinish: number,
  msToFirstChunk?: number
): number | undefined {
  if (!outputTokens || outputTokens <= 0) {
    return undefined;
  }

  const streamDurationMs =
    typeof msToFirstChunk === 'number' && msToFinish > msToFirstChunk
      ? msToFinish - msToFirstChunk
      : msToFinish;
  if (streamDurationMs <= 0) {
    return undefined;
  }

  const tokensPerSecond = outputTokens / (streamDurationMs / 1000);
  if (!Number.isFinite(tokensPerSecond) || tokensPerSecond <= 0) {
    return undefined;
  }

  return Number(tokensPerSecond.toFixed(TOKENS_PER_SECOND_DECIMALS));
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

function readTokenCount(
  record: Record<string, unknown>,
  keys: readonly string[]
): number | undefined {
  for (const key of keys) {
    const count = toTokenCount(record[key]);
    if (typeof count === 'number') {
      return count;
    }
  }
  return undefined;
}

function normalizeProviderTokenUsage(rawUsage: unknown): ProviderTokenUsage | null {
  const record = asRecord(rawUsage);
  if (!record) return null;

  const inputTokens = readTokenCount(record, INPUT_TOKEN_KEYS);
  const outputTokens = readTokenCount(record, OUTPUT_TOKEN_KEYS);
  const explicitTotalTokens = readTokenCount(record, TOTAL_TOKEN_KEYS);
  const cacheReadInputTokens = readTokenCount(record, CACHE_READ_TOKEN_KEYS);
  const cacheCreationInputTokens = readTokenCount(record, CACHE_CREATE_TOKEN_KEYS);
  const reasoningTokens = readTokenCount(record, REASONING_TOKEN_KEYS);

  const fallbackTotal =
    (inputTokens ?? 0) +
    (outputTokens ?? 0) +
    (cacheReadInputTokens ?? 0) +
    (cacheCreationInputTokens ?? 0);
  const totalTokens = explicitTotalTokens ?? (fallbackTotal > 0 ? fallbackTotal : undefined);

  if (
    !inputTokens &&
    !outputTokens &&
    !totalTokens &&
    !cacheReadInputTokens &&
    !cacheCreationInputTokens &&
    !reasoningTokens
  ) {
    return null;
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

function extractTokenUsageFromProviderMessage(message: ProviderMessage): ProviderTokenUsage | null {
  const direct = normalizeProviderTokenUsage(message.usage);
  if (direct) return direct;

  const messageRecord = asRecord(message);
  if (!messageRecord) return null;

  const nestedMessage = asRecord(messageRecord.message);
  if (nestedMessage) {
    const nestedUsage = normalizeProviderTokenUsage(nestedMessage.usage);
    if (nestedUsage) return nestedUsage;
  }

  const nestedUsage = normalizeProviderTokenUsage(messageRecord.usage);
  if (nestedUsage) return nestedUsage;

  const tokenUsage = normalizeProviderTokenUsage(messageRecord.token_usage);
  if (tokenUsage) return tokenUsage;

  const camelTokenUsage = normalizeProviderTokenUsage(messageRecord.tokenUsage);
  if (camelTokenUsage) return camelTokenUsage;

  return normalizeProviderTokenUsage(messageRecord);
}

export class AgentService {
  private sessions = new Map<string, Session>();
  private activeSubagentSessions = new Map<string, ActiveSubagentSessionState>();
  private stateDir: string;
  private metadataFile: string;
  private events: EventEmitter;
  private settingsService: SettingsService | null = null;
  private logger = createLogger('AgentService');

  constructor(dataDir: string, events: EventEmitter, settingsService?: SettingsService) {
    this.stateDir = path.join(dataDir, 'agent-sessions');
    this.metadataFile = path.join(dataDir, 'sessions-metadata.json');
    this.events = events;
    this.settingsService = settingsService ?? null;
  }

  async initialize(): Promise<void> {
    await secureFs.mkdir(this.stateDir, { recursive: true });
  }

  /**
   * Start or resume a conversation
   */
  async startConversation({
    sessionId,
    workingDirectory,
  }: {
    sessionId: string;
    workingDirectory?: string;
  }) {
    if (!this.sessions.has(sessionId)) {
      const messages = await this.loadSession(sessionId);
      const metadata = await this.loadMetadata();
      const sessionMetadata = metadata[sessionId];

      // Determine the effective working directory
      const effectiveWorkingDirectory = workingDirectory || process.cwd();
      const resolvedWorkingDirectory = path.resolve(effectiveWorkingDirectory);

      // Validate that the working directory is allowed using centralized validation
      validateWorkingDirectory(resolvedWorkingDirectory);

      // Load persisted queue
      const promptQueue = await this.loadQueueState(sessionId);

      this.sessions.set(sessionId, {
        messages,
        isRunning: false,
        wasStopped: false,
        stopReason: sessionMetadata?.stopReason,
        abortController: null,
        workingDirectory: resolvedWorkingDirectory,
        model: sessionMetadata?.model,
        thinkingLevel: sessionMetadata?.thinkingLevel,
        reasoningEffort: sessionMetadata?.reasoningEffort,
        sdkSessionId: sessionMetadata?.sdkSessionId, // Load persisted SDK session ID
        promptQueue,
      });
    }

    const session = this.sessions.get(sessionId)!;
    return {
      success: true,
      messages: session.messages,
      sessionId,
    };
  }

  /**
   * Send a message to the agent and stream responses
   */
  async sendMessage({
    sessionId,
    message,
    workingDirectory,
    imagePaths,
    model,
    thinkingLevel,
    reasoningEffort,
  }: {
    sessionId: string;
    message: string;
    workingDirectory?: string;
    imagePaths?: string[];
    model?: string;
    thinkingLevel?: ThinkingLevel;
    reasoningEffort?: ReasoningEffort;
  }) {
    const session = this.sessions.get(sessionId);
    if (!session) {
      this.logger.error('ERROR: Session not found:', sessionId);
      throw new Error(`Session ${sessionId} not found`);
    }

    if (session.isRunning) {
      this.logger.error('ERROR: Agent already running for session:', sessionId);
      throw new Error('Agent is already processing a message');
    }

    // Update session model, thinking level, and reasoning effort if provided
    if (model) {
      session.model = model;
      await this.updateSession(sessionId, { model });
    }
    if (thinkingLevel !== undefined) {
      session.thinkingLevel = thinkingLevel;
      await this.updateSession(sessionId, { thinkingLevel });
    }
    if (reasoningEffort !== undefined) {
      session.reasoningEffort = reasoningEffort;
      await this.updateSession(sessionId, { reasoningEffort });
    }

    // Validate vision support before processing images
    const effectiveModel = model || session.model;
    if (imagePaths && imagePaths.length > 0 && effectiveModel) {
      const supportsVision = ProviderFactory.modelSupportsVision(effectiveModel);
      if (!supportsVision) {
        throw new Error(
          `This model (${effectiveModel}) does not support image input. ` +
            `Please switch to a model that supports vision, or remove the images and try again.`
        );
      }
    }

    // Reserve the session immediately so a second send can't sneak in
    // while we are still loading images or building prompt context.
    session.isRunning = true;
    session.wasStopped = false;
    session.stopReason = undefined;
    session.abortController = new AbortController();

    // Track elapsed time: record when this run started
    await this.updateSession(sessionId, {
      lastStartedAt: new Date().toISOString(),
      stopReason: undefined,
    });

    // Read images and convert to base64
    const images: Message['images'] = [];
    if (imagePaths && imagePaths.length > 0) {
      for (const imagePath of imagePaths) {
        try {
          const imageData = await readImageAsBase64(imagePath);
          images.push({
            data: imageData.base64,
            mimeType: imageData.mimeType,
            filename: imageData.filename,
            savedPath: imagePath,
          });
        } catch (error) {
          this.logger.error(`Failed to load image ${imagePath}:`, error);
        }
      }
    }

    // Add user message
    const userMessage: Message = {
      id: this.generateId(),
      role: 'user',
      content: message,
      images: images.length > 0 ? images : undefined,
      timestamp: new Date().toISOString(),
    };

    // Build conversation history from existing messages BEFORE adding current message
    const conversationHistory = session.messages.map((msg) => ({
      role: msg.role,
      content: msg.content,
    }));

    session.messages.push(userMessage);

    // Emit started event so UI can show thinking indicator
    this.emitAgentEvent(sessionId, {
      type: 'started',
    });

    // Emit user message event
    this.emitAgentEvent(sessionId, {
      type: 'message',
      message: userMessage,
    });

    await this.saveSession(sessionId, session.messages);
    let emitAiCallObservability:
      | ((outcome: AiCallOutcome, status: number, errorMessage?: string) => void)
      | null = null;

    try {
      // Determine the effective working directory for context loading
      const effectiveWorkDir = workingDirectory || session.workingDirectory;

      // Load autoLoadClaudeMd setting (project setting takes precedence over global)
      const autoLoadClaudeMd = await getAutoLoadClaudeMdSetting(
        effectiveWorkDir,
        this.settingsService,
        '[AgentService]'
      );

      // Load MCP servers from settings (global setting only)
      const mcpServers = await getMCPServersFromSettings(this.settingsService, '[AgentService]');

      // Get Skills configuration from settings
      const skillsConfig = this.settingsService
        ? await getSkillsConfiguration(this.settingsService)
        : { enabled: false, sources: [] as Array<'user' | 'project'>, shouldIncludeInTools: false };

      // Get Subagents configuration from settings
      const subagentsConfig = this.settingsService
        ? await getSubagentsConfiguration(this.settingsService)
        : { enabled: false, sources: [] as Array<'user' | 'project'>, shouldIncludeInTools: false };

      // Get custom subagents from settings (merge global + project-level) only if enabled
      const customSubagents =
        this.settingsService && subagentsConfig.enabled
          ? await getCustomSubagents(this.settingsService, effectiveWorkDir)
          : undefined;

      // Get credentials for API calls
      const credentials = await this.settingsService?.getCredentials();

      // Try to find a provider for the model (if it's a provider model like "GLM-4.7")
      // This allows users to select provider models in the Agent Runner UI
      let claudeCompatibleProvider: import('@automaker/types').ClaudeCompatibleProvider | undefined;
      let providerResolvedModel: string | undefined;
      const requestedModel = model || session.model;
      if (requestedModel && this.settingsService) {
        const providerResult = await getProviderByModelId(
          requestedModel,
          this.settingsService,
          '[AgentService]'
        );
        if (providerResult.provider) {
          claudeCompatibleProvider = providerResult.provider;
          providerResolvedModel = providerResult.resolvedModel;
          this.logger.info(
            `[AgentService] Using provider "${providerResult.provider.name}" for model "${requestedModel}"` +
              (providerResolvedModel ? ` -> resolved to "${providerResolvedModel}"` : '')
          );
        }
      }

      // Load project context files (CLAUDE.md, CODE_QUALITY.md, etc.) and memory files
      // Use the user's message as task context for smart memory selection
      const contextResult = await loadContextFiles({
        projectPath: effectiveWorkDir,
        fsModule: secureFs as Parameters<typeof loadContextFiles>[0]['fsModule'],
        taskContext: {
          title: message.substring(0, 200), // Use first 200 chars as title
          description: message,
        },
      });

      // When autoLoadClaudeMd is enabled, filter out CLAUDE.md to avoid duplication
      // (SDK handles CLAUDE.md via settingSources), but keep other context files like CODE_QUALITY.md
      const contextFilesPrompt = filterClaudeMdFromContext(contextResult, autoLoadClaudeMd);

      // Build combined system prompt with base prompt and context files
      const baseSystemPrompt = await this.getSystemPrompt();
      let combinedSystemPrompt = contextFilesPrompt
        ? `${contextFilesPrompt}\n\n${baseSystemPrompt}`
        : baseSystemPrompt;

      // Append completed task capture prompt if enabled in project settings
      if (this.settingsService) {
        try {
          const projectSettings = await this.settingsService.getProjectSettings(effectiveWorkDir);
          if (projectSettings.completedTasksAutoCapture) {
            const port = process.env.PORT || '3008';
            const hostname = process.env.HOSTNAME || 'localhost';
            const apiBaseUrl = `http://${hostname}:${port}`;
            combinedSystemPrompt +=
              '\n\n' + getCompletedTaskCapturePrompt(apiBaseUrl, effectiveWorkDir);
          }
        } catch (error) {
          this.logger.debug('Could not check completedTasksAutoCapture setting:', error);
        }
      }

      // Build SDK options using centralized configuration
      // Use thinking level and reasoning effort from request, or fall back to session's stored values
      const effectiveThinkingLevel = thinkingLevel ?? session.thinkingLevel;
      const effectiveReasoningEffort = reasoningEffort ?? session.reasoningEffort;
      const effectiveRequestedModel = model || session.model;
      const ultraModeActive =
        effectiveThinkingLevel === 'ultrathink' || effectiveReasoningEffort === 'xhigh';

      this.logger.info('[AgentConfig] Effective execution settings', {
        sessionId,
        model: effectiveRequestedModel,
        thinkingLevel: effectiveThinkingLevel ?? 'none',
        reasoningEffort: effectiveReasoningEffort ?? 'none',
        ultraModeActive,
      });

      // When using a provider model, use the resolved Claude model (from mapsToClaudeModel)
      // e.g., "GLM-4.5-Air" -> "claude-haiku-4-5"
      const modelForSdk = providerResolvedModel || model;
      const sessionModelForSdk = providerResolvedModel ? undefined : session.model;

      const sdkOptions = createChatOptions({
        cwd: effectiveWorkDir,
        model: modelForSdk,
        sessionModel: sessionModelForSdk,
        systemPrompt: combinedSystemPrompt,
        abortController: session.abortController!,
        autoLoadClaudeMd,
        thinkingLevel: effectiveThinkingLevel, // Pass thinking level for Claude models
        mcpServers: Object.keys(mcpServers).length > 0 ? mcpServers : undefined,
      });

      // Extract model, maxTurns, and allowedTools from SDK options
      const effectiveModel = sdkOptions.model!;
      const maxTurns = sdkOptions.maxTurns;
      let allowedTools = sdkOptions.allowedTools as string[] | undefined;

      // Build merged settingSources array using Set for automatic deduplication
      const sdkSettingSources = (sdkOptions.settingSources ?? []).filter(
        (source): source is 'user' | 'project' => source === 'user' || source === 'project'
      );
      const skillSettingSources = skillsConfig.enabled ? skillsConfig.sources : [];
      const settingSources = [...new Set([...sdkSettingSources, ...skillSettingSources])];

      // Enhance allowedTools with Skills and Subagents tools
      // These tools are not in the provider's default set - they're added dynamically based on settings
      const needsSkillTool = skillsConfig.shouldIncludeInTools;
      const needsTaskTool =
        subagentsConfig.shouldIncludeInTools &&
        customSubagents &&
        Object.keys(customSubagents).length > 0;

      // Base tools that match the provider's default set
      const baseTools = ['Read', 'Write', 'Edit', 'Glob', 'Grep', 'Bash', 'WebSearch', 'WebFetch'];

      if (allowedTools) {
        allowedTools = [...allowedTools]; // Create a copy to avoid mutating SDK options
        // Add Skill tool if skills are enabled
        if (needsSkillTool && !allowedTools.includes('Skill')) {
          allowedTools.push('Skill');
        }
        // Add Task tool if custom subagents are configured
        if (needsTaskTool && !allowedTools.includes('Task')) {
          allowedTools.push('Task');
        }
      } else if (needsSkillTool || needsTaskTool) {
        // If no allowedTools specified but we need to add Skill/Task tools,
        // build the full list including base tools
        allowedTools = [...baseTools];
        if (needsSkillTool) {
          allowedTools.push('Skill');
        }
        if (needsTaskTool) {
          allowedTools.push('Task');
        }
      }

      // Get provider for this model (with prefix)
      const provider = ProviderFactory.getProviderForModel(effectiveModel);
      const providerName = provider.getName();

      // Strip provider prefix - providers should receive bare model IDs
      const bareModel = stripProviderPrefix(effectiveModel);

      // Build options for provider
      const options: ExecuteOptions = {
        prompt: '', // Will be set below based on images
        model: bareModel, // Bare model ID (e.g., "gpt-5.1-codex-max", "composer-1")
        originalModel: effectiveModel, // Original with prefix for logging (e.g., "codex-gpt-5.1-codex-max")
        cwd: effectiveWorkDir,
        systemPrompt: sdkOptions.systemPrompt,
        maxTurns: maxTurns,
        allowedTools: allowedTools,
        abortController: session.abortController!,
        conversationHistory: conversationHistory.length > 0 ? conversationHistory : undefined,
        settingSources: settingSources.length > 0 ? settingSources : undefined,
        sdkSessionId: session.sdkSessionId, // Pass SDK session ID for resuming
        mcpServers: Object.keys(mcpServers).length > 0 ? mcpServers : undefined, // Pass MCP servers configuration
        agents: customSubagents, // Pass custom subagents for task delegation
        thinkingLevel: effectiveThinkingLevel, // Pass thinking level for Claude models
        reasoningEffort: effectiveReasoningEffort, // Pass reasoning effort for Codex models
        credentials, // Pass credentials for resolving 'credentials' apiKeySource
        claudeCompatibleProvider, // Pass provider for alternative endpoint configuration (GLM, MiniMax, etc.)
      };

      // Check if this is the first message in the session (for auto title generation)
      // We check conversationHistory length since it was built BEFORE adding the current message
      const isFirstMsg = isFirstMessage(conversationHistory.length);

      // Build prompt content with images
      const { content: promptContent } = await buildPromptWithImages(
        message,
        imagePaths,
        undefined, // no workDir for agent service
        true // include image paths in text
      );

      // For the first message, prepend title generation instruction
      const finalPrompt = isFirstMsg
        ? prependTitleInstruction(typeof promptContent === 'string' ? promptContent : message)
        : promptContent;

      // Set the prompt in options
      options.prompt = finalPrompt;

      const aiCallRequestId = this.generateId();
      const aiCallStartedAtMs = Date.now();
      let aiFirstChunkAtMs: number | null = null;
      let aiStepCount = 0;
      let aiCallObservabilityEmitted = false;
      const toolUses: Array<{ name: string; input: unknown }> = [];
      let latestTokenUsage: ProviderTokenUsage | null = null;
      emitAiCallObservability = (outcome: AiCallOutcome, status: number, errorMessage?: string) => {
        if (aiCallObservabilityEmitted) {
          return;
        }

        aiCallObservabilityEmitted = true;
        this.emitAiCallWideEvent({
          requestId: aiCallRequestId,
          sessionId,
          provider: providerName,
          model: effectiveModel,
          thinkingLevel: effectiveThinkingLevel,
          reasoningEffort: effectiveReasoningEffort,
          imageCount: imagePaths?.length ?? 0,
          startedAtMs: aiCallStartedAtMs,
          firstChunkAtMs: aiFirstChunkAtMs,
          endedAtMs: Date.now(),
          stepCount: aiStepCount,
          toolUses,
          usage: latestTokenUsage,
          outcome,
          status,
          errorMessage,
        });
      };

      // Execute via provider
      const stream = provider.executeQuery(options);

      let currentAssistantMessage: Message | null = null;
      let responseText = '';
      let sessionInfoParsed = false; // Track if we've already extracted session info

      for await (const msg of stream) {
        // Capture SDK session ID from any message and persist it
        if (msg.session_id && !session.sdkSessionId) {
          session.sdkSessionId = msg.session_id;
          // Persist the SDK session ID to ensure conversation continuity across server restarts
          await this.updateSession(sessionId, { sdkSessionId: msg.session_id });
        }

        const usage = extractTokenUsageFromProviderMessage(msg);
        if (usage) {
          latestTokenUsage = usage;
        }

        if (msg.type === 'assistant') {
          if (msg.message?.content) {
            if (aiFirstChunkAtMs === null && msg.message.content.length > 0) {
              aiFirstChunkAtMs = Date.now();
            }

            // Add newline separator between assistant turns so multi-turn
            // responses don't concatenate without breaks
            let needsTurnSeparator = responseText.length > 0;

            for (const block of msg.message.content) {
              if (block.type === 'text') {
                if (needsTurnSeparator) {
                  responseText += '\n\n';
                  needsTurnSeparator = false;
                }
                responseText += block.text;

                // For first messages, strip SESSION_INFO block from displayed content during streaming
                let displayText = responseText;
                if (isFirstMsg) {
                  if (!sessionInfoParsed) {
                    // Try to parse and strip SESSION_INFO block as it streams in
                    const parsed = parseSessionInfo(responseText);
                    if (parsed.title || parsed.description) {
                      displayText = parsed.cleanedContent;
                      sessionInfoParsed = true;

                      // Update session metadata with extracted title and description
                      const metadataUpdates: Partial<SessionMetadata> = {};
                      if (parsed.title) {
                        metadataUpdates.name = parsed.title;
                      }
                      if (parsed.description) {
                        metadataUpdates.description = parsed.description;
                      }
                      await this.updateSession(sessionId, metadataUpdates);

                      // Emit session metadata update event so frontend can refresh
                      this.emitAgentEvent(sessionId, {
                        type: 'session_metadata_updated',
                        name: parsed.title,
                        description: parsed.description,
                      });
                    } else if (responseText.includes('[SESSION_INFO]')) {
                      // Block is still being written - hide it from display
                      const infoStart = responseText.indexOf('[SESSION_INFO]');
                      displayText = responseText.substring(0, infoStart).trim();
                    }
                  } else {
                    // SESSION_INFO already parsed - continue stripping from accumulated text
                    const parsed = parseSessionInfo(responseText);
                    displayText = parsed.cleanedContent;
                  }
                }

                if (!currentAssistantMessage) {
                  currentAssistantMessage = {
                    id: this.generateId(),
                    role: 'assistant',
                    content: displayText,
                    timestamp: new Date().toISOString(),
                    tokenUsage: latestTokenUsage ?? undefined,
                  };
                  session.messages.push(currentAssistantMessage);
                } else {
                  currentAssistantMessage.content = displayText;
                  if (latestTokenUsage) {
                    currentAssistantMessage.tokenUsage = latestTokenUsage;
                  }
                }

                this.emitAgentEvent(sessionId, {
                  type: 'stream',
                  messageId: currentAssistantMessage.id,
                  content: displayText,
                  isComplete: false,
                });
              } else if (block.type === 'tool_use') {
                const toolUse = {
                  name: block.name || 'unknown',
                  input: block.input,
                };
                toolUses.push(toolUse);

                this.emitAgentEvent(sessionId, {
                  type: 'tool_use',
                  tool: toolUse,
                });

                // Detect Task tool invocations for sub-agent tracking
                if (block.name === 'Task') {
                  const taskInput = block.input as Record<string, unknown>;
                  // SDK tool_use blocks include an 'id' field not in our ContentBlock type
                  const blockWithId = block as typeof block & { id?: string };
                  const childSession = await this.ensureSubagentSession(
                    sessionId,
                    taskInput,
                    blockWithId.id
                  );
                  const agentType = (taskInput.subagent_type as string) || 'unknown';
                  const description = (taskInput.description as string) || '';
                  const model = taskInput.model as string | undefined;
                  const runInBackground = Boolean(taskInput.run_in_background);
                  const startedAt = new Date().toISOString();
                  if (blockWithId.id && childSession?.id) {
                    this.activeSubagentSessions.set(blockWithId.id, {
                      childSessionId: childSession.id,
                      parentSessionId: sessionId,
                      runInBackground,
                      agentType,
                      description,
                      model,
                      startedAt,
                      elapsedSeconds: 0,
                    });
                  }

                  this.emitAgentEvent(sessionId, {
                    type: 'subagent_started',
                    agentId: blockWithId.id,
                    agentType,
                    description,
                    model,
                    runInBackground,
                    childSessionId: childSession?.id,
                  });
                }
              }
            }
          }
        } else if (msg.type === 'result') {
          if (msg.subtype === 'success') {
            aiStepCount += 1;
          }

          if (msg.subtype === 'success' && msg.result) {
            // For first messages, ensure SESSION_INFO is parsed from result
            // if it wasn't caught during streaming
            if (isFirstMsg && !sessionInfoParsed) {
              const parsed = parseSessionInfo(msg.result);
              if (parsed.title || parsed.description) {
                sessionInfoParsed = true;
                const metadataUpdates: Partial<SessionMetadata> = {};
                if (parsed.title) metadataUpdates.name = parsed.title;
                if (parsed.description) metadataUpdates.description = parsed.description;
                await this.updateSession(sessionId, metadataUpdates);
                this.emitAgentEvent(sessionId, {
                  type: 'session_metadata_updated',
                  name: parsed.title,
                  description: parsed.description,
                });
              }
            }

            if (!currentAssistantMessage) {
              // No streaming happened - use result content as the message
              let resultContent = msg.result;
              if (isFirstMsg) {
                const parsed = parseSessionInfo(resultContent);
                resultContent = parsed.cleanedContent;
              }

              currentAssistantMessage = {
                id: this.generateId(),
                role: 'assistant',
                content: resultContent,
                timestamp: new Date().toISOString(),
                tokenUsage: latestTokenUsage ?? undefined,
              };
              session.messages.push(currentAssistantMessage);
              responseText = resultContent;

              this.emitAgentEvent(sessionId, {
                type: 'stream',
                messageId: currentAssistantMessage.id,
                content: resultContent,
                isComplete: false,
              });
            }
            // When currentAssistantMessage exists, keep the accumulated streaming
            // content from all turns — msg.result only contains the last turn's text
            if (currentAssistantMessage && latestTokenUsage) {
              currentAssistantMessage.tokenUsage = latestTokenUsage;
            }
          }
        } else if (msg.type === 'error') {
          // Some providers (like Codex CLI/SaaS or Cursor CLI) surface failures as
          // streamed error messages instead of throwing. Handle these here so the
          // Agent Runner UX matches the Claude/Cursor behavior without changing
          // their provider implementations.
          const rawErrorText =
            (typeof msg.error === 'string' && msg.error.trim()) ||
            'Unexpected error from provider during agent execution.';

          const errorInfo = classifyError(new Error(rawErrorText));
          const shouldTreatAsStoppedRun =
            session.wasStopped || errorInfo.isAbort || errorInfo.isCancellation;

          // User pressed stop: some providers still emit a non-zero exit error event.
          // Treat that as an aborted run instead of a hard failure.
          if (shouldTreatAsStoppedRun) {
            this.logger.info('Ignoring provider error after user stop/cancel:', {
              type: errorInfo.type,
              message: errorInfo.message,
              wasStopped: session.wasStopped,
            });

            session.isRunning = false;
            session.abortController = null;
            await this.accumulateElapsedTime(sessionId);
            await this.finalizeForegroundSubagents(sessionId);
            await this.finalizeBackgroundSubagentsAfterParentStop(sessionId);

            // Continue queued prompts after a manual stop.
            setImmediate(() => this.processNextInQueue(sessionId));
            emitAiCallObservability?.(
              'aborted',
              DEFAULT_LOG_STATUS_ABORTED,
              errorInfo.message || rawErrorText
            );

            return { success: false, aborted: true };
          }

          // Keep the provider-supplied text intact (Codex already includes helpful tips),
          // only add a small rate-limit hint when we can detect it.
          const enhancedText = errorInfo.isRateLimit
            ? `${rawErrorText}\n\nTip: It looks like you hit a rate limit. Try waiting a bit or reducing concurrent Agent Runner / Auto Mode tasks.`
            : rawErrorText;

          this.logger.error('Provider error during agent execution:', {
            type: errorInfo.type,
            message: errorInfo.message,
          });

          // Mark session as no longer running so the UI and queue stay in sync
          session.isRunning = false;
          session.abortController = null;
          await this.accumulateElapsedTime(sessionId);
          await this.finalizeForegroundSubagents(sessionId);
          await this.finalizeBackgroundSubagentsAfterParentStop(sessionId);

          const errorMessage: Message = {
            id: this.generateId(),
            role: 'assistant',
            content: `Error: ${enhancedText}`,
            timestamp: new Date().toISOString(),
            isError: true,
          };

          session.messages.push(errorMessage);
          await this.saveSession(sessionId, session.messages);

          this.emitAgentEvent(sessionId, {
            type: 'error',
            error: enhancedText,
            message: errorMessage,
          });
          emitAiCallObservability?.('error', DEFAULT_LOG_STATUS_ERROR, enhancedText);

          // Don't continue streaming after an error message
          return {
            success: false,
          };
        } else if ((msg as { type: string }).type === 'tool_progress') {
          // Track sub-agent progress - the SDK emits these for long-running tools
          // The SDK's tool_progress messages have fields not in our ProviderMessage type
          const progressMsg = msg as {
            tool_use_id?: string;
            tool_name?: string;
            elapsed_time_seconds?: number;
            parent_tool_use_id?: string;
          };
          const trackedAgentId = progressMsg.parent_tool_use_id || progressMsg.tool_use_id;
          if (trackedAgentId) {
            const activeSubagent = this.activeSubagentSessions.get(trackedAgentId);
            if (activeSubagent && typeof progressMsg.elapsed_time_seconds === 'number') {
              this.activeSubagentSessions.set(trackedAgentId, {
                ...activeSubagent,
                elapsedSeconds: progressMsg.elapsed_time_seconds,
              });
            }
          }
          this.emitAgentEvent(sessionId, {
            type: 'subagent_progress',
            agentId: trackedAgentId,
            toolName: progressMsg.tool_name,
            elapsedSeconds: progressMsg.elapsed_time_seconds,
            parentToolUseId: progressMsg.parent_tool_use_id,
          });
        } else if (msg.type === 'user' && msg.parent_tool_use_id) {
          // Sub-agent returned its result
          const activeSubagent = this.activeSubagentSessions.get(msg.parent_tool_use_id);
          let childSessionId = activeSubagent?.childSessionId;
          if (!childSessionId) {
            const existingSubagentSession = await this.findSubagentSession(
              sessionId,
              msg.parent_tool_use_id
            );
            childSessionId = existingSubagentSession?.id;
          }
          if (childSessionId) {
            await this.accumulateElapsedTime(childSessionId);
          }
          this.activeSubagentSessions.delete(msg.parent_tool_use_id);

          this.emitAgentEvent(sessionId, {
            type: 'subagent_stopped',
            agentId: msg.parent_tool_use_id,
            childSessionId,
          });
        }
      }

      if (currentAssistantMessage && latestTokenUsage) {
        currentAssistantMessage.tokenUsage = latestTokenUsage;
      }

      await this.saveSession(sessionId, session.messages);

      session.isRunning = false;
      session.abortController = null;
      await this.accumulateElapsedTime(sessionId);
      await this.finalizeForegroundSubagents(sessionId);
      await this.finalizeBackgroundSubagentsAfterParentStop(sessionId);

      // Emit a single terminal completion event after the provider stream ends.
      // Some providers can emit multiple "result" events during one execution.
      this.emitAgentEvent(sessionId, {
        type: 'complete',
        messageId: currentAssistantMessage?.id,
        content: currentAssistantMessage?.content ?? responseText,
        toolUses,
        usage: latestTokenUsage ?? undefined,
      });
      emitAiCallObservability?.('success', DEFAULT_LOG_STATUS_SUCCESS);

      // Mark session as dirty (needs review) after successful completion
      await this.markSessionDirty(sessionId);

      // Process next item in queue after completion
      setImmediate(() => this.processNextInQueue(sessionId));

      return {
        success: true,
        message: currentAssistantMessage,
      };
    } catch (error) {
      const errorInfo = classifyError(error);

      if (session.wasStopped || isAbortError(error) || errorInfo.isCancellation) {
        session.isRunning = false;
        session.abortController = null;
        await this.accumulateElapsedTime(sessionId);
        await this.finalizeForegroundSubagents(sessionId);
        await this.finalizeBackgroundSubagentsAfterParentStop(sessionId);

        // Process next queued prompt after user stop
        // This enables the "stop to send next" workflow:
        // User queues a prompt → clicks Stop → queued prompt sends immediately
        setImmediate(() => this.processNextInQueue(sessionId));
        emitAiCallObservability?.('aborted', DEFAULT_LOG_STATUS_ABORTED, errorInfo.message);

        return { success: false, aborted: true };
      }

      this.logger.error('Error:', error);

      session.isRunning = false;
      session.abortController = null;
      await this.accumulateElapsedTime(sessionId);
      await this.finalizeForegroundSubagents(sessionId);
      await this.finalizeBackgroundSubagentsAfterParentStop(sessionId);

      const errorMessage: Message = {
        id: this.generateId(),
        role: 'assistant',
        content: `Error: ${(error as Error).message}`,
        timestamp: new Date().toISOString(),
        isError: true,
      };

      session.messages.push(errorMessage);
      await this.saveSession(sessionId, session.messages);

      this.emitAgentEvent(sessionId, {
        type: 'error',
        error: (error as Error).message,
        message: errorMessage,
      });
      emitAiCallObservability?.('error', DEFAULT_LOG_STATUS_ERROR, (error as Error).message);

      throw error;
    }
  }

  /**
   * Get conversation history
   */
  getHistory(sessionId: string) {
    const session = this.sessions.get(sessionId);
    if (!session) {
      return { success: false, error: 'Session not found' };
    }

    return {
      success: true,
      messages: session.messages,
      isRunning: session.isRunning,
      activeSubAgents: this.getActiveSubagentsForParent(sessionId),
    };
  }

  private getActiveSubagentsForParent(parentSessionId: string): Array<{
    agentId: string;
    agentType: string;
    description: string;
    childSessionId: string;
    model?: string;
    runInBackground: boolean;
    startedAt: string;
    elapsedSeconds: number;
  }> {
    const nowMs = Date.now();

    return Array.from(this.activeSubagentSessions.entries())
      .filter(([, active]) => active.parentSessionId === parentSessionId)
      .map(([agentId, active]) => {
        const startedAtMs = new Date(active.startedAt).getTime();
        const liveElapsedSeconds =
          Number.isFinite(startedAtMs) && startedAtMs > 0
            ? Math.max(0, Math.floor((nowMs - startedAtMs) / 1000))
            : 0;

        return {
          agentId,
          agentType: active.agentType,
          description: active.description,
          childSessionId: active.childSessionId,
          model: active.model,
          runInBackground: active.runInBackground,
          startedAt: active.startedAt,
          elapsedSeconds: Math.max(active.elapsedSeconds, liveElapsedSeconds),
        };
      });
  }

  isSessionRunning(sessionId: string): boolean {
    return this.sessions.get(sessionId)?.isRunning ?? false;
  }

  getRunningSessionIds(): Set<string> {
    return new Set(
      Array.from(this.sessions.entries())
        .filter(([, session]) => session.isRunning)
        .map(([sessionId]) => sessionId)
    );
  }

  getRunningSubagentSessionIds(): Set<string> {
    // Safety net: clean up stale subagent entries before returning
    this.cleanupStaleSubagentSessions();
    return new Set(
      Array.from(this.activeSubagentSessions.values()).map((active) => active.childSessionId)
    );
  }

  isSubagentSessionRunning(sessionId: string): boolean {
    for (const active of this.activeSubagentSessions.values()) {
      if (active.childSessionId === sessionId) {
        return true;
      }
    }
    return false;
  }

  /**
   * Safety net: Remove subagent entries whose parent session is no longer running.
   * This catches any edge case where the normal cleanup path was missed
   * (e.g. unexpected errors, race conditions, provider crashes).
   * Also removes entries older than 30 minutes as an absolute safety net.
   */
  private cleanupStaleSubagentSessions(): void {
    const MAX_SUBAGENT_AGE_MS = 30 * 60 * 1000; // 30 minutes
    const nowMs = Date.now();
    const staleIds: string[] = [];

    for (const [toolUseId, active] of this.activeSubagentSessions.entries()) {
      const parentSession = this.sessions.get(active.parentSessionId);
      const parentIsRunning = parentSession?.isRunning ?? false;

      // If parent is no longer running, this subagent entry is stale
      if (!parentIsRunning) {
        staleIds.push(toolUseId);
        continue;
      }

      // Absolute timeout: no subagent should be tracked for more than 30 minutes
      const startedAtMs = new Date(active.startedAt).getTime();
      if (Number.isFinite(startedAtMs) && nowMs - startedAtMs > MAX_SUBAGENT_AGE_MS) {
        staleIds.push(toolUseId);
      }
    }

    if (staleIds.length > 0) {
      this.logger.warn(
        `Cleaning up ${staleIds.length} stale subagent session(s) from activeSubagentSessions`
      );
      for (const toolUseId of staleIds) {
        const active = this.activeSubagentSessions.get(toolUseId);
        this.activeSubagentSessions.delete(toolUseId);

        // Emit stopped event so the UI updates immediately
        if (active) {
          this.emitAgentEvent(active.parentSessionId, {
            type: 'subagent_stopped',
            agentId: toolUseId,
            childSessionId: active.childSessionId,
          });
        }
      }
    }
  }

  isSessionStopped(sessionId: string): boolean {
    return this.sessions.get(sessionId)?.wasStopped ?? false;
  }

  getStoppedSessionIds(): Set<string> {
    return new Set(
      Array.from(this.sessions.entries())
        .filter(([, session]) => session.wasStopped)
        .map(([sessionId]) => sessionId)
    );
  }

  getStoppedSessionReasons(): Map<string, StopExecutionReason> {
    return new Map(
      Array.from(this.sessions.entries())
        .filter(([, session]) => session.wasStopped)
        .map(([sessionId, session]) => [sessionId, session.stopReason ?? 'manual'])
    );
  }

  async sessionExists(sessionId: string): Promise<boolean> {
    const metadata = await this.loadMetadata();
    return Boolean(metadata[sessionId]);
  }

  /**
   * Stop current agent execution
   */
  async stopExecution(sessionId: string, reason: StopExecutionReason = 'manual') {
    const session = this.sessions.get(sessionId);
    if (!session) {
      return { success: false, error: 'Session not found' };
    }

    if (session.abortController) {
      session.abortController.abort();
      session.isRunning = false;
      session.wasStopped = true;
      session.stopReason = reason;
      session.abortController = null;
      await this.updateSession(sessionId, { stopReason: reason });
      await this.accumulateElapsedTime(sessionId);
      await this.finalizeForegroundSubagents(sessionId);
      await this.finalizeBackgroundSubagentsAfterParentStop(sessionId);

      this.emitAgentEvent(sessionId, {
        type: 'stopped',
      });
    }

    return { success: true };
  }

  /**
   * Clear conversation history
   */
  async clearSession(sessionId: string) {
    const session = this.sessions.get(sessionId);
    if (session) {
      session.messages = [];
      session.isRunning = false;
      await this.saveSession(sessionId, []);
    }

    return { success: true };
  }

  // Session management

  async loadSession(sessionId: string): Promise<Message[]> {
    const sessionFile = path.join(this.stateDir, `${sessionId}.json`);

    try {
      const data = (await secureFs.readFile(sessionFile, 'utf-8')) as string;
      return JSON.parse(data);
    } catch {
      return [];
    }
  }

  async saveSession(sessionId: string, messages: Message[]): Promise<void> {
    const sessionFile = path.join(this.stateDir, `${sessionId}.json`);

    try {
      await secureFs.writeFile(sessionFile, JSON.stringify(messages, null, 2), 'utf-8');
      const metadata = await this.loadMetadata();
      if (metadata[sessionId]) {
        const isOrchestratorSession = Boolean(metadata[sessionId].orchestratorRunId);
        metadata[sessionId] = {
          ...metadata[sessionId],
          ...buildSessionSummary(messages, isOrchestratorSession),
          updatedAt: new Date().toISOString(),
        };
        await this.saveMetadata(metadata);
      }
    } catch (error) {
      this.logger.error('Failed to save session:', error);
    }
  }

  async loadMetadata(): Promise<Record<string, SessionMetadata>> {
    const recovery = await readJsonWithRecovery<Record<string, SessionMetadata>>(
      this.metadataFile,
      {},
      { maxBackups: DEFAULT_BACKUP_COUNT }
    );

    if (!recovery.recovered) {
      return recovery.data;
    }

    if (recovery.source !== 'default') {
      logRecoveryWarning(recovery, 'Session metadata', this.logger);
      return recovery.data;
    }

    // Last-resort salvage: try trimming trailing garbage after a complete root JSON object.
    try {
      const raw = (await secureFs.readFile(this.metadataFile, 'utf-8')) as string;
      const repaired = recoverMetadataFromCorruptedContent(raw);
      if (repaired) {
        this.logger.warn(
          '[SessionMetadata] Recovered metadata by trimming corrupted trailing content'
        );
        await this.saveMetadata(repaired);
        return repaired;
      }
    } catch {
      // Ignore and fall back to recovery default below.
    }

    this.logger.warn(
      `[SessionMetadata] Recovery failed, using empty metadata. Reason: ${recovery.error ?? 'unknown'}`
    );
    return recovery.data;
  }

  async saveMetadata(metadata: Record<string, SessionMetadata>): Promise<void> {
    await atomicWriteJson(this.metadataFile, metadata, {
      createDirs: true,
      backupCount: DEFAULT_BACKUP_COUNT,
    });
  }

  /**
   * Accumulate elapsed time when a session run ends.
   * Adds the duration since lastStartedAt to totalElapsedMs and clears lastStartedAt.
   */
  private async accumulateElapsedTime(sessionId: string): Promise<void> {
    const metadata = await this.loadMetadata();
    const session = metadata[sessionId];
    if (!session?.lastStartedAt) return;

    const startedAt = new Date(session.lastStartedAt).getTime();
    const now = Date.now();
    const elapsed = Math.max(0, now - startedAt);
    const totalElapsedMs = (session.totalElapsedMs || 0) + elapsed;

    metadata[sessionId] = {
      ...session,
      totalElapsedMs,
      lastStartedAt: undefined,
      updatedAt: new Date().toISOString(),
    };
    await this.saveMetadata(metadata);
  }

  /**
   * Mark session as dirty (has completed work that needs review)
   */
  async markSessionDirty(sessionId: string): Promise<boolean> {
    const metadata = await this.loadMetadata();
    if (!metadata[sessionId]) return false;
    metadata[sessionId].isDirty = true;
    await this.saveMetadata(metadata);
    return true;
  }

  /**
   * Mark session as clean (user has reviewed the completed work)
   */
  async markSessionClean(sessionId: string): Promise<boolean> {
    const metadata = await this.loadMetadata();
    if (!metadata[sessionId]) return false;
    metadata[sessionId].isDirty = false;
    await this.saveMetadata(metadata);
    return true;
  }

  async listSessions(includeArchived = false, projectPath?: string): Promise<SessionMetadata[]> {
    const metadata = await this.loadMetadata();
    let sessions = Object.values(metadata);

    if (!includeArchived) {
      sessions = sessions.filter((s) => !s.archived);
    }

    if (projectPath) {
      const normalizePath = (value: string | undefined): string =>
        (value || '')
          .replace(/[\\/]+$/, '')
          .replace(/\\/g, '/')
          .toLowerCase();
      const normalizedTargetProjectPath = normalizePath(projectPath);
      sessions = sessions.filter(
        (s) => normalizePath(s.projectPath || s.workingDirectory) === normalizedTargetProjectPath
      );
    }

    return sessions.sort(
      (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
    );
  }

  async createSession(
    name: string,
    projectPath?: string,
    workingDirectory?: string,
    model?: string,
    orchestratorRunId?: string,
    sourceType?: SessionSourceType,
    parentSessionId?: string,
    parentToolUseId?: string
  ): Promise<SessionMetadata> {
    const sessionId = this.generateId();
    const metadata = await this.loadMetadata();

    // Determine the effective working directory
    const effectiveWorkingDirectory = workingDirectory || projectPath || process.cwd();
    const resolvedWorkingDirectory = path.resolve(effectiveWorkingDirectory);

    // Validate that the working directory is allowed using centralized validation
    validateWorkingDirectory(resolvedWorkingDirectory);

    // Validate that projectPath is allowed if provided
    if (projectPath) {
      validateWorkingDirectory(projectPath);
    }

    const resolvedSourceType: SessionSourceType =
      sourceType || (parentSessionId ? 'subagent' : orchestratorRunId ? 'orchestrator' : 'manual');

    const session: SessionMetadata = {
      id: sessionId,
      name,
      projectPath,
      workingDirectory: resolvedWorkingDirectory,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      model,
      orchestratorRunId,
      sourceType: resolvedSourceType,
      parentSessionId,
      parentToolUseId,
      messageCount: 0,
      preview: '',
      lastError: undefined,
    };

    metadata[sessionId] = session;
    await this.saveMetadata(metadata);

    return session;
  }

  async setSessionModel(sessionId: string, model: string): Promise<boolean> {
    const session = this.sessions.get(sessionId);
    if (session) {
      session.model = model;
      await this.updateSession(sessionId, { model });
      return true;
    }
    return false;
  }

  async updateSession(
    sessionId: string,
    updates: Partial<SessionMetadata>
  ): Promise<SessionMetadata | null> {
    const metadata = await this.loadMetadata();
    if (!metadata[sessionId]) return null;

    metadata[sessionId] = {
      ...metadata[sessionId],
      ...updates,
      updatedAt: new Date().toISOString(),
    };

    await this.saveMetadata(metadata);
    return metadata[sessionId];
  }

  async archiveSession(sessionId: string): Promise<boolean> {
    const result = await this.updateSession(sessionId, { archived: true });
    return result !== null;
  }

  async unarchiveSession(sessionId: string): Promise<boolean> {
    const result = await this.updateSession(sessionId, { archived: false });
    return result !== null;
  }

  async deleteSession(sessionId: string): Promise<boolean> {
    const metadata = await this.loadMetadata();
    if (!metadata[sessionId]) return false;

    // Cascade: find all child sessions (sessions whose parentSessionId === sessionId)
    // and delete them recursively before deleting the parent.
    const childIds = Object.values(metadata)
      .filter((s) => s.parentSessionId === sessionId)
      .map((s) => s.id);

    for (const childId of childIds) {
      // Recursive delete so grandchildren are also removed
      await this.deleteSession(childId);
    }

    // Re-load metadata after potential child deletions
    const freshMetadata = childIds.length > 0 ? await this.loadMetadata() : metadata;
    if (!freshMetadata[sessionId]) return false;

    delete freshMetadata[sessionId];
    await this.saveMetadata(freshMetadata);

    // Delete session file
    try {
      const sessionFile = path.join(this.stateDir, `${sessionId}.json`);
      await secureFs.unlink(sessionFile);
    } catch {
      // File may not exist
    }

    // Clear from memory
    this.sessions.delete(sessionId);

    return true;
  }

  // Queue management methods

  /**
   * Add a prompt to the queue for later execution
   */
  async addToQueue(
    sessionId: string,
    prompt: {
      message: string;
      imagePaths?: string[];
      model?: string;
      thinkingLevel?: ThinkingLevel;
      reasoningEffort?: ReasoningEffort;
    }
  ): Promise<{ success: boolean; queuedPrompt?: QueuedPrompt; error?: string }> {
    const session = this.sessions.get(sessionId);
    if (!session) {
      return { success: false, error: 'Session not found' };
    }

    const queuedPrompt: QueuedPrompt = {
      id: this.generateId(),
      message: prompt.message,
      imagePaths: prompt.imagePaths,
      model: prompt.model,
      thinkingLevel: prompt.thinkingLevel,
      reasoningEffort: prompt.reasoningEffort,
      addedAt: new Date().toISOString(),
    };

    session.promptQueue.push(queuedPrompt);
    await this.saveQueueState(sessionId, session.promptQueue);

    // Emit queue update event
    this.emitAgentEvent(sessionId, {
      type: 'queue_updated',
      queue: session.promptQueue,
    });

    return { success: true, queuedPrompt };
  }

  /**
   * Get the current queue for a session
   */
  getQueue(sessionId: string): { success: boolean; queue?: QueuedPrompt[]; error?: string } {
    const session = this.sessions.get(sessionId);
    if (!session) {
      return { success: false, error: 'Session not found' };
    }
    return { success: true, queue: session.promptQueue };
  }

  /**
   * Remove a specific prompt from the queue
   */
  async removeFromQueue(
    sessionId: string,
    promptId: string
  ): Promise<{ success: boolean; error?: string }> {
    const session = this.sessions.get(sessionId);
    if (!session) {
      return { success: false, error: 'Session not found' };
    }

    const index = session.promptQueue.findIndex((p) => p.id === promptId);
    if (index === -1) {
      return { success: false, error: 'Prompt not found in queue' };
    }

    session.promptQueue.splice(index, 1);
    await this.saveQueueState(sessionId, session.promptQueue);

    this.emitAgentEvent(sessionId, {
      type: 'queue_updated',
      queue: session.promptQueue,
    });

    return { success: true };
  }

  /**
   * Clear all prompts from the queue
   */
  async clearQueue(sessionId: string): Promise<{ success: boolean; error?: string }> {
    const session = this.sessions.get(sessionId);
    if (!session) {
      return { success: false, error: 'Session not found' };
    }

    session.promptQueue = [];
    await this.saveQueueState(sessionId, []);

    this.emitAgentEvent(sessionId, {
      type: 'queue_updated',
      queue: [],
    });

    return { success: true };
  }

  /**
   * Save queue state to disk for persistence
   */
  private async saveQueueState(sessionId: string, queue: QueuedPrompt[]): Promise<void> {
    const queueFile = path.join(this.stateDir, `${sessionId}-queue.json`);
    try {
      await secureFs.writeFile(queueFile, JSON.stringify(queue, null, 2), 'utf-8');
    } catch (error) {
      this.logger.error('Failed to save queue state:', error);
    }
  }

  /**
   * Load queue state from disk
   */
  private async loadQueueState(sessionId: string): Promise<QueuedPrompt[]> {
    const queueFile = path.join(this.stateDir, `${sessionId}-queue.json`);
    try {
      const data = (await secureFs.readFile(queueFile, 'utf-8')) as string;
      return JSON.parse(data);
    } catch {
      return [];
    }
  }

  /**
   * Process the next item in the queue (called after task completion)
   */
  private async processNextInQueue(sessionId: string): Promise<void> {
    const session = this.sessions.get(sessionId);
    if (!session || session.promptQueue.length === 0) {
      return;
    }

    // Don't process if already running
    if (session.isRunning) {
      return;
    }

    const nextPrompt = session.promptQueue.shift();
    if (!nextPrompt) return;

    await this.saveQueueState(sessionId, session.promptQueue);

    this.emitAgentEvent(sessionId, {
      type: 'queue_updated',
      queue: session.promptQueue,
    });

    try {
      await this.sendMessage({
        sessionId,
        message: nextPrompt.message,
        imagePaths: nextPrompt.imagePaths,
        model: nextPrompt.model,
        thinkingLevel: nextPrompt.thinkingLevel,
        reasoningEffort: nextPrompt.reasoningEffort,
      });
    } catch (error) {
      this.logger.error('Failed to process queued prompt:', error);
      this.emitAgentEvent(sessionId, {
        type: 'queue_error',
        error: (error as Error).message,
        promptId: nextPrompt.id,
      });
    }
  }

  private async findSubagentSession(
    parentSessionId: string,
    parentToolUseId: string
  ): Promise<SessionMetadata | undefined> {
    if (!parentToolUseId) return undefined;
    const metadata = await this.loadMetadata();
    return Object.values(metadata).find(
      (session) =>
        session.parentSessionId === parentSessionId && session.parentToolUseId === parentToolUseId
    );
  }

  private buildSubagentSessionName(agentType: string, description: string): string {
    const normalizedAgentType = agentType.trim() || 'Sub-Agent';
    const normalizedDescription = description.trim();
    if (!normalizedDescription) {
      return `${normalizedAgentType} Aufgabe`;
    }

    const maxDescriptionLength = 64;
    const compactDescription =
      normalizedDescription.length > maxDescriptionLength
        ? `${normalizedDescription.slice(0, maxDescriptionLength - 3)}...`
        : normalizedDescription;

    return `${normalizedAgentType}: ${compactDescription}`;
  }

  private async ensureSubagentSession(
    parentSessionId: string,
    taskInput: Record<string, unknown>,
    parentToolUseId?: string
  ): Promise<SessionMetadata | null> {
    if (!parentToolUseId) {
      return null;
    }

    const existingSession = await this.findSubagentSession(parentSessionId, parentToolUseId);
    if (existingSession) {
      await this.updateSession(existingSession.id, { lastStartedAt: new Date().toISOString() });
      return existingSession;
    }

    const metadata = await this.loadMetadata();
    const parentSession = metadata[parentSessionId];
    if (!parentSession) {
      return null;
    }

    const description =
      typeof taskInput.description === 'string' ? taskInput.description.trim() : '';
    const agentType =
      typeof taskInput.subagent_type === 'string' ? taskInput.subagent_type.trim() : 'Sub-Agent';
    const model = typeof taskInput.model === 'string' ? taskInput.model : undefined;
    const sessionName = this.buildSubagentSessionName(agentType, description);
    const startedAt = new Date().toISOString();

    const subagentSession = await this.createSession(
      sessionName,
      parentSession.projectPath,
      parentSession.workingDirectory,
      model,
      parentSession.orchestratorRunId,
      'subagent',
      parentSessionId,
      parentToolUseId
    );

    await this.updateSession(subagentSession.id, {
      description: description || undefined,
      lastStartedAt: startedAt,
    });

    return {
      ...subagentSession,
      description: description || undefined,
      lastStartedAt: startedAt,
    };
  }

  private async finalizeForegroundSubagents(parentSessionId: string): Promise<void> {
    const entries = Array.from(this.activeSubagentSessions.entries()).filter(
      ([, active]) => active.parentSessionId === parentSessionId && !active.runInBackground
    );

    for (const [toolUseId, active] of entries) {
      this.activeSubagentSessions.delete(toolUseId);
      await this.accumulateElapsedTime(active.childSessionId);
      this.emitAgentEvent(parentSessionId, {
        type: 'subagent_stopped',
        agentId: toolUseId,
        childSessionId: active.childSessionId,
      });
    }
  }

  private async finalizeBackgroundSubagentsAfterParentStop(parentSessionId: string): Promise<void> {
    const entries = Array.from(this.activeSubagentSessions.entries()).filter(
      ([, active]) => active.parentSessionId === parentSessionId && active.runInBackground
    );

    for (const [toolUseId, active] of entries) {
      this.activeSubagentSessions.delete(toolUseId);
      await this.accumulateElapsedTime(active.childSessionId);
      this.emitAgentEvent(parentSessionId, {
        type: 'subagent_stopped',
        agentId: toolUseId,
        childSessionId: active.childSessionId,
      });
    }
  }

  private emitAiCallWideEvent(params: AiCallWideEventParams): void {
    try {
      ensureEvlogInitialized();
      const log = createEvlogRequestLogger({
        method: EVLOG_AGENT_METHOD,
        path: EVLOG_AGENT_PATH,
        requestId: params.requestId,
      });

      const msToFinish = Math.max(0, params.endedAtMs - params.startedAtMs);
      const msToFirstChunk =
        typeof params.firstChunkAtMs === 'number'
          ? Math.max(0, params.firstChunkAtMs - params.startedAtMs)
          : undefined;
      const totalTokens = resolveUsageTotalTokens(params.usage);
      const tokensPerSecond = resolveTokensPerSecond(
        params.usage?.outputTokens,
        msToFinish,
        msToFirstChunk
      );
      const toolCallNames = Array.from(
        new Set(params.toolUses.map((tool) => tool.name).filter(Boolean))
      );

      const aiEvent: Record<string, unknown> = {
        calls: 1,
        model: params.model,
        provider: params.provider,
        inputTokens: params.usage?.inputTokens ?? 0,
        outputTokens: params.usage?.outputTokens ?? 0,
        totalTokens,
        steps: Math.max(DEFAULT_AI_STEP_COUNT, params.stepCount),
        msToFinish,
      };

      if (params.usage?.cacheReadInputTokens) {
        aiEvent.cacheReadTokens = params.usage.cacheReadInputTokens;
      }
      if (params.usage?.cacheCreationInputTokens) {
        aiEvent.cacheWriteTokens = params.usage.cacheCreationInputTokens;
      }
      if (params.usage?.reasoningTokens) {
        aiEvent.reasoningTokens = params.usage.reasoningTokens;
      }
      if (typeof msToFirstChunk === 'number') {
        aiEvent.msToFirstChunk = msToFirstChunk;
      }
      if (typeof tokensPerSecond === 'number') {
        aiEvent.tokensPerSecond = tokensPerSecond;
      }
      if (toolCallNames.length > 0) {
        aiEvent.toolCalls = toolCallNames;
      }
      if (params.errorMessage) {
        aiEvent.error = params.errorMessage;
      }

      log.set({
        sessionId: params.sessionId,
        model: params.model,
        provider: params.provider,
        thinkingLevel: params.thinkingLevel ?? 'none',
        reasoningEffort: params.reasoningEffort ?? 'none',
        imageCount: params.imageCount,
        outcome: params.outcome,
        ai: aiEvent,
      });

      log.emit({
        status: params.status,
        _forceKeep: params.outcome !== 'success',
      });
    } catch (error) {
      this.logger.warn('EVLOG AI call telemetry could not be emitted:', error);
    }
  }

  private emitAgentEvent(sessionId: string, data: Record<string, unknown>): void {
    this.events.emit('agent:stream', { sessionId, ...data });
  }

  private async getSystemPrompt(): Promise<string> {
    // Load from settings (no caching - allows hot reload of custom prompts)
    const prompts = await getPromptCustomization(this.settingsService, '[AgentService]');
    return prompts.agent.systemPrompt;
  }

  private generateId(): string {
    return `msg_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
  }
}
