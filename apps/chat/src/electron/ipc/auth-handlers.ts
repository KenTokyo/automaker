/**
 * Auth IPC handlers for Chat App
 *
 * Simplified - no external server mode.
 */

import { ipcMain } from 'electron';
import { IPC_CHANNELS } from './channels';
import { state } from '../state';

/**
 * Register auth IPC handlers
 */
export function registerAuthHandlers(): void {
  ipcMain.handle(IPC_CHANNELS.AUTH.GET_API_KEY, (event) => {
    if (event.sender !== state.mainWindow?.webContents) {
      return null;
    }
    return state.apiKey;
  });
}
