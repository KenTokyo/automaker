/**
 * Server IPC handlers for Chat App
 */

import { ipcMain } from 'electron';
import { IPC_CHANNELS } from './channels';
import { state } from '../state';

/**
 * Register server IPC handlers
 */
export function registerServerHandlers(): void {
  ipcMain.handle(IPC_CHANNELS.SERVER.GET_URL, async () => {
    return `http://localhost:${state.serverPort}`;
  });

  ipcMain.handle(IPC_CHANNELS.PING, async () => {
    return 'pong';
  });
}
