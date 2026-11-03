import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Clock, MapPin, Mic2, Plus, Search } from 'lucide-react';
import { EmptyState } from '@/app/EmptyState';
import { StaleNotice } from '@/app/StaleNotice';
import { useAuth } from '@/lib/auth';
import {
  ARTIST_STATUSES,
  ARTIST_STATUS_COLOR,
  ARTIST_STATUS_LABEL,
  checklistProgress,
  useArtists,
  type Artist,
  type ArtistStatus,
} from '@/lib/festival';
import { useEventDays, useLocations } from '@/lib/refdata';
import { useSchedulePublished } from '@/lib/schedule';
import { formatDayShort, formatTime } from '@/lib/time';
import { useT } from '@/lib/usePrefs';
import { ArtistDialog } from './ArtistDialog';

/** Alle artiesten met hun voorbereiding: wie is klaar, wie is er al, wie mist nog iets. */
export function ArtistsPage() {
  const { t, errText, locale } = useT();
  const { can } = useAuth();
  const artists = useArtists();
  const locations = useLocations();
  const days = useEventDays();
  const schedule = useSchedulePublished();
  const [filter, setFilter] = useState<ArtistStatus | 'all'>('all');
  const [query, setQuery] = useState('');
  const [editing, setEditing] = useState<Artist | 'new' | null>(null);
  const manager = can('artists.manage');

  const list = artists.data ?? [];
  const counts = useMemo(() => {
    const c = Object.fromEntries(ARTIST_STATUSES.map((s) => [s, 0])) as Record<ArtistStatus, number>;
    for (const a of list) c[a.status] += 1;
    return c;
  }, [list]);
  const q = query.trim().toLowerCase();
  const shown = list.filter(
    (a) =>
      (filter === 'all' || a.status === filter) &&
      (!q || a.name.toLowerCase().includes(q) || (a.genre ?? '').toLowerCase().includes(q)),
  );
  const setOf = (a: Artist) => schedule.data?.find((s) => s.id === a.schedule_item_id);

  return (
    <div className="stack">
      <div className="page-head">
        <span className="bubble bubble-lg" data-color="pink" aria-hidden>
          <Mic2 size={24} />
        </span>
        <div className="grow">
          <h1>{t('artists.title')}</h1>
          <p className="sub">{t('artists.subtitle')}</p>
        </div>
        {manager && (
          <button type="button" className="btn btn-primary" onClick={() => setEditing('new')}>
            <Plus aria-hidden size={20} />
            {t('artists.new')}
          </button>
        )}
      </div>
      <StaleNotice fromCache={artists.fromCache} fetchedAt={artists.fetchedAt} />
      {artists.error && !artists.data && (
        <div className="alert alert-error" role="alert">
          {errText(artists.error)}
        </div>
      )}

      {list.length > 0 && (
        <>
          <div className="segmented" role="group" aria-label={t('artists.filter')}>
            <button
              type="button"
              className="chip"
              aria-pressed={filter === 'all'}
              onClick={() => setFilter('all')}
            >
              {t('common.all')} · {list.length}
            </button>
            {ARTIST_STATUSES.map((s) => (
              <button
                key={s}
                type="button"
                className="chip"
                data-color={ARTIST_STATUS_COLOR[s]}
                aria-pressed={filter === s}
                onClick={() => setFilter(filter === s ? 'all' : s)}
              >
                <span className="dot" aria-hidden />
                {t(ARTIST_STATUS_LABEL[s])} · {counts[s]}
              </button>
            ))}
          </div>
          <label className="search">
            <Search aria-hidden size={18} />
            <input
              type="search"
              placeholder={t('artists.search')}
              aria-label={t('artists.search')}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </label>
        </>
      )}

      {artists.data && list.length === 0 ? (
        <EmptyState icon={Mic2} color="pink" title={t('artists.emptyTitle')}>
          <p>{t(manager ? 'artists.emptyManager' : 'artists.empty')}</p>
        </EmptyState>
      ) : (
        <div className="cards">
          {shown.map((a) => {
            const p = checklistProgress(a);
            const set = setOf(a);
            const loc = locations.data?.find((l) => l.id === (set?.location_id ?? a.location_id));
            const day = days.data?.find((d) => d.id === (set?.day_id ?? a.day_id));
            return (
              <Link
                key={a.id}
                to={`/artists/${a.id}`}
                className="card pkg-card stack-sm link-card"
                data-color={a.color}
              >
                <div className="row" style={{ alignItems: 'flex-start' }}>
                  <span className="bubble bubble-lg" aria-hidden>
                    <Mic2 size={22} />
                  </span>
                  <span className="grow">
                    <span className="title" style={{ display: 'block', fontWeight: 750 }}>
                      {a.name}
                    </span>
                    {a.genre && <span className="sub">{a.genre}</span>}
                  </span>
                  <span className="badge" data-color={ARTIST_STATUS_COLOR[a.status]}>
                    {t(ARTIST_STATUS_LABEL[a.status])}
                  </span>
                </div>
                <span className="sub row" style={{ gap: 'var(--space-3)', flexWrap: 'wrap' }}>
                  {(set || day) && (
                    <span>
                      <Clock aria-hidden size={14} />{' '}
                      {set
                        ? `${formatDayShort(set.starts_at, locale)} · ${formatTime(set.starts_at, locale)}–${formatTime(set.ends_at, locale)}`
                        : day?.label}
                    </span>
                  )}
                  {loc && (
                    <span>
                      <MapPin aria-hidden size={14} /> {loc.name}
                    </span>
                  )}
                </span>
                <span className="sub">
                  {t('artists.checklistProgress', { done: p.done, total: p.total })}
                </span>
                <div className="progress" aria-hidden>
                  <span style={{ width: `${p.pct}%` }} />
                </div>
              </Link>
            );
          })}
        </div>
      )}
      {list.length > 0 && shown.length === 0 && <p className="sub">{t('artists.noMatch')}</p>}

      <ArtistDialog value={editing} onClose={() => setEditing(null)} />
    </div>
  );
}
