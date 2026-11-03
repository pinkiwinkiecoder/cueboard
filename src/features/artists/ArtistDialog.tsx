import { useEffect, useState, type FormEvent } from 'react';
import { Save } from 'lucide-react';
import { Dialog } from '@/app/Dialog';
import { ColorPicker } from '@/app/ColorPicker';
import {
  ARTIST_STATUSES,
  ARTIST_STATUS_LABEL,
  artistActions,
  type Artist,
  type ArtistInput,
} from '@/lib/festival';
import { useEventDays, useLocations, usePeople } from '@/lib/refdata';
import { useSchedulePublished } from '@/lib/schedule';
import { formatDayShort, formatTime, isoToLocal, localToIso } from '@/lib/time';
import { useT } from '@/lib/usePrefs';

const EMPTY: ArtistInput = {
  name: '',
  genre: null,
  status: 'booked',
  color: 'pink',
  day_id: null,
  location_id: null,
  schedule_item_id: null,
  contact_name: null,
  contact_phone: null,
  contact_email: null,
  arrival_at: null,
  departure_at: null,
  party_size: null,
  hospitality: null,
  technical: null,
  notes: null,
  liaison_id: null,
};

/** "2027-07-16T14:30" in festivaltijd ↔ ISO. */
const toInput = (iso: string | null) => {
  if (!iso) return '';
  const l = isoToLocal(iso);
  return `${l.day}T${l.time}`;
};
const fromInput = (v: string) => {
  const [day, time] = v.split('T');
  return day && time ? localToIso(day, time.slice(0, 5)) : null;
};

