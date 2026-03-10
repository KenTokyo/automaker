import path, { join } from "path";
import { app, screen, BrowserWindow, shell, ipcMain, dialog } from "electron";
import "fs/promises";
import fsSync from "fs";
import { execSync, execFile, spawn } from "child_process";
import "readline";
import os from "os";
import { promisify } from "util";
import "node:fs/promises";
import "node:path";
import "node:crypto";
import net from "net";
import crypto from "crypto";
import http from "http";
class Node {
  value;
  next;
  constructor(value) {
    this.value = value;
  }
}
class Queue {
  #head;
  #tail;
  #size;
  constructor() {
    this.clear();
  }
  enqueue(value) {
    const node = new Node(value);
    if (this.#head) {
      this.#tail.next = node;
      this.#tail = node;
    } else {
      this.#head = node;
      this.#tail = node;
    }
    this.#size++;
  }
  dequeue() {
    const current = this.#head;
    if (!current) {
      return;
    }
    this.#head = this.#head.next;
    this.#size--;
    if (!this.#head) {
      this.#tail = void 0;
    }
    return current.value;
  }
  peek() {
    if (!this.#head) {
      return;
    }
    return this.#head.value;
  }
  clear() {
    this.#head = void 0;
    this.#tail = void 0;
    this.#size = 0;
  }
  get size() {
    return this.#size;
  }
  *[Symbol.iterator]() {
    let current = this.#head;
    while (current) {
      yield current.value;
      current = current.next;
    }
  }
  *drain() {
    while (this.#head) {
      yield this.dequeue();
    }
  }
}
function pLimit(concurrency) {
  validateConcurrency(concurrency);
  const queue = new Queue();
  let activeCount = 0;
  const resumeNext = () => {
    if (activeCount < concurrency && queue.size > 0) {
      queue.dequeue()();
      activeCount++;
    }
  };
  const next = () => {
    activeCount--;
    resumeNext();
  };
  const run = async (function_, resolve, arguments_) => {
    const result = (async () => function_(...arguments_))();
    resolve(result);
    try {
      await result;
    } catch {
    }
    next();
  };
  const enqueue = (function_, resolve, arguments_) => {
    new Promise((internalResolve) => {
      queue.enqueue(internalResolve);
    }).then(
      run.bind(void 0, function_, resolve, arguments_)
    );
    (async () => {
      await Promise.resolve();
      if (activeCount < concurrency) {
        resumeNext();
      }
    })();
  };
  const generator = (function_, ...arguments_) => new Promise((resolve) => {
    enqueue(function_, resolve, arguments_);
  });
  Object.defineProperties(generator, {
    activeCount: {
      get: () => activeCount
    },
    pendingCount: {
      get: () => queue.size
    },
    clearQueue: {
      value() {
        queue.clear();
      }
    },
    concurrency: {
      get: () => concurrency,
      set(newConcurrency) {
        validateConcurrency(newConcurrency);
        concurrency = newConcurrency;
        queueMicrotask(() => {
          while (activeCount < concurrency && queue.size > 0) {
            resumeNext();
          }
        });
      }
    }
  });
  return generator;
}
function validateConcurrency(concurrency) {
  if (!((Number.isInteger(concurrency) || concurrency === Number.POSITIVE_INFINITY) && concurrency > 0)) {
    throw new TypeError("Expected `concurrency` to be a number from 1 and up");
  }
}
let allowedRootDirectory = null;
let dataDirectory = null;
function initAllowedPaths() {
  const rootDir = process.env.ALLOWED_ROOT_DIRECTORY;
  if (rootDir) {
    allowedRootDirectory = path.resolve(rootDir);
    console.log(`[Security] ✓ ALLOWED_ROOT_DIRECTORY configured: ${allowedRootDirectory}`);
  } else {
    console.log("[Security] ⚠️  ALLOWED_ROOT_DIRECTORY not set - allowing access to all paths");
  }
  const dataDir = process.env.DATA_DIR;
  if (dataDir) {
    dataDirectory = path.resolve(dataDir);
    console.log(`[Security] ✓ DATA_DIR configured: ${dataDirectory}`);
  }
}
function isPathAllowed(filePath) {
  const resolvedPath = path.resolve(filePath);
  if (dataDirectory && isPathWithinDirectory(resolvedPath, dataDirectory)) {
    return true;
  }
  if (!allowedRootDirectory) {
    return true;
  }
  if (allowedRootDirectory && isPathWithinDirectory(resolvedPath, allowedRootDirectory)) {
    return true;
  }
  return false;
}
function isPathWithinDirectory(resolvedPath, directoryPath) {
  const relativePath = path.relative(directoryPath, resolvedPath);
  return !relativePath.startsWith("..") && !path.isAbsolute(relativePath);
}
function getAllowedRootDirectory() {
  return allowedRootDirectory;
}
const DEFAULT_CONFIG = {
  maxConcurrency: 100,
  maxRetries: 3,
  baseDelay: 100,
  maxDelay: 5e3
};
let config = { ...DEFAULT_CONFIG };
pLimit(config.maxConcurrency);
function getGitHubCliPaths() {
  const isWindows = process.platform === "win32";
  if (isWindows) {
    return [
      path.join(process.env.LOCALAPPDATA || "", "Programs", "gh", "bin", "gh.exe"),
      path.join(process.env.ProgramFiles || "", "GitHub CLI", "gh.exe")
    ].filter(Boolean);
  }
  return [
    "/opt/homebrew/bin/gh",
    "/usr/local/bin/gh",
    path.join(os.homedir(), ".local", "bin", "gh"),
    "/home/linuxbrew/.linuxbrew/bin/gh"
  ];
}
function getClaudeCliPaths() {
  const isWindows = process.platform === "win32";
  if (isWindows) {
    const appData = process.env.APPDATA || path.join(os.homedir(), "AppData", "Roaming");
    return [
      path.join(os.homedir(), ".local", "bin", "claude.exe"),
      path.join(appData, "npm", "claude.cmd"),
      path.join(appData, "npm", "claude"),
      path.join(appData, ".npm-global", "bin", "claude.cmd"),
      path.join(appData, ".npm-global", "bin", "claude")
    ];
  }
  return [
    path.join(os.homedir(), ".local", "bin", "claude"),
    path.join(os.homedir(), ".claude", "local", "claude"),
    "/usr/local/bin/claude",
    path.join(os.homedir(), ".npm-global", "bin", "claude")
  ];
}
function getNvmBinPaths() {
  const nvmDir = process.env.NVM_DIR || path.join(os.homedir(), ".nvm");
  const versionsDir = path.join(nvmDir, "versions", "node");
  try {
    if (!fsSync.existsSync(versionsDir)) {
      return [];
    }
    const versions = fsSync.readdirSync(versionsDir);
    return versions.map((version) => path.join(versionsDir, version, "bin"));
  } catch {
    return [];
  }
}
function getFnmBinPaths() {
  const homeDir = os.homedir();
  const possibleFnmDirs = [
    path.join(homeDir, ".local", "share", "fnm", "node-versions"),
    path.join(homeDir, ".fnm", "node-versions"),
    // macOS
    path.join(homeDir, "Library", "Application Support", "fnm", "node-versions")
  ];
  const binPaths = [];
  for (const fnmDir of possibleFnmDirs) {
    try {
      if (!fsSync.existsSync(fnmDir)) {
        continue;
      }
      const versions = fsSync.readdirSync(fnmDir);
      for (const version of versions) {
        binPaths.push(path.join(fnmDir, version, "installation", "bin"));
      }
    } catch {
    }
  }
  return binPaths;
}
function getCodexCliPaths() {
  const isWindows = process.platform === "win32";
  const homeDir = os.homedir();
  if (isWindows) {
    const appData = process.env.APPDATA || path.join(homeDir, "AppData", "Roaming");
    const localAppData = process.env.LOCALAPPDATA || path.join(homeDir, "AppData", "Local");
    return [
      path.join(homeDir, ".local", "bin", "codex.exe"),
      path.join(appData, "npm", "codex.cmd"),
      path.join(appData, "npm", "codex"),
      path.join(appData, ".npm-global", "bin", "codex.cmd"),
      path.join(appData, ".npm-global", "bin", "codex"),
      // Volta on Windows
      path.join(homeDir, ".volta", "bin", "codex.exe"),
      // pnpm on Windows
      path.join(localAppData, "pnpm", "codex.cmd"),
      path.join(localAppData, "pnpm", "codex")
    ];
  }
  const nvmBinPaths = getNvmBinPaths().map((binPath) => path.join(binPath, "codex"));
  const fnmBinPaths = getFnmBinPaths().map((binPath) => path.join(binPath, "codex"));
  const pnpmHome = process.env.PNPM_HOME || path.join(homeDir, ".local", "share", "pnpm");
  return [
    // Standard locations
    path.join(homeDir, ".local", "bin", "codex"),
    "/opt/homebrew/bin/codex",
    "/usr/local/bin/codex",
    "/usr/bin/codex",
    path.join(homeDir, ".npm-global", "bin", "codex"),
    // Linuxbrew
    "/home/linuxbrew/.linuxbrew/bin/codex",
    // Volta
    path.join(homeDir, ".volta", "bin", "codex"),
    // pnpm global
    path.join(pnpmHome, "codex"),
    // Yarn global
    path.join(homeDir, ".yarn", "bin", "codex"),
    path.join(homeDir, ".config", "yarn", "global", "node_modules", ".bin", "codex"),
    // Snap packages
    "/snap/bin/codex",
    // NVM paths
    ...nvmBinPaths,
    // fnm paths
    ...fnmBinPaths
  ];
}
const CODEX_CONFIG_DIR_NAME = ".codex";
const CODEX_AUTH_FILENAME = "auth.json";
function getCodexConfigDir() {
  return path.join(os.homedir(), CODEX_CONFIG_DIR_NAME);
}
function getCodexAuthPath() {
  return path.join(getCodexConfigDir(), CODEX_AUTH_FILENAME);
}
function getClaudeConfigDir() {
  return path.join(os.homedir(), ".claude");
}
function getClaudeCredentialPaths() {
  const claudeDir = getClaudeConfigDir();
  return [path.join(claudeDir, ".credentials.json"), path.join(claudeDir, "credentials.json")];
}
function getClaudeSettingsPath() {
  return path.join(getClaudeConfigDir(), "settings.json");
}
function getClaudeStatsCachePath() {
  return path.join(getClaudeConfigDir(), "stats-cache.json");
}
function getClaudeProjectsDir() {
  return path.join(getClaudeConfigDir(), "projects");
}
function enumerateMatchingPaths(parentDir, prefix, ...subPathParts) {
  try {
    if (!fsSync.existsSync(parentDir)) {
      return [];
    }
    const entries = fsSync.readdirSync(parentDir);
    const matching = entries.filter((entry) => entry.startsWith(prefix));
    return matching.map((entry) => path.join(parentDir, entry, ...subPathParts));
  } catch {
    return [];
  }
}
function getGitBashPaths() {
  if (process.platform !== "win32") {
    return [];
  }
  const homeDir = os.homedir();
  const localAppData = process.env.LOCALAPPDATA || "";
  const wingetGitPaths = localAppData ? enumerateMatchingPaths(path.join(localAppData, "Microsoft", "WinGet", "Packages"), "Git.Git_", "bin", "bash.exe") : [];
  const githubDesktopPaths = localAppData ? enumerateMatchingPaths(path.join(localAppData, "GitHubDesktop"), "app-", "resources", "app", "git", "cmd", "bash.exe") : [];
  return [
    // Standard Git for Windows installations
    "C:\\Program Files\\Git\\bin\\bash.exe",
    "C:\\Program Files (x86)\\Git\\bin\\bash.exe",
    // User-local installations
    path.join(localAppData, "Programs", "Git", "bin", "bash.exe"),
    // Scoop package manager
    path.join(homeDir, "scoop", "apps", "git", "current", "bin", "bash.exe"),
    // Chocolatey
    path.join(process.env.ChocolateyInstall || "C:\\ProgramData\\chocolatey", "lib", "git", "tools", "bin", "bash.exe"),
    // winget installations (dynamically resolved)
    ...wingetGitPaths,
    // GitHub Desktop bundled Git (dynamically resolved)
    ...githubDesktopPaths
  ].filter(Boolean);
}
function getShellPaths() {
  if (process.platform === "win32") {
    return [
      // Full paths (most specific first)
      "C:\\Program Files\\PowerShell\\7\\pwsh.exe",
      "C:\\Program Files\\PowerShell\\7-preview\\pwsh.exe",
      "C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe",
      // COMSPEC environment variable (typically cmd.exe)
      process.env.COMSPEC || "C:\\Windows\\System32\\cmd.exe",
      // Short names (for PATH resolution)
      "pwsh.exe",
      "pwsh",
      "powershell.exe",
      "powershell",
      "cmd.exe",
      "cmd"
    ];
  }
  return [
    // Full paths
    "/bin/zsh",
    "/bin/bash",
    "/bin/sh",
    "/usr/bin/zsh",
    "/usr/bin/bash",
    "/usr/bin/sh",
    "/usr/local/bin/zsh",
    "/usr/local/bin/bash",
    "/opt/homebrew/bin/zsh",
    "/opt/homebrew/bin/bash",
    // Short names (for PATH resolution or $SHELL matching)
    "zsh",
    "bash",
    "sh"
  ];
}
function getNvmPaths() {
  const homeDir = os.homedir();
  if (process.platform === "win32") {
    const appData = process.env.APPDATA || path.join(homeDir, "AppData", "Roaming");
    return [path.join(appData, "nvm")];
  }
  return [path.join(homeDir, ".nvm", "versions", "node")];
}
function getFnmPaths() {
  const homeDir = os.homedir();
  if (process.platform === "win32") {
    const localAppData = process.env.LOCALAPPDATA || path.join(homeDir, "AppData", "Local");
    return [
      path.join(homeDir, ".fnm", "node-versions"),
      path.join(localAppData, "fnm", "node-versions")
    ];
  }
  if (process.platform === "darwin") {
    return [
      path.join(homeDir, ".local", "share", "fnm", "node-versions"),
      path.join(homeDir, "Library", "Application Support", "fnm", "node-versions")
    ];
  }
  return [
    path.join(homeDir, ".local", "share", "fnm", "node-versions"),
    path.join(homeDir, ".fnm", "node-versions")
  ];
}
function getNodeSystemPaths() {
  if (process.platform === "win32") {
    return [
      path.join(process.env.PROGRAMFILES || "C:\\Program Files", "nodejs", "node.exe"),
      path.join(process.env["PROGRAMFILES(X86)"] || "C:\\Program Files (x86)", "nodejs", "node.exe")
    ];
  }
  if (process.platform === "darwin") {
    return ["/opt/homebrew/bin/node", "/usr/local/bin/node", "/usr/bin/node"];
  }
  return ["/usr/bin/node", "/usr/local/bin/node", "/snap/bin/node"];
}
function getScoopNodePath() {
  return path.join(os.homedir(), "scoop", "apps", "nodejs", "current", "node.exe");
}
function getChocolateyNodePath() {
  return path.join(process.env.ChocolateyInstall || "C:\\ProgramData\\chocolatey", "bin", "node.exe");
}
function getWslVersionPath() {
  return "/proc/version";
}
function systemPathExists(filePath) {
  if (!isAllowedSystemPath(filePath)) {
    throw new Error(`[SystemPaths] Access denied: ${filePath} is not an allowed system path`);
  }
  return fsSync.existsSync(filePath);
}
function systemPathIsExecutable(filePath) {
  if (!isAllowedSystemPath(filePath)) {
    throw new Error(`[SystemPaths] Access denied: ${filePath} is not an allowed system path`);
  }
  try {
    if (process.platform === "win32") {
      fsSync.accessSync(filePath, fsSync.constants.F_OK);
    } else {
      fsSync.accessSync(filePath, fsSync.constants.X_OK);
    }
    return true;
  } catch {
    return false;
  }
}
function systemPathReaddirSync(dirPath) {
  if (!isAllowedSystemPath(dirPath)) {
    throw new Error(`[SystemPaths] Access denied: ${dirPath} is not an allowed system path`);
  }
  return fsSync.readdirSync(dirPath);
}
function getAllAllowedSystemPaths() {
  return [
    // GitHub CLI paths
    ...getGitHubCliPaths(),
    // Claude CLI paths
    ...getClaudeCliPaths(),
    // Claude config directory and files
    getClaudeConfigDir(),
    ...getClaudeCredentialPaths(),
    getClaudeSettingsPath(),
    getClaudeStatsCachePath(),
    getClaudeProjectsDir(),
    // Codex CLI paths
    ...getCodexCliPaths(),
    // Codex config directory and files
    getCodexConfigDir(),
    getCodexAuthPath(),
    // OpenCode CLI paths
    ...getOpenCodeCliPaths(),
    // OpenCode config directory and files
    getOpenCodeConfigDir(),
    getOpenCodeAuthPath(),
    // Shell paths
    ...getShellPaths(),
    // Git Bash paths (for Windows cross-platform shell script execution)
    ...getGitBashPaths(),
    // Node.js system paths
    ...getNodeSystemPaths(),
    getScoopNodePath(),
    getChocolateyNodePath(),
    // WSL detection
    getWslVersionPath()
  ];
}
function getAllAllowedSystemDirs() {
  return [
    // Claude config
    getClaudeConfigDir(),
    getClaudeProjectsDir(),
    // Codex config
    getCodexConfigDir(),
    // OpenCode config
    getOpenCodeConfigDir(),
    // Version managers (need recursive access for version directories)
    ...getNvmPaths(),
    ...getFnmPaths()
  ];
}
function isAllowedSystemPath(filePath) {
  const normalizedPath = path.resolve(filePath);
  const allowedPaths = getAllAllowedSystemPaths();
  if (allowedPaths.includes(normalizedPath)) {
    return true;
  }
  const allowedDirs = getAllAllowedSystemDirs();
  for (const allowedDir of allowedDirs) {
    const normalizedAllowedDir = path.resolve(allowedDir);
    if (normalizedPath === normalizedAllowedDir || normalizedPath.startsWith(normalizedAllowedDir + path.sep)) {
      return true;
    }
  }
  return false;
}
let electronUserDataPath = null;
function setElectronUserDataPath(userDataPath) {
  electronUserDataPath = userDataPath;
}
function electronUserDataReadFileSync(relativePath, encoding = "utf-8") {
  if (!electronUserDataPath) {
    throw new Error("[SystemPaths] Electron userData path not initialized");
  }
  const fullPath = path.join(electronUserDataPath, relativePath);
  return fsSync.readFileSync(fullPath, encoding);
}
function electronUserDataWriteFileSync(relativePath, data, options) {
  if (!electronUserDataPath) {
    throw new Error("[SystemPaths] Electron userData path not initialized");
  }
  const fullPath = path.join(electronUserDataPath, relativePath);
  const dir = path.dirname(fullPath);
  fsSync.mkdirSync(dir, { recursive: true });
  fsSync.writeFileSync(fullPath, data, options);
}
function electronUserDataExists(relativePath) {
  if (!electronUserDataPath)
    return false;
  const fullPath = path.join(electronUserDataPath, relativePath);
  return fsSync.existsSync(fullPath);
}
let electronAppDirs = [];
let electronResourcesPath = null;
function setElectronAppPaths(appDirOrDirs, resourcesPath) {
  electronAppDirs = Array.isArray(appDirOrDirs) ? appDirOrDirs : [appDirOrDirs];
  electronResourcesPath = resourcesPath || null;
}
function isElectronAppPath(filePath) {
  const normalizedPath = path.resolve(filePath);
  for (const appDir of electronAppDirs) {
    const normalizedAppDir = path.resolve(appDir);
    if (normalizedPath === normalizedAppDir || normalizedPath.startsWith(normalizedAppDir + path.sep)) {
      return true;
    }
  }
  if (electronResourcesPath) {
    const normalizedResources = path.resolve(electronResourcesPath);
    if (normalizedPath === normalizedResources || normalizedPath.startsWith(normalizedResources + path.sep)) {
      return true;
    }
  }
  return false;
}
function electronAppExists(filePath) {
  if (!isElectronAppPath(filePath)) {
    throw new Error(`[SystemPaths] Access denied: ${filePath} is not within Electron app bundle`);
  }
  return fsSync.existsSync(filePath);
}
function electronAppStat(filePath, callback) {
  if (!isElectronAppPath(filePath)) {
    callback(new Error(`[SystemPaths] Access denied: ${filePath} is not within Electron app bundle`), void 0);
    return;
  }
  fsSync.stat(filePath, callback);
}
function electronAppReadFile(filePath, callback) {
  if (!isElectronAppPath(filePath)) {
    callback(new Error(`[SystemPaths] Access denied: ${filePath} is not within Electron app bundle`), void 0);
    return;
  }
  fsSync.readFile(filePath, callback);
}
const OPENCODE_DATA_DIR = ".local/share/opencode";
const OPENCODE_AUTH_FILENAME = "auth.json";
function getOpenCodeCliPaths() {
  const isWindows = process.platform === "win32";
  const homeDir = os.homedir();
  if (isWindows) {
    const appData = process.env.APPDATA || path.join(homeDir, "AppData", "Roaming");
    const localAppData = process.env.LOCALAPPDATA || path.join(homeDir, "AppData", "Local");
    return [
      // OpenCode's default installation directory
      path.join(homeDir, ".opencode", "bin", "opencode.exe"),
      path.join(homeDir, ".local", "bin", "opencode.exe"),
      path.join(appData, "npm", "opencode.cmd"),
      path.join(appData, "npm", "opencode"),
      path.join(appData, ".npm-global", "bin", "opencode.cmd"),
      path.join(appData, ".npm-global", "bin", "opencode"),
      // Volta on Windows
      path.join(homeDir, ".volta", "bin", "opencode.exe"),
      // pnpm on Windows
      path.join(localAppData, "pnpm", "opencode.cmd"),
      path.join(localAppData, "pnpm", "opencode"),
      // Go installation (if OpenCode is a Go binary)
      path.join(homeDir, "go", "bin", "opencode.exe"),
      path.join(process.env.GOPATH || path.join(homeDir, "go"), "bin", "opencode.exe")
    ];
  }
  const nvmBinPaths = getNvmBinPaths().map((binPath) => path.join(binPath, "opencode"));
  const fnmBinPaths = getFnmBinPaths().map((binPath) => path.join(binPath, "opencode"));
  const pnpmHome = process.env.PNPM_HOME || path.join(homeDir, ".local", "share", "pnpm");
  return [
    // OpenCode's default installation directory
    path.join(homeDir, ".opencode", "bin", "opencode"),
    // Standard locations
    path.join(homeDir, ".local", "bin", "opencode"),
    "/opt/homebrew/bin/opencode",
    "/usr/local/bin/opencode",
    "/usr/bin/opencode",
    path.join(homeDir, ".npm-global", "bin", "opencode"),
    // Linuxbrew
    "/home/linuxbrew/.linuxbrew/bin/opencode",
    // Volta
    path.join(homeDir, ".volta", "bin", "opencode"),
    // pnpm global
    path.join(pnpmHome, "opencode"),
    // Yarn global
    path.join(homeDir, ".yarn", "bin", "opencode"),
    path.join(homeDir, ".config", "yarn", "global", "node_modules", ".bin", "opencode"),
    // Go installation (if OpenCode is a Go binary)
    path.join(homeDir, "go", "bin", "opencode"),
    path.join(process.env.GOPATH || path.join(homeDir, "go"), "bin", "opencode"),
    // Snap packages
    "/snap/bin/opencode",
    // NVM paths
    ...nvmBinPaths,
    // fnm paths
    ...fnmBinPaths
  ];
}
function getOpenCodeConfigDir() {
  return path.join(os.homedir(), OPENCODE_DATA_DIR);
}
function getOpenCodeAuthPath() {
  return path.join(getOpenCodeConfigDir(), OPENCODE_AUTH_FILENAME);
}
const VERSION_DIR_PATTERN = /^v?\d+/;
const PRE_RELEASE_PATTERN = /-(beta|rc|alpha|nightly|canary|dev|pre)/i;
function isExecutable(filePath) {
  try {
    return systemPathIsExecutable(filePath);
  } catch {
    return false;
  }
}
function findNodeFromVersionManager(basePath, binSubpath = "bin/node") {
  try {
    if (!systemPathExists(basePath))
      return null;
  } catch {
    return null;
  }
  try {
    const allVersions = systemPathReaddirSync(basePath).filter((v) => VERSION_DIR_PATTERN.test(v)).sort((a, b) => b.localeCompare(a, void 0, { numeric: true, sensitivity: "base" }));
    const stableVersions = allVersions.filter((v) => !PRE_RELEASE_PATTERN.test(v));
    const preReleaseVersions = allVersions.filter((v) => PRE_RELEASE_PATTERN.test(v));
    for (const version of [...stableVersions, ...preReleaseVersions]) {
      const nodePath = path.join(basePath, version, binSubpath);
      if (isExecutable(nodePath)) {
        return nodePath;
      }
    }
  } catch {
  }
  return null;
}
function findNodeMacOS(_homeDir) {
  const systemPaths = getNodeSystemPaths();
  for (const nodePath of systemPaths) {
    if (isExecutable(nodePath)) {
      if (nodePath.includes("homebrew") || nodePath === "/usr/local/bin/node") {
        return { nodePath, source: "homebrew" };
      }
      return { nodePath, source: "system" };
    }
  }
  const nvmPaths = getNvmPaths();
  for (const nvmPath of nvmPaths) {
    const nvmNode = findNodeFromVersionManager(nvmPath);
    if (nvmNode) {
      return { nodePath: nvmNode, source: "nvm" };
    }
  }
  const fnmPaths = getFnmPaths();
  for (const fnmBasePath of fnmPaths) {
    const fnmNode = findNodeFromVersionManager(fnmBasePath);
    if (fnmNode) {
      return { nodePath: fnmNode, source: "fnm" };
    }
  }
  return null;
}
function findNodeLinux(_homeDir) {
  const systemPaths = getNodeSystemPaths();
  for (const nodePath of systemPaths) {
    if (isExecutable(nodePath)) {
      return { nodePath, source: "system" };
    }
  }
  const nvmPaths = getNvmPaths();
  for (const nvmPath of nvmPaths) {
    const nvmNode = findNodeFromVersionManager(nvmPath);
    if (nvmNode) {
      return { nodePath: nvmNode, source: "nvm" };
    }
  }
  const fnmPaths = getFnmPaths();
  for (const fnmBasePath of fnmPaths) {
    const fnmNode = findNodeFromVersionManager(fnmBasePath);
    if (fnmNode) {
      return { nodePath: fnmNode, source: "fnm" };
    }
  }
  return null;
}
function findNodeWindows(_homeDir) {
  const systemPaths = getNodeSystemPaths();
  for (const nodePath of systemPaths) {
    if (isExecutable(nodePath)) {
      return { nodePath, source: "program-files" };
    }
  }
  const nvmPaths = getNvmPaths();
  for (const nvmPath of nvmPaths) {
    const nvmNode = findNodeFromVersionManager(nvmPath, "node.exe");
    if (nvmNode) {
      return { nodePath: nvmNode, source: "nvm-windows" };
    }
  }
  const fnmPaths = getFnmPaths();
  for (const fnmBasePath of fnmPaths) {
    const fnmNode = findNodeFromVersionManager(fnmBasePath, "node.exe");
    if (fnmNode) {
      return { nodePath: fnmNode, source: "fnm" };
    }
  }
  const scoopPath = getScoopNodePath();
  if (isExecutable(scoopPath)) {
    return { nodePath: scoopPath, source: "scoop" };
  }
  const chocoPath = getChocolateyNodePath();
  if (isExecutable(chocoPath)) {
    return { nodePath: chocoPath, source: "chocolatey" };
  }
  return null;
}
function findNodeViaShell(platform, logger2 = () => {
}) {
  try {
    const command = platform === "win32" ? "where node" : "which node";
    const result = execSync(command, {
      encoding: "utf8",
      stdio: ["pipe", "pipe", "pipe"]
    }).trim();
    const nodePath = result.split(/\r?\n/)[0];
    if (nodePath && !nodePath.includes("\0") && isExecutable(nodePath)) {
      return {
        nodePath,
        source: platform === "win32" ? "where" : "which"
      };
    }
  } catch {
    logger2("Shell command failed to find Node.js (expected when launched from desktop)");
  }
  return null;
}
function findNodeExecutable(options = {}) {
  const { skipSearch = false, logger: logger2 = () => {
  } } = options;
  if (skipSearch) {
    return { nodePath: "node", source: "fallback" };
  }
  const platform = process.platform;
  os.homedir();
  let result = null;
  switch (platform) {
    case "darwin":
      result = findNodeMacOS();
      break;
    case "linux":
      result = findNodeLinux();
      break;
    case "win32":
      result = findNodeWindows();
      break;
  }
  if (result) {
    logger2(`Found Node.js via ${result.source} at: ${result.nodePath}`);
    return result;
  }
  result = findNodeViaShell(platform, logger2);
  if (result) {
    logger2(`Found Node.js via ${result.source} at: ${result.nodePath}`);
    return result;
  }
  logger2('Could not find Node.js, falling back to "node"');
  return { nodePath: "node", source: "fallback" };
}
function buildEnhancedPath(nodePath, currentPath = "") {
  if (nodePath === "node") {
    return currentPath;
  }
  const nodeDir = path.dirname(nodePath);
  const normalizedNodeDir = path.normalize(nodeDir);
  const pathSegments = currentPath.split(path.delimiter).map((s) => path.normalize(s));
  if (normalizedNodeDir === "." || pathSegments.includes(normalizedNodeDir)) {
    return currentPath;
  }
  if (!currentPath) {
    return nodeDir;
  }
  return `${nodeDir}${path.delimiter}${currentPath}`;
}
const OPENCODE_MODELS = [
  // OpenCode Free Tier Models
  {
    id: "opencode-big-pickle",
    label: "Big Pickle",
    description: "OpenCode free tier model - great for general coding",
    supportsVision: false,
    provider: "opencode",
    tier: "free"
  },
  {
    id: "opencode-glm-4.7-free",
    label: "GLM 4.7 Free",
    description: "OpenCode free tier GLM model",
    supportsVision: false,
    provider: "opencode",
    tier: "free"
  },
  {
    id: "opencode-gpt-5-nano",
    label: "GPT-5 Nano",
    description: "OpenCode free tier nano model - fast and lightweight",
    supportsVision: false,
    provider: "opencode",
    tier: "free"
  },
  {
    id: "opencode-grok-code",
    label: "Grok Code",
    description: "OpenCode free tier Grok model for coding",
    supportsVision: false,
    provider: "opencode",
    tier: "free"
  },
  {
    id: "opencode-minimax-m2.1-free",
    label: "MiniMax M2.1 Free",
    description: "OpenCode free tier MiniMax model",
    supportsVision: false,
    provider: "opencode",
    tier: "free"
  }
];
OPENCODE_MODELS.reduce((acc, config2) => {
  acc[config2.id] = config2;
  return acc;
}, {});
function getAllOpencodeModelIds() {
  return OPENCODE_MODELS.map((config2) => config2.id);
}
const GEMINI_MODEL_MAP = {
  // Gemini 3 Series (latest)
  "gemini-3-pro-preview": {
    label: "Gemini 3 Pro Preview",
    description: "Most advanced Gemini model with deep reasoning capabilities.",
    supportsVision: true,
    supportsThinking: true,
    contextWindow: 1e6
  },
  "gemini-3-flash-preview": {
    label: "Gemini 3 Flash Preview",
    description: "Fast Gemini 3 model for quick tasks.",
    supportsVision: true,
    supportsThinking: true,
    contextWindow: 1e6
  },
  // Gemini 2.5 Series
  "gemini-2.5-pro": {
    label: "Gemini 2.5 Pro",
    description: "Advanced model with strong reasoning and 1M context.",
    supportsVision: true,
    supportsThinking: true,
    contextWindow: 1e6
  },
  "gemini-2.5-flash": {
    label: "Gemini 2.5 Flash",
    description: "Balanced speed and capability for most tasks.",
    supportsVision: true,
    supportsThinking: true,
    contextWindow: 1e6
  },
  "gemini-2.5-flash-lite": {
    label: "Gemini 2.5 Flash Lite",
    description: "Fastest Gemini model for simple tasks.",
    supportsVision: true,
    supportsThinking: false,
    contextWindow: 1e6
  }
};
({
  enabledOpencodeModels: getAllOpencodeModelIds()
});
Object.entries(GEMINI_MODEL_MAP).map(([id, config2]) => ({
  id,
  label: config2.label,
  description: config2.description,
  badge: config2.supportsThinking ? "Thinking" : "Speed",
  provider: "gemini",
  hasThinking: config2.supportsThinking
}));
promisify(execFile);
process.platform === "win32";
process.platform === "darwin";
const ANTIGRAVITY_CLI_COMMANDS = ["antigravity", "agy"];
const [PRIMARY_ANTIGRAVITY_COMMAND, ...LEGACY_ANTIGRAVITY_COMMANDS] = ANTIGRAVITY_CLI_COMMANDS;
promisify(execFile);
process.platform === "win32";
process.platform === "darwin";
process.platform === "linux";
[
  // macOS terminals
  {
    id: "iterm2",
    name: "iTerm2",
    cliCommand: "iterm2",
    macAppName: "iTerm",
    platform: "darwin"
  },
  {
    id: "warp",
    name: "Warp",
    cliCommand: "warp-cli",
    cliAliases: ["warp-terminal", "warp"],
    macAppName: "Warp"
  },
  {
    id: "ghostty",
    name: "Ghostty",
    cliCommand: "ghostty",
    macAppName: "Ghostty"
  },
  {
    id: "rio",
    name: "Rio",
    cliCommand: "rio",
    macAppName: "Rio"
  },
  {
    id: "alacritty",
    name: "Alacritty",
    cliCommand: "alacritty",
    macAppName: "Alacritty"
  },
  {
    id: "wezterm",
    name: "WezTerm",
    cliCommand: "wezterm",
    macAppName: "WezTerm"
  },
  {
    id: "kitty",
    name: "Kitty",
    cliCommand: "kitty",
    macAppName: "kitty"
  },
  {
    id: "hyper",
    name: "Hyper",
    cliCommand: "hyper",
    macAppName: "Hyper"
  },
  {
    id: "tabby",
    name: "Tabby",
    cliCommand: "tabby",
    macAppName: "Tabby"
  },
  {
    id: "terminal-macos",
    name: "System Terminal",
    macAppName: "Utilities/Terminal",
    platform: "darwin"
  },
  // Windows terminals
  {
    id: "windows-terminal",
    name: "Windows Terminal",
    cliCommand: "wt",
    windowsPaths: [join(process.env.LOCALAPPDATA || "", "Microsoft", "WindowsApps", "wt.exe")],
    platform: "win32"
  },
  {
    id: "powershell",
    name: "PowerShell",
    cliCommand: "pwsh",
    cliAliases: ["powershell"],
    windowsPaths: [
      join(process.env.SYSTEMROOT || "C:\\Windows", "System32", "WindowsPowerShell", "v1.0", "powershell.exe")
    ],
    platform: "win32"
  },
  {
    id: "cmd",
    name: "Command Prompt",
    cliCommand: "cmd",
    windowsPaths: [join(process.env.SYSTEMROOT || "C:\\Windows", "System32", "cmd.exe")],
    platform: "win32"
  },
  {
    id: "git-bash",
    name: "Git Bash",
    windowsPaths: [
      join(process.env.PROGRAMFILES || "C:\\Program Files", "Git", "git-bash.exe"),
      join(process.env["PROGRAMFILES(X86)"] || "C:\\Program Files (x86)", "Git", "git-bash.exe")
    ],
    platform: "win32"
  },
  // Linux terminals
  {
    id: "gnome-terminal",
    name: "GNOME Terminal",
    cliCommand: "gnome-terminal",
    platform: "linux"
  },
  {
    id: "konsole",
    name: "Konsole",
    cliCommand: "konsole",
    platform: "linux"
  },
  {
    id: "xfce4-terminal",
    name: "XFCE4 Terminal",
    cliCommand: "xfce4-terminal",
    platform: "linux"
  },
  {
    id: "tilix",
    name: "Tilix",
    cliCommand: "tilix",
    platform: "linux"
  },
  {
    id: "terminator",
    name: "Terminator",
    cliCommand: "terminator",
    platform: "linux"
  },
  {
    id: "foot",
    name: "Foot",
    cliCommand: "foot",
    platform: "linux"
  },
  {
    id: "xterm",
    name: "XTerm",
    cliCommand: "xterm",
    platform: "linux"
  }
];
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
const MIN_WIDTH = 500;
const MIN_HEIGHT = 400;
const DEFAULT_WIDTH = 1100;
const DEFAULT_HEIGHT = 800;
const parsedServerPort = Number.parseInt(process.env.PORT ?? "", 10);
const parsedStaticPort = Number.parseInt(process.env.TEST_PORT ?? "", 10);
const DEFAULT_SERVER_PORT = Number.isFinite(parsedServerPort) ? parsedServerPort : 3008;
const DEFAULT_STATIC_PORT = Number.isFinite(parsedStaticPort) ? parsedStaticPort : 3009;
const API_KEY_FILENAME = ".chat-api-key";
const WINDOW_BOUNDS_FILENAME = "chat-window-bounds.json";
const state = {
  mainWindow: null,
  serverProcess: null,
  staticServer: null,
  serverPort: DEFAULT_SERVER_PORT,
  staticPort: DEFAULT_STATIC_PORT,
  apiKey: null,
  saveWindowBoundsTimeout: null
};
function isPortAvailable(port) {
  return new Promise((resolve) => {
    const server = net.createServer();
    server.once("error", () => {
      resolve(false);
    });
    server.once("listening", () => {
      server.close(() => {
        resolve(true);
      });
    });
    server.listen(port);
  });
}
async function findAvailablePort(preferredPort) {
  for (let offset = 0; offset < 100; offset++) {
    const port = preferredPort + offset;
    if (await isPortAvailable(port)) {
      return port;
    }
  }
  throw new Error(`Could not find an available port starting from ${preferredPort}`);
}
const logger$7 = createLogger("ChatApiKeyManager");
function ensureApiKey() {
  try {
    if (electronUserDataExists(API_KEY_FILENAME)) {
      const key = electronUserDataReadFileSync(API_KEY_FILENAME).trim();
      if (key) {
        state.apiKey = key;
        logger$7.info("Loaded existing API key");
        return state.apiKey;
      }
    }
  } catch (error) {
    logger$7.warn("Error reading API key:", error);
  }
  state.apiKey = crypto.randomUUID();
  try {
    electronUserDataWriteFileSync(API_KEY_FILENAME, state.apiKey, {
      encoding: "utf-8",
      mode: 384
    });
    logger$7.info("Generated new API key");
  } catch (error) {
    logger$7.error("Failed to save API key:", error);
  }
  return state.apiKey;
}
const logger$6 = createLogger("ChatIconManager");
function getIconPath() {
  const isDev2 = !app.isPackaged;
  let iconFile;
  if (process.platform === "win32") {
    iconFile = "icon.ico";
  } else {
    iconFile = "logo_larger.png";
  }
  const iconPath = isDev2 ? path.join(__dirname, "../public", iconFile) : path.join(__dirname, "../dist/public", iconFile);
  try {
    if (!electronAppExists(iconPath)) {
      logger$6.warn("Icon not found at:", iconPath);
      return null;
    }
  } catch (error) {
    logger$6.warn("Icon check failed:", iconPath, error);
    return null;
  }
  return iconPath;
}
const logger$5 = createLogger("ChatWindowBounds");
function loadWindowBounds() {
  try {
    if (electronUserDataExists(WINDOW_BOUNDS_FILENAME)) {
      const data = electronUserDataReadFileSync(WINDOW_BOUNDS_FILENAME);
      const bounds = JSON.parse(data);
      if (typeof bounds.x === "number" && typeof bounds.y === "number" && typeof bounds.width === "number" && typeof bounds.height === "number") {
        return bounds;
      }
    }
  } catch (error) {
    logger$5.warn("Failed to load window bounds:", error.message);
  }
  return null;
}
function saveWindowBounds(bounds) {
  try {
    electronUserDataWriteFileSync(WINDOW_BOUNDS_FILENAME, JSON.stringify(bounds, null, 2));
    logger$5.info("Window bounds saved");
  } catch (error) {
    logger$5.warn("Failed to save window bounds:", error.message);
  }
}
function scheduleSaveWindowBounds() {
  if (!state.mainWindow || state.mainWindow.isDestroyed()) return;
  if (state.saveWindowBoundsTimeout) {
    clearTimeout(state.saveWindowBoundsTimeout);
  }
  state.saveWindowBoundsTimeout = setTimeout(() => {
    if (!state.mainWindow || state.mainWindow.isDestroyed()) return;
    const isMaximized = state.mainWindow.isMaximized();
    const bounds = isMaximized ? state.mainWindow.getNormalBounds() : state.mainWindow.getBounds();
    saveWindowBounds({
      x: bounds.x,
      y: bounds.y,
      width: bounds.width,
      height: bounds.height,
      isMaximized
    });
  }, 500);
}
function validateBounds(bounds) {
  const displays = screen.getAllDisplays();
  const centerX = bounds.x + bounds.width / 2;
  const centerY = bounds.y + bounds.height / 2;
  let isVisible = false;
  for (const display of displays) {
    const { x, y, width, height } = display.workArea;
    if (centerX >= x && centerX <= x + width && centerY >= y && centerY <= y + height) {
      isVisible = true;
      break;
    }
  }
  if (!isVisible) {
    const primaryDisplay = screen.getPrimaryDisplay();
    const { x, y, width, height } = primaryDisplay.workArea;
    return {
      x: x + Math.floor((width - bounds.width) / 2),
      y: y + Math.floor((height - bounds.height) / 2),
      width: Math.min(bounds.width, width),
      height: Math.min(bounds.height, height),
      isMaximized: bounds.isMaximized
    };
  }
  return {
    ...bounds,
    width: Math.max(bounds.width, MIN_WIDTH),
    height: Math.max(bounds.height, MIN_HEIGHT)
  };
}
const logger$4 = createLogger("ChatMainWindow");
const VITE_DEV_SERVER_URL = process.env.VITE_DEV_SERVER_URL;
function createWindow() {
  const iconPath = getIconPath();
  const savedBounds = loadWindowBounds();
  const validBounds = savedBounds ? validateBounds(savedBounds) : null;
  const windowOptions = {
    width: validBounds?.width ?? DEFAULT_WIDTH,
    height: validBounds?.height ?? DEFAULT_HEIGHT,
    x: validBounds?.x,
    y: validBounds?.y,
    minWidth: MIN_WIDTH,
    minHeight: MIN_HEIGHT,
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false
    },
    backgroundColor: "#0a0a0a",
    title: "UniAI Chat"
  };
  if (iconPath) {
    windowOptions.icon = iconPath;
  }
  state.mainWindow = new BrowserWindow(windowOptions);
  if (validBounds?.isMaximized) {
    state.mainWindow.maximize();
  }
  if (VITE_DEV_SERVER_URL) {
    state.mainWindow.loadURL(VITE_DEV_SERVER_URL);
  } else {
    state.mainWindow.loadURL(`http://localhost:${state.staticPort}`);
  }
  if (!app.isPackaged && process.env.OPEN_DEVTOOLS === "true") {
    state.mainWindow.webContents.openDevTools();
  }
  state.mainWindow.on("close", () => {
    if (state.mainWindow && !state.mainWindow.isDestroyed()) {
      const isMaximized = state.mainWindow.isMaximized();
      const bounds = isMaximized ? state.mainWindow.getNormalBounds() : state.mainWindow.getBounds();
      saveWindowBounds({
        x: bounds.x,
        y: bounds.y,
        width: bounds.width,
        height: bounds.height,
        isMaximized
      });
    }
  });
  state.mainWindow.on("closed", () => {
    state.mainWindow = null;
  });
  state.mainWindow.on("resized", () => {
    scheduleSaveWindowBounds();
  });
  state.mainWindow.on("moved", () => {
    scheduleSaveWindowBounds();
  });
  state.mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: "deny" };
  });
  logger$4.info("Chat window created");
}
const logger$3 = createLogger("ChatStaticServer");
const CONTENT_TYPES = {
  ".html": "text/html",
  ".js": "application/javascript",
  ".css": "text/css",
  ".json": "application/json",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".gif": "image/gif",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
  ".ttf": "font/ttf",
  ".eot": "application/vnd.ms-fontobject"
};
async function startStaticServer() {
  const staticPath = path.join(__dirname, "../dist");
  state.staticServer = http.createServer((request, response) => {
    let filePath = path.join(staticPath, request.url?.split("?")[0] || "/");
    if (filePath.endsWith("/")) {
      filePath = path.join(filePath, "index.html");
    } else if (!path.extname(filePath)) {
      const possibleFile = filePath + ".html";
      try {
        if (!electronAppExists(filePath) && !electronAppExists(possibleFile)) {
          filePath = path.join(staticPath, "index.html");
        } else if (electronAppExists(possibleFile)) {
          filePath = possibleFile;
        }
      } catch {
        filePath = path.join(staticPath, "index.html");
      }
    }
    electronAppStat(filePath, (err, stats) => {
      if (err || !stats?.isFile()) {
        filePath = path.join(staticPath, "index.html");
      }
      electronAppReadFile(filePath, (error, content) => {
        if (error || !content) {
          response.writeHead(500);
          response.end("Server Error");
          return;
        }
        const ext = path.extname(filePath);
        response.writeHead(200, {
          "Content-Type": CONTENT_TYPES[ext] || "application/octet-stream"
        });
        response.end(content);
      });
    });
  });
  return new Promise((resolve, reject) => {
    state.staticServer.listen(state.staticPort, () => {
      logger$3.info("Static server running at http://localhost:" + state.staticPort);
      resolve();
    });
    state.staticServer.on("error", reject);
  });
}
function stopStaticServer() {
  if (state.staticServer) {
    logger$3.info("Stopping static server...");
    state.staticServer.close();
    state.staticServer = null;
  }
}
const logger$2 = createLogger("ChatBackendServer");
const serverLogger = createLogger("ChatServer");
async function startServer() {
  const isDev2 = !app.isPackaged;
  const nodeResult = findNodeExecutable({
    skipSearch: isDev2,
    logger: (msg) => logger$2.info(msg)
  });
  const command = nodeResult.nodePath;
  if (command !== "node") {
    let exists;
    try {
      exists = systemPathExists(command);
    } catch (error) {
      const originalError = error instanceof Error ? error.message : String(error);
      throw new Error(
        `Failed to verify Node.js executable at: ${command} (source: ${nodeResult.source}). Reason: ${originalError}`
      );
    }
    if (!exists) {
      throw new Error(`Node.js executable not found at: ${command} (source: ${nodeResult.source})`);
    }
  }
  let args;
  let serverPath;
  if (isDev2) {
    serverPath = path.join(__dirname, "../../server/src/index.ts");
    const serverNodeModules2 = path.join(__dirname, "../../server/node_modules/tsx");
    const rootNodeModules = path.join(__dirname, "../../../node_modules/tsx");
    let tsxCliPath;
    const serverTsxPath = path.join(serverNodeModules2, "dist/cli.mjs");
    const rootTsxPath = path.join(rootNodeModules, "dist/cli.mjs");
    try {
      if (electronAppExists(serverTsxPath)) {
        tsxCliPath = serverTsxPath;
      } else if (electronAppExists(rootTsxPath)) {
        tsxCliPath = rootTsxPath;
      } else {
        tsxCliPath = require.resolve("tsx/cli.mjs", {
          paths: [path.join(__dirname, "../../server")]
        });
      }
    } catch {
      try {
        tsxCliPath = require.resolve("tsx/cli.mjs", {
          paths: [path.join(__dirname, "../../server")]
        });
      } catch {
        throw new Error("Could not find tsx. Please run 'npm install' in the server directory.");
      }
    }
    args = [tsxCliPath, "watch", serverPath];
  } else {
    serverPath = path.join(process.resourcesPath, "server", "index.js");
    args = [serverPath];
    if (!electronAppExists(serverPath)) {
      throw new Error(`Server not found at: ${serverPath}`);
    }
  }
  const serverNodeModules = app.isPackaged ? path.join(process.resourcesPath, "server", "node_modules") : path.join(__dirname, "../../server/node_modules");
  const serverRoot = app.isPackaged ? path.join(process.resourcesPath, "server") : path.join(__dirname, "../../server");
  const dataDir = app.isPackaged ? app.getPath("userData") : path.join(__dirname, "../../..", "data");
  const enhancedPath = buildEnhancedPath(command, process.env.PATH || "");
  const env = {
    ...process.env,
    PATH: enhancedPath,
    PORT: state.serverPort.toString(),
    DATA_DIR: dataDir,
    NODE_PATH: serverNodeModules,
    AUTOMAKER_API_KEY: state.apiKey,
    // Chat mode - server will gate off board/terminal routes
    AUTOMAKER_MODE: "chat",
    ...process.env.ALLOWED_ROOT_DIRECTORY && {
      ALLOWED_ROOT_DIRECTORY: process.env.ALLOWED_ROOT_DIRECTORY
    }
  };
  logger$2.info("Starting backend server in chat mode...");
  logger$2.info("Server path:", serverPath);
  logger$2.info("Server port:", state.serverPort);
  state.serverProcess = spawn(command, args, {
    cwd: serverRoot,
    env,
    stdio: ["ignore", "pipe", "pipe"]
  });
  state.serverProcess.stdout?.on("data", (data) => {
    serverLogger.info(data.toString().trim());
  });
  state.serverProcess.stderr?.on("data", (data) => {
    serverLogger.error(data.toString().trim());
  });
  state.serverProcess.on("close", (code) => {
    serverLogger.info("Process exited with code", code);
    state.serverProcess = null;
  });
  state.serverProcess.on("error", (err) => {
    serverLogger.error("Failed to start server process:", err);
    state.serverProcess = null;
  });
  await waitForServer();
}
async function waitForServer(maxAttempts = 30) {
  for (let i = 0; i < maxAttempts; i++) {
    try {
      await new Promise((resolve, reject) => {
        const req = http.get(`http://localhost:${state.serverPort}/api/health`, (res) => {
          if (res.statusCode === 200) {
            resolve();
          } else {
            reject(new Error(`Status: ${res.statusCode}`));
          }
        });
        req.on("error", reject);
        req.setTimeout(1e3, () => {
          req.destroy();
          reject(new Error("Timeout"));
        });
      });
      logger$2.info("Server is ready");
      return;
    } catch {
      await new Promise((r) => setTimeout(r, 500));
    }
  }
  throw new Error("Server failed to start");
}
function stopServer() {
  if (state.serverProcess && state.serverProcess.pid) {
    logger$2.info("Stopping server...");
    if (process.platform === "win32") {
      try {
        execSync(`taskkill /f /t /pid ${state.serverProcess.pid}`, { stdio: "ignore" });
      } catch (error) {
        logger$2.error("Failed to kill server process:", error.message);
      }
    } else {
      state.serverProcess.kill("SIGTERM");
    }
    state.serverProcess = null;
  }
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
function registerDialogHandlers() {
  ipcMain.handle(IPC_CHANNELS.DIALOG.OPEN_DIRECTORY, async () => {
    if (!state.mainWindow) {
      return { canceled: true, filePaths: [] };
    }
    const result = await dialog.showOpenDialog(state.mainWindow, {
      properties: ["openDirectory", "createDirectory"]
    });
    if (!result.canceled && result.filePaths.length > 0) {
      const selectedPath = result.filePaths[0];
      if (!isPathAllowed(selectedPath)) {
        const allowedRoot = getAllowedRootDirectory();
        const errorMessage = allowedRoot ? `The selected directory is not allowed. Please select a directory within: ${allowedRoot}` : "The selected directory is not allowed.";
        dialog.showErrorBox("Directory Not Allowed", errorMessage);
        return { canceled: true, filePaths: [] };
      }
    }
    return result;
  });
  ipcMain.handle(
    IPC_CHANNELS.DIALOG.OPEN_FILE,
    async (_, options = {}) => {
      if (!state.mainWindow) {
        return { canceled: true, filePaths: [] };
      }
      const inputProperties = options.properties ?? [];
      const properties = ["openFile", ...inputProperties].filter(
        (p) => p !== "openDirectory" && p !== "createDirectory"
      );
      const result = await dialog.showOpenDialog(state.mainWindow, {
        ...options,
        properties
      });
      return result;
    }
  );
}
function registerShellHandlers() {
  ipcMain.handle(IPC_CHANNELS.SHELL.OPEN_EXTERNAL, async (_, url) => {
    try {
      await shell.openExternal(url);
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });
}
const logger$1 = createLogger("ChatAppHandlers");
function registerAppHandlers() {
  ipcMain.handle(IPC_CHANNELS.APP.GET_PATH, async (_, name) => {
    return app.getPath(name);
  });
  ipcMain.handle(IPC_CHANNELS.APP.GET_VERSION, async () => {
    return app.getVersion();
  });
  ipcMain.handle(IPC_CHANNELS.APP.IS_PACKAGED, async () => {
    return app.isPackaged;
  });
  ipcMain.handle(IPC_CHANNELS.APP.QUIT, () => {
    logger$1.info("Quitting application via IPC request");
    app.quit();
  });
}
function registerAuthHandlers() {
  ipcMain.handle(IPC_CHANNELS.AUTH.GET_API_KEY, (event) => {
    if (event.sender !== state.mainWindow?.webContents) {
      return null;
    }
    return state.apiKey;
  });
}
function registerServerHandlers() {
  ipcMain.handle(IPC_CHANNELS.SERVER.GET_URL, async () => {
    return `http://localhost:${state.serverPort}`;
  });
  ipcMain.handle(IPC_CHANNELS.PING, async () => {
    return "pong";
  });
}
function registerAllHandlers() {
  registerDialogHandlers();
  registerShellHandlers();
  registerAppHandlers();
  registerAuthHandlers();
  registerServerHandlers();
}
const logger = createLogger("ChatElectron");
const isDev = !app.isPackaged;
if (isDev) {
  try {
    require("dotenv").config({ path: path.join(__dirname, "../.env") });
  } catch (error) {
    logger.warn("dotenv not available:", error.message);
  }
}
registerAllHandlers();
app.whenReady().then(handleAppReady);
app.on("window-all-closed", handleWindowAllClosed);
app.on("before-quit", handleBeforeQuit);
async function handleAppReady() {
  let userDataPathToUse;
  if (app.isPackaged) {
    try {
      const desiredUserDataPath = path.join(app.getPath("appData"), "UniAI Chat");
      if (app.getPath("userData") !== desiredUserDataPath) {
        app.setPath("userData", desiredUserDataPath);
        logger.info("[PRODUCTION] userData path set to:", desiredUserDataPath);
      }
      userDataPathToUse = desiredUserDataPath;
    } catch (error) {
      logger.warn("[PRODUCTION] Failed to set userData path:", error.message);
      userDataPathToUse = app.getPath("userData");
    }
  } else {
    const projectRoot = path.join(__dirname, "../../..");
    userDataPathToUse = path.join(projectRoot, "data");
    try {
      app.setPath("userData", userDataPathToUse);
      logger.info("[DEVELOPMENT] userData path set to:", userDataPathToUse);
    } catch (error) {
      logger.warn("[DEVELOPMENT] Failed to set userData path:", error.message);
      userDataPathToUse = path.join(projectRoot, "data");
    }
  }
  setElectronUserDataPath(userDataPathToUse);
  if (isDev) {
    const projectRoot = path.join(__dirname, "../../..");
    setElectronAppPaths([__dirname, projectRoot]);
  } else {
    setElectronAppPaths(__dirname, process.resourcesPath);
  }
  logger.info("Initialized path security helpers");
  const mainProcessDataDir = app.isPackaged ? app.getPath("userData") : path.join(process.cwd(), "data");
  process.env.DATA_DIR = mainProcessDataDir;
  initAllowedPaths();
  try {
    ensureApiKey();
    state.serverPort = await findAvailablePort(DEFAULT_SERVER_PORT);
    if (state.serverPort !== DEFAULT_SERVER_PORT) {
      logger.info("Default server port", DEFAULT_SERVER_PORT, "in use, using port", state.serverPort);
    }
    state.staticPort = await findAvailablePort(DEFAULT_STATIC_PORT);
    if (state.staticPort !== DEFAULT_STATIC_PORT) {
      logger.info("Default static port", DEFAULT_STATIC_PORT, "in use, using port", state.staticPort);
    }
    if (app.isPackaged) {
      await startStaticServer();
    }
    await startServer();
    createWindow();
  } catch (error) {
    logger.error("Failed to start:", error);
    const errorMessage = error.message;
    const isNodeError = errorMessage.includes("Node.js");
    dialog.showErrorBox(
      "UniAI Chat Failed to Start",
      `The application failed to start.

${errorMessage}

${isNodeError ? "Please install Node.js from https://nodejs.org or via a package manager." : "Please check the application logs for more details."}`
    );
    app.quit();
  }
  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
}
function handleWindowAllClosed() {
  if (process.platform !== "darwin") {
    stopServer();
    stopStaticServer();
    app.quit();
  }
}
function handleBeforeQuit() {
  stopServer();
  stopStaticServer();
}
