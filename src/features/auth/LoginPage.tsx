import { useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { LogIn } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/auth';

export function LoginPage() {
  const { problem } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
        <div className="brand-big display">Art of Faith</div>
        <h1>Inloggen</h1>
        {problem && <div className="alert alert-warning">{problem}</div>}
        {error && (
          <div className="alert alert-error" role="alert">
            {error}
          </div>
        )}
        <div className="field">
          <label htmlFor="email">E-mailadres</label>
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
          <label htmlFor="password">Wachtwoord</label>
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
          {busy ? 'Bezig met inloggen…' : 'Inloggen'}
        </button>
        <p>
          <Link to="/wachtwoord-vergeten">Wachtwoord vergeten?</Link>
        </p>
        <p className="muted small">
          Nog geen account? Je krijgt een uitnodiging van de beheerder via e-mail of WhatsApp.{' '}
          <Link to="/privacy">Privacyverklaring</Link>
        </p>
      </form>
    </div>
  );
}

function loginError(message: string, status?: number): string {
  if (status === 429) return 'Te veel pogingen. Wacht een paar minuten en probeer opnieuw.';
  if (/invalid login credentials/i.test(message))
    return 'E-mailadres of wachtwoord klopt niet. Controleer beide en probeer opnieuw.';
  if (/fetch|network/i.test(message))
    return 'Geen verbinding met de server. Controleer je internet of probeer later opnieuw.';
  return 'Inloggen lukte niet. Probeer opnieuw of vraag de beheerder om hulp.';
}
