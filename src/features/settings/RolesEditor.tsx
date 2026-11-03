import { useState } from 'react';
import { Crown, Pencil, Plus, ShieldCheck, Star, Trash2 } from 'lucide-react';
import { Dialog } from '@/app/Dialog';
import { ColorPicker } from '@/app/ColorPicker';
import { useAuth } from '@/lib/auth';
import { usePeople, useRoles } from '@/lib/refdata';
import { dbError } from '@/lib/query';
import { supabase } from '@/lib/supabase';
import { useT } from '@/lib/usePrefs';
import { PERMISSION_GROUPS, permKey, type PaletteColor, type Permission } from '@/lib/permissions';
import type { RoleRow } from '@/lib/types';
import type { MsgKey } from '@/i18n';

interface Draft {
  id: string | null;
  name: string;
  description: string;
  color: PaletteColor;
  permissions: Permission[];
  is_admin: boolean;
  is_default: boolean;
}

const EMPTY: Draft = {
  id: null,
  name: '',
  description: '',
  color: 'violet',
  permissions: ['view.schedule', 'view.tasks', 'view.people'],
  is_admin: false,
  is_default: false,
};

/** Rollen maken en per rol aanvinken wat ze zien en mogen. Enkel voor de beheerder. */
export function RolesEditor() {
  const { t, errText } = useT();
  const { isAdmin } = useAuth();
  const roles = useRoles();
  const people = usePeople();
  const [draft, setDraft] = useState<Draft | null>(null);
  const [error, setError] = useState<unknown>(null);
  const [busy, setBusy] = useState(false);

  const countFor = (roleId: string) =>
    (people.data ?? []).filter((p) => p.role_id === roleId && p.active).length;

  function edit(r: RoleRow) {
    setError(null);
    setDraft({
      id: r.id,
      name: r.name,
      description: r.description ?? '',
      color: r.color,
      permissions: [...r.permissions],
      is_admin: r.is_admin,
      is_default: r.is_default,
    });
  }

  async function save() {
    if (!draft || !draft.name.trim()) return;
    setBusy(true);
    setError(null);
    const row = {
      name: draft.name.trim(),
      description: draft.description.trim() || null,
      color: draft.color,
      permissions: draft.is_admin ? [] : draft.permissions,
    };
    // Er mag maar één standaardrol zijn: eerst de oude uitzetten.
    if (draft.is_default && !draft.is_admin) {
      await supabase.from('roles').update({ is_default: false }).eq('is_default', true);
    }
    const res = draft.id
      ? await supabase
          .from('roles')
          .update({ ...row, is_default: draft.is_default && !draft.is_admin })
          .eq('id', draft.id)
      : await supabase.from('roles').insert({
          ...row,
          is_default: draft.is_default,
          sort_order: (roles.data?.length ?? 0) + 1,
        });
    setBusy(false);
    if (res.error) return setError(dbError(res.error));
    setDraft(null);
    void roles.reload();
  }

  async function remove(r: RoleRow) {
    if (!window.confirm(t('roles.confirmDelete', { name: r.name }))) return;
    const { error: err } = await supabase.from('roles').delete().eq('id', r.id);
    if (err) setError(dbError(err));
    else void roles.reload();
  }

  function toggle(p: Permission) {
    if (!draft) return;
    const has = draft.permissions.includes(p);
    setDraft({
      ...draft,
      permissions: has ? draft.permissions.filter((x) => x !== p) : [...draft.permissions, p],
    });
  }

  return (
    <section className="stack" aria-labelledby="h-roles">
      <div className="page-head">
        <div className="grow">
          <h2 id="h-roles" style={{ margin: 0 }}>
            {t('roles.title')}
          </h2>
          <p className="sub">{t('roles.hint')}</p>
        </div>
        {isAdmin && (
          <button
            type="button"
            className="btn btn-primary"
            onClick={() => {
              setError(null);
              setDraft({ ...EMPTY });
            }}
          >
            <Plus aria-hidden size={20} />
            {t('roles.add')}
          </button>
        )}
      </div>
      {error !== null && !draft && (
        <div className="alert alert-error" role="alert">
          {errText(error)}
        </div>
      )}

      <div className="cards">
        {(roles.data ?? []).map((r) => (
          <article key={r.id} className="card stack-sm" data-color={r.color}>
            <div className="row">
              <span className="bubble" aria-hidden>
                {r.is_admin ? <Crown size={20} /> : <ShieldCheck size={20} />}
              </span>
              <span className="grow">
                <span className="title" style={{ display: 'block', fontWeight: 750 }}>
                  {r.name}
                </span>
                <span className="sub">
                  {t('common.countPeople', { n: countFor(r.id) })} ·{' '}
                  {r.is_admin
                    ? t('roles.admin')
                    : t('roles.rightsCount', { n: r.permissions.length })}
                </span>
              </span>
              {isAdmin && (
                <>
                  <button
                    type="button"
                    className="icon-btn"
                    aria-label={`${t('common.edit')}: ${r.name}`}
                    onClick={() => edit(r)}
                  >
                    <Pencil aria-hidden size={20} />
                  </button>
                  {!r.is_admin && (
                    <button
                      type="button"
                      className="icon-btn"
                      aria-label={`${t('common.delete')}: ${r.name}`}
                      onClick={() => void remove(r)}
                    >
                      <Trash2 aria-hidden size={20} />
                    </button>
                  )}
                </>
              )}
            </div>
            {r.description && (
              <p className="sub" style={{ margin: 0 }}>
                {r.description}
              </p>
            )}
            {r.is_default && (
              <span className="badge" data-color="gold">
                <Star aria-hidden size={14} /> {t('roles.isDefault')}
              </span>
            )}
          </article>
        ))}
      </div>

      <Dialog
        open={draft !== null}
        title={t(draft?.id ? 'roles.editTitle' : 'roles.newTitle')}
        onClose={() => setDraft(null)}
      >
        {draft && (
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
              <label htmlFor="r-name">{t('roles.name')}</label>
              <input
                id="r-name"
                required
                maxLength={40}
                placeholder={t('roles.namePlaceholder')}
                value={draft.name}
                onChange={(e) => setDraft({ ...draft, name: e.target.value })}
              />
            </div>
            <div className="field">
              <label htmlFor="r-desc">
                {t('roles.description')} {t('common.optional')}
              </label>
              <input
                id="r-desc"
                maxLength={200}
                value={draft.description}
                onChange={(e) => setDraft({ ...draft, description: e.target.value })}
              />
            </div>
            <div className="field">
              <span className="label">{t('common.colour')}</span>
              <ColorPicker value={draft.color} onChange={(c) => setDraft({ ...draft, color: c })} />
            </div>

            {draft.is_admin ? (
              <div className="alert alert-success">{t('roles.adminHint')}</div>
            ) : (
              <>
                <label className="switch-row" style={{ marginBottom: 'var(--space-4)' }}>
                  <span>
                    <strong>{t('roles.makeDefault')}</strong>
                  </span>
                  <input
                    type="checkbox"
                    role="switch"
                    checked={draft.is_default}
                    onChange={(e) => setDraft({ ...draft, is_default: e.target.checked })}
                  />
                </label>
                {PERMISSION_GROUPS.map((group) => (
                  <fieldset
                    key={group.id}
                    className="card"
                    style={{ marginBottom: 'var(--space-4)' }}
                  >
                    <legend className="label" style={{ fontWeight: 750, padding: '0 6px' }}>
                      {t(group.id === 'see' ? 'roles.see' : 'roles.manage')}
                    </legend>
                    {group.keys.map((p) => (
                      <label key={p} className="perm-row">
                        <span>
                          <strong>{t(`perms.${permKey(p)}` as MsgKey)}</strong>
                          <span className="sub">{t(`perms.${permKey(p)}_hint` as MsgKey)}</span>
                        </span>
                        <input
                          type="checkbox"
                          role="switch"
                          className="switch"
                          checked={draft.permissions.includes(p)}
                          onChange={() => toggle(p)}
                        />
                      </label>
                    ))}
                  </fieldset>
                ))}
              </>
            )}
            <div className="row">
              <button
                type="submit"
                className="btn btn-primary"
                disabled={busy || !draft.name.trim()}
              >
                {busy ? t('common.saving') : t('common.save')}
              </button>
              <button type="button" className="btn" onClick={() => setDraft(null)}>
                {t('common.cancel')}
              </button>
            </div>
          </form>
        )}
      </Dialog>
    </section>
  );
}
