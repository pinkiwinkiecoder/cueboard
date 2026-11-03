import { useEffect, useState } from 'react';
import { ArrowRight, Clock } from 'lucide-react';
import { Dialog } from '@/app/Dialog';
import { supabase } from '@/lib/supabase';
import { formatTime, localToIso } from '@/lib/time';
import { useT } from '@/lib/usePrefs';
import { previewShift, scheduleActions, type ScheduleItem } from '@/lib/schedule';
import type { Location } from '@/lib/refdata';

const QUICK = [-15, -5, 5, 10, 15, 30];

/** Planning verschuiven met voorbeeld; optioneel meteen publiceren + team verwittigen. */
export function ShiftDialog(props: {
  open: boolean;
  dayId: string;
  dayDate: string;
  items: ScheduleItem[];
  locations: Location[];
  defaultLocation: string | null;
  onClose: () => void;
  onDone: (published: boolean) => void;
}) {
  const { t, errText, locale } = useT();
  const [location, setLocation] = useState<string>('');
  const [from, setFrom] = useState('');
  const [minutes, setMinutes] = useState(10);
  const [notify, setNotify] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<unknown>(null);

  useEffect(() => {
    if (!props.open) return;
    setError(null);
    setLocation(props.defaultLocation ?? props.locations[0]?.id ?? '');
    const now = new Date();
    setFrom(
      `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`,
    );
  }, [props.open, props.defaultLocation, props.locations]);

  const fromIso = from ? localToIso(props.dayDate, from) : '';
  const preview = fromIso ? previewShift(props.items, location || null, fromIso, minutes) : [];
  const locName = props.locations.find((l) => l.id === location)?.name ?? t('schedule.noLocation');
  const signed = `${minutes > 0 ? '+' : ''}${minutes}`;

  async function apply() {
    if (!fromIso || preview.length === 0 || minutes === 0) return;
    setBusy(true);
    setError(null);
    try {
      await scheduleActions.shift(props.dayId, location || null, fromIso, minutes);
      if (notify) {
        await scheduleActions.publish(props.dayId);
        await supabase.from('announcements').insert({
          title: t('schedule.shiftAnnouncementTitle', { location: locName, minutes: signed }),
          body: t('schedule.shiftAnnouncementBody', {
            n: preview.length,
            minutes: signed,
            time: from,
          }),
          color: 'violet',
        });
      }
      props.onDone(notify);
      props.onClose();
    } catch (e) {
      setError(e);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog open={props.open} title={t('schedule.shiftTitle')} onClose={props.onClose}>
      <p className="hint">{t('schedule.shiftHint')}</p>
      {error !== null && (
        <div className="alert alert-error" role="alert">
          {errText(error)}
        </div>
      )}
      <div className="grid-2">
        <div className="field">
          <label htmlFor="sh-loc">{t('schedule.location')}</label>
          <select id="sh-loc" value={location} onChange={(e) => setLocation(e.target.value)}>
            {props.locations.map((l) => (
              <option key={l.id} value={l.id}>
                {l.name}
              </option>
            ))}
            <option value="">{t('schedule.noLocation')}</option>
          </select>
        </div>
        <div className="field">
          <label htmlFor="sh-from">{t('schedule.shiftFrom')}</label>
          <input id="sh-from" type="time" value={from} onChange={(e) => setFrom(e.target.value)} />
        </div>
      </div>
      <div className="field">
        <label htmlFor="sh-min">{t('schedule.shiftMinutes')}</label>
        <div className="row">
          <input
            id="sh-min"
            className="input"
            style={{ width: '7rem' }}
            type="number"
            min={-720}
            max={720}
            step={5}
            value={minutes}
            onChange={(e) => setMinutes(Number.parseInt(e.target.value || '0', 10))}
          />
          {QUICK.map((q) => (
            <button
              key={q}
              type="button"
              className="chip"
              aria-pressed={minutes === q}
              onClick={() => setMinutes(q)}
            >
              {q > 0 ? `+${q}` : q}
            </button>
          ))}
        </div>
      </div>

      <section
        className="card"
        aria-labelledby="sh-prev"
        style={{ marginBottom: 'var(--space-4)' }}
      >
        <h3 id="sh-prev">{t('schedule.shiftPreview')}</h3>
        {preview.length === 0 ? (
          <p className="muted" style={{ margin: 0 }}>
            {t('schedule.shiftNone')}
          </p>
        ) : (
          <ul className="list">
            {preview.map((p) => (
              <li key={p.item.id} className="row shift-row">
                <Clock aria-hidden size={16} />
                <span className="time muted">{formatTime(p.item.starts_at, locale)}</span>
                <ArrowRight aria-hidden size={16} />
                <span className="time">{formatTime(p.starts_at, locale)}</span>
                <span className="grow">{p.item.title}</span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <label className="switch-row" style={{ marginBottom: 'var(--space-4)' }}>
        <span>
          <strong>{t('schedule.shiftNotify')}</strong>
        </span>
        <input
          type="checkbox"
          role="switch"
          checked={notify}
          onChange={(e) => setNotify(e.target.checked)}
        />
      </label>
      <div className="row">
        <button
          type="button"
          className="btn btn-primary"
          disabled={busy || preview.length === 0 || minutes === 0}
          onClick={() => void apply()}
        >
          {busy ? t('common.busy') : t('schedule.shiftApply', { n: preview.length })}
        </button>
        <button type="button" className="btn" onClick={props.onClose}>
          {t('common.cancel')}
        </button>
      </div>
    </Dialog>
  );
}
