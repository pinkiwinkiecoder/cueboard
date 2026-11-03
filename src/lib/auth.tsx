import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import type { Session } from '@supabase/supabase-js';
import { supabase } from './supabase';
import type { Profile } from './types';

interface AuthState {
  session: Session | null;
  profile: Profile | null;
  loading: boolean;
  /** Uitleg als iemand ingelogd is maar geen (actief) profiel heeft. */
  problem: string | null;
  /** True kort na het openen van een uitnodigings- of resetlink. */
  recovery: boolean;
  signOut: () => Promise<void>;
  reloadProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [problem, setProblem] = useState<string | null>(null);
  const [recovery, setRecovery] = useState(false);

  const loadProfile = useCallback(async (s: Session | null) => {
    if (!s) {
      setProfile(null);
      setProblem(null);
      return;
    }
    const { data, error } = await supabase
      .from('profiles')
      .select('id, full_name, email, phone, department_id, role, active')
      .eq('id', s.user.id)
      .maybeSingle<Profile>();
    if (error) {
      setProblem(
        'Je profiel kon niet geladen worden. Controleer je verbinding en probeer opnieuw.',
      );
      return;
    }
    if (!data) {
      setProblem('Er is geen profiel voor dit account. Vraag de beheerder om je uit te nodigen.');
      setProfile(null);
      return;
    }
    if (!data.active) {
      setProblem('Je account is gedeactiveerd. Neem contact op met de beheerder.');
      setProfile(null);
      await supabase.auth.signOut();
      return;
    }
    setProblem(null);
    setProfile(data);
  }, []);

  useEffect(() => {
    // Enkel tijdens lokale ontwikkeling (npm run dev): bekijk de app zonder server.
    // import.meta.env.DEV is false in elke build, dus dit zit nooit in productie.
    if (import.meta.env.DEV && import.meta.env.VITE_DEMO_LOGIN === '1') {
      setSession({ user: { id: 'demo', email: 'demo@demo.test' } } as Session);
      setProfile({
        id: 'demo',
        full_name: 'Demo Beheerder',
        email: 'demo@demo.test',
        phone: null,
        department_id: null,
        role: 'beheerder',
        active: true,
      });
      setLoading(false);
      return;
    }
    let cancelled = false;
    void supabase.auth.getSession().then(async ({ data }) => {
      if (cancelled) return;
      setSession(data.session);
      await loadProfile(data.session);
      if (!cancelled) setLoading(false);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((event, s) => {
      setSession(s);
      if (event === 'PASSWORD_RECOVERY') setRecovery(true);
      // Geen await in de callback (aanbevolen door Supabase): profiel apart laden.
      setTimeout(() => void loadProfile(s), 0);
    });
    return () => {
      cancelled = true;
      sub.subscription.unsubscribe();
    };
  }, [loadProfile]);

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
    setProfile(null);
  }, []);

  const reloadProfile = useCallback(() => loadProfile(session), [loadProfile, session]);

  const value = useMemo(
    () => ({ session, profile, loading, problem, recovery, signOut, reloadProfile }),
    [session, profile, loading, problem, recovery, signOut, reloadProfile],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth buiten AuthProvider');
  return ctx;
}
