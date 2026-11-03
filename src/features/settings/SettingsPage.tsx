import { useEffect, useState, type FormEvent } from 'react';
import { CalendarPlus, Check, Save, Trash2 } from 'lucide-react';
import { NAV_ITEMS } from '@/app/nav';
import { StaleNotice } from '@/app/StaleNotice';
import { useAuth } from '@/lib/auth';
import { supabase } from '@/lib/supabase';
import { dbError } from '@/lib/query';
import { useDepartments, useEvent, useEventDays, useLocations } from '@/lib/refdata';
import { MODULES, type ModuleKey } from '@/lib/permissions';
import { useT } from '@/lib/usePrefs';
import { formatDayLong } from '@/lib/time';
import { NamedListEditor } from './NamedListEditor';
import { RolesEditor } from './RolesEditor';

type Tab = 'event' | 'roles' | 'departments' | 'locations' | 'days';

export function SettingsPage() {
  const { t } = useT();
  const { isAdmin, can } = useAuth();
  const event = useEvent();
  const days = useEventDays();
  const locations = useLocations();
  const departments = useDepartments();
  const canSettings = can('settings.manage');
  const tabs: { id: Tab; label: Parameters<typeof t>[0]; show: boolean }[] = [
    { id: 'event', label: 'settings.tabEvent', show: canSettings },
    { id: 'roles', label: 'settings.tabRoles', show: isAdmin },
    { id: 'departments', label: 'settings.tabDepartments', show: canSettings },
    { id: 'locations', label: 'settings.tabLocations', show: canSettings },
    { id: 'days', label: 'settings.tabDays', show: canSettings },
  ];
  const visible = tabs.filter((x) => x.show);
  const [tab, setTab] = useState<Tab>(visible[0]?.id ?? 'event');

  return (
    <div className="stack">
      <div className="page-head">
        <span className="bubble bubble-lg" data-color="violet" aria-hidden>
          {(() => {
            const Icon = NAV_ITEMS.find((n) => n.to === '/instellingen')?.icon;
            return Icon ? <Icon size={24} /> : null;
          })()}
        </span>
        <div className="grow">
          <h1>{t('settings.title')}</h1>
          <p className="sub">{t('settings.subtitle')}</p>
        </div>
      </div>
      <StaleNotice fromCache={event.fromCache} fetchedAt={event.fetchedAt} />

      <div className="tabs" role="tablist" aria-label={t('settings.title')}>
        {visible.map((x) => (
          <button
            key={x.id}
            type="button"
            role="tab"
            id={`tab-${x.id}`}
            aria-selected={tab === x.id}
            aria-controls={`panel-${x.id}`}
            onClick={() => setTab(x.id)}
          >
            {t(x.label)}
          </button>
        ))}
      </div>

      <div role="tabpanel" id={`panel-${tab}`} aria-labelledby={`tab-${tab}`}>
        {tab === 'event' && (
          <EventForm
            name={event.data?.name ?? ''}
            venue={event.data?.venue ?? ''}
            modules={event.data?.modules ?? [...MODULES]}
            onSaved={() => void event.reload()}
          />
        )}
        {tab === 'roles' && <RolesEditor />}
        {tab === 'departments' && (
          <NamedListEditor
            table="departments"
            rows={departments.data}
            title="settings.departments"
            hint="settings.departmentsHint"
            fieldLabel="settings.departmentName"
            addLabel="settings.addDepartment"
            onChanged={() => void departments.reload()}
          />
        )}
        {tab === 'locations' && (
          <NamedListEditor
            table="locations"
            rows={locations.data}
            title="settings.locations"
            hint="settings.locationsHint"
            fieldLabel="settings.locationName"
            addLabel="settings.addLocation"
            onChanged={() => void locations.reload()}
          />
        )}
        {tab === 'days' && <DaysEditor days={days.data} onChanged={() => void days.reload()} />}
      </div>
    </div>
  );
}

function EventForm(props: {
  name: string;
  venue: string;
  modules: ModuleKey[];
  onSaved: () => void;
}) {
  const { t, errText } = useT();
  const [name, setName] = useState(props.name);
  const [venue, setVenue] = useState(props.venue);
  const [modules, setModules] = useState<ModuleKey[]>(props.modules);
  const [state, setState] = useState<'idle' | 'busy' | 'saved'>('idle');
  const [error, setError] = useState<unknown>(null);
  const modulesKey = props.modules.join(',');

  useEffect(() => {
    setName(props.name);
    setVenue(props.venue);
    setModules(modulesKey ? (modulesKey.split(',') as ModuleKey[]) : []);
  }, [props.name, props.venue, modulesKey]);

  async function save(e: FormEvent) {
    e.preventDefault();
    setState('busy');
    setError(null);
    const { error: err } = await supabase
      .from('event')
      .update({ name: name.trim() || 'My event', venue: venue.trim() || null, modules })
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
    <form className="stack" onSubmit={(e) => void save(e)}>
      {error !== null && (
        <div className="alert alert-error" role="alert">
          {errText(error)}
        </div>
      )}
      <section className="card" aria-labelledby="h-event">
        <h2 id="h-event">{t('settings.event')}</h2>
        <div className="grid-2">
          <div className="field">
            <label htmlFor="f-name">{t('settings.eventName')}</label>
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
      </section>

      <section className="card" aria-labelledby="h-modules">
        <h2 id="h-modules">{t('settings.modules')}</h2>
        <p className="sub">{t('settings.modulesHint')}</p>
        {MODULES.map((m) => {
          const nav = NAV_ITEMS.find((n) => n.module === m);
          if (!nav) return null;
          const Icon = nav.icon;
          const on = modules.includes(m);
          return (
            <label key={m} className="perm-row">
              <span className="bubble" data-color={nav.color} aria-hidden style={{ flex: 'none' }}>
                <Icon size={20} />
              </span>
              <span>
                <strong>{t(nav.label)}</strong>
              </span>
              <input
                type="checkbox"
                role="switch"
                className="switch"
                checked={on}
                onChange={() => setModules(on ? modules.filter((x) => x !== m) : [...modules, m])}
              />
            </label>
          );
        })}
      </section>

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
    const { error: err } = await supabase.from('event_days').insert({ date, label: label.trim() });
    if (err) return setError(dbError(err));
    setDate('');
    setLabel('');
    props.onChanged();
  }

  async function remove(id: string, name: string) {
    if (!window.confirm(t('settings.confirmDelete', { name }))) return;
    const { error: err } = await supabase.from('event_days').delete().eq('id', id);
    if (err) return setError(dbError(err));
    props.onChanged();
  }

  return (
    <section className="stack" aria-labelledby="h-days">
      <div>
        <h2 id="h-days" style={{ margin: 0 }}>
          {t('settings.days')}
        </h2>
        <p className="sub" style={{ margin: '2px 0 0' }}>
          {t('settings.daysHint')}
        </p>
      </div>
      {error !== null && (
        <div className="alert alert-error" role="alert">
          {errText(error)}
        </div>
      )}
      {props.days && props.days.length === 0 && <p className="muted">{t('settings.noDays')}</p>}
      <ul className="list">
        {(props.days ?? []).map((d) => (
          <li key={d.id} className="list-item">
            <span className="bubble" data-color="violet" aria-hidden>
              <CalendarPlus size={20} />
            </span>
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
