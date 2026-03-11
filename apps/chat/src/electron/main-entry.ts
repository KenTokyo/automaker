/**
 * Electron main process entry point for Chat App
 *
 * Simplified version - no Docker/external server mode, no macOS Dock icon.
 * Always starts server with AUTOMAKER_MODE=chat.
 */

import path from 'path';
import { app, BrowserWindow, dialog } from 'electron';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import {
  setElectronUserDataPath,
  setElectronAppPaths,
  initAllowedPaths,
} from '@automaker/platform';
import { createLogger } from '@automaker/utils/logger';
import { DEFAULT_SERVER_PORT, DEFAULT_STATIC_PORT } from './constants';
import { state } from './state';
import { findAvailablePort } from './utils/port-manager';
import { ensureApiKey } from './security/api-key-manager';
import { createWindow } from './windows/main-window';
import { startStaticServer, stopStaticServer } from './server/static-server';
import { startServer, stopServer } from './server/backend-server';
import { registerAllHandlers } from './ipc';

const logger = createLogger('ChatElectron');
const electronDir = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.join(electronDir, '../../..');

const isDev = !app.isPackaged;

// Load environment variables from .env file (development only)
if (isDev) {
  dotenv.config({ path: path.join(electronDir, '../.env') });
}

// Register IPC handlers
registerAllHandlers();

// App lifecycle
app.whenReady().then(handleAppReady);
app.on('window-all-closed', handleWindowAllClosed);
app.on('before-quit', handleBeforeQuit);

/**
 * Handle app.whenReady()
 */
async function handleAppReady(): Promise<void> {
  // Set up userData path
  let userDataPathToUse: string;

  if (app.isPackaged) {
    try {
      const desiredUserDataPath = path.join(app.getPath('appData'), 'UniAI Chat');

      if (app.getPath('userData') !== desiredUserDataPath) {
        app.setPath('userData', desiredUserDataPath);
        logger.info('[PRODUCTION] userData path set to:', desiredUserDataPath);
      }

      userDataPathToUse = desiredUserDataPath;
    } catch (error) {
      logger.warn('[PRODUCTION] Failed to set userData path:', (error as Error).message);
      userDataPathToUse = app.getPath('userData');
    }
  } else {
    // Development: share data with web mode via project root
    userDataPathToUse = path.join(projectRoot, 'data');

    try {
      app.setPath('userData', userDataPathToUse);
      logger.info('[DEVELOPMENT] userData path set to:', userDataPathToUse);
    } catch (error) {
      logger.warn('[DEVELOPMENT] Failed to set userData path:', (error as Error).message);
      userDataPathToUse = path.join(projectRoot, 'data');
    }
  }

  // Initialize centralized path helpers
  setElectronUserDataPath(userDataPathToUse);

  if (isDev) {
    setElectronAppPaths([electronDir, projectRoot]);
  } else {
    setElectronAppPaths(electronDir, process.resourcesPath);
  }

  logger.info('Initialized path security helpers');

  const mainProcessDataDir = app.isPackaged
    ? app.getPath('userData')
    : path.join(process.cwd(), 'data');
  process.env.DATA_DIR = mainProcessDataDir;

  initAllowedPaths();

  try {
    // Generate or load API key for CSRF protection
    ensureApiKey();

    if (process.env.AUTOMAKER_AUTO_LOGIN === undefined) {
      process.env.AUTOMAKER_AUTO_LOGIN = 'true';
      logger.info('AUTOMAKER_AUTO_LOGIN enabled for chat mode');
    }

    // Find available ports
    state.serverPort = await findAvailablePort(DEFAULT_SERVER_PORT);
    if (state.serverPort !== DEFAULT_SERVER_PORT) {
      logger.info(
        'Default server port',
        DEFAULT_SERVER_PORT,
        'in use, using port',
        state.serverPort
      );
    }

    state.staticPort = await findAvailablePort(DEFAULT_STATIC_PORT);
    if (state.staticPort !== DEFAULT_STATIC_PORT) {
      logger.info(
        'Default static port',
        DEFAULT_STATIC_PORT,
        'in use, using port',
        state.staticPort
      );
    }

    // Start static file server in production
    if (app.isPackaged) {
      await startStaticServer();
    }

    // Start backend server with AUTOMAKER_MODE=chat
    await startServer();

    // Create window
    createWindow();
  } catch (error) {
    logger.error('Failed to start:', error);

    const errorMessage = (error as Error).message;
    const isNodeError = errorMessage.includes('Node.js');

    dialog.showErrorBox(
      'UniAI Chat Failed to Start',
      `The application failed to start.\n\n${errorMessage}\n\n${
        isNodeError
          ? 'Please install Node.js from https://nodejs.org or via a package manager.'
          : 'Please check the application logs for more details.'
      }`
    );
    app.quit();
  }

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
}

/**
 * Handle window-all-closed event
 */
function handleWindowAllClosed(): void {
  if (process.platform !== 'darwin') {
    stopServer();
    stopStaticServer();
    app.quit();
  }
}

/**
 * Handle before-quit event
 */
function handleBeforeQuit(): void {
  stopServer();
  stopStaticServer();
}
