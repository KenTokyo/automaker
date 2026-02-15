/**
 * Agent Prompts Routes - HTTP API for managing custom agent prompts
 *
 * Provides CRUD operations for agent prompts stored as .md files.
 * Supports both global prompts (DATA_DIR/agents/) and project-specific prompts.
 *
 * Endpoints:
 * - POST /api/agent-prompts/list - List all prompts (global + local)
 * - POST /api/agent-prompts/add - Add a new prompt
 * - PUT /api/agent-prompts/update - Update an existing prompt
 * - DELETE /api/agent-prompts/delete - Delete a prompt
 */

import { Router } from 'express';
import type { Request, Response } from 'express';
import { createLogger } from '@automaker/utils';
import {
  loadAgentPrompts,
  addAgentPrompt,
  updateAgentPrompt,
  deleteAgentPrompt,
  type AgentPromptScope,
} from '../../services/agent-prompts-service.js';

const logger = createLogger('AgentPromptsRoutes');

/**
 * Create agent prompts router with all endpoints
 */
export function createAgentPromptsRoutes(): Router {
  const router = Router();

  /**
   * List all agent prompts (both global and local)
   * POST /api/agent-prompts/list
   * Body: { projectPath?: string }
   */
  router.post('/list', async (req: Request, res: Response) => {
    try {
      const { projectPath } = req.body as { projectPath?: string };

      logger.debug(`Loading agent prompts${projectPath ? ` for project: ${projectPath}` : ''}`);

      const result = await loadAgentPrompts(projectPath);

      res.json({
        success: true,
        globalPrompts: result.globalPrompts,
        localPrompts: result.localPrompts,
      });
    } catch (error) {
      logger.error('Failed to load agent prompts:', error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to load agent prompts',
      });
    }
  });

  /**
   * Add a new agent prompt
   * POST /api/agent-prompts/add
   * Body: { name: string, prompt: string, scope: 'global' | 'local', projectPath?: string }
   */
  router.post('/add', async (req: Request, res: Response) => {
    try {
      const { name, prompt, scope, projectPath } = req.body as {
        name: string;
        prompt: string;
        scope: AgentPromptScope;
        projectPath?: string;
      };

      if (!name?.trim()) {
        return res.status(400).json({
          success: false,
          error: 'Name is required',
        });
      }

      if (!prompt?.trim()) {
        return res.status(400).json({
          success: false,
          error: 'Prompt content is required',
        });
      }

      if (scope !== 'global' && scope !== 'local') {
        return res.status(400).json({
          success: false,
          error: 'Invalid scope. Must be "global" or "local"',
        });
      }

      if (scope === 'local' && !projectPath) {
        return res.status(400).json({
          success: false,
          error: 'projectPath is required for local prompts',
        });
      }

      logger.info(`Adding ${scope} agent prompt: ${name}`);

      const result = await addAgentPrompt(name.trim(), prompt.trim(), scope, projectPath);

      if (!result) {
        return res.status(400).json({
          success: false,
          error: 'Failed to add agent prompt. It may already exist.',
        });
      }

      res.json({
        success: true,
        prompt: result,
      });
    } catch (error) {
      logger.error('Failed to add agent prompt:', error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to add agent prompt',
      });
    }
  });

  /**
   * Update an existing agent prompt
   * PUT /api/agent-prompts/update
   * Body: { id: string, name: string, prompt: string, scope: 'global' | 'local', projectPath?: string }
   */
  router.put('/update', async (req: Request, res: Response) => {
    try {
      const { id, name, prompt, scope, projectPath } = req.body as {
        id: string;
        name: string;
        prompt: string;
        scope: AgentPromptScope;
        projectPath?: string;
      };

      if (!id?.trim()) {
        return res.status(400).json({
          success: false,
          error: 'ID is required',
        });
      }

      if (!name?.trim()) {
        return res.status(400).json({
          success: false,
          error: 'Name is required',
        });
      }

      if (!prompt?.trim()) {
        return res.status(400).json({
          success: false,
          error: 'Prompt content is required',
        });
      }

      if (scope !== 'global' && scope !== 'local') {
        return res.status(400).json({
          success: false,
          error: 'Invalid scope. Must be "global" or "local"',
        });
      }

      if (scope === 'local' && !projectPath) {
        return res.status(400).json({
          success: false,
          error: 'projectPath is required for local prompts',
        });
      }

      logger.info(`Updating ${scope} agent prompt: ${id}`);

      const result = await updateAgentPrompt(
        id.trim(),
        name.trim(),
        prompt.trim(),
        scope,
        projectPath
      );

      if (!result) {
        return res.status(400).json({
          success: false,
          error: 'Failed to update agent prompt',
        });
      }

      res.json({
        success: true,
        prompt: result,
      });
    } catch (error) {
      logger.error('Failed to update agent prompt:', error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to update agent prompt',
      });
    }
  });

  /**
   * Delete an agent prompt
   * DELETE /api/agent-prompts/delete
   * Body: { id: string, scope: 'global' | 'local', projectPath?: string }
   */
  router.delete('/delete', async (req: Request, res: Response) => {
    try {
      const { id, scope, projectPath } = req.body as {
        id: string;
        scope: AgentPromptScope;
        projectPath?: string;
      };

      if (!id?.trim()) {
        return res.status(400).json({
          success: false,
          error: 'ID is required',
        });
      }

      if (scope !== 'global' && scope !== 'local') {
        return res.status(400).json({
          success: false,
          error: 'Invalid scope. Must be "global" or "local"',
        });
      }

      if (scope === 'local' && !projectPath) {
        return res.status(400).json({
          success: false,
          error: 'projectPath is required for local prompts',
        });
      }

      logger.info(`Deleting ${scope} agent prompt: ${id}`);

      const success = await deleteAgentPrompt(id.trim(), scope, projectPath);

      if (!success) {
        return res.status(400).json({
          success: false,
          error: 'Failed to delete agent prompt',
        });
      }

      res.json({
        success: true,
      });
    } catch (error) {
      logger.error('Failed to delete agent prompt:', error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to delete agent prompt',
      });
    }
  });

  return router;
}
