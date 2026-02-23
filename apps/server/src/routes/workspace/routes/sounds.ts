/**
 * Workspace sound routes:
 * - GET /sounds: list custom .mp3 files from .uniai-chat/sounds
 * - GET /sounds/file?path=...: stream a specific custom .mp3 file
 */

import type { Request, Response } from 'express';
import path from 'path';
import { getAllowedRootDirectory } from '@automaker/platform';
import * as secureFs from '../../../lib/secure-fs.js';
import { getErrorMessage, logError } from '../common.js';

const CUSTOM_SOUNDS_DIR = ['.uniai-chat', 'sounds'] as const;

interface WorkspaceSound {
  name: string;
  path: string;
}

function getResolvedWorkspaceRoot(): string | null {
  const allowedRootDirectory = getAllowedRootDirectory();
  if (!allowedRootDirectory) {
    return null;
  }
  return path.resolve(allowedRootDirectory);
}

function getResolvedSoundsDirectory(workspaceRoot: string): string {
  return path.join(workspaceRoot, ...CUSTOM_SOUNDS_DIR);
}

function isPathInside(baseDir: string, candidatePath: string): boolean {
  const relative = path.relative(baseDir, candidatePath);
  return relative === '' || (!relative.startsWith('..') && !path.isAbsolute(relative));
}

function isWorkspaceSoundFilePath(workspaceRoot: string, soundPath: string): boolean {
  if (!isPathInside(workspaceRoot, soundPath)) {
    return false;
  }

  const normalizedParentDir = path.normalize(path.dirname(soundPath)).toLowerCase();
  const normalizedSoundsDirSuffix = path.normalize(path.join(...CUSTOM_SOUNDS_DIR)).toLowerCase();
  return normalizedParentDir.endsWith(normalizedSoundsDirSuffix);
}

export function createSoundsHandler() {
  return async (req: Request, res: Response): Promise<void> => {
    try {
      const workspaceRoot = getResolvedWorkspaceRoot();
      if (!workspaceRoot) {
        res.status(400).json({
          success: false,
          error: 'ALLOWED_ROOT_DIRECTORY is not configured',
        });
        return;
      }

      // Validate workspace root exists before scanning for sounds.
      try {
        const rootStats = await secureFs.stat(workspaceRoot);
        if (!rootStats.isDirectory()) {
          res.status(400).json({
            success: false,
            error: 'Workspace directory path is not a directory',
          });
          return;
        }
      } catch {
        res.status(400).json({
          success: false,
          error: 'Workspace directory path does not exist',
        });
        return;
      }

      const requestedProjectPath =
        typeof req.query.projectPath === 'string' ? req.query.projectPath.trim() : '';
      const scanRoot =
        requestedProjectPath.length > 0 ? path.resolve(requestedProjectPath) : workspaceRoot;

      if (!isPathInside(workspaceRoot, scanRoot)) {
        res.status(403).json({
          success: false,
          error: 'Requested projectPath is outside the allowed workspace root',
        });
        return;
      }

      try {
        const scanRootStats = await secureFs.stat(scanRoot);
        if (!scanRootStats.isDirectory()) {
          res.status(400).json({
            success: false,
            error: 'Requested projectPath is not a directory',
          });
          return;
        }
      } catch {
        res.status(400).json({
          success: false,
          error: 'Requested projectPath does not exist',
        });
        return;
      }

      const soundsDir = getResolvedSoundsDirectory(scanRoot);
      let entries: Awaited<ReturnType<typeof secureFs.readdir>>;

      try {
        entries = await secureFs.readdir(soundsDir, { withFileTypes: true });
      } catch {
        // If the folder does not exist yet, return an empty sound list.
        res.json({
          success: true,
          sounds: [],
        });
        return;
      }

      const sounds: WorkspaceSound[] = entries
        .filter((entry) => entry.isFile() && entry.name.toLowerCase().endsWith('.mp3'))
        .map((entry) => ({
          name: entry.name,
          path: path.join(soundsDir, entry.name),
        }))
        .sort((a, b) => a.name.localeCompare(b.name));

      res.json({
        success: true,
        sounds,
      });
    } catch (error) {
      logError(error, 'Scan workspace sounds failed');
      res.status(500).json({ success: false, error: getErrorMessage(error) });
    }
  };
}

export function createSoundFileHandler() {
  return async (req: Request, res: Response): Promise<void> => {
    try {
      const rawPath = req.query.path;
      if (typeof rawPath !== 'string' || rawPath.trim().length === 0) {
        res.status(400).json({
          success: false,
          error: 'Missing required query parameter: path',
        });
        return;
      }

      const workspaceRoot = getResolvedWorkspaceRoot();
      if (!workspaceRoot) {
        res.status(400).json({
          success: false,
          error: 'ALLOWED_ROOT_DIRECTORY is not configured',
        });
        return;
      }

      const resolvedSoundPath = path.resolve(rawPath);

      // Restrict playback to files under <workspace>/**/.uniai-chat/sounds.
      if (!isWorkspaceSoundFilePath(workspaceRoot, resolvedSoundPath)) {
        res.status(403).json({
          success: false,
          error: 'Requested sound path is outside the allowed custom sounds directory',
        });
        return;
      }

      if (!resolvedSoundPath.toLowerCase().endsWith('.mp3')) {
        res.status(400).json({
          success: false,
          error: 'Only .mp3 files are supported',
        });
        return;
      }

      let stats: Awaited<ReturnType<typeof secureFs.stat>>;
      try {
        stats = await secureFs.stat(resolvedSoundPath);
      } catch {
        res.status(404).json({
          success: false,
          error: 'Sound file not found',
        });
        return;
      }

      if (!stats.isFile()) {
        res.status(400).json({
          success: false,
          error: 'Requested path is not a file',
        });
        return;
      }

      const fileContent = await secureFs.readFile(resolvedSoundPath);
      const audioBuffer = Buffer.isBuffer(fileContent) ? fileContent : Buffer.from(fileContent);

      res.setHeader('Content-Type', 'audio/mpeg');
      res.setHeader('Cache-Control', 'no-store');
      res.setHeader('Content-Length', String(audioBuffer.length));
      res.send(audioBuffer);
    } catch (error) {
      logError(error, 'Load custom workspace sound failed');
      res.status(500).json({ success: false, error: getErrorMessage(error) });
    }
  };
}
