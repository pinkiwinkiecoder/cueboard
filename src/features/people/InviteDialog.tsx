import { useState, type FormEvent } from 'react';
import { Mail, MessageCircle } from 'lucide-react';
import { Dialog } from '@/app/Dialog';
import { useDepartments } from '@/lib/refdata';
import { invitePerson } from '@/lib/invite';
import { useT } from '@/lib/usePrefs';
import { ROLES, type Role } from '@/lib/types';
import { ShareLink } from './ShareLink';

const EMPTY = { full_name: '', email: '', phone: '', department_id: '', role: 'crew' as Role };

export function InviteDialog(props: { open: boolean; onClose: () => void; onDone: () => void }) {
  const { t, errText } = useT();
  const departments = useDepartments();
  const [form, setForm] = useState(EMPTY);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<unknown>(null);
  const [result, setResult] = useState<{ name: string; link: string | null } | null>(null);

  function close() {
    setForm(EMPTY);
    setError(null);
    setResult(null);
    props.onClose();
  }

  async function submit(e: FormEvent, sendEmail: boolean) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const res = await invitePerson({
        full_name: form.full_name,
        email: form.email,
        phone: form.phone || null,
        department_id: form.department_id || null,
        role: form.role,
        send_email: sendEmail,
      });
      setResult({ name: form.full_name, link: res.link });
      props.onDone();
    } catch (err) {
      setError(err);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog
      open={props.open}
      title={t(result ? 'people.invitedTitle' : 'people.add')}
      onClose={close}
    >
      {result ? (
        <>
          {result.link ? (
            <ShareLink name={result.name} link={result.link} />
          ) : (
            <div className="alert alert-success">
              {t('people.emailSent', { name: result.name })}
            </div>
          )}
          <button type="button" className="btn" onClick={close}>
            {t('common.done')}
          </button>
        </>
      ) : (
        <form onSubmit={(e) => void submit(e, false)} noValidate>
          {error !== null && (
            <div className="alert alert-error" role="alert">
              {errText(error)}
            </div>
          )}
          <div className="field">
            <label htmlFor="inv-name">{t('people.name')}</label>
            <input
              id="inv-name"
              required
              autoComplete="off"
              value={form.full_name}
              onChange={(e) => setForm({ ...form, full_name: e.target.value })}
            />
          </div>
          <div className="grid-2">
            <div className="field">
              <label htmlFor="inv-email">{t('people.email')}</label>
              <input
                id="inv-email"
                type="email"
                inputMode="email"
                required
                autoComplete="off"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
              />
            </div>
            <div className="field">
              <label htmlFor="inv-phone">
                {t('people.phone')} {t('common.optional')}
              </label>
              <input
                id="inv-phone"
                type="tel"
                inputMode="tel"
                autoComplete="off"
                placeholder="+32 470 12 34 56"
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
              />
            </div>
            <div className="field">
              <label htmlFor="inv-dept">{t('people.department')}</label>
              <select
                id="inv-dept"
                value={form.department_id}
                onChange={(e) => setForm({ ...form, department_id: e.target.value })}
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
              <label htmlFor="inv-role">{t('people.role')}</label>
              <select
                id="inv-role"
                value={form.role}
                onChange={(e) => setForm({ ...form, role: e.target.value as Role })}
              >
                {ROLES.map((r) => (
                  <option key={r} value={r}>
                    {t(`roles.${r}`)}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <p className="hint">{t('people.linkVsEmail')}</p>
          <div className="row">
            <button type="submit" className="btn btn-primary" disabled={busy}>
              <MessageCircle aria-hidden size={20} />
              {busy ? t('common.busy') : t('people.makeLink')}
            </button>
            <button
              type="button"
              className="btn"
              disabled={busy}
              onClick={(e) => void submit(e, true)}
            >
              <Mail aria-hidden size={20} />
              {t('people.sendEmail')}
            </button>
          </div>
        </form>
      )}
    </Dialog>
  );
}
