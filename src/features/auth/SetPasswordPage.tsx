import { useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { KeyRound } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/auth';
import { MIN_PASSWORD_LENGTH, passwordProblem } from '@/lib/password';

/** Gebruikt na een uitnodigingslink én na een resetlink. */
export function SetPasswordPage() {
  const { session, loading } = useAuth();
  const navigate = useNavigate();
  const [pw, setPw] = useState('');
  const [pw2, setPw2] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (loading) return <div className="auth-page">Bezig met laden…</div>;

  if (!session) {
    return (
      <div className="auth-page">
        <div className="auth-card panel">
          <h1>Link verlopen of al gebruikt</h1>
          <p>
            Deze link werkt niet (meer). Links zijn eenmalig en een beperkte tijd geldig. Vraag de
            beheerder om een nieuwe uitnodiging, of vraag zelf een nieuwe resetlink aan.
          </p>
          <Link className="btn btn-primary btn-block" to="/wachtwoord-vergeten">
            Nieuwe resetlink aanvragen
          </Link>
        </div>
      </div>
    );
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    const problem = passwordProblem(pw);
    if (problem) return setError(problem);
    if (pw !== pw2) return setError('De twee wachtwoorden zijn niet gelijk.');
    setBusy(true);
    setError(null);
    const { error: err } = await supabase.auth.updateUser({ password: pw });
    setBusy(false);
    if (err) {
      setError(
        /weak|pwned|length/i.test(err.message)
          ? 'Dit wachtwoord is te zwak. Kies een langer wachtwoord met hoofdletters en cijfers.'
          : 'Opslaan lukte niet. Controleer je verbinding en probeer opnieuw.',
      );
      return;
    }
    navigate('/', { replace: true });
  }

  return (
    <div className="auth-page">
      <form className="auth-card panel" onSubmit={onSubmit} noValidate>
        <h1>Kies je wachtwoord</h1>
        <p className="muted">Account: {session.user.email}</p>
        {error && (
          <div className="alert alert-error" role="alert">
            {error}
          </div>
        )}
        <div className="field">
          <label htmlFor="pw">Nieuw wachtwoord</label>
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
            Minstens {MIN_PASSWORD_LENGTH} tekens, met hoofdletters, kleine letters en een cijfer.
          </span>
        </div>
        <div className="field">
          <label htmlFor="pw2">Herhaal wachtwoord</label>
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
          {busy ? 'Bezig met opslaan…' : 'Wachtwoord opslaan'}
        </button>
      </form>
    </div>
  );
}
