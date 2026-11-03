import { useState, type FormEvent } from 'react';
import {
  ArrowDown,
  ArrowUp,
  ChevronDown,
  CornerDownRight,
  Crown,
  ListPlus,
  Pencil,
  Plus,
  Search,
  Trash2,
  UserMinus,
  UserPlus,
  Users,
  X,
} from 'lucide-react';
import { Avatar } from '@/app/Avatar';
import { Dialog } from '@/app/Dialog';
import { ColorPicker } from '@/app/ColorPicker';
import { EmptyState } from '@/app/EmptyState';
import { supabase } from '@/lib/supabase';
import { dbError } from '@/lib/query';
import {
  teamTree,
  useDepartments,
  useMemberships,
  usePeople,
  type Department,
} from '@/lib/refdata';
import { useT } from '@/lib/usePrefs';
import { PALETTE, type PaletteColor } from '@/lib/permissions';

type Op = PromiseLike<{ error: { message: string; code?: string } | null }>;

interface TeamForm {
  id: string | null;
  name: string;
  description: string;
  color: PaletteColor;
  parent_id: string | null;
}

/**
 * Teams als boom: hoofdteams met subteams. Per team: beschrijving, kleur,
 * volgorde, leden met functie en teamleider. Meerdere teams tegelijk toevoegen.
 */
