import { useState, type FormEvent } from 'react';
import { ArrowDown, ArrowUp, Check, Pencil, Plus, Trash2, X } from 'lucide-react';
import { ColorPicker } from '@/app/ColorPicker';
import { supabase } from '@/lib/supabase';
import { dbError } from '@/lib/query';
import { useT } from '@/lib/usePrefs';
import { PALETTE, type PaletteColor } from '@/lib/permissions';
import type { MsgKey } from '@/i18n';

interface Row {
  id: string;
  name: string;
  color: PaletteColor;
  sort_order: number;
}

/** Editor for an ordered list of named, coloured items (locations, departments). */
export function NamedListEditor(props: {
  table: 'locations' | 'departments';
  rows: Row[] | undefined;
  title: MsgKey;
  hint: MsgKey;
  fieldLabel: MsgKey;
  addLabel: MsgKey;
  onChanged: () => void;
}) {
  const { t, errText } = useT();
  const [name, setName] = useState('');
  const [editing, setEditing] = useState<{ id: string; name: string; color: PaletteColor } | null>(
    null,
  );
  const [error, setError] = useState<unknown>(null);
  const rows = props.rows ?? [];

  async function run(op: PromiseLike<{ error: { message: string; code?: string } | null }>) {
    setError(null);
    const { error: err } = await op;
    if (err) {
      setError(dbError(err));
      return false;
    }
    props.onChanged();
    return true;
  }

  async function add(e: FormEvent) {
    e.preventDefault();
    const clean = name.trim();
    if (!clean) return;
    const next = Math.max(0, ...rows.map((r) => r.sort_order)) + 1;
    const color = PALETTE[rows.length % PALETTE.length] ?? 'violet';
    if (await run(supabase.from(props.table).insert({ name: clean, sort_order: next, color })))
      setName('');
  }

  async function saveEdit(e: FormEvent) {
    e.preventDefault();
    if (!editing?.name.trim()) return;
    if (
      await run(
        supabase
          .from(props.table)
          .update({ name: editing.name.trim(), color: editing.color })
          .eq('id', editing.id),
      )
    )
      setEditing(null);
  }

  async function move(index: number, dir: -1 | 1) {
    const a = rows[index];
    const b = rows[index + dir];
    if (!a || !b) return;
    await run(supabase.from(props.table).update({ sort_order: b.sort_order }).eq('id', a.id));
    await run(supabase.from(props.table).update({ sort_order: a.sort_order }).eq('id', b.id));
  }

  async function remove(row: Row) {
    if (!window.confirm(t('settings.confirmDelete', { name: row.name }))) return;
    await run(supabase.from(props.table).delete().eq('id', row.id));
  }

  const inputId = `${props.table}-new`;
  return (
    <section className="stack" aria-labelledby={`h-${props.table}`}>
      <div>
        <h2 id={`h-${props.table}`} style={{ margin: 0 }}>
          {t(props.title)}
        </h2>
        <p className="sub" style={{ margin: '2px 0 0' }}>
          {t(props.hint)}
        </p>
      </div>
      {error !== null && (
        <div className="alert alert-error" role="alert">
          {errText(error)}
        </div>
      )}
      <ul className="list">
        {rows.map((row, i) => (
          <li key={row.id} className="list-item" data-color={row.color}>
            {editing?.id === row.id ? (
              <form className="stack grow" onSubmit={(e) => void saveEdit(e)}>
                <div className="row">
                  <label className="visually-hidden" htmlFor={`edit-${row.id}`}>
                    {t(props.fieldLabel)}
                  </label>
                  <input
                    id={`edit-${row.id}`}
                    className="input grow"
                    value={editing.name}
                    maxLength={60}
                    autoFocus
                    onChange={(e) => setEditing({ ...editing, name: e.target.value })}
                  />
                  <button type="submit" className="icon-btn" aria-label={t('common.save')}>
                    <Check aria-hidden size={20} />
                  </button>
                  <button
                    type="button"
                    className="icon-btn"
                    aria-label={t('common.cancel')}
                    onClick={() => setEditing(null)}
                  >
                    <X aria-hidden size={20} />
                  </button>
                </div>
                <ColorPicker
                  value={editing.color}
                  onChange={(c) => setEditing({ ...editing, color: c })}
                />
              </form>
            ) : (
              <>
                <span className="dot" aria-hidden />
                <span className="grow title">{row.name}</span>
                <button
                  type="button"
                  className="icon-btn"
                  aria-label={`${t('common.moveUp')}: ${row.name}`}
                  disabled={i === 0}
                  onClick={() => void move(i, -1)}
                >
                  <ArrowUp aria-hidden size={20} />
                </button>
                <button
                  type="button"
                  className="icon-btn"
                  aria-label={`${t('common.moveDown')}: ${row.name}`}
                  disabled={i === rows.length - 1}
                  onClick={() => void move(i, 1)}
                >
                  <ArrowDown aria-hidden size={20} />
                </button>
                <button
                  type="button"
                  className="icon-btn"
                  aria-label={`${t('common.edit')}: ${row.name}`}
                  onClick={() => setEditing({ id: row.id, name: row.name, color: row.color })}
                >
                  <Pencil aria-hidden size={20} />
                </button>
                <button
                  type="button"
                  className="icon-btn"
                  aria-label={`${t('common.delete')}: ${row.name}`}
                  onClick={() => void remove(row)}
                >
                  <Trash2 aria-hidden size={20} />
                </button>
              </>
            )}
          </li>
        ))}
      </ul>
      <form className="row" onSubmit={(e) => void add(e)}>
        <label className="visually-hidden" htmlFor={inputId}>
          {t(props.fieldLabel)}
        </label>
        <input
          id={inputId}
          className="input grow"
          placeholder={t(props.fieldLabel)}
          value={name}
          maxLength={60}
          onChange={(e) => setName(e.target.value)}
        />
        <button type="submit" className="btn" disabled={!name.trim()}>
          <Plus aria-hidden size={20} />
          {t(props.addLabel)}
        </button>
      </form>
    </section>
  );
}
