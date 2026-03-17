#!/usr/bin/env node
/**
 * Cross-platform launcher for Automaker
 * Works on Windows (CMD, PowerShell, Git Bash) and Unix (macOS, Linux)
 */

import { spawn, spawnSync } from 'child_process';
import { existsSync, readFileSync } from 'fs';
import { platform } from 'os';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const isWindows = platform() === 'win32';
const args = process.argv.slice(2);
const launcherModes = new Set([
  'web',
  'electron',
  'electron-fast',
  'docker',
  'docker-electron',
  'chat',
  'chat-electron',
]);
const npmRunCommand = isWindows ? 'npm.cmd' : 'npm';
const fallbackIgnoredFlags = new Set(['--no-colors', '--check-deps', '--no-history']);
const fallbackDryRunFlag = '--fallback-dry-run';
const forceNoBashFallback = process.env.AUTOMAKER_FORCE_NO_BASH === '1';

/**
 * Detect the bash variant by checking $OSTYPE
 * This is more reliable than path-based detection since bash.exe in PATH
 * could be Git Bash, WSL, or something else
 * @param {string} bashPath - Path to bash executable
 * @returns {'WSL' | 'MSYS' | 'CYGWIN' | 'UNKNOWN'} The detected bash variant
 */
function detectBashVariant(bashPath) {
  try {
    const result = spawnSync(bashPath, ['-c', 'echo $OSTYPE'], {
      stdio: 'pipe',
      timeout: 2000,
    });
    if (result.status === 0) {
      const ostype = result.stdout.toString().trim();
      // WSL reports 'linux-gnu' or similar Linux identifier
      if (ostype === 'linux-gnu' || ostype.startsWith('linux')) return 'WSL';
      // MSYS2/Git Bash reports 'msys' or 'mingw*'
      if (ostype.startsWith('msys') || ostype.startsWith('mingw')) return 'MSYS';
      // Cygwin reports 'cygwin'
      if (ostype.startsWith('cygwin')) return 'CYGWIN';
    }
  } catch {
    // Fall through to path-based detection
  }
  // Fallback to path-based detection if $OSTYPE check fails
  const lower = bashPath.toLowerCase();
  if (lower.includes('cygwin')) return 'CYGWIN';
  if (lower.includes('system32')) return 'WSL';
  // Default to MSYS (Git Bash) as it's the most common
  return 'MSYS';
}

/**
 * Convert Windows path to Unix-style for the detected bash variant
 * @param {string} windowsPath - Windows-style path (e.g., C:\path\to\file)
 * @param {string} bashCmd - Path to bash executable (used to detect variant)
 * @returns {string} Unix-style path appropriate for the bash variant
 */
function convertPathForBash(windowsPath, bashCmd) {
  // Input validation
  if (!windowsPath || typeof windowsPath !== 'string') {
    throw new Error('convertPathForBash: invalid windowsPath');
  }
  if (!bashCmd || typeof bashCmd !== 'string') {
    throw new Error('convertPathForBash: invalid bashCmd');
  }

  let unixPath = windowsPath.replace(/\\/g, '/');
  if (/^[A-Za-z]:/.test(unixPath)) {
    const drive = unixPath[0].toLowerCase();
    const pathPart = unixPath.slice(2);

    // Detect bash variant via $OSTYPE (more reliable than path-based)
    const variant = detectBashVariant(bashCmd);
    switch (variant) {
      case 'CYGWIN':
        // Cygwin expects /cygdrive/c/path format
        return `/cygdrive/${drive}${pathPart}`;
      case 'WSL':
        // WSL expects /mnt/c/path format
        return `/mnt/${drive}${pathPart}`;
      case 'MSYS':
      default:
        // MSYS2/Git Bash expects /c/path format
        return `/${drive}${pathPart}`;
    }
  }
  return unixPath;
}

/**
 * Find bash executable on Windows
 */
function findBashOnWindows() {
  const possiblePaths = [
    // Git Bash (most common)
    'C:\\Program Files\\Git\\bin\\bash.exe',
    'C:\\Program Files (x86)\\Git\\bin\\bash.exe',
    // MSYS2
    'C:\\msys64\\usr\\bin\\bash.exe',
    'C:\\msys32\\usr\\bin\\bash.exe',
    // Cygwin
    'C:\\cygwin64\\bin\\bash.exe',
    'C:\\cygwin\\bin\\bash.exe',
    // WSL bash (available in PATH on Windows 10+)
    'bash.exe',
  ];

  for (const bashPath of possiblePaths) {
    if (bashPath === 'bash.exe') {
      // Check if bash is in PATH
      try {
        const result = spawnSync('where', ['bash.exe'], { stdio: 'pipe' });
        if (result?.status === 0) {
          return 'bash.exe';
        }
      } catch (err) {
        // where command failed, continue checking other paths
      }
    } else if (existsSync(bashPath)) {
      return bashPath;
    }
  }

  return null;
}

