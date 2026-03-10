/**
 * App IPC handlers for Chat App
 */

import { ipcMain, app } from 'electron';
import { createLogger } from '@automaker/utils/logger';
import { IPC_CHANNELS } from './channels';

const logger = createLogger('ChatAppHandlers');

/**
 * Register app IPC handlers
 */
export function registerAppHandlers(): void {
  ipcMain.handle(IPC_CHANNELS.APP.GET_PATH, async (_, name: Parameters<typeof app.getPath>[0]) => {
    return app.getPath(name);
  });

  ipcMain.handle(IPC_CHANNELS.APP.GET_VERSION, async () => {
    return app.getVersion();
  });

  ipcMain.handle(IPC_CHANNELS.APP.IS_PACKAGED, async () => {
    return app.isPackaged;
  });

  ipcMain.handle(IPC_CHANNELS.APP.QUIT, () => {
    logger.info('Quitting application via IPC request');
    app.quit();
  });
}
