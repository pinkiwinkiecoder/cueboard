import { useEffect, useRef, useState } from 'react';
import {
  Bell,
  BellOff,
  BellRing,
  Check,
  CheckCheck,
  Megaphone,
  Pencil,
  Pin,
  PinOff,
  Plus,
  Trash2,
} from 'lucide-react';
import { EmptyState } from '@/app/EmptyState';
import { StaleNotice } from '@/app/StaleNotice';
import { Avatar } from '@/app/Avatar';
import { useAuth } from '@/lib/auth';
import {
  markAnnouncement,
  notificationState,
  useAnnouncements,
  type Announcement,
  type NotifyState,
} from '@/lib/announcements';
import { useDepartments, usePeople } from '@/lib/refdata';
import { dbError } from '@/lib/query';
import { supabase } from '@/lib/supabase';
import { formatDayShort, formatTime } from '@/lib/time';
import { useT } from '@/lib/usePrefs';
import { ComposeDialog } from './ComposeDialog';
import { PinnedList } from './PinnedList';

export function AnnouncementsPage() {
  const { t, errText, locale } = useT();
  const { profile, can } = useAuth();
  const { items, reload, fromCache, fetchedAt } = useAnnouncements();
  const people = usePeople();
  const departments = useDepartments();
  const sender = can('announcements.send');
  const [compose, setCompose] = useState<Announcement | 'new' | 'new-pinned' | null>(null);
  const [error, setError] = useState<unknown>(null);
  const [notify, setNotify] = useState<NotifyState>(notificationState);
  const pinned = items.filter((a) => a.pinned);
  const feed = items.filter((a) => !a.pinned);
  const nameOf = (id: string | null) => people.data?.find((p) => p.id === id)?.full_name ?? '—';
  const activeCount = (people.data ?? []).filter((p) => p.active).length;

  // Alles wat je hier ziet, telt als gelezen (dringende blijven tot "Begrepen").
  // Elk bericht maar één keer proberen, ook als het mislukt (bv. offline).
  const tried = useRef(new Set<string>());
  useEffect(() => {
    const unread = items.filter(
      (a) =>
        a.created_by !== profile?.id &&
        !tried.current.has(a.id) &&
        !a.announcement_reads.some((r) => r.profile_id === profile?.id),
    );
    unread.forEach((a) => tried.current.add(a.id));
    if (unread.length === 0) return;
    void Promise.all(unread.map((a) => markAnnouncement(a.id).catch(() => undefined))).then(() =>
      reload(),
    );
  }, [items, profile?.id, reload]);

  async function enableNotifications() {
    if (typeof Notification === 'undefined') return;
    setNotify((await Notification.requestPermission()) as NotifyState);
  }

  async function run(op: PromiseLike<{ error: { message: string; code?: string } | null }>) {
    setError(null);
    const { error: err } = await op;
    if (err) setError(dbError(err));
    else void reload();
  }

  function audience(a: Announcement) {
    if (a.department_ids.length === 0) return t('people.everyone');
    return a.department_ids
      .map((id) => departments.data?.find((d) => d.id === id)?.name)
      .filter(Boolean)
      .join(', ');
  }

  return (
    <div className="stack">
      <div className="page-head">
        <span className="bubble bubble-lg" data-color="peach" aria-hidden>
          <Megaphone size={24} />
        </span>
        <div className="grow">
          <h1>{t('announcements.title')}</h1>
          <p className="sub">{t('announcements.subtitle')}</p>
        </div>
        {sender && (
          <div className="row">
            <button type="button" className="btn" onClick={() => setCompose('new-pinned')}>
              <Pin aria-hidden size={20} />
              {t('announcements.newPinned')}
            </button>
            <button type="button" className="btn btn-primary" onClick={() => setCompose('new')}>
              <Plus aria-hidden size={20} />
              {t('announcements.new')}
            </button>
          </div>
        )}
      </div>
      <StaleNotice fromCache={fromCache} fetchedAt={fetchedAt} />
      {error !== null && (
        <div className="alert alert-error" role="alert">
          {errText(error)}
        </div>
      )}

      {notify !== 'granted' && (
        <div className="card row" data-color="gold">
          <span className="bubble" aria-hidden>
            {notify === 'denied' ? <BellOff size={20} /> : <Bell size={20} />}
          </span>
          <p className="grow" style={{ margin: 0 }}>
            {t(
              notify === 'unsupported'
                ? 'announcements.notifyUnsupported'
                : notify === 'denied'
                  ? 'announcements.notifyDenied'
                  : 'announcements.notifyAsk',
            )}
          </p>
          {notify === 'default' && (
            <button
              type="button"
              className="btn btn-primary btn-sm"
              onClick={() => void enableNotifications()}
            >
              <BellRing aria-hidden size={18} />
              {t('announcements.notifyButton')}
            </button>
          )}
        </div>
      )}

      {pinned.length > 0 && (
        <section className="stack-sm" aria-labelledby="h-pinned">
          <h2 id="h-pinned" style={{ margin: 0 }}>
            <Pin aria-hidden size={18} /> {t('announcements.pinned')}
          </h2>
          <PinnedList items={pinned} />
          {sender && (
            <div className="row">
              {pinned.map((a) => (
                <span key={a.id} className="chip" data-color={a.color}>
                  {a.title}
                  <button
                    type="button"
                    className="icon-btn"
                    aria-label={`${t('common.edit')}: ${a.title}`}
                    onClick={() => setCompose(a)}
                  >
                    <Pencil aria-hidden size={16} />
                  </button>
                  <button
                    type="button"
                    className="icon-btn"
                    aria-label={`${t('announcements.unpin')}: ${a.title}`}
                    onClick={() =>
                      void run(
                        supabase.from('announcements').update({ pinned: false }).eq('id', a.id),
                      )
                    }
                  >
                    <PinOff aria-hidden size={16} />
                  </button>
                </span>
              ))}
            </div>
          )}
        </section>
      )}

      {items.length === 0 && (
        <EmptyState icon={Megaphone} color="peach" title={t('announcements.emptyTitle')}>
          <p>{t(sender ? 'announcements.emptySender' : 'announcements.emptyCrew')}</p>
        </EmptyState>
      )}

      {feed.length > 0 && (
        <section className="stack-sm" aria-labelledby="h-feed">
          <h2 id="h-feed" style={{ margin: 0 }}>
            {t('announcements.feed')}
          </h2>
          <ul className="list">
            {feed.map((a) => {
              const mine = a.announcement_reads.find((r) => r.profile_id === profile?.id);
              const acked = a.announcement_reads.filter((r) => r.acknowledged_at).length;
              const read = a.announcement_reads.length;
              return (
                <li key={a.id} className="card feed-item" data-color={a.color}>
                  <div className="row" style={{ alignItems: 'flex-start' }}>
                    <Avatar name={nameOf(a.created_by)} />
                    <div className="grow stack-sm">
                      <div className="row">
                        <strong className="grow">{a.title}</strong>
                        {a.urgent && (
                          <span className="badge" data-color="rose">
                            <BellRing aria-hidden size={13} /> {t('announcements.urgent')}
                          </span>
                        )}
                      </div>
                      <span className="sub">
                        {nameOf(a.created_by)} · {formatDayShort(a.created_at, locale)}{' '}
                        {formatTime(a.created_at, locale)} · {audience(a)}
                      </span>
                      {a.body && (
                        <p className="pre" style={{ margin: 0 }}>
                          {a.body}
                        </p>
                      )}
                      <div className="row">
                        {a.requires_ack &&
                          a.created_by !== profile?.id &&
                          (mine?.acknowledged_at ? (
                            <span className="badge" data-color="mint">
                              <Check aria-hidden size={13} /> {t('announcements.acknowledged')}
                            </span>
                          ) : (
                            <button
                              type="button"
                              className="btn btn-primary btn-sm"
                              onClick={() =>
                                void markAnnouncement(a.id, true).then(reload, setError)
                              }
                            >
                              <Check aria-hidden size={18} />
                              {t('announcements.gotIt')}
                            </button>
                          ))}
                        {sender && (
                          <>
                            <span className="badge">
                              <CheckCheck aria-hidden size={13} />
                              {a.requires_ack
                                ? t('announcements.ackStats', { n: acked, total: activeCount })
                                : t('announcements.readStats', { n: read, total: activeCount })}
                            </span>
                            <span className="spacer" />
                            <button
                              type="button"
                              className="icon-btn"
                              aria-label={`${t('announcements.pin')}: ${a.title}`}
                              onClick={() =>
                                void run(
                                  supabase
                                    .from('announcements')
                                    .update({ pinned: true })
                                    .eq('id', a.id),
                                )
                              }
                            >
                              <Pin aria-hidden size={18} />
                            </button>
                            <button
                              type="button"
                              className="icon-btn"
                              aria-label={`${t('common.edit')}: ${a.title}`}
                              onClick={() => setCompose(a)}
                            >
                              <Pencil aria-hidden size={18} />
                            </button>
                            <button
                              type="button"
                              className="icon-btn"
                              aria-label={`${t('common.delete')}: ${a.title}`}
                              onClick={() => {
                                if (window.confirm(t('settings.confirmDelete', { name: a.title })))
                                  void run(supabase.from('announcements').delete().eq('id', a.id));
                              }}
                            >
                              <Trash2 aria-hidden size={18} />
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        </section>
      )}

      {sender && (
        <ComposeDialog
          value={compose}
          onClose={() => setCompose(null)}
          onDone={() => void reload()}
        />
      )}
    </div>
  );
}
