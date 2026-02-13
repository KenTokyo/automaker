/**
 * POST /api/docs/ai-transform - AI text transformation for docs editor
 *
 * Transforms selected text using AI based on the specified command.
 * Supports: rewrite, summarize, expand, fix-grammar, translate, simplify, professional, custom.
 */

import type { Request, Response } from 'express';
import { createLogger } from '@automaker/utils';
import { resolveModelString } from '@automaker/model-resolver';
import { CLAUDE_MODEL_MAP } from '@automaker/types';
import { simpleQuery } from '../../../providers/simple-query-service.js';
import type { SettingsService } from '../../../services/settings-service.js';
import { getProviderByModelId } from '../../../lib/settings-helpers.js';

const logger = createLogger('DocsAITransform');

/** Supported AI transformation commands */
type TransformCommand =
  | 'rewrite'
  | 'summarize'
  | 'expand'
  | 'fix-grammar'
  | 'translate'
  | 'simplify'
  | 'professional'
  | 'custom';

const VALID_COMMANDS = new Set<TransformCommand>([
  'rewrite',
  'summarize',
  'expand',
  'fix-grammar',
  'translate',
  'simplify',
  'professional',
  'custom',
]);

interface TransformRequestBody {
  text: string;
  command: string;
  customPrompt?: string;
  context?: string;
  language?: string;
  model?: string;
  projectPath?: string;
}

/**
 * Build the system prompt for the given transformation command.
 */
function buildSystemPrompt(command: TransformCommand, language?: string): string {
  const base =
    'You are a text transformation assistant for a document editor. ' +
    'Return ONLY the transformed text, with no explanations, preambles, or wrapper formatting. ' +
    'Preserve the original Markdown formatting (headings, lists, bold, italic, code, links, etc.) ' +
    'unless the transformation explicitly requires changing it.';

  const commandPrompts: Record<TransformCommand, string> = {
    rewrite: `${base}\n\nRewrite the following text with the same meaning but different wording and improved clarity.`,
    summarize: `${base}\n\nSummarize the following text concisely while preserving key information.`,
    expand: `${base}\n\nExpand the following text with more detail, examples, and elaboration.`,
    'fix-grammar': `${base}\n\nFix all grammar, spelling, and punctuation errors in the following text. Keep the meaning and style unchanged.`,
    translate: `${base}\n\nTranslate the following text into ${language || 'English'}. Preserve the original tone and Markdown formatting.`,
    simplify: `${base}\n\nSimplify the following text so it is easy to understand. Use shorter sentences and simpler words.`,
    professional: `${base}\n\nRewrite the following text in a formal, professional tone suitable for business communication.`,
    custom: base,
  };

  return commandPrompts[command];
}

/**
 * Create the AI text transform handler
 */
export function createAITransformHandler(
  settingsService?: SettingsService
): (req: Request, res: Response) => Promise<void> {
  return async (req: Request, res: Response): Promise<void> => {
    try {
      const { text, command, customPrompt, context, language, model, projectPath } =
        req.body as TransformRequestBody;

      // Validate required fields
      if (!text || typeof text !== 'string') {
        res.status(400).json({ success: false, error: 'text is required and must be a string' });
        return;
      }

      if (!command || typeof command !== 'string') {
        res.status(400).json({ success: false, error: 'command is required and must be a string' });
        return;
      }

      const trimmedText = text.trim();
      if (trimmedText.length === 0) {
        res.status(400).json({ success: false, error: 'text cannot be empty' });
        return;
      }

      // Validate command
      const normalizedCommand = command.toLowerCase() as TransformCommand;
      if (!VALID_COMMANDS.has(normalizedCommand)) {
        res.status(400).json({
          success: false,
          error: `Invalid command: ${command}. Valid commands: ${[...VALID_COMMANDS].join(', ')}`,
        });
        return;
      }

      // Custom command requires customPrompt
      if (normalizedCommand === 'custom' && (!customPrompt || customPrompt.trim().length === 0)) {
        res.status(400).json({
          success: false,
          error: 'customPrompt is required for the custom command',
        });
        return;
      }

      // Warn about very large selections
      if (trimmedText.length > 10000) {
        logger.warn(`Large text selection: ${trimmedText.length} chars`);
      }

      logger.info(
        `AI transform: command="${normalizedCommand}", text length=${trimmedText.length}`
      );

      // Build prompts
      const systemPrompt = buildSystemPrompt(normalizedCommand, language);
      let userPrompt: string;

      if (normalizedCommand === 'custom') {
        userPrompt = `Instruction: ${customPrompt}\n\nText to transform:\n${trimmedText}`;
      } else {
        userPrompt = trimmedText;
      }

      // Add surrounding context if provided
      if (context && context.trim().length > 0) {
        userPrompt = `Context (surrounding text for reference, do NOT include in output):\n---\n${context.trim()}\n---\n\nText to transform:\n${userPrompt}`;
      }

      // Resolve provider/model
      let claudeCompatibleProvider: import('@automaker/types').ClaudeCompatibleProvider | undefined;
      let providerResolvedModel: string | undefined;
      let credentials = await settingsService?.getCredentials();

      if (model && settingsService) {
        const providerResult = await getProviderByModelId(
          model,
          settingsService,
          '[DocsAITransform]'
        );
        if (providerResult.provider) {
          claudeCompatibleProvider = providerResult.provider;
          providerResolvedModel = providerResult.resolvedModel;
          credentials = providerResult.credentials;
        }
      }

      const resolvedModel =
        providerResolvedModel || resolveModelString(model, CLAUDE_MODEL_MAP.sonnet);

      logger.debug(`Using model: ${resolvedModel}`);

      const result = await simpleQuery({
        prompt: `${systemPrompt}\n\n${userPrompt}`,
        model: resolvedModel,
        cwd: process.cwd(),
        maxTurns: 1,
        allowedTools: [],
        readOnly: true,
        credentials,
        claudeCompatibleProvider,
      });

      const transformedText = result.text;

      if (!transformedText || transformedText.trim().length === 0) {
        logger.warn('Received empty response from AI');
        res.status(500).json({
          success: false,
          error: 'Failed to transform text - empty response from AI',
        });
        return;
      }

      logger.info(`Transform complete: ${transformedText.length} chars output`);

      res.json({
        success: true,
        transformedText: transformedText.trim(),
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      logger.error('AI transform failed:', errorMessage);
      res.status(500).json({ success: false, error: errorMessage });
    }
  };
}
