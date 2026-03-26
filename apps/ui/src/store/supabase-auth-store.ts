import { create } from 'zustand';
import type { User, Session } from '@supabase/supabase-js';
import { createLogger } from '@automaker/utils/logger';
import {
  isSupabaseConfigured,
  getSupabaseClient,
  getSupabaseAuthRedirectUrl,
} from '@/lib/supabase';

interface SupabaseAuthState {
  user: User | null;
  session: Session | null;
  initialized: boolean;
  loading: boolean;
}

interface SupabaseAuthActions {
  initialize: () => Promise<void>;
  signIn: (email: string, password: string) => Promise<{ error: string | null }>;
  signUp: (
    email: string,
    password: string,
    displayName?: string
  ) => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
}

let authStateSubscription: { unsubscribe: () => void } | null = null;
const logger = createLogger('SupabaseAuthStore');

async function trySetSessionFromUrlHash(): Promise<void> {
  if (typeof window === 'undefined') return;
  if (!window.location.hash) return;

  const hash = window.location.hash.startsWith('#')
    ? window.location.hash.slice(1)
    : window.location.hash;
  const params = new URLSearchParams(hash);
  const accessToken = params.get('access_token');
  const refreshToken = params.get('refresh_token');

  if (!accessToken || !refreshToken) return;

  const { error } = await getSupabaseClient().auth.setSession({
    access_token: accessToken,
    refresh_token: refreshToken,
  });

  if (error) {
    logger.warn('Failed to apply session from auth hash:', error);
    return;
  }

  const cleanedUrl = `${window.location.pathname}${window.location.search}`;
  window.history.replaceState({}, document.title, cleanedUrl);
}

export const useSupabaseAuthStore = create<SupabaseAuthState & SupabaseAuthActions>((set) => ({
  user: null,
  session: null,
  initialized: false,
  loading: false,

  initialize: async () => {
    try {
      if (!isSupabaseConfigured()) {
        set({ user: null, session: null, initialized: true, loading: false });
        return;
      }

      const client = getSupabaseClient();
      await trySetSessionFromUrlHash();
      const {
        data: { session },
        error,
      } = await client.auth.getSession();

      if (error) {
        throw error;
      }

      set({
        user: session?.user ?? null,
        session,
        initialized: true,
        loading: false,
      });

      // Avoid stacking multiple listeners if initialize() is called more than once.
      authStateSubscription?.unsubscribe();
      const { data } = client.auth.onAuthStateChange((_event, session) => {
        set({
          user: session?.user ?? null,
          session,
        });
      });
      authStateSubscription = data.subscription;
    } catch (error) {
      logger.error('Supabase auth initialize failed:', error);
      set({ user: null, session: null, initialized: true, loading: false });
    }
  },

  signIn: async (email, password) => {
    if (!isSupabaseConfigured()) return { error: 'Supabase not configured' };

    set({ loading: true });
    const { error } = await getSupabaseClient().auth.signInWithPassword({ email, password });
    set({ loading: false });

    return { error: error?.message ?? null };
  },

  signUp: async (email, password, displayName) => {
    if (!isSupabaseConfigured()) return { error: 'Supabase not configured' };

    const authRedirectUrl = getSupabaseAuthRedirectUrl();
    const signUpOptions: {
      data?: { display_name: string };
      emailRedirectTo?: string;
    } = {};

    if (displayName) {
      signUpOptions.data = { display_name: displayName };
    }

    if (authRedirectUrl) {
      signUpOptions.emailRedirectTo = authRedirectUrl;
    }

    set({ loading: true });
    const { error } = await getSupabaseClient().auth.signUp({
      email,
      password,
      options: Object.keys(signUpOptions).length > 0 ? signUpOptions : undefined,
    });
    set({ loading: false });

    return { error: error?.message ?? null };
  },

  signOut: async () => {
    if (!isSupabaseConfigured()) return;
    await getSupabaseClient().auth.signOut();
    set({ user: null, session: null });
  },
}));
