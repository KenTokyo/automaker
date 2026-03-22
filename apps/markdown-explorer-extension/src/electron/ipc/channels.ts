/**
 * IPC channel constants for Chat App
 *
 * Simplified - only Chat-relevant channels.
 * No WINDOW.UPDATE_MIN_WIDTH, DIALOG.SAVE_FILE, SHELL.OPEN_PATH, SHELL.OPEN_IN_EDITOR.
 */

export const IPC_CHANNELS = {
  DIALOG: {
    OPEN_DIRECTORY: 'dialog:openDirectory',
    OPEN_FILE: 'dialog:openFile',
  },
  SHELL: {
    OPEN_EXTERNAL: 'shell:openExternal',
  },
  APP: {
    GET_PATH: 'app:getPath',
    GET_VERSION: 'app:getVersion',
    IS_PACKAGED: 'app:isPackaged',
    QUIT: 'app:quit',
  },
  AUTH: {
    GET_API_KEY: 'auth:getApiKey',
  },
  SERVER: {
    GET_URL: 'server:getUrl',
  },
  PING: 'ping',
} as const;
