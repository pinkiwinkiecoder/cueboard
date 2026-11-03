import { useEffect, useRef, useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { KeyRound } from 'lucide-react';
import { linkError, supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/auth';
import { useT } from '@/lib/usePrefs';
import { MIN_PASSWORD_LENGTH, passwordProblem } from '@/lib/password';
import type { MsgKey } from '@/i18n';

/** ?token_hash=…&type=recovery|invite uit de e-mail, of niets. */
function readTokenHash(): { hash: string; type: 'recovery' | 'invite' | 'signup' | 'email' } | null {
  const q = new URLSearchParams(window.location.search);
  const hash = q.get('token_hash');
  const type = q.get('type');
  if (!hash || !type) return null;
  if (type !== 'recovery' && type !== 'invite' && type !== 'signup' && type !== 'email') return null;
  return { hash, type };
}

/** Gebruikt na een uitnodigingslink én na een resetlink. */
export function SetPasswordPage() {
  const { session, loading, clearRecovery } = useAuth();
  const { t } = useT();
  const navigate = useNavigate();
  const [pw, setPw] = useState('');
  const [pw2, setPw2] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<MsgKey | null>(null);
  // Link uit de e-mail met token_hash: de app bevestigt hem zelf (werkt ook als een
  // virusscanner de link vooraf opent, want die voert geen JavaScript uit).
  const [verifying, setVerifying] = useState(() => !!readTokenHash());
  const [, setLinkBad] = useState(!!linkError);
  const started = useRef(false);

  useEffect(() => {
    const link = readTokenHash();
    if (!link || started.current) return;
    started.current = true;
    void supabase.auth.verifyOtp({ token_hash: link.hash, type: link.type }).then(({ error: err }) => {
      window.history.replaceState(null, '', '/new-password');
      if (err) setLinkBad(true);
      setVerifying(false);
    });
  }, []);

  if (loading || verifying) return <div className="auth-page">{t('app.loading')}</div>;

  if (!session) {
    return (
      <div className="auth-page">
        <div className="auth-card panel">
          <h1>{t('auth.linkExpiredTitle')}</h1>
          <p>{t('auth.linkExpiredBody')}</p>
          <Link className="btn btn-primary btn-block" to="/forgot-password">
            {t('auth.requestNewLink')}
          </Link>
        </div>
      </div>
    );
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    const problem = passwordProblem(pw);
    if (problem) return setError(problem);
    if (pw !== pw2) return setError('auth.pwMismatch');
    setBusy(true);
    setError(null);
    const { error: err } = await supabase.auth.updateUser({ password: pw });
    setBusy(false);
    if (err) {
      setError(/weak|pwned|length/i.test(err.message) ? 'auth.pwWeak' : 'auth.pwSaveFailed');
      return;
    }
    clearRecovery();
    navigate('/', { replace: true });
  }

  return (
    <div className="auth-page">
      <form className="auth-card panel" onSubmit={onSubmit} noValidate>
        <h1>{t('auth.setTitle')}</h1>
        <p className="muted">{t('auth.account', { email: session.user.email ?? '' })}</p>
        {error && (
          <div className="alert alert-error" role="alert">
            {t(error, { min: MIN_PASSWORD_LENGTH })}
          </div>
        )}
        <div className="field">
          <label htmlFor="pw">{t('auth.newPassword')}</label>
          <input
            id="pw"
            type="password"
            autoComplete="new-password"
            required
            minLength={MIN_PASSWORD_LENGTH}
            aria-describedby="pw-hint"
            value={pw}
            onChange={(e) => setPw(e.target.value)}
          />
          <span id="pw-hint" className="hint">
            {t('auth.passwordHint', { min: MIN_PASSWORD_LENGTH })}
          </span>
        </div>
        <div className="field">
          <label htmlFor="pw2">{t('auth.repeatPassword')}</label>
          <input
            id="pw2"
            type="password"
            autoComplete="new-password"
            required
            value={pw2}
            onChange={(e) => setPw2(e.target.value)}
          />
        </div>
        <button className="btn btn-primary btn-block" type="submit" disabled={busy}>
          <KeyRound aria-hidden size={20} />
          {busy ? t('common.saving') : t('auth.savePassword')}
        </button>
      </form>
    </div>
  );
}
