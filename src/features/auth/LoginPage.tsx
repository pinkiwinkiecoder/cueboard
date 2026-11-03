import { useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { LogIn } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/auth';
import { useT } from '@/lib/usePrefs';
import type { MsgKey } from '@/i18n';
import { LanguagePicker } from '@/features/me/LanguagePicker';
import { APP_NAME, EventLogo, useBranding } from '@/lib/branding';

export function LoginPage() {
  const { problem } = useAuth();
  const { t } = useT();
  const branding = useBranding();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<MsgKey | null>(null);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const { error: err } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });
    setBusy(false);
    if (err) setError(loginError(err.message, err.status));
  }

  return (
    <div className="auth-page">
      <form className="auth-card panel" onSubmit={onSubmit} noValidate>
        <div className="row" style={{ justifyContent: 'flex-end' }}>
          <LanguagePicker compact />
        </div>
        <div className="login-brand">
          <EventLogo
            path={branding.data?.logo_path}
            size={96}
            alt={branding.data ? t('settings.logoAlt', { name: branding.data.name }) : APP_NAME}
          />
          {branding.data?.name && <div className="brand-big display">{branding.data.name}</div>}
          <p className="sub" style={{ margin: 0 }}>
            {t('auth.signInTo', { app: APP_NAME })}
          </p>
        </div>
        {problem && <div className="alert alert-warning">{t(problem)}</div>}
        {error && (
          <div className="alert alert-error" role="alert">
            {t(error)}
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
        <div className="field">
          <label htmlFor="password">{t('auth.password')}</label>
          <input
            id="password"
            type="password"
            autoComplete="current-password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </div>
        <button className="btn btn-primary btn-block" type="submit" disabled={busy}>
          <LogIn aria-hidden size={20} />
          {busy ? t('auth.signingIn') : t('auth.signIn')}
        </button>
        <p>
          <Link to="/wachtwoord-vergeten">{t('auth.forgotLink')}</Link>
        </p>
        <p className="muted small">
          {t('auth.noAccount')} <Link to="/privacy">{t('auth.privacyLink')}</Link>
        </p>
      </form>
    </div>
  );
}

function loginError(message: string, status?: number): MsgKey {
  if (status === 429) return 'auth.errTooMany';
  if (/invalid login credentials/i.test(message)) return 'auth.errInvalid';
  if (/fetch|network/i.test(message)) return 'auth.errNetwork';
  return 'auth.errGeneric';
}
