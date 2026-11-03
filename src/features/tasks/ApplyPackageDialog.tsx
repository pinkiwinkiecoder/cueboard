import { useEffect, useState, type FormEvent } from 'react';
import { Dialog } from '@/app/Dialog';
import { useAuth } from '@/lib/auth';
import { useDepartments, useEventDays, useLocations, usePeople } from '@/lib/refdata';
import { localToIso } from '@/lib/time';
import { useT } from '@/lib/usePrefs';
import { taskActions, type TaskPackage } from '@/lib/tasks';

export function ApplyPackageDialog(props: {
  pkg: TaskPackage | null;
  onClose: () => void;
  onDone: () => void;
}) {
  const { t, errText } = useT();
  const { profile, can } = useAuth();
  const departments = useDepartments();
  const locations = useLocations();
  const days = useEventDays();
  const people = usePeople();
  const all = can('tasks.manage_all');
  const [f, setF] = useState({
    name: '',
    department_id: '',
    location_id: '',
    day_id: '',
    time: '',
    assignee: '',
  });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<unknown>(null);

  useEffect(() => {
    if (!props.pkg) return;
    setError(null);
    setF({
      name: props.pkg.name,
      department_id: all ? (props.pkg.department_id ?? '') : (profile?.department_id ?? ''),
      location_id: '',
      day_id: '',
      time: '',
      assignee: '',
    });
  }, [props.pkg, all, profile?.department_id]);

  const dayDate = days.data?.find((d) => d.id === f.day_id)?.date;

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!props.pkg) return;
    setBusy(true);
    setError(null);
    try {
      await taskActions.applyPackage({
        package: props.pkg.id,
        day: f.day_id || null,
        location: f.location_id || null,
        department: f.department_id || null,
        assignee: f.assignee || null,
        anchor: dayDate && f.time ? localToIso(dayDate, f.time) : null,
        group_name: f.name.trim() || null,
      });
      props.onDone();
      props.onClose();
    } catch (err) {
      setError(err);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog open={props.pkg !== null} title={t('tasks.applyPackage')} onClose={props.onClose}>
      <form onSubmit={(e) => void submit(e)}>
        {error !== null && (
          <div className="alert alert-error" role="alert">
            {errText(error)}
          </div>
        )}
        <div className="field">
          <label htmlFor="a-name">{t('tasks.groupName')}</label>
          <input
            id="a-name"
            maxLength={120}
            value={f.name}
            onChange={(e) => setF({ ...f, name: e.target.value })}
          />
        </div>
        <div className="grid-2">
          <div className="field">
            <label htmlFor="a-day">{t('settings.dayLabel')}</label>
            <select
              id="a-day"
              value={f.day_id}
              onChange={(e) => setF({ ...f, day_id: e.target.value })}
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
            <label htmlFor="a-time">{t('tasks.anchor')}</label>
            <input
              id="a-time"
              type="time"
              disabled={!f.day_id}
              value={f.time}
              aria-describedby="a-time-hint"
              onChange={(e) => setF({ ...f, time: e.target.value })}
            />
            <span id="a-time-hint" className="hint">
              {t('tasks.anchorHint')}
            </span>
          </div>
          <div className="field">
            <label htmlFor="a-loc">{t('settings.locations')}</label>
            <select
              id="a-loc"
              value={f.location_id}
              onChange={(e) => setF({ ...f, location_id: e.target.value })}
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
            <label htmlFor="a-dept">{t('people.department')}</label>
            <select
              id="a-dept"
              value={f.department_id}
              disabled={!all}
              onChange={(e) => setF({ ...f, department_id: e.target.value })}
            >
              <option value="">{t('people.noDepartment')}</option>
              {(departments.data ?? []).map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name}
                </option>
              ))}
            </select>
          </div>
          <div className="field">
            <label htmlFor="a-who">{t('tasks.assignTo')}</label>
            <select
              id="a-who"
              value={f.assignee}
              onChange={(e) => setF({ ...f, assignee: e.target.value })}
            >
              <option value="">{t('common.nobody')}</option>
              {(people.data ?? [])
                .filter(
                  (p) => p.active && (!f.department_id || p.department_id === f.department_id),
                )
                .map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.full_name}
                  </option>
                ))}
            </select>
          </div>
        </div>
        {!f.assignee && f.department_id && <p className="hint">{t('tasks.poolHint')}</p>}
        <div className="row">
          <button type="submit" className="btn btn-primary" disabled={busy}>
            {busy ? t('common.busy') : t('tasks.applyPackage')}
          </button>
          <button type="button" className="btn" onClick={props.onClose}>
            {t('common.cancel')}
          </button>
        </div>
      </form>
    </Dialog>
  );
}
