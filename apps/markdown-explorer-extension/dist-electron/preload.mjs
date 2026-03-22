"use strict";
const electron = require("electron");
var LogLevel;
(function(LogLevel2) {
  LogLevel2[LogLevel2["ERROR"] = 0] = "ERROR";
  LogLevel2[LogLevel2["WARN"] = 1] = "WARN";
  LogLevel2[LogLevel2["INFO"] = 2] = "INFO";
  LogLevel2[LogLevel2["DEBUG"] = 3] = "DEBUG";
})(LogLevel || (LogLevel = {}));
const LOG_LEVEL_NAMES = {
  error: LogLevel.ERROR,
  warn: LogLevel.WARN,
  info: LogLevel.INFO,
  debug: LogLevel.DEBUG
};
const ANSI = {
  reset: "\x1B[0m",
  // Foreground colors
  red: "\x1B[31m",
  yellow: "\x1B[33m",
  blue: "\x1B[34m",
  magenta: "\x1B[35m",
  cyan: "\x1B[36m",
  gray: "\x1B[90m"
};
const BROWSER_STYLES = {
  timestamp: "color: #6b7280; font-size: 11px;",
  context: "color: #3b82f6; font-weight: 600;",
  reset: "color: inherit; font-weight: inherit;",
  levels: {
    ERROR: "background: #ef4444; color: white; font-weight: bold; padding: 1px 6px; border-radius: 3px;",
    WARN: "background: #f59e0b; color: white; font-weight: bold; padding: 1px 6px; border-radius: 3px;",
    INFO: "background: #3b82f6; color: white; font-weight: bold; padding: 1px 6px; border-radius: 3px;",
    DEBUG: "background: #8b5cf6; color: white; font-weight: bold; padding: 1px 6px; border-radius: 3px;"
  }
};
const isBrowser = typeof globalThis.window !== "undefined";
let currentLogLevel = LogLevel.INFO;
function getEnvVar(name) {
  if (isBrowser)
    return void 0;
  try {
    return process.env?.[name];
  } catch {
    return void 0;
  }
}
let colorsEnabled = !isBrowser && getEnvVar("LOG_COLORS") !== "false";
let timestampsEnabled = getEnvVar("LOG_TIMESTAMPS") === "true";
const envLogLevel = getEnvVar("LOG_LEVEL")?.toLowerCase();
if (envLogLevel && LOG_LEVEL_NAMES[envLogLevel] !== void 0) {
  currentLogLevel = LOG_LEVEL_NAMES[envLogLevel];
}
function formatTimestamp() {
  return (/* @__PURE__ */ new Date()).toISOString();
}
function formatShortTime() {
  return (/* @__PURE__ */ new Date()).toISOString().split("T")[1].slice(0, 12);
}
function formatNodeLog(level, context, levelColor) {
  const parts = [];
  if (timestampsEnabled) {
    parts.push(colorsEnabled ? `${ANSI.gray}${formatTimestamp()}${ANSI.reset}` : formatTimestamp());
  }
  const levelPadded = level.padEnd(5);
  parts.push(colorsEnabled ? `${levelColor}${levelPadded}${ANSI.reset}` : levelPadded);
  parts.push(colorsEnabled ? `${ANSI.blue}[${context}]${ANSI.reset}` : `[${context}]`);
  return parts.join(" ");
}
function createLogger(context) {
  if (isBrowser) {
    return {
      error: (...args) => {
        if (currentLogLevel >= LogLevel.ERROR) {
          console.error(`%cERROR%c %c${formatShortTime()}%c %c[${context}]%c`, BROWSER_STYLES.levels.ERROR, BROWSER_STYLES.reset, BROWSER_STYLES.timestamp, BROWSER_STYLES.reset, BROWSER_STYLES.context, BROWSER_STYLES.reset, ...args);
        }
      },
      warn: (...args) => {
        if (currentLogLevel >= LogLevel.WARN) {
          console.warn(`%cWARN%c %c${formatShortTime()}%c %c[${context}]%c`, BROWSER_STYLES.levels.WARN, BROWSER_STYLES.reset, BROWSER_STYLES.timestamp, BROWSER_STYLES.reset, BROWSER_STYLES.context, BROWSER_STYLES.reset, ...args);
        }
      },
      info: (...args) => {
        if (currentLogLevel >= LogLevel.INFO) {
          console.log(`%cINFO%c %c${formatShortTime()}%c %c[${context}]%c`, BROWSER_STYLES.levels.INFO, BROWSER_STYLES.reset, BROWSER_STYLES.timestamp, BROWSER_STYLES.reset, BROWSER_STYLES.context, BROWSER_STYLES.reset, ...args);
        }
      },
      debug: (...args) => {
        if (currentLogLevel >= LogLevel.DEBUG) {
          console.log(`%cDEBUG%c %c${formatShortTime()}%c %c[${context}]%c`, BROWSER_STYLES.levels.DEBUG, BROWSER_STYLES.reset, BROWSER_STYLES.timestamp, BROWSER_STYLES.reset, BROWSER_STYLES.context, BROWSER_STYLES.reset, ...args);
        }
      }
    };
  }
  return {
    error: (...args) => {
      if (currentLogLevel >= LogLevel.ERROR) {
        console.error(formatNodeLog("ERROR", context, ANSI.red), ...args);
      }
    },
    warn: (...args) => {
      if (currentLogLevel >= LogLevel.WARN) {
        console.log(formatNodeLog("WARN", context, ANSI.yellow), ...args);
      }
    },
    info: (...args) => {
      if (currentLogLevel >= LogLevel.INFO) {
        console.log(formatNodeLog("INFO", context, ANSI.cyan), ...args);
      }
    },
    debug: (...args) => {
      if (currentLogLevel >= LogLevel.DEBUG) {
        console.log(formatNodeLog("DEBUG", context, ANSI.magenta), ...args);
      }
    }
  };
}
const IPC_CHANNELS = {
  DIALOG: {
    OPEN_DIRECTORY: "dialog:openDirectory",
    OPEN_FILE: "dialog:openFile"
  },
  SHELL: {
    OPEN_EXTERNAL: "shell:openExternal"
  },
  APP: {
    GET_PATH: "app:getPath",
    GET_VERSION: "app:getVersion",
    IS_PACKAGED: "app:isPackaged",
    QUIT: "app:quit"
  },
  AUTH: {
    GET_API_KEY: "auth:getApiKey"
  },
  SERVER: {
    GET_URL: "server:getUrl"
  },
  PING: "ping"
};
const logger = createLogger("ChatPreload");
electron.contextBridge.exposeInMainWorld("electronAPI", {
  // Platform info
  platform: process.platform,
  isElectron: true,
  // Connection check
  ping: () => electron.ipcRenderer.invoke(IPC_CHANNELS.PING),
  // Get server URL for HTTP client
  getServerUrl: () => electron.ipcRenderer.invoke(IPC_CHANNELS.SERVER.GET_URL),
  // Get API key for authentication
  getApiKey: () => electron.ipcRenderer.invoke(IPC_CHANNELS.AUTH.GET_API_KEY),
  // Native dialogs
  openDirectory: () => electron.ipcRenderer.invoke(IPC_CHANNELS.DIALOG.OPEN_DIRECTORY),
  openFile: (options) => electron.ipcRenderer.invoke(IPC_CHANNELS.DIALOG.OPEN_FILE, options),
  // Shell operations
  openExternalLink: (url) => electron.ipcRenderer.invoke(IPC_CHANNELS.SHELL.OPEN_EXTERNAL, url),
  // App info
  getPath: (name) => electron.ipcRenderer.invoke(IPC_CHANNELS.APP.GET_PATH, name),
  getVersion: () => electron.ipcRenderer.invoke(IPC_CHANNELS.APP.GET_VERSION),
  isPackaged: () => electron.ipcRenderer.invoke(IPC_CHANNELS.APP.IS_PACKAGED),
  // App control
  quit: () => electron.ipcRenderer.invoke(IPC_CHANNELS.APP.QUIT)
});
logger.info("Chat Electron API exposed");
