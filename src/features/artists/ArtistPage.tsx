import { useState, type FormEvent } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import {
  ArrowLeft,
  CalendarClock,
  Check,
  Clock,
  FileText,
  Mail,
  MapPin,
  Mic2,
  Pencil,
  Phone,
  Plus,
  Trash2,
  Users,
  X,
} from 'lucide-react';
import { useAuth } from '@/lib/auth';
import {
  ARTIST_STATUSES,
  ARTIST_STATUS_COLOR,
  ARTIST_STATUS_LABEL,
  artistActions,
  checklistProgress,
  documentActions,
  useArtists,
  useDocuments,
} from '@/lib/festival';
import { useEventDays, useLocations, usePeople } from '@/lib/refdata';
import { useSchedulePublished } from '@/lib/schedule';
import { formatDayShort, formatTime } from '@/lib/time';
import { useT } from '@/lib/usePrefs';
import { ArtistDialog } from './ArtistDialog';

/** Het dossier van één artiest: tijden, contact, checklist, rider en documenten. */
export function ArtistPage() {
  const { id = '' } = useParams();
  const navigate = useNavigate();
  const { t, errText, locale } = useT();
  const { can, profile } = useAuth();
  const artists = useArtists();
  const documents = useDocuments();
  const schedule = useSchedulePublished();
  const locations = useLocations();
  const days = useEventDays();
  const people = usePeople();
  const [editing, setEditing] = useState(false);
  const [newCheck, setNewCheck] = useState('');
  const [error, setError] = useState<unknown>(null);
  const a = artists.data?.find((x) => x.id === id);
  const manager = can('artists.manage');

  if (!a) {
    return (
      <div className="stack">
        <Link to="/artists" className="back-link">
          <ArrowLeft aria-hidden size={18} /> {t('artists.title')}
        </Link>
        <p className="sub">{artists.data ? t('artists.notFound') : t('app.loading')}</p>
      </div>
    );
  }

  const canTick = manager || a.liaison_id === profile?.id;
  const p = checklistProgress(a);
  const set = schedule.data?.find((s) => s.id === a.schedule_item_id);
  const related = (schedule.data ?? []).filter(
    (s) => s.id === a.schedule_item_id || s.title.toLowerCase().includes(a.name.toLowerCase()),
  );
  const loc = locations.data?.find((l) => l.id === (set?.location_id ?? a.location_id));
  const day = days.data?.find((d) => d.id === (set?.day_id ?? a.day_id));
  const liaison = people.data?.find((x) => x.id === a.liaison_id);
  const docs = (documents.data ?? []).filter((d) => d.artist_id === a.id);

  async function act(op: Promise<void>) {
    setError(null);
    try {
      await op;
      await artists.reload();
    } catch (e) {
      setError(e);
    }
  }

  async function addCheck(e: FormEvent) {
    e.preventDefault();
    if (!a || !newCheck.trim()) return;
    await act(artistActions.addCheck(a.id, newCheck.trim(), a.artist_checklist.length + 1));
    setNewCheck('');
  }

  async function remove() {
    if (!a || !window.confirm(t('artists.confirmDelete', { name: a.name }))) return;
    try {
      await artistActions.remove(a.id);
      navigate('/artists', { replace: true });
    } catch (e) {
      setError(e);
    }
  }

  async function openDoc(docId: string) {
    const d = docs.find((x) => x.id === docId);
    if (!d) return;
    try {
      window.open(await documentActions.openUrl(d), '_blank', 'noopener');
    } catch (e) {
      setError(e);
    }
  }

  const time = (iso: string | null) =>
    iso ? `${formatDayShort(iso, locale)} · ${formatTime(iso, locale)}` : '—';

  return (
    <div className="stack">
      <Link to="/artists" className="back-link">
        <ArrowLeft aria-hidden size={18} /> {t('artists.title')}
      </Link>
      <div className="hero card" data-color={a.color}>
        <span className="bubble bubble-lg" aria-hidden>
          <Mic2 size={26} />
        </span>
        <div className="grow">
          <h1 style={{ margin: 0 }}>{a.name}</h1>
          <p className="sub" style={{ margin: '4px 0 0' }}>
            {[a.genre, loc?.name, day?.label].filter(Boolean).join(' · ')}
          </p>
        </div>
        {manager && (
          <div className="row">
            <button type="button" className="btn" onClick={() => setEditing(true)}>
              <Pencil aria-hidden size={18} />
              {t('common.edit')}
            </button>
            <button
              type="button"
              className="icon-btn"
              aria-label={t('common.delete')}
              onClick={() => void remove()}
            >
              <Trash2 aria-hidden size={20} />
            </button>
          </div>
        )}
      </div>
      {error !== null && (
        <div className="alert alert-error" role="alert">
          {errText(error)}
        </div>
      )}

      <div className="segmented" role="group" aria-label={t('artists.status')}>
        {ARTIST_STATUSES.map((s) => (
          <button
            key={s}
            type="button"
            className="chip"
            data-color={ARTIST_STATUS_COLOR[s]}
            aria-pressed={a.status === s}
            disabled={!manager}
            onClick={() => void act(artistActions.setStatus(a.id, s))}
          >
            <span className="dot" aria-hidden />
            {t(ARTIST_STATUS_LABEL[s])}
          </button>
        ))}
      </div>

      <div className="grid-2" style={{ gap: 'var(--space-4)' }}>
        <section className="card stack-sm" data-color="violet" aria-labelledby="h-times">
          <h2 id="h-times" style={{ margin: 0 }}>
            <Clock aria-hidden size={18} /> {t('artists.times')}
          </h2>
          <dl className="facts">
            <dt>{t('artists.set')}</dt>
            <dd>
              {set
                ? `${formatDayShort(set.starts_at, locale)} · ${formatTime(set.starts_at, locale)}–${formatTime(set.ends_at, locale)}`
                : '—'}
            </dd>
            <dt>{t('artists.arrival')}</dt>
            <dd>{time(a.arrival_at)}</dd>
            <dt>{t('artists.departure')}</dt>
            <dd>{time(a.departure_at)}</dd>
            <dt>{t('artists.partySize')}</dt>
            <dd>
              <Users aria-hidden size={14} /> {a.party_size ?? '—'}
            </dd>
            <dt>{t('artists.location')}</dt>
            <dd>
              <MapPin aria-hidden size={14} /> {loc?.name ?? '—'}
            </dd>
          </dl>
        </section>

        <section className="card stack-sm" data-color="teal" aria-labelledby="h-contact">
          <h2 id="h-contact" style={{ margin: 0 }}>
            <Phone aria-hidden size={18} /> {t('artists.contact')}
          </h2>
          <dl className="facts">
            <dt>{t('artists.contactName')}</dt>
            <dd>{a.contact_name ?? '—'}</dd>
            <dt>{t('artists.contactPhone')}</dt>
            <dd>
              {a.contact_phone ? <a href={`tel:${a.contact_phone}`}>{a.contact_phone}</a> : '—'}
            </dd>
            <dt>{t('artists.contactEmail')}</dt>
            <dd>
              {a.contact_email ? (
                <a href={`mailto:${a.contact_email}`}>
                  <Mail aria-hidden size={14} /> {a.contact_email}
                </a>
              ) : (
                '—'
              )}
            </dd>
            <dt>{t('artists.liaison')}</dt>
            <dd>{liaison?.full_name ?? '—'}</dd>
          </dl>
        </section>
      </div>

      <section className="card stack-sm" data-color="mint" aria-labelledby="h-check">
        <div className="row">
          <h2 id="h-check" className="grow" style={{ margin: 0 }}>
            <Check aria-hidden size={18} /> {t('artists.checklist')}
          </h2>
          <span className="sub">
            {t('artists.checklistProgress', { done: p.done, total: p.total })}
          </span>
        </div>
        <div className="progress" aria-hidden>
          <span style={{ width: `${p.pct}%` }} />
        </div>
        <ul className="list">
          {a.artist_checklist.map((c) => (
            <li key={c.id} className="list-item">
              <label className="row grow" style={{ cursor: canTick ? 'pointer' : 'default' }}>
                <input
                  type="checkbox"
                  checked={c.done}
                  disabled={!canTick}
                  onChange={(e) => void act(artistActions.toggleCheck(c.id, e.target.checked))}
                />
                <span style={c.done ? { textDecoration: 'line-through', opacity: 0.7 } : undefined}>
                  {c.title}
                </span>
              </label>
              {manager && (
                <button
                  type="button"
                  className="icon-btn"
                  aria-label={t('common.delete')}
                  onClick={() => void act(artistActions.removeCheck(c.id))}
                >
                  <X aria-hidden size={18} />
                </button>
              )}
            </li>
          ))}
        </ul>
        {manager && (
          <form className="row" onSubmit={(e) => void addCheck(e)}>
            <input
              className="grow"
              maxLength={140}
              placeholder={t('artists.addCheck')}
              aria-label={t('artists.addCheck')}
              value={newCheck}
              onChange={(e) => setNewCheck(e.target.value)}
            />
            <button type="submit" className="btn" disabled={!newCheck.trim()}>
              <Plus aria-hidden size={18} />
              {t('common.add')}
            </button>
          </form>
        )}
      </section>

      {(['hospitality', 'technical', 'notes'] as const).map((k) =>
        a[k] ? (
          <section key={k} className="card stack-sm" aria-labelledby={`h-${k}`}>
            <h2 id={`h-${k}`} style={{ margin: 0 }}>
              {t(`artists.${k}`)}
            </h2>
            <p className="pre" style={{ margin: 0 }}>
              {a[k]}
            </p>
          </section>
        ) : null,
      )}

      {related.length > 0 && (
        <section className="card stack-sm" data-color="violet" aria-labelledby="h-sched">
          <h2 id="h-sched" style={{ margin: 0 }}>
            <CalendarClock aria-hidden size={18} /> {t('artists.inSchedule')}
          </h2>
          <ul className="list">
            {related.map((s) => (
              <li key={s.id} className="list-item">
                <span className="time">{formatTime(s.starts_at, locale)}</span>
                <span className="grow">{s.title}</span>
                <span className="sub">{formatDayShort(s.starts_at, locale)}</span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {docs.length > 0 && (
        <section className="card stack-sm" data-color="sky" aria-labelledby="h-docs">
          <h2 id="h-docs" style={{ margin: 0 }}>
            <FileText aria-hidden size={18} /> {t('nav.documents')}
          </h2>
          <ul className="list">
            {docs.map((d) => (
              <li key={d.id}>
                <button
                  type="button"
                  className="list-item"
                  style={{ width: '100%' }}
                  onClick={() => void openDoc(d.id)}
                >
                  <FileText aria-hidden size={18} />
                  <span className="grow title" style={{ textAlign: 'start' }}>
                    {d.title}
                  </span>
                  <span className="sub">v{d.version}</span>
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}

      <ArtistDialog value={editing ? a : null} onClose={() => setEditing(false)} />
    </div>
  );
}
