import { useEffect, useRef, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Maximize } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useWakeLock } from '@/lib/wakelock';
import { formatTime } from '@/lib/time';
import { useT } from '@/lib/usePrefs';
import {
  clockOffset,
  formatClock,
  phaseFor,
  remainingSeconds,
  type StageView,
} from '@/lib/stageTimer';

const POLL_MS = 2000;

/**
 * Stagescherm voor de artiest of backstage. Geen login: enkel het geheime token.
 * Haalt elke 2 s de toestand op en rekent met de servertijd, zodat elk scherm
 * exact gelijk aftelt. Het scherm blijft aan.
 */
export function StageScreen() {
  const { token = '' } = useParams();
  const { t } = useT();
  const [view, setView] = useState<StageView | null>(null);
  const [missing, setMissing] = useState(false);
  const [offline, setOffline] = useState(false);
  const [, setTick] = useState(0);
  const offset = useRef<{ ms: number; rtt: number }>({ ms: 0, rtt: Infinity });
  useWakeLock(true);

  useEffect(() => {
    let stop = false;
    async function poll() {
      const sent = Date.now();
      const { data, error } = await supabase.rpc('stage_view', { token });
      const got = Date.now();
      if (stop) return;
      if (error) return setOffline(true);
      setOffline(false);
      if (!data) return setMissing(true);
      const v = data as StageView;
      // Bewaar de meting met de kortste rondreis: die is het nauwkeurigst.
      const rtt = got - sent;
      if (rtt <= offset.current.rtt * 1.5) {
        offset.current = {
          ms: clockOffset(v.server_now, sent, got),
          rtt: Math.min(rtt, offset.current.rtt),
        };
      }
      setMissing(false);
      setView(v);
    }
    void poll();
    const id = window.setInterval(() => void poll(), POLL_MS);
    const tick = window.setInterval(() => setTick((n) => n + 1), 250);
    return () => {
      stop = true;
      window.clearInterval(id);
      window.clearInterval(tick);
    };
  }, [token]);

  useEffect(() => {
    document.title = view ? `${view.location} · Stage` : 'Stage';
  }, [view]);

  if (missing) {
    return (
      <div className="stage-screen stage-empty">
        <p>{t('stage.invalidLink')}</p>
      </div>
    );
  }
  if (!view) return <div className="stage-screen stage-empty" />;
  if (view.blackout) return <div className="stage-screen stage-blackout" aria-label="Blackout" />;

  const now = Date.now() + offset.current.ms;
  const left = remainingSeconds(view, now);
  const phase = view.state === 'idle' ? 'normal' : phaseFor(left, view.warn_s, view.danger_s);

  return (
    <div className={`stage-screen phase-${phase}`}>
      <div className="stage-top">
        <span>{view.location}</span>
        <span className="time">{formatTime(new Date(now))}</span>
      </div>
      <div className="stage-title">{view.title ?? ''}</div>
      <div className="stage-clock time" aria-live="off">
        {formatClock(left)}
      </div>
      {view.state === 'paused' && <div className="stage-state">{t('stage.paused')}</div>}
      {view.message && <div className="stage-message">{view.message}</div>}
      <div className="stage-bottom">
        {view.next ? (
          <span>
            {t('schedule.next')}: <strong>{view.next.title}</strong> ·{' '}
            {formatTime(view.next.starts_at)}
          </span>
        ) : (
          <span />
        )}
        {offline && <span className="stage-offline">{t('stage.offline')}</span>}
        <button
          type="button"
          className="stage-fs"
          aria-label={t('stage.fullscreen')}
          onClick={() => void document.documentElement.requestFullscreen?.()}
        >
          <Maximize aria-hidden size={22} />
        </button>
      </div>
    </div>
  );
}
