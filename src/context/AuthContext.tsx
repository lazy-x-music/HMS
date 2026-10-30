import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import type { Session } from '@supabase/supabase-js';
import { supabase, type Profile } from '@/lib/supabase';

type AuthState = {
  session: Session | null;
  profile: Profile | null;
  loading: boolean;
};

type AuthContextValue = AuthState & {
  passwordRecovery: boolean;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
  clearPasswordRecovery: () => void;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [passwordRecovery, setPasswordRecovery] = useState(false);

  async function loadProfile(uid: string) {
    const { data, error } = await supabase
      .from('profiles')
      .select('id, email, full_name, role, created_at')
      .eq('id', uid)
      .maybeSingle();
    if (error) {
      console.error('Profile load error:', error.message);
      return;
    }
    if (data) {
      setProfile(data as Profile);
    } else {
      // profile trigger may lag; retry once
      setTimeout(async () => {
        const { data: retry } = await supabase
          .from('profiles')
          .select('id, email, full_name, role, created_at')
          .eq('id', uid)
          .maybeSingle();
        if (retry) setProfile(retry as Profile);
      }, 1500);
    }
  }

  useEffect(() => {
    let mounted = true;

    supabase.auth.getSession().then(({ data }) => {
      if (!mounted) return;
      setSession(data.session);
      if (data.session) {
        loadProfile(data.session.user.id).finally(() => mounted && setLoading(false));
      } else {
        setLoading(false);
      }
    });

    const { data: sub } = supabase.auth.onAuthStateChange((event, sess) => {
      if (event === 'PASSWORD_RECOVERY') setPasswordRecovery(true);
      setSession(sess);
      if (sess) {
        loadProfile(sess.user.id);
      } else {
        setProfile(null);
      }
    });

    return () => {
      mounted = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  const signOut = async () => {
    await supabase.auth.signOut();
    setProfile(null);
  };

  const refreshProfile = async () => {
    if (session) await loadProfile(session.user.id);
  };

  const clearPasswordRecovery = () => setPasswordRecovery(false);

  return (
    <AuthContext.Provider value={{ session, profile, loading, passwordRecovery, signOut, refreshProfile, clearPasswordRecovery }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
