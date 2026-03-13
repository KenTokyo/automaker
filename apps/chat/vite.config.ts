import * as path from 'path';
import * as fs from 'fs';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { defineConfig } from 'vite';
import electron from 'vite-plugin-electron/simple';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const uiSrcDir = path.resolve(__dirname, '../ui/src');

// Read version from root package.json
const rootPackageJson = JSON.parse(
  fs.readFileSync(path.resolve(__dirname, '../../package.json'), 'utf-8')
);
const appVersion = rootPackageJson.version;

export default defineConfig(({ command }) => {
  // Skip electron plugin in web-only mode or CI
  const skipElectron =
    command === 'serve' && (process.env.CI === 'true' || process.env.VITE_SKIP_ELECTRON === 'true');
  const backendHost = process.env.CHAT_API_HOST || '127.0.0.1';
  const backendPort = parseInt(process.env.AUTOMAKER_SERVER_PORT || process.env.PORT || '3008', 10);
  const backendTarget = process.env.CHAT_API_TARGET || `http://${backendHost}:${backendPort}`;

  return {
    plugins: [
      ...(skipElectron
        ? []
        : [
            electron({
              main: {
                entry: 'src/electron/main-entry.ts',
                vite: {
                  build: {
                    outDir: 'dist-electron',
                    rollupOptions: {
                      external: ['electron'],
                    },
                  },
                },
              },
              preload: {
                input: 'src/preload.ts',
                vite: {
                  build: {
                    outDir: 'dist-electron',
                    rollupOptions: {
                      external: ['electron'],
                    },
                  },
                },
              },
            }),
          ]),
      tailwindcss(),
      react(),
    ],
    resolve: {
      alias: {
        // @/ resolves to apps/ui/src/ so that all shared UI component
        // internal imports (e.g. @/lib/utils, @/store/app-store) work
        // correctly when compiled in this Vite context.
        '@/': `${uiSrcDir}/`,
        '@': uiSrcDir,
      },
    },
    server: {
      host: process.env.HOST || '0.0.0.0',
      port: parseInt(process.env.CHAT_PORT || '3009', 10),
      allowedHosts: true,
      proxy: {
        '/api': {
          target: backendTarget,
          changeOrigin: true,
          ws: true,
        },
      },
    },
    build: {
      outDir: 'dist',
      rolldownOptions: {
        external: [
          'child_process',
          'fs',
          'path',
          'crypto',
          'http',
          'net',
          'os',
          'util',
          'stream',
          'events',
          'readline',
        ],
      },
    },
    optimizeDeps: {
      exclude: ['@automaker/platform'],
    },
    define: {
      __APP_VERSION__: JSON.stringify(appVersion),
    },
  };
});
