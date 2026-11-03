import { useState, type FormEvent } from 'react';
import { Dialog } from '@/app/Dialog';
import { useAuth } from '@/lib/auth';
import { useDepartments, useEventDays, useLocations, usePeople } from '@/lib/refdata';
import { dbError } from '@/lib/query';
import { supabase } from '@/lib/supabase';
import { localToIso } from '@/lib/time';
import { useT } from '@/lib/usePrefs';
import { PRIORITIES, PRIORITY_LABEL, type TaskPriority } from '@/lib/tasks';

export function NewTaskDialog(props: { open: boolean; onClose: () => void; onDone: () => void }) {
  const { t, errText } = useT();
  const { profile, can } = useAuth();
  const departments = useDepartments();
  const locations = useLocations();
  const days = useEventDays();
  const people = usePeople();
  const all = can('tasks.manage_all');
  const myDept = profile?.department_id ?? '';
  const [f, setF] = useState({
    title: '',
    description: '',
    department_id: all ? '' : myDept,
    location_id: '',
    day_id: '',
    time: '',
    priority: 'normal' as TaskPriority,
    assignee: '',
    signoff: false,
  });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<unknown>(null);

  const dayDate = days.data?.find((d) => d.id === f.day_id)?.date;
  const assignable = (people.data ?? []).filter(
    (p) => p.active && (all || !f.department_id || p.department_id === f.department_id),
  );

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!f.title.trim()) return;
    setBusy(true);
    setError(null);
    const { data, error: err } = await supabase
      .from('tasks')
      .insert({
        title: f.title.trim(),
        description: f.description.trim() || null,
        department_id: f.department_id || null,
        location_id: f.location_id || null,
        day_id: f.day_id || null,
        due_at: dayDate && f.time ? localToIso(dayDate, f.time) : null,
        priority: f.priority,
        requires_signoff: f.signoff,
        pool: !f.assignee && !!f.department_id,
      })
      .select('id')
      .single();
    if (!err && data && f.assignee) {
      const res = await supabase
        .from('task_assignees')
        .insert({ task_id: (data as { id: string }).id, profile_id: f.assignee });
      if (res.error) setError(dbError(res.error));
    }
    setBusy(false);
    if (err) return setError(dbError(err));
    props.onDone();
    props.onClose();
    setF({ ...f, title: '', description: '', assignee: '', time: '' });
  }

  return (
    <Dialog open={props.open} title={t('tasks.new')} onClose={props.onClose}>
      <form onSubmit={(e) => void submit(e)} noValidate>
        {error !== null && (
          <div className="alert alert-error" role="alert">
            {errText(error)}
          </div>
        )}
        <div className="field">
          <label htmlFor="t-title">{t('tasks.taskTitle')}</label>
          <input
            id="t-title"
            required
            maxLength={140}
            value={f.title}
            onChange={(e) => setF({ ...f, title: e.target.value })}
          />
        </div>
        <div className="field">
          <label htmlFor="t-desc">
            {t('common.description')} {t('common.optional')}
          </label>
          <textarea
            id="t-desc"
            maxLength={2000}
            value={f.description}
            onChange={(e) => setF({ ...f, description: e.target.value })}
          />
        </div>
        <div className="grid-2">
          <div className="field">
            <label htmlFor="t-dept">{t('people.department')}</label>
            <select
              id="t-dept"
              value={f.department_id}
              disabled={!all}
              onChange={(e) => setF({ ...f, department_id: e.target.value, assignee: '' })}
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
            <label htmlFor="t-assignee">{t('tasks.assignTo')}</label>
            <select
              id="t-assignee"
              value={f.assignee}
              onChange={(e) => setF({ ...f, assignee: e.target.value })}
            >
              <option value="">{t('common.nobody')}</option>
              {assignable.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.full_name}
                </option>
              ))}
            </select>
          </div>
          <div className="field">
            <label htmlFor="t-loc">
              {t('settings.locations')} {t('common.optional')}
            </label>
            <select
              id="t-loc"
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
            <label htmlFor="t-prio">{t('tasks.priority')}</label>
            <select
              id="t-prio"
              value={f.priority}
              onChange={(e) => setF({ ...f, priority: e.target.value as TaskPriority })}
            >
              {PRIORITIES.map((p) => (
                <option key={p} value={p}>
                  {t(PRIORITY_LABEL[p])}
                </option>
              ))}
            </select>
          </div>
          <div className="field">
            <label htmlFor="t-day">{t('settings.dayLabel')}</label>
            <select
              id="t-day"
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
            <label htmlFor="t-time">{t('tasks.due')}</label>
            <input
              id="t-time"
              type="time"
              disabled={!f.day_id}
              value={f.time}
              onChange={(e) => setF({ ...f, time: e.target.value })}
            />
          </div>
        </div>
        <label className="switch-row" style={{ marginBottom: 'var(--space-4)' }}>
          <span>
            <strong>{t('tasks.signoff')}</strong>
          </span>
          <input
            type="checkbox"
            role="switch"
            checked={f.signoff}
            onChange={(e) => setF({ ...f, signoff: e.target.checked })}
          />
        </label>
        {!f.assignee && f.department_id && <p className="hint">{t('tasks.poolHint')}</p>}
        <div className="row">
          <button type="submit" className="btn btn-primary" disabled={busy || !f.title.trim()}>
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
