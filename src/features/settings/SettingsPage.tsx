import { useEffect, useState, type FormEvent } from 'react';
import { CalendarPlus, Check, Save, Trash2 } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { dbError } from '@/lib/query';
import { useDepartments, useFestival, useFestivalDays, useStages } from '@/lib/refdata';
import { useT } from '@/lib/usePrefs';
import { formatDayLong } from '@/lib/time';
import { StaleNotice } from '@/app/StaleNotice';
import { NamedListEditor } from './NamedListEditor';

export function SettingsPage() {
  const { t } = useT();
  const festival = useFestival();
  const days = useFestivalDays();
  const stages = useStages();
  const departments = useDepartments();

  return (
    <div className="stack">
      <h1>{t('settings.title')}</h1>
      <StaleNotice fromCache={festival.fromCache} fetchedAt={festival.fetchedAt} />
      <FestivalForm
        name={festival.data?.name ?? ''}
        venue={festival.data?.venue ?? ''}
        onSaved={() => void festival.reload()}
      />
      <DaysEditor days={days.data} onChanged={() => void days.reload()} />
      <NamedListEditor
        table="stages"
        rows={stages.data}
        title="settings.stages"
        fieldLabel="settings.stageName"
        addLabel="settings.addStage"
        onChanged={() => void stages.reload()}
      />
      <NamedListEditor
        table="departments"
        rows={departments.data}
        title="settings.departments"
        fieldLabel="settings.departmentName"
        addLabel="settings.addDepartment"
        onChanged={() => void departments.reload()}
      />
    </div>
  );
}

function FestivalForm(props: { name: string; venue: string; onSaved: () => void }) {
  const { t, errText } = useT();
  const [name, setName] = useState(props.name);
  const [venue, setVenue] = useState(props.venue);
  const [state, setState] = useState<'idle' | 'busy' | 'saved'>('idle');
  const [error, setError] = useState<unknown>(null);

  useEffect(() => {
    setName(props.name);
    setVenue(props.venue);
  }, [props.name, props.venue]);

  async function save(e: FormEvent) {
    e.preventDefault();
    setState('busy');
    setError(null);
    const { error: err } = await supabase
      .from('festival')
      .update({ name: name.trim() || 'Art of Faith', venue: venue.trim() || null })
      .eq('id', true);
    if (err) {
      setError(dbError(err));
      setState('idle');
      return;
    }
    setState('saved');
    props.onSaved();
    window.setTimeout(() => setState('idle'), 2000);
  }

  return (
    <form className="panel stack" onSubmit={(e) => void save(e)} aria-labelledby="h-festival">
      <h2 id="h-festival">{t('settings.festival')}</h2>
      {error !== null && (
        <div className="alert alert-error" role="alert">
          {errText(error)}
        </div>
      )}
      <div className="grid-2">
        <div className="field">
          <label htmlFor="f-name">{t('settings.festivalName')}</label>
          <input
            id="f-name"
            value={name}
            maxLength={80}
            onChange={(e) => setName(e.target.value)}
          />
        </div>
        <div className="field">
          <label htmlFor="f-venue">
            {t('settings.venue')} {t('common.optional')}
          </label>
          <input
            id="f-venue"
            value={venue}
            maxLength={120}
            onChange={(e) => setVenue(e.target.value)}
          />
        </div>
      </div>
      <div className="row">
        <button type="submit" className="btn btn-primary" disabled={state === 'busy'}>
          {state === 'saved' ? <Check aria-hidden size={20} /> : <Save aria-hidden size={20} />}
          {t(
            state === 'busy'
              ? 'common.saving'
              : state === 'saved'
                ? 'settings.saved'
                : 'common.save',
          )}
        </button>
      </div>
    </form>
  );
}

function DaysEditor(props: {
  days: { id: string; date: string; label: string }[] | undefined;
  onChanged: () => void;
}) {
  const { t, errText, locale } = useT();
  const [date, setDate] = useState('');
  const [label, setLabel] = useState('');
  const [error, setError] = useState<unknown>(null);

  async function add(e: FormEvent) {
    e.preventDefault();
    if (!date || !label.trim()) return;
    setError(null);
    const { error: err } = await supabase
      .from('festival_days')
      .insert({ date, label: label.trim() });
    if (err) return setError(dbError(err));
    setDate('');
    setLabel('');
    props.onChanged();
  }

  async function remove(id: string, name: string) {
    if (!window.confirm(t('settings.confirmDelete', { name }))) return;
    const { error: err } = await supabase.from('festival_days').delete().eq('id', id);
    if (err) return setError(dbError(err));
    props.onChanged();
  }

  return (
    <section className="panel stack" aria-labelledby="h-days">
      <h2 id="h-days">{t('settings.days')}</h2>
      <p className="hint">{t('settings.daysHint')}</p>
      {error !== null && (
        <div className="alert alert-error" role="alert">
          {errText(error)}
        </div>
      )}
      {props.days && props.days.length === 0 && <p className="muted">{t('settings.noDays')}</p>}
      <ul className="list">
        {(props.days ?? []).map((d) => (
          <li key={d.id} className="list-item">
            <span className="grow">
              <span className="title">{d.label}</span>{' '}
              <span className="sub">{formatDayLong(`${d.date}T12:00:00Z`, locale)}</span>
            </span>
            <button
              type="button"
              className="icon-btn"
              aria-label={`${t('common.delete')}: ${d.label}`}
              onClick={() => void remove(d.id, d.label)}
            >
              <Trash2 aria-hidden size={20} />
            </button>
          </li>
        ))}
      </ul>
      <form className="row" onSubmit={(e) => void add(e)}>
        <label className="visually-hidden" htmlFor="day-date">
          {t('settings.dayDate')}
        </label>
        <input
          id="day-date"
          className="input"
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
        />
        <label className="visually-hidden" htmlFor="day-label">
          {t('settings.dayLabel')}
        </label>
        <input
          id="day-label"
          className="input grow"
          placeholder={t('settings.dayLabelPlaceholder')}
          value={label}
          maxLength={40}
          onChange={(e) => setLabel(e.target.value)}
        />
        <button type="submit" className="btn" disabled={!date || !label.trim()}>
          <CalendarPlus aria-hidden size={20} />
          {t('settings.addDay')}
        </button>
      </form>
    </section>
  );
}
