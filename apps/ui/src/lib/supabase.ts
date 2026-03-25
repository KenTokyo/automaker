import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import type { Database } from './supabase-types';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL ?? '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY ?? '';

let _client: SupabaseClient<Database> | null = null;

if (supabaseUrl && supabaseAnonKey) {
  _client = createClient<Database>(supabaseUrl, supabaseAnonKey);
}

export function isSupabaseConfigured(): boolean {
  return _client !== null;
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
