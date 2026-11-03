import { useEffect, useState } from 'react';
import { Link2, Save, UserCheck, UserX } from 'lucide-react';
import { Dialog } from '@/app/Dialog';
import { useAuth } from '@/lib/auth';
import { useDepartments } from '@/lib/refdata';
import { newLinkFor } from '@/lib/invite';
import { dbError } from '@/lib/query';
import { supabase } from '@/lib/supabase';
import { useT } from '@/lib/usePrefs';
import { ROLES, type Profile, type Role } from '@/lib/types';
import { ShareLink } from './ShareLink';

export function PersonDialog(props: {
  person: Profile | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const { profile: me } = useAuth();
  const { t, errText } = useT();
  const departments = useDepartments();
  const p = props.person;
  const [role, setRole] = useState<Role>('crew');
  const [dept, setDept] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<unknown>(null);
  const [link, setLink] = useState<string | null>(null);

  useEffect(() => {
    if (!p) return;
    setRole(p.role);
    setDept(p.department_id ?? '');
    setError(null);
    setLink(null);
  }, [p]);

  if (!p) return null;
  const isMe = p.id === me?.id;

  async function save(active: boolean) {
    if (!p) return;
    if (
      !active &&
      p.active &&
      !window.confirm(t('people.confirmDeactivate', { name: p.full_name }))
    )
      return;
    setBusy(true);
    setError(null);
    const { error: err } = await supabase.rpc('admin_update_profile', {
      target: p.id,
      new_role: role,
      new_department: dept || null,
      new_active: active,
    });
    setBusy(false);
    if (err) return setError(dbError(err));
    props.onSaved();
    props.onClose();
  }

  async function makeLink() {
    if (!p) return;
    setBusy(true);
    setError(null);
    try {
      setLink((await newLinkFor(p.id)).link);
    } catch (e) {
      setError(e);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog open title={p.full_name} onClose={props.onClose}>
      <p className="muted">
        {p.email}
        {p.phone ? ` · ${p.phone}` : ''}
      </p>
      {error !== null && (
        <div className="alert alert-error" role="alert">
          {errText(error)}
        </div>
      )}
      <div className="grid-2">
        <div className="field">
          <label htmlFor="p-dept">{t('people.department')}</label>
          <select id="p-dept" value={dept} onChange={(e) => setDept(e.target.value)}>
            <option value="">{t('people.noDepartment')}</option>
            {(departments.data ?? []).map((d) => (
              <option key={d.id} value={d.id}>
                {d.name}
              </option>
            ))}
          </select>
        </div>
        <div className="field">
          <label htmlFor="p-role">{t('people.role')}</label>
          <select
            id="p-role"
            value={role}
            disabled={isMe}
            onChange={(e) => setRole(e.target.value as Role)}
          >
            {ROLES.map((r) => (
              <option key={r} value={r}>
                {t(`roles.${r}`)}
              </option>
            ))}
          </select>
        </div>
      </div>
      <div className="row">
        <button
          type="button"
          className="btn btn-primary"
          disabled={busy}
          onClick={() => void save(p.active)}
        >
          <Save aria-hidden size={20} />
          {t('common.save')}
        </button>
        {!isMe &&
          (p.active ? (
            <button type="button" className="btn" disabled={busy} onClick={() => void save(false)}>
              <UserX aria-hidden size={20} />
              {t('people.deactivate')}
            </button>
          ) : (
            <button type="button" className="btn" disabled={busy} onClick={() => void save(true)}>
              <UserCheck aria-hidden size={20} />
              {t('people.reactivate')}
            </button>
          ))}
      </div>
      {p.active && !isMe && (
        <section className="stack">
          <h3>{t('people.loginLink')}</h3>
          <p className="hint">{t('people.loginLinkHint')}</p>
          {link ? (
            <ShareLink name={p.full_name} link={link} />
          ) : (
            <button type="button" className="btn" disabled={busy} onClick={() => void makeLink()}>
              <Link2 aria-hidden size={20} />
              {t('people.newLink')}
            </button>
          )}
        </section>
      )}
    </Dialog>
  );
}
