import * as path from 'path';
import * as fs from 'fs';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { defineConfig } from 'vite';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const packageJson = JSON.parse(fs.readFileSync(path.resolve(__dirname, 'package.json'), 'utf-8'));
const appVersion = packageJson.version;

export default defineConfig({
  plugins: [tailwindcss(), react()],
  envDir: __dirname,
  resolve: {
    alias: {
      '@': path.resolve(__dirname, '../ui/src'),
      '@ui': path.resolve(__dirname, '../ui/src'),
      '@kanban': path.resolve(__dirname, './src'),
    },
  },
  server: {
    host: process.env.HOST || '0.0.0.0',
    port: parseInt(process.env.TEST_PORT || '3010', 10),
    hmr: false,
    allowedHosts: true,
  },
  build: {
    outDir: 'dist',
  },
  optimizeDeps: {
    exclude: ['@automaker/platform'],
  },
  define: {
    __APP_VERSION__: JSON.stringify(appVersion),
  },
});
