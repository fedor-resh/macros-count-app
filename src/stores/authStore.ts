import { Session, User } from '@supabase/supabase-js';
import { create } from 'zustand';
import { supabase } from '../lib/supabase';

interface AuthState {
  session: Session | null;
  user: User | null;
  loading: boolean;
  setSession: (session: Session | null) => void;
  signOut: () => Promise<void>;
  initialize: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  session: null,
  user: null,
  loading: true,

  setSession: (session) => {
    set({
      session,
      user: session?.user ?? null,
      loading: false,
    });
  },

  signOut: async () => {
    await supabase.auth.signOut();
    set({
      session: null,
      user: null,
    });
  },

  initialize: async () => {
    // Get initial session
    const { data: { session } } = await supabase.auth.getSession();
    set({
      session,
      user: session?.user ?? null,
      loading: false,
    });

    // Listen for auth changes
    supabase.auth.onAuthStateChange((_event, session) => {
      set({
        session,
        user: session?.user ?? null,
        loading: false,
      });
    });
  },
}));

