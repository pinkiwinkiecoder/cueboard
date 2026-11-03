import { useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { Mail } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useT } from '@/lib/usePrefs';

export function ForgotPasswordPage() {
  const { t } = useT();
  const [email, setEmail] = useState('');
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);
  const [tooMany, setTooMany] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setTooMany(false);
    const { error: err } = await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: `${window.location.origin}/nieuw-wachtwoord`,
    });
    setBusy(false);
    if (err && err.status === 429) return setTooMany(true);
    // Altijd dezelfde melding, zodat niemand kan uitzoeken welke adressen bestaan.
    setSent(true);
  }

  return (
    <div className="auth-page">
      <form className="auth-card panel" onSubmit={onSubmit} noValidate>
        <h1>{t('auth.forgotTitle')}</h1>
        {sent ? (
          <div className="alert alert-success" role="status">
            {t('auth.resetSent')}
          </div>
        ) : (
          <>
            {tooMany && (
              <div className="alert alert-error" role="alert">
                {t('auth.resetTooMany')}
              </div>
            )}
            <div className="field">
              <label htmlFor="email">{t('auth.email')}</label>
              <input
                id="email"
                type="email"
                autoComplete="username"
                inputMode="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <button className="btn btn-primary btn-block" type="submit" disabled={busy}>
              <Mail aria-hidden size={20} />
              {busy ? t('common.busy') : t('auth.sendReset')}
            </button>
          </>
        )}
        <p>
          <Link to="/inloggen">{t('auth.backToSignIn')}</Link>
        </p>
      </form>
    </div>
  );
}
