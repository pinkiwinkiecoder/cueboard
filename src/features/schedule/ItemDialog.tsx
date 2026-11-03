import { useEffect, useState, type FormEvent } from 'react';
import { Trash2 } from 'lucide-react';
import { Dialog } from '@/app/Dialog';
import { useDepartments, useEventDays, useLocations, usePeople } from '@/lib/refdata';
import { dbError } from '@/lib/query';
import { supabase } from '@/lib/supabase';
import { isoToLocal } from '@/lib/time';
import { useT } from '@/lib/usePrefs';
import {
  itemTimes,
  KIND_LABEL,
  KINDS,
  SCHEDULE_STATUS_LABEL,
  sortByStart,
  STATUSES,
  type ScheduleItem,
  type ScheduleKind,
  type ScheduleStatus,
} from '@/lib/schedule';

interface Form {
  title: string;
  kind: ScheduleKind;
  day_id: string;
  location_id: string;
  start: string;
  end: string;
  status: ScheduleStatus;
  responsible_id: string;
  department_ids: string[];
  depends_on: string;
  notes: string;
}

/** Nieuw planningsitem of een bestaand bewerken (werkversie). */
export function ItemDialog(props: {
  value: ScheduleItem | { new: true; day_id: string; location_id: string | null } | null;
  allItems: ScheduleItem[];
  onClose: () => void;
  onDone: () => void;
}) {
  const { t, errText } = useT();
  const days = useEventDays();
  const locations = useLocations();
  const people = usePeople();
  const departments = useDepartments();
  const [f, setF] = useState<Form | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<unknown>(null);
  const existing = props.value && 'id' in props.value ? props.value : null;

  useEffect(() => {
    const v = props.value;
    if (!v) return setF(null);
    setError(null);
    if ('id' in v) {
      setF({
        title: v.title,
        kind: v.kind,
        day_id: v.day_id,
        location_id: v.location_id ?? '',
        start: isoToLocal(v.starts_at).time,
        end: isoToLocal(v.ends_at).time,
        status: v.status,
        responsible_id: v.responsible_id ?? '',
        department_ids: v.department_ids,
        depends_on: v.depends_on ?? '',
        notes: v.notes ?? '',
      });
    } else {
      setF({
        title: '',
        kind: 'performance',
        day_id: v.day_id,
        location_id: v.location_id ?? '',
        start: '20:00',
        end: '21:00',
        status: 'planned',
        responsible_id: '',
        department_ids: [],
        depends_on: '',
        notes: '',
      });
    }
  }, [props.value]);

  if (!f) return <Dialog open={false} title="" onClose={props.onClose} children={null} />;
  const form = f;
  const dayDate = days.data?.find((d) => d.id === form.day_id)?.date;

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!form.title.trim() || !dayDate) return;
    setBusy(true);
    setError(null);
    const row = {
      title: form.title.trim(),
      kind: form.kind,
      day_id: form.day_id,
      location_id: form.location_id || null,
      ...itemTimes(dayDate, form.start, form.end),
      status: form.status,
      responsible_id: form.responsible_id || null,
      department_ids: form.department_ids,
      depends_on: form.depends_on || null,
      notes: form.notes.trim() || null,
    };
    const res = existing
      ? await supabase.from('schedule_items').update(row).eq('id', existing.id)
      : await supabase.from('schedule_items').insert(row);
    setBusy(false);
    if (res.error) return setError(dbError(res.error));
    props.onDone();
    props.onClose();
  }

  async function remove() {
    if (!existing || !window.confirm(t('schedule.confirmDelete', { title: existing.title })))
      return;
    const { error: err } = await supabase.from('schedule_items').delete().eq('id', existing.id);
    if (err) return setError(dbError(err));
    props.onDone();
    props.onClose();
  }

  const dependable = sortByStart(
    props.allItems.filter((i) => i.day_id === form.day_id && i.id !== existing?.id),
  );

  return (
    <Dialog
      open
      title={t(existing ? 'schedule.editItem' : 'schedule.newItem')}
      onClose={props.onClose}
    >
      <form onSubmit={(e) => void submit(e)}>
        {error !== null && (
          <div className="alert alert-error" role="alert">
            {errText(error)}
          </div>
        )}
        <div className="field">
          <label htmlFor="si-title">{t('schedule.itemTitle')}</label>
          <input
            id="si-title"
            required
            maxLength={140}
            value={form.title}
            onChange={(e) => setF({ ...form, title: e.target.value })}
          />
        </div>
        <div className="field">
          <span className="label">{t('schedule.kind')}</span>
          <div className="segmented" role="radiogroup" aria-label={t('schedule.kind')}>
            {KINDS.map((k) => (
              <button
                key={k}
                type="button"
                role="radio"
                aria-checked={form.kind === k}
                className="chip"
                aria-pressed={form.kind === k}
                onClick={() => setF({ ...form, kind: k })}
              >
                {t(KIND_LABEL[k])}
              </button>
            ))}
          </div>
        </div>
        <div className="grid-2">
          <div className="field">
            <label htmlFor="si-day">{t('schedule.day')}</label>
            <select
              id="si-day"
              value={form.day_id}
              onChange={(e) => setF({ ...form, day_id: e.target.value })}
            >
              {(days.data ?? []).map((d) => (
                <option key={d.id} value={d.id}>
                  {d.label}
                </option>
              ))}
            </select>
          </div>
          <div className="field">
            <label htmlFor="si-loc">{t('schedule.location')}</label>
            <select
              id="si-loc"
              value={form.location_id}
              onChange={(e) => setF({ ...form, location_id: e.target.value })}
            >
              <option value="">{t('schedule.noLocation')}</option>
              {(locations.data ?? []).map((l) => (
                <option key={l.id} value={l.id}>
                  {l.name}
                </option>
              ))}
            </select>
          </div>
          <div className="field">
            <label htmlFor="si-start">{t('schedule.start')}</label>
            <input
              id="si-start"
              type="time"
              required
              value={form.start}
              onChange={(e) => setF({ ...form, start: e.target.value })}
            />
          </div>
          <div className="field">
            <label htmlFor="si-end">{t('schedule.end')}</label>
            <input
              id="si-end"
              type="time"
              required
              value={form.end}
              onChange={(e) => setF({ ...form, end: e.target.value })}
            />
          </div>
          <div className="field">
            <label htmlFor="si-status">{t('schedule.status')}</label>
            <select
              id="si-status"
              value={form.status}
              onChange={(e) => setF({ ...form, status: e.target.value as ScheduleStatus })}
            >
              {STATUSES.map((s) => (
                <option key={s} value={s}>
                  {t(SCHEDULE_STATUS_LABEL[s])}
                </option>
              ))}
            </select>
          </div>
          <div className="field">
            <label htmlFor="si-resp">{t('schedule.responsible')}</label>
            <select
              id="si-resp"
              value={form.responsible_id}
              onChange={(e) => setF({ ...form, responsible_id: e.target.value })}
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
        <div className="field">
          <label htmlFor="si-dep">{t('schedule.dependsOn')}</label>
          <select
            id="si-dep"
            value={form.depends_on}
            onChange={(e) => setF({ ...form, depends_on: e.target.value })}
          >
            <option value="">{t('common.none')}</option>
            {dependable.map((i) => (
              <option key={i.id} value={i.id}>
                {isoToLocal(i.starts_at).time} · {i.title}
              </option>
            ))}
          </select>
        </div>
        <div className="field">
          <span className="label">{t('schedule.departments')}</span>
          <div className="segmented">
            {(departments.data ?? []).map((d) => (
              <button
                key={d.id}
                type="button"
                className="chip"
                data-color={d.color}
                aria-pressed={form.department_ids.includes(d.id)}
                onClick={() =>
                  setF({
                    ...form,
                    department_ids: form.department_ids.includes(d.id)
                      ? form.department_ids.filter((x) => x !== d.id)
                      : [...form.department_ids, d.id],
                  })
                }
              >
                <span className="dot" aria-hidden />
                {d.name}
              </button>
            ))}
          </div>
        </div>
        <div className="field">
          <label htmlFor="si-notes">
            {t('schedule.notes')} {t('common.optional')}
          </label>
          <textarea
            id="si-notes"
            maxLength={2000}
            value={form.notes}
            onChange={(e) => setF({ ...form, notes: e.target.value })}
          />
        </div>
        <div className="row">
          <button
            type="submit"
            className="btn btn-primary"
            disabled={busy || !form.title.trim() || !dayDate}
          >
            {busy ? t('common.saving') : t('common.save')}
          </button>
          <button type="button" className="btn" onClick={props.onClose}>
            {t('common.cancel')}
          </button>
          <span className="spacer" />
          {existing && (
            <button type="button" className="btn btn-ghost" onClick={() => void remove()}>
              <Trash2 aria-hidden size={18} />
              {t('schedule.deleteItem')}
            </button>
          )}
        </div>
      </form>
    </Dialog>
  );
}
