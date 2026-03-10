/**
 * Shell IPC handlers for Chat App
 *
 * Only external link opening (no openPath, openInEditor).
 */

import { ipcMain, shell } from 'electron';
import { IPC_CHANNELS } from './channels';

/**
 * Register shell IPC handlers
 */
export function registerShellHandlers(): void {
  ipcMain.handle(IPC_CHANNELS.SHELL.OPEN_EXTERNAL, async (_, url: string) => {
    try {
      await shell.openExternal(url);
      return { success: true };
    } catch (error) {
      return { success: false, error: (error as Error).message };
    }
  });
}
