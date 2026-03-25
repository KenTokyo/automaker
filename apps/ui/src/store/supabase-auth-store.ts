import { create } from 'zustand';
import type { User, Session } from '@supabase/supabase-js';
import { isSupabaseConfigured, getSupabaseClient } from '@/lib/supabase';

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

export const useSupabaseAuthStore = create<SupabaseAuthState & SupabaseAuthActions>((set) => ({
  user: null,
  session: null,
  initialized: false,
  loading: false,

  initialize: async () => {
    if (!isSupabaseConfigured()) {
      set({ initialized: true });
      return;
    }

    const client = getSupabaseClient();
    const {
      data: { session },
    } = await client.auth.getSession();
    set({
      user: session?.user ?? null,
      session,
      initialized: true,
    });

    client.auth.onAuthStateChange((_event, session) => {
      set({
        user: session?.user ?? null,
        session,
      });
    });
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

    set({ loading: true });
    const { error } = await getSupabaseClient().auth.signUp({
      email,
      password,
      options: displayName ? { data: { display_name: displayName } } : undefined,
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
