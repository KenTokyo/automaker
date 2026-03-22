/**
 * Dialog IPC handlers for Chat App
 *
 * Handles native file dialog operations (open file for image upload, open directory for project).
 */

import { ipcMain, dialog } from 'electron';
import { isPathAllowed, getAllowedRootDirectory } from '@automaker/platform';
import { IPC_CHANNELS } from './channels';
import { state } from '../state';

/**
 * Register dialog IPC handlers
 */
export function registerDialogHandlers(): void {
  ipcMain.handle(IPC_CHANNELS.DIALOG.OPEN_DIRECTORY, async () => {
    if (!state.mainWindow) {
      return { canceled: true, filePaths: [] };
    }
    const result = await dialog.showOpenDialog(state.mainWindow, {
      properties: ['openDirectory', 'createDirectory'],
    });

    if (!result.canceled && result.filePaths.length > 0) {
      const selectedPath = result.filePaths[0];
      if (!isPathAllowed(selectedPath)) {
        const allowedRoot = getAllowedRootDirectory();
        const errorMessage = allowedRoot
          ? `The selected directory is not allowed. Please select a directory within: ${allowedRoot}`
          : 'The selected directory is not allowed.';

        dialog.showErrorBox('Directory Not Allowed', errorMessage);
        return { canceled: true, filePaths: [] };
      }
    }

    return result;
  });

  ipcMain.handle(
    IPC_CHANNELS.DIALOG.OPEN_FILE,
    async (_, options: Record<string, unknown> = {}) => {
      if (!state.mainWindow) {
        return { canceled: true, filePaths: [] };
      }
      const inputProperties = (options.properties as string[]) ?? [];
      const properties = ['openFile', ...inputProperties].filter(
        (p) => p !== 'openDirectory' && p !== 'createDirectory'
      );
      const result = await dialog.showOpenDialog(state.mainWindow, {
        ...options,
        properties: properties as Electron.OpenDialogOptions['properties'],
      });
      return result;
    }
  );
}
