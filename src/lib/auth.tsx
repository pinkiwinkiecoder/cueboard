import { exitDemo, isDemo } from './demoMode';
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
import { arrivedViaSetPasswordLink, supabase } from './supabase';
import type { Access, Profile } from './types';
import { ALL_PERMISSIONS, type Permission } from './permissions';
import type { MsgKey } from '@/i18n';
import { kvGet, kvSet } from './localdb';

interface AuthState {
  session: Session | null;
  profile: Profile | null;
  access: Access | null;
  loading: boolean;
  /** Uitleg als iemand ingelogd is maar geen (actief) profiel heeft. */
  problem: MsgKey | null;
  /** True kort na het openen van een uitnodigings- of resetlink. */
  recovery: boolean;
  /** Heeft de ingelogde persoon dit recht? Beheerder: altijd. */
  can: (perm: Permission) => boolean;
  isAdmin: boolean;
  signOut: () => Promise<void>;
  reloadProfile: () => Promise<void>;
  /** Na het kiezen van een wachtwoord: niet langer naar het wachtwoordscherm sturen. */
  clearRecovery: () => void;
}

const AuthContext = createContext<AuthState | null>(null);
const CACHE_KEY = 'me';

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [access, setAccess] = useState<Access | null>(null);
  const [loading, setLoading] = useState(true);
  const [problem, setProblem] = useState<MsgKey | null>(null);
  const [recovery, setRecovery] = useState(arrivedViaSetPasswordLink);

  const loadProfile = useCallback(async (s: Session | null) => {
    if (!s) {
      setProfile(null);
      setAccess(null);
      setProblem(null);
      return;
    }
    const [{ data, error }, acc] = await Promise.all([
      supabase
        .from('profiles')
        .select('id, full_name, email, phone, department_id, role_id, active')
        .eq('id', s.user.id)
        .maybeSingle<Profile>(),
      supabase.rpc('my_access'),
    ]);
    if (error || acc.error) {
      // Offline: val terug op de laatst bekende gegevens van dit toestel.
      const cached = await kvGet<{ profile: Profile; access: Access }>(CACHE_KEY);
      if (cached && cached.profile.id === s.user.id) {
        setProfile(cached.profile);
        setAccess(cached.access);
        setProblem(null);
      } else {
        setProblem('auth.profileLoadFailed');
      }
      return;
    }
    if (!data) {
      setProblem('auth.noProfile');
      setProfile(null);
      return;
    }
    if (!data.active || !acc.data) {
      setProblem('auth.deactivated');
      setProfile(null);
      await supabase.auth.signOut();
      return;
    }
    setProblem(null);
    setProfile(data);
    setAccess(acc.data as Access);
    void kvSet(CACHE_KEY, { profile: data, access: acc.data }).catch(() => undefined);
  }, []);

  useEffect(() => {
    // Enkel tijdens lokale ontwikkeling (npm run dev): bekijk de app zonder server.
    // import.meta.env.DEV is false in elke build, dus dit zit nooit in productie.
    if (isDemo()) {
      setSession({ user: { id: 'demo', email: 'demo@demo.test' } } as Session);
      setProfile({
        id: 'demo',
        full_name: 'Demo Admin',
        email: 'demo@demo.test',
        phone: null,
        department_id: null,
        role_id: 'demo-admin',
        active: true,
      });
      setAccess({
        role_id: 'demo-admin',
        role_name: 'Admin',
        is_admin: true,
        permissions: [...ALL_PERMISSIONS],
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

  // Rechten live bijwerken als de beheerder een rol of iemands rol aanpast.
  const userId = session?.user.id;
  useEffect(() => {
    if (!userId || userId === 'demo') return;
    const channel = supabase
      .channel(`me:${crypto.randomUUID()}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'roles' },
        () => void loadProfile(session),
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'profiles', filter: `id=eq.${userId}` },
        () => void loadProfile(session),
      )
      .subscribe();
    return () => void supabase.removeChannel(channel);
  }, [userId, session, loadProfile]);

  const signOut = useCallback(async () => {
    if (isDemo()) return exitDemo();
    await supabase.auth.signOut();
    setProfile(null);
    setAccess(null);
  }, []);

  const reloadProfile = useCallback(() => loadProfile(session), [loadProfile, session]);

  const can = useCallback(
    (perm: Permission) => !!access && (access.is_admin || access.permissions.includes(perm)),
    [access],
  );

  const clearRecovery = useCallback(() => setRecovery(false), []);

  const value = useMemo(
    () => ({
      session,
      profile,
      access,
      loading,
      problem,
      recovery,
      can,
      isAdmin: !!access?.is_admin,
      signOut,
      reloadProfile,
      clearRecovery,
    }),
    [session, profile, access, loading, problem, recovery, can, signOut, reloadProfile, clearRecovery],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth buiten AuthProvider');
  return ctx;
}
