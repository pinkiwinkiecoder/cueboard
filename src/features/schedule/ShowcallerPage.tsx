import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AlarmClockOff, Check, Play, RotateCcw, X } from 'lucide-react';
import { useEventDays, useLocations } from '@/lib/refdata';
import { useT } from '@/lib/usePrefs';
import { useNow } from '@/lib/useNow';
import { usePrefs } from '@/lib/usePrefs';
import { formatTime, isoToLocal } from '@/lib/time';
import {
  nowAndNext,
  scheduleActions,
  sortByStart,
  startDelay,
  useScheduleDraft,
} from '@/lib/schedule';
import { KindBadge, useDuration } from './parts';

/** Volledig scherm voor de showcaller: grote klok, nu, hierna, Start/Klaar. */
export function ShowcallerPage() {
  const { t, errText, locale } = useT();
  const { prefs, update } = usePrefs();
  const navigate = useNavigate();
  const now = useNow(1000);
  const dur = useDuration();
  const days = useEventDays();
  const locations = useLocations();
  const draft = useScheduleDraft(true);
  const [loc, setLoc] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<unknown>(null);

  // Scherm wakker houden zolang de showcaller open is.
  useEffect(() => {
    if (prefs.wakeLock) return;
    update({ wakeLock: true });
    return () => update({ wakeLock: false });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (loc === null && locations.data?.[0]) setLoc(locations.data[0].id);
  }, [locations.data, loc]);

  const today = isoToLocal(now.toISOString()).day;
  const day = days.data?.find((d) => d.date === today) ?? days.data?.[0];
  const items = sortByStart(
    (draft.data ?? []).filter((i) => i.day_id === day?.id && i.location_id === loc),
  );
  const nn = nowAndNext(items, now).find((x) => x.locationId === loc) ?? {
    current: null,
    next: null,
  };
  const { current, next } = nn;
  const upcoming = items
    .filter((i) => i.status !== 'done' && i !== current && i !== next)
    .slice(0, 3);
  const left = current ? (Date.parse(current.ends_at) - now.getTime()) / 60_000 : 0;
  const toNext = next ? (Date.parse(next.starts_at) - now.getTime()) / 60_000 : 0;

  async function act(id: string, action: 'start' | 'done' | 'delayed' | 'reset') {
    setBusy(true);
    setError(null);
    try {
      await scheduleActions.live(id, action);
      await draft.reload();
    } catch (e) {
      setError(e);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="showcaller" role="dialog" aria-label={t('schedule.showcaller')}>
      <div className="row sc-top">
        <div className="segmented">
          {(locations.data ?? []).map((l) => (
            <button
              key={l.id}
              type="button"
              className="chip"
              data-color={l.color}
              aria-pressed={loc === l.id}
              onClick={() => setLoc(l.id)}
            >
              <span className="dot" aria-hidden />
              {l.name}
            </button>
          ))}
        </div>
        <span className="spacer" />
        <button type="button" className="btn" onClick={() => navigate('/planning')}>
          <X aria-hidden size={20} />
          {t('schedule.scExit')}
        </button>
      </div>

      <div className="sc-clock time" aria-live="off">
        {formatTime(now, locale)}
        <span className="sc-seconds">:{String(now.getSeconds()).padStart(2, '0')}</span>
      </div>
      {error !== null && (
        <div className="alert alert-error" role="alert">
          {errText(error)}
        </div>
      )}

      <section className="sc-card sc-now" data-color="mint" aria-labelledby="sc-now">
        <span id="sc-now" className="nn-label">
          {t('schedule.now')}
        </span>
        {current ? (
          <>
            <h2 className="sc-title">{current.title}</h2>
            <div className="row">
              <KindBadge kind={current.kind} />
              <span className="sub">
                {t('schedule.scPlanned', {
                  start: formatTime(current.starts_at, locale),
                  end: formatTime(current.ends_at, locale),
                })}
                {current.actual_start &&
                  ` · ${t('schedule.scActual', { time: formatTime(current.actual_start, locale) })}`}
              </span>
            </div>
            <div className={`sc-count time${left < 0 ? ' sc-over' : ''}`}>
              {left >= 0
                ? t('schedule.endsIn', { time: dur(left) })
                : t('schedule.overtime', { time: dur(-left) })}
            </div>
            <div className="row">
              {current.status !== 'live' ? (
                <button
                  type="button"
                  className="btn btn-primary sc-btn"
                  disabled={busy}
                  onClick={() => void act(current.id, 'start')}
                >
                  <Play aria-hidden size={28} />
                  {t('schedule.scStart')}
                </button>
              ) : (
                <button
                  type="button"
                  className="btn btn-primary sc-btn"
                  disabled={busy}
                  onClick={() => void act(current.id, 'done')}
                >
                  <Check aria-hidden size={28} />
                  {t('schedule.scDone')}
                </button>
              )}
              <button
                type="button"
                className="btn"
                disabled={busy}
                onClick={() => void act(current.id, 'reset')}
              >
                <RotateCcw aria-hidden size={20} />
                {t('schedule.scReset')}
              </button>
            </div>
          </>
        ) : (
          <h2 className="sc-title muted">{t('schedule.nothingNow')}</h2>
        )}
      </section>

      <section className="sc-card" data-color="sky" aria-labelledby="sc-next">
        <span id="sc-next" className="nn-label">
          {t('schedule.next')}
        </span>
        {next ? (
          <>
            <div className="row">
              <h2 className="sc-title grow" style={{ fontSize: '1.8rem' }}>
                {next.title}
              </h2>
              <div className="sc-count time">{dur(toNext)}</div>
            </div>
            <div className="row">
              <KindBadge kind={next.kind} />
              <span className="sub">{formatTime(next.starts_at, locale)}</span>
              <span className="spacer" />
              <button
                type="button"
                className="btn btn-primary"
                disabled={busy}
                onClick={() => void act(next.id, 'start')}
              >
                <Play aria-hidden size={20} />
                {t('schedule.scStart')}
              </button>
              <button
                type="button"
                className="btn"
                disabled={busy}
                onClick={() => void act(next.id, 'delayed')}
              >
                <AlarmClockOff aria-hidden size={20} />
                {t('schedule.scDelayed')}
              </button>
            </div>
          </>
        ) : (
          <p className="muted">{t('schedule.nothingNext')}</p>
        )}
      </section>

      {upcoming.length > 0 && (
        <ul className="sc-upcoming">
          {upcoming.map((i) => (
            <li key={i.id}>
              <span className="time">{formatTime(i.starts_at, locale)}</span>
              <span className="grow">{i.title}</span>
              {startDelay(i) !== null && <span className="sub">{startDelay(i)} min</span>}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
