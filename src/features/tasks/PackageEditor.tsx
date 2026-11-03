import { useEffect, useState } from 'react';
import { PenLine, Plus, Trash2 } from 'lucide-react';
import { Dialog } from '@/app/Dialog';
import { ColorPicker } from '@/app/ColorPicker';
import { dbError } from '@/lib/query';
import { supabase } from '@/lib/supabase';
import { useT } from '@/lib/usePrefs';
import type { PaletteColor } from '@/lib/permissions';
import {
  PRIORITIES,
  PRIORITY_LABEL,
  type PackageItem,
  type TaskPackage,
  type TaskPriority,
} from '@/lib/tasks';

interface ItemDraft {
  id: string | null;
  title: string;
  priority: TaskPriority;
  offset: string;
  signoff: boolean;
}

/** Pakket maken of bewerken: naam, kleur en de lijst taken met relatieve deadlines. */
export function PackageEditor(props: {
  pkg: TaskPackage | 'new' | null;
  onClose: () => void;
  onDone: () => void;
}) {
  const { t, errText } = useT();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [color, setColor] = useState<PaletteColor>('mint');
  const [items, setItems] = useState<ItemDraft[]>([]);
  const [removed, setRemoved] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<unknown>(null);
  const existing = props.pkg && props.pkg !== 'new' ? props.pkg : null;

  useEffect(() => {
    if (!props.pkg) return;
    setError(null);
    setRemoved([]);
    if (props.pkg === 'new') {
      setName('');
      setDescription('');
      setColor('mint');
      setItems([{ id: null, title: '', priority: 'normal', offset: '', signoff: false }]);
    } else {
      setName(props.pkg.name);
      setDescription(props.pkg.description ?? '');
      setColor(props.pkg.color);
      setItems(
        [...props.pkg.package_items]
          .sort((a, b) => a.sort_order - b.sort_order)
          .map((i: PackageItem) => ({
            id: i.id,
            title: i.title,
            priority: i.priority,
            offset: i.offset_minutes === null ? '' : String(i.offset_minutes),
            signoff: i.requires_signoff,
          })),
      );
    }
  }, [props.pkg]);

  function patch(i: number, p: Partial<ItemDraft>) {
    setItems(items.map((it, j) => (j === i ? { ...it, ...p } : it)));
  }

  async function save() {
    if (!name.trim()) return;
    setBusy(true);
    setError(null);
    try {
      let pkgId = existing?.id;
      const row = { name: name.trim(), description: description.trim() || null, color };
      if (pkgId) {
        const r = await supabase.from('task_packages').update(row).eq('id', pkgId);
        if (r.error) throw dbError(r.error);
      } else {
        const r = await supabase.from('task_packages').insert(row).select('id').single();
        if (r.error) throw dbError(r.error);
        pkgId = (r.data as { id: string }).id;
      }
      if (removed.length) {
        const r = await supabase.from('package_items').delete().in('id', removed);
        if (r.error) throw dbError(r.error);
      }
      const rows = items
        .filter((i) => i.title.trim())
        .map((i, idx) => ({
          ...(i.id ? { id: i.id } : {}),
          package_id: pkgId,
          title: i.title.trim(),
          priority: i.priority,
          offset_minutes: i.offset.trim() === '' ? null : Number.parseInt(i.offset, 10),
          requires_signoff: i.signoff,
          sort_order: idx + 1,
        }));
      // Bestaande rijen bijwerken en nieuwe apart invoegen (anders wordt id = null).
      const existingRows = rows.filter((r) => 'id' in r);
      const newRows = rows.filter((r) => !('id' in r));
      if (existingRows.length) {
        const r = await supabase.from('package_items').upsert(existingRows);
        if (r.error) throw dbError(r.error);
      }
      if (newRows.length) {
        const r = await supabase.from('package_items').insert(newRows);
        if (r.error) throw dbError(r.error);
      }
      props.onDone();
      props.onClose();
    } catch (e) {
      setError(e);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog
      open={props.pkg !== null}
      title={t(existing ? 'tasks.editPackage' : 'tasks.newPackage')}
      onClose={props.onClose}
    >
      <form
        onSubmit={(e) => {
          e.preventDefault();
          void save();
        }}
      >
        {error !== null && (
          <div className="alert alert-error" role="alert">
            {errText(error)}
          </div>
        )}
        <div className="field">
          <label htmlFor="pk-name">{t('tasks.packageName')}</label>
          <input
            id="pk-name"
            required
            maxLength={80}
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </div>
        <div className="field">
          <label htmlFor="pk-desc">
            {t('common.description')} {t('common.optional')}
          </label>
          <input
            id="pk-desc"
            maxLength={500}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </div>
        <div className="field">
          <span className="label">{t('common.colour')}</span>
          <ColorPicker value={color} onChange={setColor} />
        </div>

        <fieldset className="card" style={{ marginBottom: 'var(--space-4)' }}>
          <legend className="label" style={{ fontWeight: 750, padding: '0 6px' }}>
            {t('tasks.packageItems')}
          </legend>
          <p className="hint">{t('tasks.offsetHint')}</p>
          <ol className="pkg-items">
            {items.map((it, i) => (
              <li key={it.id ?? `new-${i}`}>
                <input
                  className="input grow"
                  aria-label={t('tasks.taskTitle')}
                  placeholder={t('tasks.taskTitle')}
                  maxLength={140}
                  value={it.title}
                  onChange={(e) => patch(i, { title: e.target.value })}
                />
                <div className="row">
                  <select
                    className="input"
                    aria-label={t('tasks.priority')}
                    value={it.priority}
                    onChange={(e) => patch(i, { priority: e.target.value as TaskPriority })}
                  >
                    {PRIORITIES.map((p) => (
                      <option key={p} value={p}>
                        {t(PRIORITY_LABEL[p])}
                      </option>
                    ))}
                  </select>
                  <input
                    className="input"
                    style={{ width: '6.5rem' }}
                    inputMode="numeric"
                    aria-label={`${t('tasks.offset')} (${t('tasks.minutes')})`}
                    placeholder={`± ${t('tasks.minutes')}`}
                    value={it.offset}
                    onChange={(e) => patch(i, { offset: e.target.value.replace(/[^\d-]/g, '') })}
                  />
                  <button
                    type="button"
                    className="chip"
                    aria-pressed={it.signoff}
                    data-color="violet"
                    onClick={() => patch(i, { signoff: !it.signoff })}
                  >
                    <PenLine aria-hidden size={14} />
                    {t('tasks.signoff')}
                  </button>
                  <button
                    type="button"
                    className="icon-btn"
                    aria-label={t('common.delete')}
                    onClick={() => {
                      if (it.id) setRemoved([...removed, it.id]);
                      setItems(items.filter((_, j) => j !== i));
                    }}
                  >
                    <Trash2 aria-hidden size={20} />
                  </button>
                </div>
              </li>
            ))}
          </ol>
          <button
            type="button"
            className="btn btn-sm"
            onClick={() =>
              setItems([
                ...items,
                { id: null, title: '', priority: 'normal', offset: '', signoff: false },
              ])
            }
          >
            <Plus aria-hidden size={18} />
            {t('tasks.addItem')}
          </button>
        </fieldset>

        <div className="row">
          <button type="submit" className="btn btn-primary" disabled={busy || !name.trim()}>
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
