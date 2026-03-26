import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import type { Database } from './supabase-types';

function sanitizeEnvValue(value: string | undefined): string {
  // Remove accidental line breaks from copied ENV values (common cause of broken websocket URLs).
  return (value ?? '').trim().replace(/[\r\n]+/g, '');
}

const rawSupabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const rawSupabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
const rawSupabaseAuthRedirectUrl = import.meta.env.VITE_SUPABASE_AUTH_REDIRECT_URL;

const supabaseUrl = sanitizeEnvValue(rawSupabaseUrl);
const supabaseAnonKey = sanitizeEnvValue(rawSupabaseAnonKey);
const supabaseAuthRedirectUrl = sanitizeEnvValue(rawSupabaseAuthRedirectUrl);

let _client: SupabaseClient<Database> | null = null;

if (supabaseUrl && supabaseAnonKey) {
  _client = createClient<Database>(supabaseUrl, supabaseAnonKey);
}

export function isSupabaseConfigured(): boolean {
  return _client !== null;
}

/**
 * Redirect URL used in Supabase auth emails (signup / magic link / recovery).
 * Priority:
 * 1. VITE_SUPABASE_AUTH_REDIRECT_URL (explicit override, useful on Vercel)
 * 2. Current origin (works for local and preview deployments)
 */
export function getSupabaseAuthRedirectUrl(): string | undefined {
  if (supabaseAuthRedirectUrl) {
    return supabaseAuthRedirectUrl;
  }

  if (typeof window !== 'undefined' && window.location?.origin) {
    return window.location.origin;
  }

  return undefined;
}

/**
 * Get the Supabase client. Throws if not configured.
 * Use `isSupabaseConfigured()` to check first.
 */
export function getSupabaseClient(): SupabaseClient<Database> {
  if (!_client) {
    throw new Error(
      'Supabase is not configured. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.'
    );
  }
  return _client;
}
