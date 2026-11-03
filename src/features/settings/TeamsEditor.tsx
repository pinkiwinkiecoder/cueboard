import { useState, type FormEvent } from 'react';
import { Check, CornerDownRight, Pencil, Plus, Trash2, Users, X } from 'lucide-react';
import { ColorPicker } from '@/app/ColorPicker';
import { EmptyState } from '@/app/EmptyState';
import { supabase } from '@/lib/supabase';
import { dbError } from '@/lib/query';
import { teamTree, useDepartments, useMemberships, type Department } from '@/lib/refdata';
import { useT } from '@/lib/usePrefs';
import { PALETTE, type PaletteColor } from '@/lib/permissions';

interface Edit {
  id: string;
  name: string;
  color: PaletteColor;
  parent_id: string | null;
}

/** Teams als boom: hoofdteams met subteams, ledentelling, hernoemen en kleur. */
export function TeamsEditor() {
  const { t, errText } = useT();
  const depts = useDepartments();
  const members = useMemberships();
  const [newTop, setNewTop] = useState('');
  const [newSub, setNewSub] = useState<{ parent: string; name: string } | null>(null);
  const [editing, setEditing] = useState<Edit | null>(null);
  const [error, setError] = useState<unknown>(null);
  const all = depts.data ?? [];
  const tree = teamTree(all);
  const countFor = (id: string) =>
    (members.data ?? []).filter((m) => m.department_id === id).length;

  async function run(op: PromiseLike<{ error: { message: string; code?: string } | null }>) {
    setError(null);
    const { error: err } = await op;
    if (err) {
      setError(dbError(err));
      return false;
    }
    void depts.reload();
    return true;
  }

  const nextOrder = () => Math.max(0, ...all.map((d) => d.sort_order)) + 1;

  async function addTop(e: FormEvent) {
    e.preventDefault();
    if (!newTop.trim()) return;
    const color = PALETTE[tree.length % PALETTE.length] ?? 'violet';
    if (
      await run(
        supabase
          .from('departments')
          .insert({ name: newTop.trim(), color, sort_order: nextOrder() }),
      )
    )
      setNewTop('');
  }

  async function addSub(e: FormEvent) {
    e.preventDefault();
    if (!newSub?.name.trim()) return;
    const parent = all.find((d) => d.id === newSub.parent);
    if (
      await run(
        supabase.from('departments').insert({
          name: newSub.name.trim(),
          parent_id: newSub.parent,
          color: parent?.color ?? 'violet',
          sort_order: nextOrder(),
        }),
      )
    )
      setNewSub(null);
  }

  async function save(e: FormEvent) {
    e.preventDefault();
    if (!editing?.name.trim()) return;
    if (
      await run(
        supabase
          .from('departments')
          .update({ name: editing.name.trim(), color: editing.color, parent_id: editing.parent_id })
          .eq('id', editing.id),
      )
    )
      setEditing(null);
  }

  async function remove(d: Department) {
    if (!window.confirm(t('settings.confirmDelete', { name: d.name }))) return;
    await run(supabase.from('departments').delete().eq('id', d.id));
  }

  function row(d: Department, isChild: boolean, hasChildren: boolean) {
    if (editing?.id === d.id) {
      return (
        <li key={d.id} className="list-item" data-color={editing.color}>
          <form className="stack grow" onSubmit={(e) => void save(e)}>
            <div className="row">
              <input
                className="input grow"
                aria-label={t('settings.departmentName')}
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
            {!hasChildren && (
              <label className="field" style={{ margin: 0 }}>
                <span className="label">{t('teams.parent')}</span>
                <select
                  className="input"
                  value={editing.parent_id ?? ''}
                  onChange={(e) => setEditing({ ...editing, parent_id: e.target.value || null })}
                >
                  <option value="">{t('teams.topLevel')}</option>
                  {tree
                    .filter(({ team }) => team.id !== d.id)
                    .map(({ team }) => (
                      <option key={team.id} value={team.id}>
                        {team.name}
                      </option>
                    ))}
                </select>
              </label>
            )}
            <ColorPicker
              value={editing.color}
              onChange={(c) => setEditing({ ...editing, color: c })}
            />
          </form>
        </li>
      );
    }
    return (
      <li key={d.id} className={`list-item${isChild ? ' team-child' : ''}`} data-color={d.color}>
        {isChild ? (
          <CornerDownRight aria-hidden size={18} className="muted" />
        ) : (
          <span className="bubble" aria-hidden>
            <Users size={18} />
          </span>
        )}
        <span className="grow">
          <span className="title" style={{ display: 'block' }}>
            {d.name}
          </span>
          <span className="sub">{t('teams.members', { n: countFor(d.id) })}</span>
        </span>
        {!isChild && (
          <button
            type="button"
            className="btn btn-sm btn-ghost"
            onClick={() => setNewSub({ parent: d.id, name: '' })}
          >
            <Plus aria-hidden size={18} />
            {t('teams.addSub')}
          </button>
        )}
        <button
          type="button"
          className="icon-btn"
          aria-label={`${t('common.edit')}: ${d.name}`}
          onClick={() =>
            setEditing({ id: d.id, name: d.name, color: d.color, parent_id: d.parent_id })
          }
        >
          <Pencil aria-hidden size={20} />
        </button>
        <button
          type="button"
          className="icon-btn"
          aria-label={`${t('common.delete')}: ${d.name}`}
          onClick={() => void remove(d)}
        >
          <Trash2 aria-hidden size={20} />
        </button>
      </li>
    );
  }

  return (
    <section className="stack" aria-labelledby="h-teams">
      <div>
        <h2 id="h-teams" style={{ margin: 0 }}>
          {t('teams.title')}
        </h2>
        <p className="sub" style={{ margin: '2px 0 0' }}>
          {t('teams.hint')}
        </p>
      </div>
      {error !== null && (
        <div className="alert alert-error" role="alert">
          {errText(error)}
        </div>
      )}
      {depts.data && tree.length === 0 && (
        <EmptyState icon={Users} color="sky" title={t('teams.emptyTitle')}>
          <p>{t('teams.emptyHint')}</p>
        </EmptyState>
      )}
      {tree.map(({ team, children }) => (
        <div key={team.id} className="card team-card" data-color={team.color}>
          <ul className="list">
            {row(team, false, children.length > 0)}
            {children.map((c) => row(c, true, false))}
            {newSub?.parent === team.id && (
              <li className="list-item team-child">
                <form className="row grow" onSubmit={(e) => void addSub(e)}>
                  <CornerDownRight aria-hidden size={18} className="muted" />
                  <input
                    className="input grow"
                    aria-label={t('teams.subName')}
                    placeholder={t('teams.subName')}
                    maxLength={60}
                    autoFocus
                    value={newSub.name}
                    onChange={(e) => setNewSub({ ...newSub, name: e.target.value })}
                  />
                  <button type="submit" className="btn btn-sm" disabled={!newSub.name.trim()}>
                    <Plus aria-hidden size={18} />
                    {t('common.add')}
                  </button>
                  <button
                    type="button"
                    className="icon-btn"
                    aria-label={t('common.cancel')}
                    onClick={() => setNewSub(null)}
                  >
                    <X aria-hidden size={20} />
                  </button>
                </form>
              </li>
            )}
          </ul>
        </div>
      ))}
      <form className="row" onSubmit={(e) => void addTop(e)}>
        <input
          className="input grow"
          aria-label={t('settings.departmentName')}
          placeholder={t('settings.departmentName')}
          value={newTop}
          maxLength={60}
          onChange={(e) => setNewTop(e.target.value)}
        />
        <button type="submit" className="btn" disabled={!newTop.trim()}>
          <Plus aria-hidden size={20} />
          {t('teams.add')}
        </button>
      </form>
    </section>
  );
}