export function TeamsEditor() {
  const { t, errText } = useT();
  const depts = useDepartments();
  const members = useMemberships();
  const people = usePeople();
  const [form, setForm] = useState<TeamForm | null>(null);
  const [bulk, setBulk] = useState<{ parent: string | null; text: string } | null>(null);
  const [open, setOpen] = useState<Set<string>>(new Set());
  const [query, setQuery] = useState('');
  const [adding, setAdding] = useState<{ team: string; person: string; title: string; lead: boolean } | null>(
    null,
  );
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<unknown>(null);
  const all = depts.data ?? [];
  const tree = teamTree(all);
  const activePeople = (people.data ?? []).filter((p) => p.active);
  const membersOf = (id: string) => (members.data ?? []).filter((m) => m.department_id === id);
  const personName = (id: string) => people.data?.find((p) => p.id === id)?.full_name ?? '—';
  const withoutTeam = activePeople.filter(
    (p) => !(members.data ?? []).some((m) => m.profile_id === p.id),
  );
  const q = query.trim().toLowerCase();
  const matches = (d: Department) =>
    !q ||
    d.name.toLowerCase().includes(q) ||
    membersOf(d.id).some((m) => personName(m.profile_id).toLowerCase().includes(q));

  async function run(...ops: Op[]) {
    setBusy(true);
    setError(null);
    try {
      for (const op of ops) {
        const { error: err } = await op;
        if (err) throw dbError(err);
      }
      await Promise.all([depts.reload(), members.reload()]);
      return true;
    } catch (e) {
      setError(e);
      return false;
    } finally {
      setBusy(false);
    }
  }

  const nextOrder = () => Math.max(0, ...all.map((d) => d.sort_order)) + 1;
  const toggle = (id: string) =>
    setOpen((s) => {
      const n = new Set(s);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });

  async function saveForm(e: FormEvent) {
    e.preventDefault();
    if (!form?.name.trim()) return;
    const row = {
      name: form.name.trim(),
      description: form.description.trim() || null,
      color: form.color,
      parent_id: form.parent_id,
    };
    const ok = await run(
      form.id
        ? supabase.from('departments').update(row).eq('id', form.id)
        : supabase.from('departments').insert({ ...row, sort_order: nextOrder() }),
    );
    if (ok) setForm(null);
  }

  async function saveBulk(e: FormEvent) {
    e.preventDefault();
    if (!bulk) return;
    const names = [
      ...new Set(
        bulk.text
          .split(/[\n,;]/)
          .map((s) => s.trim().slice(0, 60))
          .filter(Boolean),
      ),
    ].filter((n) => !all.some((d) => d.name.toLowerCase() === n.toLowerCase()));
    if (names.length === 0) return setBulk(null);
    const parent = all.find((d) => d.id === bulk.parent);
    let order = nextOrder();
    const rows = names.map((name, i) => ({
      name,
      parent_id: bulk.parent,
      color: parent?.color ?? PALETTE[(tree.length + i) % PALETTE.length] ?? 'violet',
      sort_order: order++,
    }));
    if (await run(supabase.from('departments').insert(rows))) {
      if (bulk.parent) setOpen((s) => new Set(s).add(bulk.parent as string));
      setBulk(null);
    }
  }

  async function move(list: Department[], index: number, dir: -1 | 1) {
    const a = list[index];
    const b = list[index + dir];
    if (!a || !b) return;
    // Volgorde opnieuw nummeren, zodat gelijke waarden geen probleem zijn.
    const ordered = [...list];
    ordered[index] = b;
    ordered[index + dir] = a;
    const base = Math.min(...list.map((d) => d.sort_order));
    await run(
      ...ordered.map((d, i) =>
        supabase.from('departments').update({ sort_order: base + i }).eq('id', d.id),
      ),
    );
  }

  async function remove(d: Department, childCount: number) {
    const n = membersOf(d.id).length;
    const msg =
      t('settings.confirmDelete', { name: d.name }) +
      (n || childCount ? `\n\n${t('teams.deleteWarning', { members: n, subs: childCount })}` : '');
    if (!window.confirm(msg)) return;
    await run(supabase.from('departments').delete().eq('id', d.id));
  }

  async function addMember(e: FormEvent) {
    e.preventDefault();
    if (!adding?.person) return;
    const ok = await run(
      supabase.from('department_members').upsert({
        department_id: adding.team,
        profile_id: adding.person,
        title: adding.title.trim() || null,
        is_lead: adding.lead,
      }),
    );
    if (ok) setAdding(null);
  }

  const setMember = (team: string, person: string, patch: { title?: string | null; is_lead?: boolean }) =>
    run(
      supabase
        .from('department_members')
        .update(patch)
        .eq('department_id', team)
        .eq('profile_id', person),
    );

  const removeMember = (team: string, person: string) =>
    run(
      supabase
        .from('department_members')
        .delete()
        .eq('department_id', team)
        .eq('profile_id', person),
    );

  function teamBlock(d: Department, isChild: boolean, siblings: Department[], index: number, childCount: number) {
    const list = membersOf(d.id);
    const leads = list.filter((m) => m.is_lead);
    const isOpen = open.has(d.id);
    return (
      <li key={d.id} className={isChild ? 'team-child' : undefined} data-color={d.color}>
        <div className="list-item">
          {isChild ? (
            <CornerDownRight aria-hidden size={18} className="muted" />
          ) : (
            <span className="bubble" aria-hidden>
              <Users size={18} />
            </span>
          )}
          <button
            type="button"
            className="grow"
            style={{ background: 'none', border: 0, padding: 0, textAlign: 'start', color: 'inherit' }}
            aria-expanded={isOpen}
            onClick={() => toggle(d.id)}
          >
            <span className="title" style={{ display: 'block' }}>
              {d.name}{' '}
              <ChevronDown
                aria-hidden
                size={14}
                style={{ transform: isOpen ? 'rotate(180deg)' : undefined }}
              />
            </span>
            <span className="sub">
              {t('teams.members', { n: list.length })}
              {leads.length > 0 &&
                ` · ${t('teams.leadBadge')}: ${leads.map((m) => personName(m.profile_id)).join(', ')}`}
              {d.description ? ` · ${d.description}` : ''}
            </span>
          </button>
          <button
            type="button"
            className="icon-btn"
            aria-label={t('common.moveUp')}
            disabled={busy || index === 0}
            onClick={() => void move(siblings, index, -1)}
          >
            <ArrowUp aria-hidden size={18} />
          </button>
          <button
            type="button"
            className="icon-btn"
            aria-label={t('common.moveDown')}
            disabled={busy || index === siblings.length - 1}
            onClick={() => void move(siblings, index, 1)}
          >
            <ArrowDown aria-hidden size={18} />
          </button>
          <button
            type="button"
            className="icon-btn"
            aria-label={`${t('common.edit')}: ${d.name}`}
            onClick={() =>
              setForm({
                id: d.id,
                name: d.name,
                description: d.description ?? '',
                color: d.color,
                parent_id: d.parent_id,
              })
            }
          >
            <Pencil aria-hidden size={18} />
          </button>
          <button
            type="button"
            className="icon-btn"
            aria-label={`${t('common.delete')}: ${d.name}`}
            onClick={() => void remove(d, childCount)}
          >
            <Trash2 aria-hidden size={18} />
          </button>
        </div>

        {isOpen && (
          <div className="team-members stack-sm">
            {list.length === 0 && <p className="sub" style={{ margin: 0 }}>{t('teams.noMembers')}</p>}
            {list.map((m) => (
              <div key={m.profile_id} className="member-row row">
                <Avatar name={personName(m.profile_id)} size={32} />
                <span className="grow">
                  <span style={{ display: 'block', fontWeight: 650 }}>
                    {personName(m.profile_id)}{' '}
                    {m.is_lead && (
                      <span className="badge" data-color="gold">
                        <Crown aria-hidden size={12} /> {t('teams.leadBadge')}
                      </span>
                    )}
                  </span>
                  <input
                    className="input"
                    style={{ minHeight: 36, marginTop: 4 }}
                    aria-label={t('teams.jobTitle')}
                    placeholder={t('teams.jobTitlePlaceholder')}
                    maxLength={60}
                    defaultValue={m.title ?? ''}
                    onBlur={(e) => {
                      const v = e.target.value.trim() || null;
                      if (v !== m.title) void setMember(d.id, m.profile_id, { title: v });
                    }}
                  />
                </span>
                <button
                  type="button"
                  className="icon-btn"
                  aria-pressed={m.is_lead}
                  aria-label={t('teams.lead')}
                  title={t('teams.lead')}
                  disabled={busy}
                  onClick={() => void setMember(d.id, m.profile_id, { is_lead: !m.is_lead })}
                >
                  <Crown aria-hidden size={18} />
                </button>
                <button
                  type="button"
                  className="icon-btn"
                  aria-label={t('teams.remove')}
                  title={t('teams.remove')}
                  disabled={busy}
                  onClick={() => void removeMember(d.id, m.profile_id)}
                >
                  <UserMinus aria-hidden size={18} />
                </button>
              </div>
            ))}
            {adding?.team === d.id ? (
              <form className="stack-sm" onSubmit={(e) => void addMember(e)}>
                <div className="grid-2">
                  <select
                    className="input"
                    aria-label={t('teams.choosePerson')}
                    value={adding.person}
                    autoFocus
                    onChange={(e) => setAdding({ ...adding, person: e.target.value })}
                  >
                    <option value="">{t('teams.choosePerson')}</option>
                    {activePeople
                      .filter((p) => !list.some((m) => m.profile_id === p.id))
                      .map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.full_name}
                        </option>
                      ))}
                  </select>
                  <input
                    className="input"
                    aria-label={t('teams.jobTitle')}
                    placeholder={t('teams.jobTitlePlaceholder')}
                    maxLength={60}
                    value={adding.title}
                    onChange={(e) => setAdding({ ...adding, title: e.target.value })}
                  />
                </div>
                <div className="row">
                  <label className="row grow">
                    <input
                      type="checkbox"
                      checked={adding.lead}
                      onChange={(e) => setAdding({ ...adding, lead: e.target.checked })}
                    />
                    {t('teams.lead')}
                  </label>
                  <button type="submit" className="btn btn-sm" disabled={busy || !adding.person}>
                    <UserPlus aria-hidden size={16} />
                    {t('teams.addMember')}
                  </button>
                  <button
                    type="button"
                    className="icon-btn"
                    aria-label={t('common.cancel')}
                    onClick={() => setAdding(null)}
                  >
                    <X aria-hidden size={18} />
                  </button>
                </div>
              </form>
            ) : (
              <div className="row" style={{ flexWrap: 'wrap' }}>
                <button
                  type="button"
                  className="btn btn-sm btn-ghost"
                  onClick={() => setAdding({ team: d.id, person: '', title: '', lead: false })}
                >
                  <UserPlus aria-hidden size={16} />
                  {t('teams.addMember')}
                </button>
                {!isChild && (
                  <button
                    type="button"
                    className="btn btn-sm btn-ghost"
                    onClick={() => setBulk({ parent: d.id, text: '' })}
                  >
                    <Plus aria-hidden size={16} />
                    {t('teams.addSub')}
                  </button>
                )}
              </div>
            )}
          </div>
        )}
      </li>
    );
  }

  const subCount = all.filter((d) => d.parent_id).length;

  return (
    <section className="stack" aria-labelledby="h-teams">
      <div className="row" style={{ flexWrap: 'wrap' }}>
        <div className="grow">
          <h2 id="h-teams" style={{ margin: 0 }}>
            {t('teams.title')}
          </h2>
          <p className="sub" style={{ margin: '2px 0 0' }}>
            {t('teams.hint')}
          </p>
        </div>
        <button
          type="button"
          className="btn"
          onClick={() => setBulk({ parent: null, text: '' })}
        >
          <ListPlus aria-hidden size={18} />
          {t('teams.bulkAdd')}
        </button>
        <button
          type="button"
          className="btn btn-primary"
          onClick={() =>
            setForm({
              id: null,
              name: '',
              description: '',
              color: PALETTE[tree.length % PALETTE.length] ?? 'violet',
              parent_id: null,
            })
          }
        >
          <Plus aria-hidden size={18} />
          {t('teams.add')}
        </button>
      </div>
      {error !== null && (
        <div className="alert alert-error" role="alert">
          {errText(error)}
        </div>
      )}

      {all.length > 0 && (
        <>
          <p className="sub" style={{ margin: 0 }}>
            {t('teams.stats', { teams: tree.length, subs: subCount, without: withoutTeam.length })}
          </p>
          <label className="search">
            <Search aria-hidden size={18} />
            <input
              type="search"
              placeholder={t('teams.search')}
              aria-label={t('teams.search')}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </label>
        </>
      )}

      {depts.data && tree.length === 0 && (
        <EmptyState icon={Users} color="sky" title={t('teams.emptyTitle')}>
          <p>{t('teams.emptyHint')}</p>
        </EmptyState>
      )}
      {tree
        .filter(({ team, children }) => matches(team) || children.some(matches))
        .map(({ team, children }, i, shown) => (
          <div key={team.id} className="card team-card" data-color={team.color}>
            <ul className="list">
              {teamBlock(team, false, shown.map((x) => x.team), i, children.length)}
              {children
                .filter((c) => !q || matches(c) || matches(team))
                .map((c, ci, cs) => teamBlock(c, true, cs, ci, 0))}
            </ul>
          </div>
        ))}

      {withoutTeam.length > 0 && all.length > 0 && (
        <div className="card stack-sm" data-color="gold">
          <strong>{t('teams.withoutTeam', { n: withoutTeam.length })}</strong>
          <p className="sub" style={{ margin: 0 }}>
            {withoutTeam.map((p) => p.full_name).join(', ')}
          </p>
        </div>
      )}

      <Dialog
        open={form !== null}
        title={t(form?.id ? 'teams.editTeam' : 'teams.newTeam')}
        onClose={() => setForm(null)}
      >
        {form && (
          <form onSubmit={(e) => void saveForm(e)}>
            <div className="field">
              <label htmlFor="tm-name">{t('settings.departmentName')}</label>
              <input
                id="tm-name"
                required
                maxLength={60}
                autoFocus
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
              />
            </div>
            <div className="field">
              <label htmlFor="tm-desc">
                {t('common.description')} <span className="hint">{t('common.optional')}</span>
              </label>
              <textarea
                id="tm-desc"
                rows={2}
                maxLength={300}
                placeholder={t('teams.descriptionPlaceholder')}
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
              />
            </div>
            {!(form.id && all.some((d) => d.parent_id === form.id)) && (
              <div className="field">
                <label htmlFor="tm-parent">{t('teams.parent')}</label>
                <select
                  id="tm-parent"
                  value={form.parent_id ?? ''}
                  onChange={(e) => setForm({ ...form, parent_id: e.target.value || null })}
                >
                  <option value="">{t('teams.topLevel')}</option>
                  {tree
                    .filter(({ team }) => team.id !== form.id)
                    .map(({ team }) => (
                      <option key={team.id} value={team.id}>
                        {team.name}
                      </option>
                    ))}
                </select>
              </div>
            )}
            <div className="field">
              <span className="label">{t('common.colour')}</span>
              <ColorPicker value={form.color} onChange={(c) => setForm({ ...form, color: c })} />
            </div>
            <div className="row">
              <button type="submit" className="btn btn-primary" disabled={busy || !form.name.trim()}>
                {busy ? t('common.saving') : t('common.save')}
              </button>
              <button type="button" className="btn" onClick={() => setForm(null)}>
                {t('common.cancel')}
              </button>
            </div>
          </form>
        )}
      </Dialog>

      <Dialog
        open={bulk !== null}
        title={
          bulk?.parent
            ? t('teams.bulkSubTitle', { name: all.find((d) => d.id === bulk.parent)?.name ?? '' })
            : t('teams.bulkAdd')
        }
        onClose={() => setBulk(null)}
      >
        {bulk && (
          <form onSubmit={(e) => void saveBulk(e)}>
            <div className="field">
              <label htmlFor="tm-bulk">{t('teams.bulkLabel')}</label>
              <textarea
                id="tm-bulk"
                rows={6}
                autoFocus
                placeholder={t(bulk.parent ? 'teams.bulkSubPlaceholder' : 'teams.bulkPlaceholder')}
                value={bulk.text}
                onChange={(e) => setBulk({ ...bulk, text: e.target.value })}
              />
              <p className="hint">{t('teams.bulkHint')}</p>
            </div>
            <div className="row">
              <button type="submit" className="btn btn-primary" disabled={busy || !bulk.text.trim()}>
                <Plus aria-hidden size={18} />
                {t('common.add')}
              </button>
              <button type="button" className="btn" onClick={() => setBulk(null)}>
                {t('common.cancel')}
              </button>
            </div>
          </form>
        )}
      </Dialog>
    </section>
  );
}
