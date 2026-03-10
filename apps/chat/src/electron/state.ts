/**
 * Electron main process shared state for Chat App
 *
 * Centralized state container to avoid circular dependencies.
 */

import { BrowserWindow } from 'electron';
import { ChildProcess } from 'child_process';
import { Server } from 'http';
import { DEFAULT_SERVER_PORT, DEFAULT_STATIC_PORT } from './constants';

export interface ElectronState {
  mainWindow: BrowserWindow | null;
  serverProcess: ChildProcess | null;
  staticServer: Server | null;
  serverPort: number;
  staticPort: number;
  apiKey: string | null;
  saveWindowBoundsTimeout: ReturnType<typeof setTimeout> | null;
}

export const state: ElectronState = {
  mainWindow: null,
  serverProcess: null,
  staticServer: null,
  serverPort: DEFAULT_SERVER_PORT,
  staticPort: DEFAULT_STATIC_PORT,
  apiKey: null,
  saveWindowBoundsTimeout: null,
};
