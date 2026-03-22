/**
 * IPC handlers aggregator for Chat App
 */

import { registerDialogHandlers } from './dialog-handlers';
import { registerShellHandlers } from './shell-handlers';
import { registerAppHandlers } from './app-handlers';
import { registerAuthHandlers } from './auth-handlers';
import { registerServerHandlers } from './server-handlers';

export { IPC_CHANNELS } from './channels';

/**
 * Register all IPC handlers
 */
export function registerAllHandlers(): void {
  registerDialogHandlers();
  registerShellHandlers();
  registerAppHandlers();
  registerAuthHandlers();
  registerServerHandlers();
}
