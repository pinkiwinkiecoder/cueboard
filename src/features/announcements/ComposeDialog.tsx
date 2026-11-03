import { useEffect, useState, type FormEvent } from 'react';
import { BellRing, Pin, Send } from 'lucide-react';
import { Dialog } from '@/app/Dialog';
import { ColorPicker } from '@/app/ColorPicker';
import { useDepartments } from '@/lib/refdata';
import { dbError } from '@/lib/query';
import { supabase } from '@/lib/supabase';
import { useT } from '@/lib/usePrefs';
import type { Announcement } from '@/lib/announcements';
import type { PaletteColor } from '@/lib/permissions';

/** Nieuwe mededeling of vastgepind bericht, of een bestaande bewerken. */
export function ComposeDialog(props: {
  value: Announcement | 'new' | 'new-pinned' | null;
  onClose: () => void;
  onDone: () => void;
}) {
  const { t, errText } = useT();
  const departments = useDepartments();
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [pinned, setPinned] = useState(false);
  const [urgent, setUrgent] = useState(false);
  const [color, setColor] = useState<PaletteColor>('peach');
  const [depts, setDepts] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<unknown>(null);
  const existing = props.value && typeof props.value === 'object' ? props.value : null;

  useEffect(() => {
    if (!props.value) return;
    setError(null);
    if (typeof props.value === 'object') {
      setTitle(props.value.title);
      setBody(props.value.body);
      setPinned(props.value.pinned);
      setUrgent(props.value.urgent);
      setColor(props.value.color);
      setDepts(props.value.department_ids);
    } else {
      setTitle('');
      setBody('');
      setPinned(props.value === 'new-pinned');
      setUrgent(false);
      setColor(props.value === 'new-pinned' ? 'sky' : 'peach');
      setDepts([]);
    }
  }, [props.value]);

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!title.trim()) return;
    setBusy(true);
    setError(null);
    const row = {
      title: title.trim(),
      body: body.trim(),
      pinned,
      urgent,
      requires_ack: urgent,
      color,
      department_ids: depts,
    };
    const res = existing
      ? await supabase.from('announcements').update(row).eq('id', existing.id)
      : await supabase.from('announcements').insert(row);
    setBusy(false);
    if (res.error) return setError(dbError(res.error));
    props.onDone();
    props.onClose();
  }

  return (
    <Dialog
      open={props.value !== null}
      title={t(
        existing ? 'announcements.edit' : pinned ? 'announcements.newPinned' : 'announcements.new',
      )}
      onClose={props.onClose}
    >
      <form onSubmit={(e) => void submit(e)}>
        {error !== null && (
          <div className="alert alert-error" role="alert">
            {errText(error)}
          </div>
        )}
        <div className="field">
          <label htmlFor="an-title">{t('announcements.titleLabel')}</label>
          <input
            id="an-title"
            required
            maxLength={120}
            placeholder={t(
              pinned ? 'announcements.pinnedPlaceholder' : 'announcements.titlePlaceholder',
            )}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
        </div>
        <div className="field">
          <label htmlFor="an-body">{t('announcements.bodyLabel')}</label>
          <textarea
            id="an-body"
            rows={pinned ? 6 : 4}
            maxLength={4000}
            placeholder={t(
              pinned ? 'announcements.pinnedBodyPlaceholder' : 'announcements.bodyPlaceholder',
            )}
            value={body}
            onChange={(e) => setBody(e.target.value)}
          />
        </div>
        <div className="field">
          <span className="label">{t('announcements.audience')}</span>
          <div className="segmented" role="group" aria-label={t('announcements.audience')}>
            <button
              type="button"
              className="chip"
              aria-pressed={depts.length === 0}
              onClick={() => setDepts([])}
            >
              {t('people.everyone')}
            </button>
            {(departments.data ?? []).map((d) => (
              <button
                key={d.id}
                type="button"
                className="chip"
                data-color={d.color}
                aria-pressed={depts.includes(d.id)}
                onClick={() =>
                  setDepts(
                    depts.includes(d.id) ? depts.filter((x) => x !== d.id) : [...depts, d.id],
                  )
                }
              >
                <span className="dot" aria-hidden />
                {d.name}
              </button>
            ))}
          </div>
        </div>
        <label className="switch-row">
          <span>
            <strong>
              <Pin aria-hidden size={16} /> {t('announcements.pin')}
            </strong>
            <span className="hint">{t('announcements.pinHint')}</span>
          </span>
          <input
            type="checkbox"
            role="switch"
            checked={pinned}
            onChange={(e) => setPinned(e.target.checked)}
          />
        </label>
        <label className="switch-row" style={{ marginBottom: 'var(--space-4)' }}>
          <span>
            <strong>
              <BellRing aria-hidden size={16} /> {t('announcements.urgent')}
            </strong>
            <span className="hint">{t('announcements.urgentHint')}</span>
          </span>
          <input
            type="checkbox"
            role="switch"
            checked={urgent}
            onChange={(e) => setUrgent(e.target.checked)}
          />
        </label>
        <div className="field">
          <span className="label">{t('common.colour')}</span>
          <ColorPicker value={color} onChange={setColor} />
        </div>
        <div className="row">
          <button type="submit" className="btn btn-primary" disabled={busy || !title.trim()}>
            <Send aria-hidden size={20} />
            {busy ? t('common.busy') : t(existing ? 'common.save' : 'announcements.post')}
          </button>
          <button type="button" className="btn" onClick={props.onClose}>
            {t('common.cancel')}
          </button>
        </div>
      </form>
    </Dialog>
  );
}
