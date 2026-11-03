import { useCallback, useEffect, useRef, useState } from 'react';
import { kvGet, kvSet } from './localdb';
import { supabase } from './supabase';
import { AppError, type MsgKey } from '@/i18n';

export interface QueryState<T> {
  data: T | undefined;
  error: AppError | null;
  loading: boolean;
  /** Tijdstip van de laatst gelukte ophaling (ook uit cache). */
  fetchedAt: number | null;
  /** True als we enkel de opgeslagen kopie tonen (offline of server weg). */
  fromCache: boolean;
  reload: () => Promise<void>;
}

interface CacheRow<T> {
  at: number;
  data: T;
}

/**
 * Haalt data op en bewaart de laatste versie op het toestel. Zonder verbinding
 * toont het de laatst bekende gegevens, zodat de app leesbaar blijft.
 */
export function useCachedQuery<T>(
  key: string,
  fetcher: () => Promise<T>,
  options: { realtime?: string[] } = {},
): QueryState<T> {
  const [data, setData] = useState<T>();
  const [error, setError] = useState<AppError | null>(null);
  const [loading, setLoading] = useState(true);
  const [fetchedAt, setFetchedAt] = useState<number | null>(null);
  const [fromCache, setFromCache] = useState(false);
  const fetcherRef = useRef(fetcher);
  fetcherRef.current = fetcher;

  const reload = useCallback(async () => {
    try {
      // Lokale demo (enkel npm run dev met VITE_DEMO_LOGIN=1): vaste voorbeelddata.
      const fresh =
        import.meta.env.DEV && import.meta.env.VITE_DEMO_LOGIN === '1'
          ? (((await import('./demo')).DEMO[key] as T | undefined) ?? (await fetcherRef.current()))
          : await fetcherRef.current();
      const at = Date.now();
      setData(fresh);
      setFetchedAt(at);
      setFromCache(false);
      setError(null);
      void kvSet(`q:${key}`, { at, data: fresh } satisfies CacheRow<T>).catch(() => undefined);
    } catch (e) {
      setError(e instanceof AppError ? e : new AppError('errors.network'));
      setFromCache(true);
    } finally {
      setLoading(false);
    }
  }, [key]);

  useEffect(() => {
    let cancelled = false;
    void kvGet<CacheRow<T>>(`q:${key}`).then((cached) => {
      if (cancelled || !cached) return;
      setData((d) => d ?? cached.data);
      setFetchedAt((f) => f ?? cached.at);
    });
    void reload();
    const onOnline = () => void reload();
    window.addEventListener('online', onOnline);
    return () => {
      cancelled = true;
      window.removeEventListener('online', onOnline);
    };
  }, [key, reload]);

  // Live bijwerken als iemand anders iets wijzigt.
  const tables = options.realtime?.join(',') ?? '';
  useEffect(() => {
    if (!tables) return;
    let timer: number | undefined;
    // Unieke naam per gebruik: hetzelfde kanaal twee keer openen geeft een fout in supabase-js.
    const channel = supabase.channel(`rt:${key}:${crypto.randomUUID()}`);
    for (const table of tables.split(',')) {
      channel.on('postgres_changes', { event: '*', schema: 'public', table }, () => {
        window.clearTimeout(timer);
        timer = window.setTimeout(() => void reload(), 300);
      });
    }
    channel.subscribe();
    return () => {
      window.clearTimeout(timer);
      void supabase.removeChannel(channel);
    };
  }, [key, tables, reload]);

  return { data, error, loading, fetchedAt, fromCache, reload };
}

/** Gooit een vertaalbare AppError bij een Supabase-fout. */
export function must<T>(res: {
  data: T | null;
  error: { message: string; code?: string } | null;
}): T {
  if (res.error) throw dbError(res.error);
  return res.data as T;
}

/** Eigen foutcodes uit de database (raise exception 'AOF:...'). */
const DB_CODES: Record<string, MsgKey> = {
  'AOF:not_admin': 'errors.notAdmin',
  'AOF:cannot_demote_self': 'errors.cannotDemoteSelf',
  'AOF:no_permission': 'errors.noPermission',
  'AOF:unknown_role': 'errors.unknownRole',
  'AOF:admin_role_locked': 'errors.adminRoleLocked',
  'AOF:unknown_task': 'errors.unknownTask',
  'AOF:reason_required': 'errors.reasonRequired',
  'AOF:cannot_claim': 'errors.cannotClaim',
  'AOF:unknown_package': 'errors.unknownPackage',
  'AOF:invalid_shift': 'errors.invalidShift',
  'AOF:unknown_item': 'errors.unknownItem',
  'AOF:team_too_deep': 'errors.teamTooDeep',
  'AOF:invalid_request': 'errors.invalidRequest',
};

export function dbError(err: { message: string; code?: string }): AppError {
  const own = DB_CODES[err.message];
  if (own) return new AppError(own);
  if (err.code === '42501' || /row-level security|permission denied/i.test(err.message)) {
    return new AppError('errors.noPermission');
  }
  if (err.code === '23505') return new AppError('errors.duplicate');
  if (err.code === '23503') return new AppError('errors.inUse');
  if (/fetch|network/i.test(err.message)) return new AppError('errors.network');
  return new AppError('errors.generic');
}
