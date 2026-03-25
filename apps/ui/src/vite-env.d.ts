/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_SERVER_URL?: string;
  readonly VITE_APP_MODE?: '1' | '2' | '3' | '4';
  readonly VITE_SUPABASE_URL?: string;
  readonly VITE_SUPABASE_ANON_KEY?: string;
}

// Extend ImportMeta to include env property
interface ImportMeta {
  readonly env: ImportMetaEnv;
}

// Global constants defined in vite.config.mts
declare const __APP_VERSION__: string;
