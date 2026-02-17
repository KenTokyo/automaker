/**
 * POST /clone endpoint - Clone a GitHub template to a new project directory
 */

import type { Request, Response } from 'express';
import { exec, spawn } from 'child_process';
import { promisify } from 'util';
import path from 'path';
import * as secureFs from '../../../lib/secure-fs.js';
import { PathNotAllowedError } from '@automaker/platform';
import { logger, getErrorMessage, logError } from '../common.js';

const execAsync = promisify(exec);

export function createCloneHandler() {
  return async (req: Request, res: Response): Promise<void> => {
    try {
      const { repoUrl, projectName, parentDir } = req.body as {
        repoUrl: string;
        projectName: string;
        parentDir: string;
      };

      // Validate inputs
      if (!repoUrl || !projectName || !parentDir) {
        res.status(400).json({
          success: false,
          error: 'repoUrl, projectName, and parentDir are required',
        });
        return;
      }

      logger.info(
        `[Templates] Clone request - Repo: ${repoUrl}, Project: ${projectName}, Parent: ${parentDir}`
      );

      // Validate repo URL is a valid GitHub URL
      const githubUrlPattern = /^https:\/\/github\.com\/[\w-]+\/[\w.-]+$/;
      if (!githubUrlPattern.test(repoUrl)) {
        res.status(400).json({
          success: false,
          error: 'Invalid GitHub repository URL',
        });
        return;
      }

      // Sanitize project name (allow alphanumeric, dash, underscore)
      const sanitizedName = projectName.replace(/[^a-zA-Z0-9-_]/g, '-');
      if (sanitizedName !== projectName) {
        logger.info(`[Templates] Sanitized project name: ${projectName} -> ${sanitizedName}`);
      }

      // Build full project path
      const projectPath = path.join(parentDir, sanitizedName);

      const resolvedParent = path.resolve(parentDir);
      const resolvedProject = path.resolve(projectPath);
      const relativePath = path.relative(resolvedParent, resolvedProject);
      if (relativePath.startsWith('..') || path.isAbsolute(relativePath)) {
        res.status(400).json({
          success: false,
          error: 'Invalid project name; potential path traversal attempt.',
        });
        return;
      }

      // Check if directory already exists (secureFs.access also validates path is allowed)
      try {
        await secureFs.access(projectPath);
        res.status(400).json({
          success: false,
          error: `Directory "${sanitizedName}" already exists in ${parentDir}`,
        });
        return;
      } catch (accessError) {
        if (accessError instanceof PathNotAllowedError) {
          res.status(403).json({
            success: false,
            error: `Project path not allowed: ${projectPath}. Must be within ALLOWED_ROOT_DIRECTORY.`,
          });
          return;
        }
        // Directory doesn't exist, which is what we want
      }

      // Ensure parent directory exists
      try {
        // Check if parentDir is a root path (Windows: C:\, D:\, etc. or Unix: /)
        const isWindowsRoot = /^[A-Za-z]:\\?$/.test(parentDir);
        const isUnixRoot = parentDir === '/' || parentDir === '';
        const isRoot = isWindowsRoot || isUnixRoot;

        if (isRoot) {
          // Root paths always exist, just verify access
          logger.info(`[Templates] Using root path: ${parentDir}`);
          await secureFs.access(parentDir);
        } else {
          // Check if parent directory exists
          let parentExists = false;
          try {
            await secureFs.access(parentDir);
            parentExists = true;
          } catch {
            parentExists = false;
          }

          if (!parentExists) {
            logger.info(`[Templates] Creating parent directory: ${parentDir}`);
            await secureFs.mkdir(parentDir, { recursive: true });
          } else {
            logger.info(`[Templates] Parent directory exists: ${parentDir}`);
          }
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        logger.error('[Templates] Failed to access parent directory:', parentDir, error);
        res.status(500).json({
          success: false,
          error: `Failed to access parent directory: ${errorMessage}`,
        });
        return;
      }

      logger.info(`[Templates] Cloning ${repoUrl} to ${projectPath}`);

      // Clone the repository
      const cloneResult = await new Promise<{
        success: boolean;
        error?: string;
      }>((resolve) => {
        const gitProcess = spawn('git', ['clone', repoUrl, projectPath], {
          cwd: parentDir,
        });

        let stderr = '';

        gitProcess.stderr.on('data', (data) => {
          stderr += data.toString();
        });

        gitProcess.on('close', (code) => {
          if (code === 0) {
            resolve({ success: true });
          } else {
            resolve({
              success: false,
              error: stderr || `Git clone failed with code ${code}`,
            });
          }
        });

        gitProcess.on('error', (error) => {
          resolve({
            success: false,
            error: `Failed to spawn git: ${error.message}`,
          });
        });
      });

      if (!cloneResult.success) {
        res.status(500).json({
          success: false,
          error: cloneResult.error || 'Failed to clone repository',
        });
        return;
      }

      // Remove .git directory to start fresh
      try {
        const gitDir = path.join(projectPath, '.git');
        await secureFs.rm(gitDir, { recursive: true, force: true });
        logger.info('[Templates] Removed .git directory');
      } catch (error) {
        logger.warn('[Templates] Could not remove .git directory:', error);
        // Continue anyway - not critical
      }

      // Check if the project directory is inside a parent git repository
      // If so, skip git init to avoid creating a nested repo (treated as submodule)
      let insideParentRepo = false;
      try {
        const { stdout } = await execAsync('git rev-parse --show-toplevel', {
          cwd: projectPath,
        });
        if (stdout.trim()) {
          insideParentRepo = true;
          logger.info(
            `[Templates] Project is inside parent git repo: ${stdout.trim()}, skipping git init`
          );
        }
      } catch {
        // Not inside any git repo
      }

      if (!insideParentRepo) {
        // Initialize a fresh git repository only when not inside a parent repo
        await new Promise<void>((resolve) => {
          const gitInit = spawn('git', ['init'], {
            cwd: projectPath,
          });

          gitInit.on('close', () => {
            logger.info('[Templates] Initialized fresh git repository');
            resolve();
          });

          gitInit.on('error', () => {
            logger.warn('[Templates] Could not initialize git');
            resolve();
          });
        });
      }

      logger.info(`[Templates] Successfully cloned template to ${projectPath}`);

      res.json({
        success: true,
        projectPath,
        projectName: sanitizedName,
      });
    } catch (error) {
      logError(error, 'Clone template failed');
      res.status(500).json({ success: false, error: getErrorMessage(error) });
    }
  };
}
