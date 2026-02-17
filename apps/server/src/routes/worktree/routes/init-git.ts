/**
 * POST /init-git endpoint - Initialize a git repository in a directory
 */

import type { Request, Response } from 'express';
import { exec } from 'child_process';
import { promisify } from 'util';
import * as secureFs from '../../../lib/secure-fs.js';
import { join } from 'path';
import { getErrorMessage, logError } from '../common.js';

const execAsync = promisify(exec);

export function createInitGitHandler() {
  return async (req: Request, res: Response): Promise<void> => {
    try {
      const { projectPath } = req.body as {
        projectPath: string;
      };

      if (!projectPath) {
        res.status(400).json({
          success: false,
          error: 'projectPath required',
        });
        return;
      }

      // Check if .git already exists in this directory
      const gitDirPath = join(projectPath, '.git');
      try {
        await secureFs.access(gitDirPath);
        // .git exists
        res.json({
          success: true,
          result: {
            initialized: false,
            message: 'Git repository already exists',
          },
        });
        return;
      } catch {
        // .git doesn't exist locally, continue with checks
      }

      // Check if this directory is already inside a parent git repository
      // This prevents creating nested repos which get treated as submodules
      try {
        const { stdout } = await execAsync('git rev-parse --show-toplevel', {
          cwd: projectPath,
        });
        const parentRepo = stdout.trim();
        if (parentRepo) {
          // Already inside a git repo — don't create a nested one
          res.json({
            success: true,
            result: {
              initialized: false,
              message: `Already inside git repository: ${parentRepo}`,
              parentRepository: parentRepo,
            },
          });
          return;
        }
      } catch {
        // Not inside any git repo — safe to initialize
      }

      // Initialize git with 'main' as the default branch (matching GitHub's standard since 2020)
      // and create an initial empty commit
      await execAsync(
        `git init --initial-branch=main && git commit --allow-empty -m "Initial commit"`,
        {
          cwd: projectPath,
        }
      );

      res.json({
        success: true,
        result: {
          initialized: true,
          message: 'Git repository initialized with initial commit',
        },
      });
    } catch (error) {
      logError(error, 'Init git failed');
      res.status(500).json({ success: false, error: getErrorMessage(error) });
    }
  };
}
