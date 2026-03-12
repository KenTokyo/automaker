#!/usr/bin/env node

import net from 'node:net';

const portValue = process.env.AUTOMAKER_SERVER_PORT || process.env.PORT || '3008';
const port = Number.parseInt(portValue, 10);

if (!Number.isInteger(port) || port < 1 || port > 65535) {
  console.error(`[dev:chat] Invalid server port: "${portValue}"`);
  process.exit(1);
}

const checker = net.createServer();
checker.unref();

checker.once('error', (error) => {
  if ((error && /** @type {{ code?: string }} */ (error).code) === 'EADDRINUSE') {
    console.error('');
    console.error(`[dev:chat] Port ${port} is already in use.`);
    console.error('[dev:chat] Stop the old process first, then start again.');
    console.error('');
    console.error('[dev:chat] Windows (PowerShell):');
    console.error(
      `[dev:chat]   Get-NetTCPConnection -LocalPort ${port} -State Listen | Select-Object -ExpandProperty OwningProcess`
    );
    console.error('[dev:chat]   Stop-Process -Id <PID> -Force');
    console.error('');
    console.error('[dev:chat] macOS/Linux:');
    console.error(`[dev:chat]   lsof -ti:${port} | xargs kill -9`);
    process.exit(1);
  }

  console.error(`[dev:chat] Could not validate port ${port}:`, error);
  process.exit(1);
});

checker.once('listening', () => {
  checker.close(() => {
    process.exit(0);
  });
});

checker.listen(port, '0.0.0.0');
