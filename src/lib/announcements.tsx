import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { supabase } from './supabase';
import { dbError, must, useCachedQuery } from './query';
import { useAuth } from './auth';
import type { PaletteColor } from './permissions';

export interface Announcement {
  id: string;
  title: string;
  body: string;
  pinned: boolean;
  urgent: boolean;
  requires_ack: boolean;
  color: PaletteColor;
  department_ids: string[];
  created_by: string | null;
  created_at: string;
  announcement_reads: { profile_id: string; read_at: string; acknowledged_at: string | null }[];
}

export function useAnnouncementsQuery() {
  return useCachedQuery(
    'announcements',
    async () =>
      must(
        await supabase
          .from('announcements')
          .select(
            'id, title, body, pinned, urgent, requires_ack, color, department_ids, created_by, created_at, announcement_reads(profile_id, read_at, acknowledged_at)',
          )
          .order('created_at', { ascending: false })
          .limit(200),
      ) as Announcement[],
    { realtime: ['announcements', 'announcement_reads'] },
  );
}

export async function markAnnouncement(id: string, acknowledge = false) {
  const { error } = await supabase.rpc('mark_announcement', { announcement: id, acknowledge });
  if (error) throw dbError(error);
}

/** Systeemmelding tonen (werkt op iOS enkel als de app op het beginscherm staat). */
export async function showSystemNotification(a: Pick<Announcement, 'id' | 'title' | 'body'>) {
  if (typeof Notification === 'undefined' || Notification.permission !== 'granted') return;
  try {
    const reg = await navigator.serviceWorker?.ready;
    const opts = { body: a.body.slice(0, 180), tag: a.id, icon: '/icon.svg', badge: '/icon.svg' };
    if (reg) await reg.showNotification(a.title, opts);
    else new Notification(a.title, opts);
  } catch {
    // Melding mislukt (bv. geen toestemming meer): de banner in de app blijft het tonen.
  }
}

export type NotifyState = 'unsupported' | 'default' | 'granted' | 'denied';

export function notificationState(): NotifyState {
  if (typeof Notification === 'undefined') return 'unsupported';
  return Notification.permission as NotifyState;
}

interface AnnouncementsState {
  items: Announcement[];
  unread: number;
  /** Dringend en nog niet bevestigd door mij. */
  pendingAck: Announcement[];
  /** Nieuw binnengekomen terwijl de app open is (voor de toast). */
  fresh: Announcement | null;
  dismissFresh: () => void;
  reload: () => Promise<void>;
  fromCache: boolean;
  fetchedAt: number | null;
}

const Ctx = createContext<AnnouncementsState | null>(null);

export function AnnouncementsProvider({ children }: { children: ReactNode }) {
  const { profile } = useAuth();
  const q = useAnnouncementsQuery();
  const [fresh, setFresh] = useState<Announcement | null>(null);
  const seen = useRef<Set<string> | null>(null);
  const me = profile?.id;

  const items = useMemo(() => q.data ?? [], [q.data]);
  const mineRead = (a: Announcement) => a.announcement_reads.find((r) => r.profile_id === me);
  const unread = items.filter((a) => !mineRead(a) && a.created_by !== me).length;
  const pendingAck = items.filter(
    (a) => a.requires_ack && a.created_by !== me && !mineRead(a)?.acknowledged_at,
  );

  // Nieuwe mededelingen melden (niet bij de eerste lading, niet je eigen berichten).
  useEffect(() => {
    if (!q.data) return;
    const ids = new Set(q.data.map((a) => a.id));
    if (seen.current) {
      const incoming = q.data.filter((a) => !seen.current?.has(a.id) && a.created_by !== me);
      const newest = incoming[0];
      if (newest) {
        setFresh(newest);
        void showSystemNotification(newest);
      }
    }
    seen.current = ids;
  }, [q.data, me]);

  const value = useMemo(
    () => ({
      items,
      unread,
      pendingAck,
      fresh,
      dismissFresh: () => setFresh(null),
      reload: q.reload,
      fromCache: q.fromCache,
      fetchedAt: q.fetchedAt,
    }),
    [items, unread, pendingAck, fresh, q.reload, q.fromCache, q.fetchedAt],
  );
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useAnnouncements(): AnnouncementsState {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useAnnouncements buiten AnnouncementsProvider');
  return ctx;
}