/**
 * Parse launcher arguments for no-bash fallback mode
 * @param {string[]} launcherArgs
 * @returns {{
 *   mode: string | null,
 *   production: boolean,
 *   showHelp: boolean,
 *   showVersion: boolean,
 *   dryRun: boolean,
 *   ignoredFlags: string[],
 *   unknownArgs: string[],
 * }}
 */
function parseLauncherArgsForFallback(launcherArgs) {
  let mode = null;
  let production = false;
  let showHelp = false;
  let showVersion = false;
  let dryRun = false;
  const ignoredFlags = [];
  const unknownArgs = [];

  for (const arg of launcherArgs) {
    if (arg === '--') {
      continue;
    }

    if (arg === '--help' || arg === '-h') {
      showHelp = true;
      continue;
    }

    if (arg === '--version' || arg === '-v') {
      showVersion = true;
      continue;
    }

    if (arg === fallbackDryRunFlag) {
      dryRun = true;
      continue;
    }

    if (arg === '--production') {
      production = true;
      continue;
    }

    if (fallbackIgnoredFlags.has(arg)) {
      if (!ignoredFlags.includes(arg)) {
        ignoredFlags.push(arg);
      }
      continue;
    }

    if (launcherModes.has(arg)) {
      mode = arg;
      continue;
    }

    unknownArgs.push(arg);
  }

  return {
    mode,
    production,
    showHelp,
    showVersion,
    dryRun,
    ignoredFlags,
    unknownArgs,
  };
}

/**
 * Resolve a direct npm script when bash is not available on Windows
 * @param {{
 *   mode: string | null,
 *   production: boolean,
 *   ignoredFlags: string[],
 * }} parsedArgs
 * @returns {{scriptName: string | null, notes: string[]}}
 */
function resolveFallbackScript(parsedArgs) {
  const notes = [];
  let mode = parsedArgs.mode ?? 'electron';

  if (!parsedArgs.mode) {
    notes.push('No mode argument found. Starting safe mode "electron".');
  }

  if (mode === 'electron-fast') {
    notes.push('Fast mode needs bash safety checks. Falling back to safe mode "electron".');
    mode = 'electron';
  }

  if (mode === 'docker-electron') {
    notes.push('Docker + Electron orchestration needs the bash launcher.');
    notes.push('Falling back to "docker" mode.');
    mode = 'docker';
  }

  if (parsedArgs.production) {
    notes.push('The --production flag was passed. Direct fallback uses development scripts.');
  }

  if (parsedArgs.ignoredFlags.length > 0) {
    notes.push(`These options need bash and were ignored: ${parsedArgs.ignoredFlags.join(', ')}`);
  }

  switch (mode) {
    case 'web':
      return { scriptName: 'dev:stable', notes };
    case 'electron':
      return { scriptName: 'dev:electron', notes };
    case 'docker':
      return { scriptName: 'dev:docker', notes };
    case 'chat':
      return { scriptName: 'dev:chat', notes };
    case 'chat-electron':
      return { scriptName: 'dev:electron:chat', notes };
    default:
      notes.push(`Mode "${mode}" cannot be started without bash.`);
      return { scriptName: null, notes };
  }
}

/**
 * Read launcher version from apps/ui/package.json
 * @returns {string}
 */
function readLauncherVersion() {
  try {
    const packageJsonPath = join(__dirname, 'apps', 'ui', 'package.json');
    if (!existsSync(packageJsonPath)) {
      return 'v0.11.0';
    }

    const content = readFileSync(packageJsonPath, 'utf8');
    const parsed = JSON.parse(content);
    if (typeof parsed.version === 'string' && parsed.version.length > 0) {
      return `v${parsed.version}`;
    }
  } catch {
    // Fall back to default version if package.json is missing or invalid
  }
  return 'v0.11.0';
}

/**
 * Print fallback-specific help when bash is unavailable on Windows
 */
function printWindowsNoBashHelp() {
  console.log('Automaker launcher fallback (Windows without bash)');
  console.log('');
  console.log('Usage: node start-automaker.mjs [mode] [options]');
  console.log('');
  console.log('Modes (direct fallback):');
  console.log('  web              -> npm run dev:stable');
  console.log('  electron         -> npm run dev:electron');
  console.log('  electron-fast    -> fallback to safe "electron"');
  console.log('  docker           -> npm run dev:docker');
  console.log('  docker-electron  -> fallback to "docker"');
  console.log('  chat             -> npm run dev:chat');
  console.log('  chat-electron    -> npm run dev:electron:chat');
  console.log('');
  console.log('Options (fallback):');
  console.log('  --help, -h');
  console.log('  --version, -v');
  console.log(`  ${fallbackDryRunFlag}  Print resolved command without starting`);
  console.log('');
  console.log('Install Git Bash for the full interactive launcher experience.');
}

