/**
 * Backend server management for Chat App
 *
 * Starts the Express server with AUTOMAKER_MODE=chat.
 */

import path from 'path';
import http from 'http';
import { spawn, execSync } from 'child_process';
import { app } from 'electron';
import { createRequire } from 'module';
import { fileURLToPath } from 'url';
import {
  findNodeExecutable,
  buildEnhancedPath,
  electronAppExists,
  systemPathExists,
} from '@automaker/platform';
import { createLogger } from '@automaker/utils/logger';
import { state } from '../state';

const logger = createLogger('ChatBackendServer');
const serverLogger = createLogger('ChatServer');
const require = createRequire(import.meta.url);
const electronDir = path.dirname(fileURLToPath(import.meta.url));

/**
 * Start the backend server with AUTOMAKER_MODE=chat
 */
export async function startServer(): Promise<void> {
  const isDev = !app.isPackaged;

  const nodeResult = findNodeExecutable({
    skipSearch: isDev,
    logger: (msg: string) => logger.info(msg),
  });
  const command = nodeResult.nodePath;

  if (command !== 'node') {
    let exists: boolean;
    try {
      exists = systemPathExists(command);
    } catch (error) {
      const originalError = error instanceof Error ? error.message : String(error);
      throw new Error(
        `Failed to verify Node.js executable at: ${command} (source: ${nodeResult.source}). Reason: ${originalError}`
      );
    }
    if (!exists) {
      throw new Error(`Node.js executable not found at: ${command} (source: ${nodeResult.source})`);
    }
  }

  let args: string[];
  let serverPath: string;

  if (isDev) {
    serverPath = path.join(electronDir, '../../server/src/index.ts');

    const serverNodeModules = path.join(electronDir, '../../server/node_modules/tsx');
    const rootNodeModules = path.join(electronDir, '../../../node_modules/tsx');

    let tsxCliPath: string;
    const serverTsxPath = path.join(serverNodeModules, 'dist/cli.mjs');
    const rootTsxPath = path.join(rootNodeModules, 'dist/cli.mjs');

    try {
      if (electronAppExists(serverTsxPath)) {
        tsxCliPath = serverTsxPath;
      } else if (electronAppExists(rootTsxPath)) {
        tsxCliPath = rootTsxPath;
      } else {
        tsxCliPath = require.resolve('tsx/cli.mjs', {
          paths: [path.join(electronDir, '../../server')],
        });
      }
    } catch {
      try {
        tsxCliPath = require.resolve('tsx/cli.mjs', {
          paths: [path.join(electronDir, '../../server')],
        });
      } catch {
        throw new Error("Could not find tsx. Please run 'npm install' in the server directory.");
      }
    }

    args = [tsxCliPath, 'watch', serverPath];
  } else {
    serverPath = path.join(process.resourcesPath, 'server', 'index.js');
    args = [serverPath];

    if (!electronAppExists(serverPath)) {
      throw new Error(`Server not found at: ${serverPath}`);
    }
  }

  const serverNodeModules = app.isPackaged
    ? path.join(process.resourcesPath, 'server', 'node_modules')
    : path.join(electronDir, '../../server/node_modules');

  const serverRoot = app.isPackaged
    ? path.join(process.resourcesPath, 'server')
    : path.join(electronDir, '../../server');

  const dataDir = app.isPackaged
    ? app.getPath('userData')
    : path.join(electronDir, '../../..', 'data');

  const enhancedPath = buildEnhancedPath(command, process.env.PATH || '');

  const env = {
    ...process.env,
    PATH: enhancedPath,
    PORT: state.serverPort.toString(),
    DATA_DIR: dataDir,
    NODE_PATH: serverNodeModules,
    AUTOMAKER_API_KEY: state.apiKey!,
    // Chat mode - server will gate off board/terminal routes
    AUTOMAKER_MODE: 'chat',
    AUTOMAKER_AUTO_LOGIN: process.env.AUTOMAKER_AUTO_LOGIN ?? 'true',
    ...(process.env.ALLOWED_ROOT_DIRECTORY && {
      ALLOWED_ROOT_DIRECTORY: process.env.ALLOWED_ROOT_DIRECTORY,
    }),
  };

  logger.info('Starting backend server in chat mode...');
  logger.info('Server path:', serverPath);
  logger.info('Server port:', state.serverPort);

  state.serverProcess = spawn(command, args, {
    cwd: serverRoot,
    env,
    stdio: ['ignore', 'pipe', 'pipe'],
  });

  state.serverProcess.stdout?.on('data', (data) => {
    serverLogger.info(data.toString().trim());
  });

  state.serverProcess.stderr?.on('data', (data) => {
    serverLogger.error(data.toString().trim());
  });

  state.serverProcess.on('close', (code) => {
    serverLogger.info('Process exited with code', code);
    state.serverProcess = null;
  });

  state.serverProcess.on('error', (err) => {
    serverLogger.error('Failed to start server process:', err);
    state.serverProcess = null;
  });

  await waitForServer();
}

/**
 * Wait for server to be available
 */
export async function waitForServer(maxAttempts = 30): Promise<void> {
  for (let i = 0; i < maxAttempts; i++) {
    try {
      await new Promise<void>((resolve, reject) => {
        const req = http.get(`http://localhost:${state.serverPort}/api/health`, (res) => {
          if (res.statusCode === 200) {
            resolve();
          } else {
            reject(new Error(`Status: ${res.statusCode}`));
          }
        });
        req.on('error', reject);
        req.setTimeout(1000, () => {
          req.destroy();
          reject(new Error('Timeout'));
        });
      });
      logger.info('Server is ready');
      return;
    } catch {
      await new Promise((r) => setTimeout(r, 500));
    }
  }

  throw new Error('Server failed to start');
}

/**
 * Stop the backend server if running
 */
export function stopServer(): void {
  if (state.serverProcess && state.serverProcess.pid) {
    logger.info('Stopping server...');
    if (process.platform === 'win32') {
      try {
        execSync(`taskkill /f /t /pid ${state.serverProcess.pid}`, { stdio: 'ignore' });
      } catch (error) {
        logger.error('Failed to kill server process:', (error as Error).message);
      }
    } else {
      state.serverProcess.kill('SIGTERM');
    }
    state.serverProcess = null;
  }
}
