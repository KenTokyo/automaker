/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_SERVER_URL?: string;
  readonly VITE_APP_MODE?: '1' | '2' | '3' | '4';
  readonly VITE_SUPABASE_URL?: string;
  readonly VITE_SUPABASE_ANON_KEY?: string;
  readonly VITE_SUPABASE_AUTH_REDIRECT_URL?: string;
  readonly VITE_HIDE_TERMINAL?: 'true' | 'false';
  readonly VITE_HIDE_WIKI?: 'true' | 'false';
  readonly VITE_HIDE_RUNNING_AGENTS?: 'true' | 'false';
  readonly VITE_HIDE_CONTEXT?: 'true' | 'false';
  readonly VITE_HIDE_SPEC_EDITOR?: 'true' | 'false';
  readonly VITE_HIDE_BOARD?: 'true' | 'false';
  readonly VITE_HIDE_GRAPH?: 'true' | 'false';
}

// Extend ImportMeta to include env property
interface ImportMeta {
  readonly env: ImportMetaEnv;
}

// Global constants defined in vite.config.mts
declare const __APP_VERSION__: string;
