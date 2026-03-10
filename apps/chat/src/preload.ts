/**
 * Electron preload script for Chat App
 *
 * Simplified - only Chat-relevant APIs exposed.
 * No openPath, openInEditor, saveFile, updateMinWidth, isExternalServerMode.
 */

import { contextBridge, ipcRenderer, OpenDialogOptions } from 'electron';
import { createLogger } from '@automaker/utils/logger';
import { IPC_CHANNELS } from './electron/ipc/channels';

const logger = createLogger('ChatPreload');

contextBridge.exposeInMainWorld('electronAPI', {
  // Platform info
  platform: process.platform,
  isElectron: true,

  // Connection check
  ping: (): Promise<string> => ipcRenderer.invoke(IPC_CHANNELS.PING),

  // Get server URL for HTTP client
  getServerUrl: (): Promise<string> => ipcRenderer.invoke(IPC_CHANNELS.SERVER.GET_URL),

  // Get API key for authentication
  getApiKey: (): Promise<string | null> => ipcRenderer.invoke(IPC_CHANNELS.AUTH.GET_API_KEY),

  // Native dialogs
  openDirectory: (): Promise<Electron.OpenDialogReturnValue> =>
    ipcRenderer.invoke(IPC_CHANNELS.DIALOG.OPEN_DIRECTORY),
  openFile: (options?: OpenDialogOptions): Promise<Electron.OpenDialogReturnValue> =>
    ipcRenderer.invoke(IPC_CHANNELS.DIALOG.OPEN_FILE, options),

  // Shell operations
  openExternalLink: (url: string): Promise<{ success: boolean; error?: string }> =>
    ipcRenderer.invoke(IPC_CHANNELS.SHELL.OPEN_EXTERNAL, url),

  // App info
  getPath: (name: string): Promise<string> => ipcRenderer.invoke(IPC_CHANNELS.APP.GET_PATH, name),
  getVersion: (): Promise<string> => ipcRenderer.invoke(IPC_CHANNELS.APP.GET_VERSION),
  isPackaged: (): Promise<boolean> => ipcRenderer.invoke(IPC_CHANNELS.APP.IS_PACKAGED),

  // App control
  quit: (): Promise<void> => ipcRenderer.invoke(IPC_CHANNELS.APP.QUIT),
});

logger.info('Chat Electron API exposed');