/**
 * Print fallback-specific version output when bash is unavailable on Windows
 */
function printWindowsNoBashVersion() {
  console.log(`Automaker Launcher ${readLauncherVersion()}`);
  console.log(`Node.js: ${process.version}`);
  console.log('Shell: no bash detected (fallback mode)');
}

/**
 * Run a direct npm script as a fallback when bash is not available
 */
function runWindowsNoBashFallback() {
  const parsedArgs = parseLauncherArgsForFallback(args);

  if (parsedArgs.showHelp) {
    printWindowsNoBashHelp();
    process.exit(0);
  }

  if (parsedArgs.showVersion) {
    printWindowsNoBashVersion();
    process.exit(0);
  }

  if (parsedArgs.unknownArgs.length > 0) {
    console.error('Warning: Bash was not found on Windows.');
    console.error(`Unknown argument(s): ${parsedArgs.unknownArgs.join(', ')}`);
    console.error('Use --help to see supported fallback options.');
    process.exit(1);
  }

  const plan = resolveFallbackScript(parsedArgs);

  console.error('Warning: Bash was not found on Windows.');
  console.error('Using a direct npm fallback so the launcher does not stop here.');
  console.error('');

  for (const note of plan.notes) {
    console.error(`- ${note}`);
  }

  if (!plan.scriptName) {
    console.error('');
    console.error('Please install Git for Windows from https://git-scm.com/download/win');
    console.error('Then start the launcher again.');
    process.exit(1);
  }

  if (parsedArgs.dryRun) {
    console.error('');
    console.error(`Dry run: npm run ${plan.scriptName}`);
    process.exit(0);
  }

  console.error('');
  console.error(`Running fallback command: npm run ${plan.scriptName}`);
  console.error('');

  const child = spawn(npmRunCommand, ['run', plan.scriptName], {
    stdio: 'inherit',
    env: {
      ...process.env,
      TERM: process.env.TERM || 'xterm-256color',
    },
    shell: false,
  });

  child.on('error', (err) => {
    if (err.code === 'ENOENT') {
      console.error(`Error: Could not find "${npmRunCommand}" in PATH.`);
      console.error('Please install Node.js and npm, then try again.');
    } else {
      console.error('Error launching fallback command:', err.message);
    }
    process.exit(1);
  });

  child.on('exit', (code, signal) => {
    if (signal) {
      process.exit(1);
    }
    process.exit(code ?? 0);
  });

  process.on('SIGINT', () => {
    if (!child.killed) child.kill('SIGINT');
  });
  process.on('SIGTERM', () => {
    if (!child.killed) child.kill('SIGTERM');
  });
}

/**
 * Run the bash script
 */
function runBashScript() {
  const scriptPath = join(__dirname, 'start-automaker.sh');

  if (!existsSync(scriptPath)) {
    console.error('Error: start-automaker.sh not found');
    process.exit(1);
  }

  let bashCmd;
  let bashArgs;

  if (isWindows) {
    if (forceNoBashFallback || args.includes(fallbackDryRunFlag)) {
      runWindowsNoBashFallback();
      return;
    }

    bashCmd = findBashOnWindows();

    if (!bashCmd) {
      runWindowsNoBashFallback();
      return;
    }

    // Convert Windows path to appropriate Unix-style for the detected bash variant
    const unixPath = convertPathForBash(scriptPath, bashCmd);
    bashArgs = [unixPath, ...args];
  } else {
    bashCmd = '/bin/bash';
    bashArgs = [scriptPath, ...args];
  }

  const child = spawn(bashCmd, bashArgs, {
    stdio: 'inherit',
    env: {
      ...process.env,
      // Ensure proper terminal handling
      TERM: process.env.TERM || 'xterm-256color',
    },
    // shell: false ensures signals are forwarded directly to the child process
    shell: false,
  });

  child.on('error', (err) => {
    if (err.code === 'ENOENT') {
      console.error(`Error: Could not find bash at "${bashCmd}"`);
      console.error('Please ensure Git Bash or another bash shell is installed.');
    } else {
      console.error('Error launching Automaker:', err.message);
    }
    process.exit(1);
  });

  child.on('exit', (code, signal) => {
    if (signal) {
      // Process was killed by a signal - exit with 1 to indicate abnormal termination
      // (Unix convention is 128 + signal number, but we use 1 for simplicity)
      process.exit(1);
    }
    process.exit(code ?? 0);
  });

  // Forward signals to child process (guard against race conditions)
  process.on('SIGINT', () => {
    if (!child.killed) child.kill('SIGINT');
  });
  process.on('SIGTERM', () => {
    if (!child.killed) child.kill('SIGTERM');
  });
}

runBashScript();
