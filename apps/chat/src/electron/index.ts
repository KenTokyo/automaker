/**
 * Electron main process modules for Chat App
 *
 * Re-exports for convenient importing.
 */

export * from './constants';
export { state } from './state';

export { isPortAvailable, findAvailablePort } from './utils/port-manager';
export { getIconPath } from './utils/icon-manager';

export { ensureApiKey, getApiKey } from './security/api-key-manager';

export {
  loadWindowBounds,
  saveWindowBounds,
  validateBounds,
  scheduleSaveWindowBounds,
} from './windows/window-bounds';
export { createWindow } from './windows/main-window';

export { startStaticServer, stopStaticServer } from './server/static-server';
export { startServer, waitForServer, stopServer } from './server/backend-server';

export { IPC_CHANNELS, registerAllHandlers } from './ipc';
