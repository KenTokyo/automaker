#!/usr/bin/env node

import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import kill from 'tree-kill';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, '..');
const serverRoot = path.join(repoRoot, 'apps', 'server');
const chatRoot = path.join(repoRoot, 'apps', 'chat');

const serverPortValue = process.env.AUTOMAKER_SERVER_PORT || process.env.PORT || '3008';
const serverPort = Number.parseInt(serverPortValue, 10);

if (!Number.isInteger(serverPort) || serverPort < 1 || serverPort > 65535) {
  console.error(`[dev:chat] Ungültiger Server-Port: "${serverPortValue}"`);
  process.exit(1);
}

const serverTarget = `http://127.0.0.1:${serverPort}`;
const dataDir = process.env.DATA_DIR || path.join(repoRoot, 'data');
const nodeCommand = process.execPath;

let shuttingDown = false;
let serverProcess = null;
let chatProcess = null;
let exitCode = 0;

function prefixLine(prefix, line) {
  if (line.length === 0) {
    return `[${prefix}]`;
  }

  return `[${prefix}] ${line}`;
}

function pipeOutput(child, prefix) {
  const forward = (stream, target) => {
    if (!stream) return;

    let buffer = '';
    stream.on('data', (chunk) => {
      buffer += chunk.toString();
      const lines = buffer.split(/\r?\n/);
      buffer = lines.pop() ?? '';

      for (const line of lines) {
        target.write(`${prefixLine(prefix, line)}\n`);
      }
    });

    stream.on('end', () => {
      if (buffer.length > 0) {
        target.write(`${prefixLine(prefix, buffer)}\n`);
      }
    });
  };

  forward(child.stdout, process.stdout);
  forward(child.stderr, process.stderr);
}

function resolveCli(label, candidates) {
  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) {
      return candidate;
    }
  }

  throw new Error(`Konnte ${label} nicht finden.`);
}

function spawnNodeProcess({ args, cwd, env, prefix }) {
  const child = spawn(nodeCommand, args, {
    cwd,
    env: {
      ...process.env,
      ...env,
    },
    stdio: ['ignore', 'pipe', 'pipe'],
    windowsHide: true,
  });

  pipeOutput(child, prefix);
  return child;
}

function waitForHealth(url, maxAttempts = 60, delayMs = 500) {
  return new Promise((resolve, reject) => {
    let attempt = 0;

    const tryConnect = () => {
      attempt += 1;

      const req = http.get(`${url}/api/health`, (res) => {
        res.resume();

        if (res.statusCode === 200) {
          resolve();
          return;
        }

        if (attempt >= maxAttempts) {
          reject(new Error(`Health-Check gab Status ${res.statusCode ?? 'unbekannt'} zurück.`));
          return;
        }

        setTimeout(tryConnect, delayMs);
      });

      req.on('error', () => {
        if (attempt >= maxAttempts) {
          reject(new Error('Backend war nicht rechtzeitig erreichbar.'));
          return;
        }

        setTimeout(tryConnect, delayMs);
      });

      req.setTimeout(1500, () => {
        req.destroy(new Error('Timeout'));
      });
    };

    tryConnect();
  });
}

function killProcessTree(child) {
  return new Promise((resolve) => {
    if (!child?.pid) {
      resolve();
      return;
    }

    kill(child.pid, 'SIGTERM', () => resolve());
  });
}

async function shutdown(code = 0) {
  if (shuttingDown) return;
  shuttingDown = true;
  exitCode = code;

  await Promise.allSettled([killProcessTree(chatProcess), killProcessTree(serverProcess)]);
  process.exit(exitCode);
}

async function start() {
  const serverCli = resolveCli('tsx CLI', [
    path.join(serverRoot, 'node_modules', 'tsx', 'dist', 'cli.mjs'),
    path.join(repoRoot, 'node_modules', 'tsx', 'dist', 'cli.mjs'),
  ]);
  const chatCli = resolveCli('Vite CLI', [
    path.join(chatRoot, 'node_modules', 'vite', 'bin', 'vite.js'),
    path.join(repoRoot, 'node_modules', 'vite', 'bin', 'vite.js'),
  ]);

  console.log(`[dev:chat] Starte Backend auf Port ${serverPort}...`);

  serverProcess = spawnNodeProcess({
    args: [serverCli, 'watch', 'src/index.ts'],
    cwd: serverRoot,
    env: {
      PORT: String(serverPort),
      AUTOMAKER_SERVER_PORT: String(serverPort),
      AUTOMAKER_MODE: 'chat',
      AUTOMAKER_AUTO_LOGIN: process.env.AUTOMAKER_AUTO_LOGIN ?? 'true',
      DATA_DIR: dataDir,
      HOSTNAME: process.env.HOSTNAME || 'localhost',
    },
    prefix: 'server',
  });

  serverProcess.on('exit', (code, signal) => {
    if (shuttingDown) return;

    const detail = signal ? `Signal ${signal}` : `Code ${code ?? 1}`;
    console.error(`[dev:chat] Server wurde beendet (${detail}).`);
    void shutdown(code ?? 1);
  });

  try {
    await waitForHealth(serverTarget);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`[dev:chat] Backend-Start fehlgeschlagen: ${message}`);
    await shutdown(1);
    return;
  }

  console.log(`[dev:chat] Backend ist bereit: ${serverTarget}/api/health`);
  console.log('[dev:chat] Starte Chat-Frontend...');

  chatProcess = spawnNodeProcess({
    args: [chatCli],
    cwd: chatRoot,
    env: {
      VITE_SKIP_ELECTRON: 'true',
      CHAT_API_TARGET: serverTarget,
      CHAT_API_HOST: '127.0.0.1',
      AUTOMAKER_SERVER_PORT: String(serverPort),
      DATA_DIR: dataDir,
    },
    prefix: 'chat',
  });

  chatProcess.on('exit', (code, signal) => {
    if (shuttingDown) return;

    const detail = signal ? `Signal ${signal}` : `Code ${code ?? 0}`;
    console.error(`[dev:chat] Chat wurde beendet (${detail}).`);
    void shutdown(code ?? 0);
  });
}

process.on('SIGINT', () => {
  void shutdown(0);
});

process.on('SIGTERM', () => {
  void shutdown(0);
});

void start();
