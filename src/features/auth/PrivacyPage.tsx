import { Link } from 'react-router-dom';

export function PrivacyPage() {
  return (
    <div className="auth-page">
      <article className="auth-card panel">
        <h1>Privacyverklaring</h1>
        <p>
          De Art of Faith Production Hub bewaart enkel wat nodig is om het festival te organiseren:
          je naam, afdeling, telefoonnummer en e-mailadres, plus wat je zelf in de app doet (taken,
          aftekeningen, meldingen).
        </p>
        <p>
          De gegevens staan bij Supabase in een datacenter in Frankfurt (EU). Ze worden niet gedeeld
          met derden en niet gebruikt voor reclame.
        </p>
        <p>
          Na het festival wist de beheerder alle persoonsgegevens. Wil je inzage of eerder gewist
          worden? Vraag het aan de beheerder van het festival.
        </p>
        <Link to="/">Terug</Link>
      </article>
    </div>
  );
}
