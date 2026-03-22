/**
 * Main window creation and lifecycle for Chat App
 *
 * Simplified window - no macOS titleBarStyle, smaller defaults.
 */

import path from 'path';
import { app, BrowserWindow, shell } from 'electron';
import { fileURLToPath } from 'url';
import { electronAppExists } from '@automaker/platform';
import { createLogger } from '@automaker/utils/logger';
import { MIN_WIDTH, MIN_HEIGHT, DEFAULT_WIDTH, DEFAULT_HEIGHT } from '../constants';
import { state } from '../state';
import { getIconPath } from '../utils/icon-manager';
import {
  loadWindowBounds,
  saveWindowBounds,
  validateBounds,
  scheduleSaveWindowBounds,
} from './window-bounds';

const logger = createLogger('ChatMainWindow');
const electronDir = path.dirname(fileURLToPath(import.meta.url));

const VITE_DEV_SERVER_URL = process.env.VITE_DEV_SERVER_URL;

function resolvePreloadPath(): string {
  const preloadJsPath = path.join(electronDir, 'preload.js');
  const preloadMjsPath = path.join(electronDir, 'preload.mjs');

  try {
    if (electronAppExists(preloadJsPath)) {
      return preloadJsPath;
    }
    if (electronAppExists(preloadMjsPath)) {
      return preloadMjsPath;
    }
  } catch {
    // Fallback below if path checks fail.
  }

  return preloadJsPath;
}

/**
 * Create the main window
 */
export function createWindow(): void {
  const iconPath = getIconPath();

  const savedBounds = loadWindowBounds();
  const validBounds = savedBounds ? validateBounds(savedBounds) : null;

  const windowOptions: Electron.BrowserWindowConstructorOptions = {
    width: validBounds?.width ?? DEFAULT_WIDTH,
    height: validBounds?.height ?? DEFAULT_HEIGHT,
    x: validBounds?.x,
    y: validBounds?.y,
    minWidth: MIN_WIDTH,
    minHeight: MIN_HEIGHT,
    webPreferences: {
      preload: resolvePreloadPath(),
      contextIsolation: true,
      nodeIntegration: false,
    },
    backgroundColor: '#0a0a0a',
    title: 'UniAI Chat',
  };

  if (iconPath) {
    windowOptions.icon = iconPath;
  }

  state.mainWindow = new BrowserWindow(windowOptions);

  if (validBounds?.isMaximized) {
    state.mainWindow.maximize();
  }

  if (VITE_DEV_SERVER_URL) {
    state.mainWindow.loadURL(VITE_DEV_SERVER_URL);
  } else {
    state.mainWindow.loadURL(`http://localhost:${state.staticPort}`);
  }

  if (!app.isPackaged && process.env.OPEN_DEVTOOLS === 'true') {
    state.mainWindow.webContents.openDevTools();
  }

  state.mainWindow.on('close', () => {
    if (state.mainWindow && !state.mainWindow.isDestroyed()) {
      const isMaximized = state.mainWindow.isMaximized();
      const bounds = isMaximized
        ? state.mainWindow.getNormalBounds()
        : state.mainWindow.getBounds();

      saveWindowBounds({
        x: bounds.x,
        y: bounds.y,
        width: bounds.width,
        height: bounds.height,
        isMaximized,
      });
    }
  });

  state.mainWindow.on('closed', () => {
    state.mainWindow = null;
  });

  state.mainWindow.on('resized', () => {
    scheduleSaveWindowBounds();
  });

  state.mainWindow.on('moved', () => {
    scheduleSaveWindowBounds();
  });

  state.mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });

  logger.info('Chat window created');
}
