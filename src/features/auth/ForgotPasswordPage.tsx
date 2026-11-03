import { useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { Mail } from 'lucide-react';
import { supabase } from '@/lib/supabase';

export function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const { error: err } = await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: `${window.location.origin}/nieuw-wachtwoord`,
    });
    setBusy(false);
    if (err && err.status === 429) {
      setError('Te veel aanvragen. Wacht een uur of vraag de beheerder om een nieuwe link.');
      return;
    }
    // Altijd dezelfde melding, zodat niemand kan uitzoeken welke adressen bestaan.
    setSent(true);
  }

  return (
    <div className="auth-page">
      <form className="auth-card panel" onSubmit={onSubmit} noValidate>
        <h1>Wachtwoord vergeten</h1>
        {sent ? (
          <div className="alert alert-success" role="status">
            Als dit adres bij ons bekend is, krijg je binnen enkele minuten een e-mail met een link.
            Kijk ook in je spammap. Niets ontvangen? Vraag de beheerder om een link via WhatsApp.
          </div>
        ) : (
          <>
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
            <button className="btn btn-primary btn-block" type="submit" disabled={busy}>
              <Mail aria-hidden size={20} />
              {busy ? 'Bezig…' : 'Stuur resetlink'}
            </button>
          </>
        )}
        <p>
          <Link to="/inloggen">Terug naar inloggen</Link>
        </p>
      </form>
    </div>
  );
}
