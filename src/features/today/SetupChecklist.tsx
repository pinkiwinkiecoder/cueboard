import { useState } from 'react';
import { Link } from 'react-router-dom';
import { CheckCircle2, Circle, Crown, Rocket, X } from 'lucide-react';
import { useAuth } from '@/lib/auth';
import { useBranding } from '@/lib/branding';
import { dbError } from '@/lib/query';
import { useDepartments, useEvent, useEventDays, useLocations, usePeople } from '@/lib/refdata';
import { useSchedulePublished } from '@/lib/schedule';
import { supabase } from '@/lib/supabase';
import { useT } from '@/lib/usePrefs';
import type { MsgKey } from '@/i18n';

const DISMISS_KEY = 'aof-setup-dismissed';

/** Eerste keer: word beheerder. Daarna: een checklist tot alles klaarstaat. */
export function SetupChecklist() {
  const { t, errText } = useT();
  const { isAdmin, reloadProfile } = useAuth();
  const branding = useBranding();
  const event = useEvent();
  const departments = useDepartments();
  const days = useEventDays();
  const locations = useLocations();
  const people = usePeople();
  const published = useSchedulePublished();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<unknown>(null);
  const [dismissed, setDismissed] = useState(() => {
    try {
      return localStorage.getItem(DISMISS_KEY) === '1';
    } catch {
      return false;
    }
  });

  async function claim() {
    setBusy(true);
    setError(null);
    const { error: err } = await supabase.rpc('claim_first_admin');
    setBusy(false);
    if (err) return setError(dbError(err));
    await reloadProfile();
    void branding.reload();
  }

  if (!isAdmin && branding.data?.needs_setup) {
    return (
      <section className="card hero" data-color="gold" aria-labelledby="h-claim">
        <span className="bubble bubble-lg" aria-hidden>
          <Crown size={26} />
        </span>
        <div className="grow stack-sm">
          <h2 id="h-claim" style={{ margin: 0 }}>
            {t('setup.claimTitle')}
          </h2>
          <p className="sub" style={{ margin: 0 }}>
            {t('setup.claimBody')}
          </p>
          {error !== null && (
            <div className="alert alert-error" role="alert" style={{ margin: 0 }}>
              {errText(error)}
            </div>
          )}
          <div className="row">
            <button
              type="button"
              className="btn btn-primary"
              disabled={busy}
              onClick={() => void claim()}
            >
              <Crown aria-hidden size={20} />
              {busy ? t('common.busy') : t('setup.claimButton')}
            </button>
          </div>
        </div>
      </section>
    );
  }

  if (!isAdmin || dismissed) return null;

  const steps: { done: boolean; label: MsgKey; hint: MsgKey; to: string }[] = [
    {
      done: !!event.data && (event.data.name !== 'My event' || !!event.data.logo_path),
      label: 'setup.stepEvent',
      hint: 'setup.stepEventHint',
      to: '/instellingen',
    },
    {
      done: (departments.data?.length ?? 0) > 0,
      label: 'setup.stepTemplate',
      hint: 'setup.stepTemplateHint',
      to: '/instellingen',
    },
    {
      done: (days.data?.length ?? 0) > 0,
      label: 'setup.stepDays',
      hint: 'setup.stepDaysHint',
      to: '/instellingen',
    },
    {
      done: (locations.data?.length ?? 0) > 0,
      label: 'setup.stepLocations',
      hint: 'setup.stepLocationsHint',
      to: '/instellingen',
    },
    {
      done: (people.data?.length ?? 0) > 1,
      label: 'setup.stepPeople',
      hint: 'setup.stepPeopleHint',
      to: '/mensen',
    },
    {
      done: (published.data?.length ?? 0) > 0,
      label: 'setup.stepSchedule',
      hint: 'setup.stepScheduleHint',
      to: '/planning',
    },
  ];
  const doneCount = steps.filter((s) => s.done).length;
  if (doneCount === steps.length) return null;

  return (
    <section className="card" data-color="violet" aria-labelledby="h-setup">
      <div className="row" style={{ marginBottom: 'var(--space-3)' }}>
        <span className="bubble" aria-hidden>
          <Rocket size={20} />
        </span>
        <div className="grow">
          <h2 id="h-setup" style={{ margin: 0 }}>
            {t('setup.title')}
          </h2>
          <span className="sub">
            {t('setup.progress', { done: doneCount, total: steps.length })}
          </span>
        </div>
        <button
          type="button"
          className="icon-btn"
          aria-label={t('setup.dismiss')}
          onClick={() => {
            try {
              localStorage.setItem(DISMISS_KEY, '1');
            } catch {
              // privémodus: enkel voor deze sessie verbergen
            }
            setDismissed(true);
          }}
        >
          <X aria-hidden size={20} />
        </button>
      </div>
      <div className="progress" aria-hidden style={{ marginBottom: 'var(--space-3)' }}>
        <span style={{ width: `${(doneCount / steps.length) * 100}%` }} />
      </div>
      <ol className="setup-steps">
        {steps.map((s) => (
          <li key={s.label} className={s.done ? 'is-done' : ''}>
            {s.done ? (
              <CheckCircle2 aria-hidden size={22} className="ok" />
            ) : (
              <Circle aria-hidden size={22} className="muted" />
            )}
            <Link to={s.to} className="grow">
              <strong>{t(s.label)}</strong>
              <span className="sub">{t(s.hint)}</span>
            </Link>
          </li>
        ))}
      </ol>
    </section>
  );
}