export function ArtistDialog(props: { value: Artist | 'new' | null; onClose: () => void }) {
  const { t, errText, locale } = useT();
  const days = useEventDays();
  const locations = useLocations();
  const people = usePeople();
  const schedule = useSchedulePublished();
  const [row, setRow] = useState<ArtistInput>(EMPTY);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<unknown>(null);
  const existing = props.value && typeof props.value === 'object' ? props.value : null;

  useEffect(() => {
    if (!props.value) return;
    setError(null);
    if (typeof props.value === 'object') {
      const v = props.value;
      setRow(
        Object.fromEntries(
          (Object.keys(EMPTY) as (keyof ArtistInput)[]).map((k) => [k, v[k]]),
        ) as ArtistInput,
      );
    } else setRow(EMPTY);
  }, [props.value]);

  const set = <K extends keyof ArtistInput>(k: K, v: ArtistInput[K]) =>
    setRow((r) => ({ ...r, [k]: v }));
  const text = (k: keyof ArtistInput) => (e: { target: { value: string } }) =>
    set(k, (e.target.value.trim() ? e.target.value : null) as never);

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!row.name.trim()) return;
    setBusy(true);
    setError(null);
    try {
      await artistActions.save(existing?.id ?? null, { ...row, name: row.name.trim() });
      props.onClose();
    } catch (err) {
      setError(err);
    } finally {
      setBusy(false);
    }
  }

  const sets = (schedule.data ?? []).filter((s) => s.kind === 'performance' || s.kind === 'soundcheck');

  return (
    <Dialog
      open={props.value !== null}
      title={t(existing ? 'artists.edit' : 'artists.new')}
      onClose={props.onClose}
    >
      <form onSubmit={(e) => void submit(e)}>
        {error !== null && (
          <div className="alert alert-error" role="alert">
            {errText(error)}
          </div>
        )}
        <div className="grid-2">
          <div className="field">
            <label htmlFor="ar-name">{t('artists.name')}</label>
            <input
              id="ar-name"
              required
              maxLength={120}
              value={row.name}
              onChange={(e) => set('name', e.target.value)}
            />
          </div>
          <div className="field">
            <label htmlFor="ar-genre">
              {t('artists.genre')} <span className="hint">{t('common.optional')}</span>
            </label>
            <input id="ar-genre" maxLength={80} value={row.genre ?? ''} onChange={text('genre')} />
          </div>
        </div>
        <div className="field">
          <span className="label">{t('artists.status')}</span>
          <div className="segmented" role="group" aria-label={t('artists.status')}>
            {ARTIST_STATUSES.map((s) => (
              <button
                key={s}
                type="button"
                className="chip"
                aria-pressed={row.status === s}
                onClick={() => set('status', s)}
              >
                {t(ARTIST_STATUS_LABEL[s])}
              </button>
            ))}
          </div>
        </div>
        <div className="field">
          <label htmlFor="ar-set">{t('artists.set')}</label>
          <select
            id="ar-set"
            value={row.schedule_item_id ?? ''}
            onChange={(e) => {
              const item = sets.find((s) => s.id === e.target.value);
              setRow((r) => ({
                ...r,
                schedule_item_id: item?.id ?? null,
                day_id: item?.day_id ?? r.day_id,
                location_id: item?.location_id ?? r.location_id,
              }));
            }}
          >
            <option value="">{t('common.none')}</option>
            {sets.map((s) => (
              <option key={s.id} value={s.id}>
                {formatDayShort(s.starts_at, locale)} {formatTime(s.starts_at, locale)} · {s.title}
              </option>
            ))}
          </select>
          <p className="hint">{t('artists.setHint')}</p>
        </div>
        <div className="grid-2">
          <div className="field">
            <label htmlFor="ar-day">{t('artists.day')}</label>
            <select
              id="ar-day"
              value={row.day_id ?? ''}
              onChange={(e) => set('day_id', e.target.value || null)}
            >
              <option value="">{t('common.none')}</option>
              {(days.data ?? []).map((d) => (
                <option key={d.id} value={d.id}>
                  {d.label}
                </option>
              ))}
            </select>
          </div>
          <div className="field">
            <label htmlFor="ar-loc">{t('artists.location')}</label>
            <select
              id="ar-loc"
              value={row.location_id ?? ''}
              onChange={(e) => set('location_id', e.target.value || null)}
            >
              <option value="">{t('common.none')}</option>
              {(locations.data ?? []).map((l) => (
                <option key={l.id} value={l.id}>
                  {l.name}
                </option>
              ))}
            </select>
          </div>
          <div className="field">
            <label htmlFor="ar-arr">{t('artists.arrival')}</label>
            <input
              id="ar-arr"
              type="datetime-local"
              value={toInput(row.arrival_at)}
              onChange={(e) => set('arrival_at', fromInput(e.target.value))}
            />
          </div>
          <div className="field">
            <label htmlFor="ar-dep">{t('artists.departure')}</label>
            <input
              id="ar-dep"
              type="datetime-local"
              value={toInput(row.departure_at)}
              onChange={(e) => set('departure_at', fromInput(e.target.value))}
            />
          </div>
          <div className="field">
            <label htmlFor="ar-party">{t('artists.partySize')}</label>
            <input
              id="ar-party"
              type="number"
              min={0}
              max={500}
              value={row.party_size ?? ''}
              onChange={(e) => set('party_size', e.target.value ? Number(e.target.value) : null)}
            />
          </div>
          <div className="field">
            <label htmlFor="ar-liaison">{t('artists.liaison')}</label>
            <select
              id="ar-liaison"
              value={row.liaison_id ?? ''}
              onChange={(e) => set('liaison_id', e.target.value || null)}
            >
              <option value="">{t('common.nobody')}</option>
              {(people.data ?? [])
                .filter((p) => p.active)
                .map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.full_name}
                  </option>
                ))}
            </select>
          </div>
        </div>
        <h3>{t('artists.contact')}</h3>
        <div className="grid-2">
          <div className="field">
            <label htmlFor="ar-cn">{t('artists.contactName')}</label>
            <input
              id="ar-cn"
              maxLength={120}
              value={row.contact_name ?? ''}
              onChange={text('contact_name')}
            />
          </div>
          <div className="field">
            <label htmlFor="ar-cp">{t('artists.contactPhone')}</label>
            <input
              id="ar-cp"
              type="tel"
              maxLength={40}
              value={row.contact_phone ?? ''}
              onChange={text('contact_phone')}
            />
          </div>
        </div>
        <div className="field">
          <label htmlFor="ar-ce">{t('artists.contactEmail')}</label>
          <input
            id="ar-ce"
            type="email"
            maxLength={200}
            value={row.contact_email ?? ''}
            onChange={text('contact_email')}
          />
        </div>
        {(['hospitality', 'technical', 'notes'] as const).map((k) => (
          <div className="field" key={k}>
            <label htmlFor={`ar-${k}`}>{t(`artists.${k}`)}</label>
            <textarea
              id={`ar-${k}`}
              rows={3}
              maxLength={4000}
              placeholder={t(`artists.${k}Placeholder`)}
              value={row[k] ?? ''}
              onChange={text(k)}
            />
          </div>
        ))}
        <div className="field">
          <span className="label">{t('common.colour')}</span>
          <ColorPicker value={row.color} onChange={(c) => set('color', c)} />
        </div>
        <div className="row">
          <button type="submit" className="btn btn-primary" disabled={busy || !row.name.trim()}>
            <Save aria-hidden size={20} />
            {busy ? t('common.saving') : t('common.save')}
          </button>
          <button type="button" className="btn" onClick={props.onClose}>
            {t('common.cancel')}
          </button>
        </div>
      </form>
    </Dialog>
  );
}
