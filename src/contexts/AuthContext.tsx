import { createContext, ReactNode, useContext, useEffect } from 'react';
import { Session, User } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import { useSignOutMutation } from '../store/api/supabaseApi';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import { clearAuth, setSession } from '../store/slices/authSlice';

interface AuthContextType {
  session: Session | null;
  user: User | null;
  loading: boolean;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const dispatch = useAppDispatch();
  const { session, user, loading } = useAppSelector((state) => state.auth);
  const [signOutMutation] = useSignOutMutation();

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      dispatch(setSession(session));
    });

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      dispatch(setSession(session));
    });

    return () => subscription.unsubscribe();
  }, [dispatch]);

  const signOut = async () => {
    await signOutMutation();
    dispatch(clearAuth());
  };

  return (
    <AuthContext.Provider value={{ session, user, loading, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
