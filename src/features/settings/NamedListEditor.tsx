import { useState, type FormEvent } from 'react';
import { ArrowDown, ArrowUp, Check, Pencil, Plus, Trash2, X } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { dbError } from '@/lib/query';
import { useT } from '@/lib/usePrefs';
import type { MsgKey } from '@/i18n';

interface Row {
  id: string;
  name: string;
  sort_order: number;
}

/** Editor for a simple ordered list of names (stages, departments). */
export function NamedListEditor(props: {
  table: 'stages' | 'departments';
  rows: Row[] | undefined;
  title: MsgKey;
  fieldLabel: MsgKey;
  addLabel: MsgKey;
  onChanged: () => void;
}) {
  const { t, errText } = useT();
  const [name, setName] = useState('');
  const [editing, setEditing] = useState<{ id: string; name: string } | null>(null);
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
    if (await run(supabase.from(props.table).insert({ name: clean, sort_order: next })))
      setName('');
  }

  async function rename(e: FormEvent) {
    e.preventDefault();
    if (!editing?.name.trim()) return;
    if (
      await run(
        supabase.from(props.table).update({ name: editing.name.trim() }).eq('id', editing.id),
      )
    )
      setEditing(null);
  }

  async function move(index: number, dir: -1 | 1) {
    const a = rows[index];
    const b = rows[index + dir];
    if (!a || !b) return;
    // Wissel de volgorde; twee kleine updates zijn genoeg voor een handvol rijen.
    await run(supabase.from(props.table).update({ sort_order: b.sort_order }).eq('id', a.id));
    await run(supabase.from(props.table).update({ sort_order: a.sort_order }).eq('id', b.id));
  }

  async function remove(row: Row) {
    if (!window.confirm(t('settings.confirmDelete', { name: row.name }))) return;
    await run(supabase.from(props.table).delete().eq('id', row.id));
  }

  const inputId = `${props.table}-new`;
  return (
    <section className="panel stack" aria-labelledby={`h-${props.table}`}>
      <h2 id={`h-${props.table}`}>{t(props.title)}</h2>
      {error !== null && (
        <div className="alert alert-error" role="alert">
          {errText(error)}
        </div>
      )}
      <ul className="list">
        {rows.map((row, i) => (
          <li key={row.id} className="list-item">
            {editing?.id === row.id ? (
              <form className="row grow" onSubmit={(e) => void rename(e)}>
                <label className="visually-hidden" htmlFor={`edit-${row.id}`}>
                  {t(props.fieldLabel)}
                </label>
                <input
                  id={`edit-${row.id}`}
                  className="input grow"
                  value={editing.name}
                  autoFocus
                  onChange={(e) => setEditing({ id: row.id, name: e.target.value })}
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
              </form>
            ) : (
              <>
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
                  aria-label={`${t('common.rename')}: ${row.name}`}
                  onClick={() => setEditing({ id: row.id, name: row.name })}
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
