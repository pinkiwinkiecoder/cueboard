import { useEffect, useState } from 'react';
import {
  Copy,
  ExternalLink,
  Minus,
  MonitorOff,
  Pause,
  Play,
  Plus,
  RotateCcw,
  Send,
  Upload,
  X,
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { dbError, useCachedQuery } from '@/lib/query';
import { useNow } from '@/lib/useNow';
import { useT } from '@/lib/usePrefs';
import { formatClock, phaseFor, remainingSeconds } from '@/lib/stageTimer';

interface TimerRow {
  location_id: string;
  item_id: string | null;
  title: string | null;
  state: 'idle' | 'running' | 'paused';
  duration_s: number;
  remaining_s: number;
  started_at: string | null;
  message: string | null;
  message_on: boolean;
  blackout: boolean;
  warn_s: number;
  danger_s: number;
  display_token: string;
}

/** Bediening van de stage timer, in de showcaller. */
export function StageControls({
  locationId,
  currentItemId,
}: {
  locationId: string;
  currentItemId: string | null;
}) {
  const { t, errText } = useT();
  const now = useNow(500);
  const [msg, setMsg] = useState('');
  const [error, setError] = useState<unknown>(null);
  const [copied, setCopied] = useState(false);
  const timers = useCachedQuery(
    'stage_timers',
    async () => {
      const { data, error: err } = await supabase.from('stage_timers').select('*');
      if (err) throw dbError(err);
      return data as TimerRow[];
    },
    { realtime: ['stage_timers'] },
  );
  const timer = timers.data?.find((x) => x.location_id === locationId);

  useEffect(() => {
    setMsg(timer?.message ?? '');
  }, [timer?.message]);

  async function act(action: string, value?: string) {
    setError(null);
    const { error: err } = await supabase.rpc('stage_control', {
      location: locationId,
      action,
      value: value ?? null,
    });
    if (err) setError(dbError(err));
    else void timers.reload();
  }

  const link = timer ? `${window.location.origin}/screen/${timer.display_token}` : '';
  const left = timer ? remainingSeconds(timer, now.getTime()) : 0;
  const phase =
    timer && timer.state !== 'idle' ? phaseFor(left, timer.warn_s, timer.danger_s) : 'normal';

  return (
    <section className="sc-card stage-controls" data-color="violet" aria-labelledby="h-stage">
      <div className="row">
        <span id="h-stage" className="nn-label grow">
          {t('stage.title')}
        </span>
        {timer?.blackout && <span className="badge badge-danger">{t('stage.blackoutOn')}</span>}
      </div>
      {error !== null && (
        <div className="alert alert-error" role="alert">
          {errText(error)}
        </div>
      )}
      <div className="row">
        <span className={`stage-mini time phase-${phase}`}>{formatClock(left)}</span>
        <span className="grow sub">{timer?.title ?? t('stage.nothingLoaded')}</span>
      </div>
      <div className="row">
        <button
          type="button"
          className="btn btn-sm"
          disabled={!currentItemId}
          onClick={() => void act('load', currentItemId ?? undefined)}
        >
          <Upload aria-hidden size={18} />
          {t('stage.loadCurrent')}
        </button>
        {timer?.state === 'running' ? (
          <button
            type="button"
            className="btn btn-primary btn-sm"
            onClick={() => void act('pause')}
          >
            <Pause aria-hidden size={18} />
            {t('stage.pause')}
          </button>
        ) : (
          <button
            type="button"
            className="btn btn-primary btn-sm"
            disabled={!timer}
            onClick={() => void act('start')}
          >
            <Play aria-hidden size={18} />
            {t('stage.start')}
          </button>
        )}
        <button
          type="button"
          className="btn btn-sm"
          disabled={!timer}
          onClick={() => void act('add', '-60')}
        >
          <Minus aria-hidden size={18} />1 min
        </button>
        <button
          type="button"
          className="btn btn-sm"
          disabled={!timer}
          onClick={() => void act('add', '60')}
        >
          <Plus aria-hidden size={18} />1 min
        </button>
        <button
          type="button"
          className="btn btn-sm"
          disabled={!timer}
          onClick={() => void act('add', '300')}
        >
          <Plus aria-hidden size={18} />5 min
        </button>
        <button
          type="button"
          className="btn btn-sm btn-ghost"
          disabled={!timer}
          onClick={() => void act('reset')}
        >
          <RotateCcw aria-hidden size={18} />
          {t('stage.reset')}
        </button>
      </div>
      <form
        className="row"
        onSubmit={(e) => {
          e.preventDefault();
          void act('message', msg);
        }}
      >
        <input
          className="input grow"
          aria-label={t('stage.message')}
          placeholder={t('stage.messagePlaceholder')}
          maxLength={200}
          value={msg}
          onChange={(e) => setMsg(e.target.value)}
        />
        <button type="submit" className="btn btn-sm" disabled={!msg.trim()}>
          <Send aria-hidden size={18} />
          {t('stage.showMessage')}
        </button>
        {timer?.message_on && (
          <button
            type="button"
            className="btn btn-sm btn-ghost"
            onClick={() => void act('message_off')}
          >
            <X aria-hidden size={18} />
            {t('stage.hideMessage')}
          </button>
        )}
      </form>
      <div className="row">
        <button type="button" className="btn btn-sm" onClick={() => void act('blackout')}>
          <MonitorOff aria-hidden size={18} />
          {t(timer?.blackout ? 'stage.blackoutOff' : 'stage.blackout')}
        </button>
        {timer && (
          <>
            <a href={link} target="_blank" rel="noreferrer" className="btn btn-sm">
              <ExternalLink aria-hidden size={18} />
              {t('stage.openScreen')}
            </a>
            <button
              type="button"
              className="btn btn-sm btn-ghost"
              onClick={() =>
                void navigator.clipboard.writeText(link).then(() => {
                  setCopied(true);
                  window.setTimeout(() => setCopied(false), 2000);
                })
              }
            >
              <Copy aria-hidden size={18} />
              {t(copied ? 'people.copied' : 'stage.copyLink')}
            </button>
            <button
              type="button"
              className="btn btn-sm btn-ghost"
              onClick={() => {
                if (window.confirm(t('stage.newLinkConfirm'))) void act('new_link');
              }}
            >
              {t('stage.newLink')}
            </button>
          </>
        )}
      </div>
      <p className="hint" style={{ margin: 0 }}>
        {t('stage.linkHint')}
      </p>
    </section>
  );
}
