import { useEffect, type ReactNode } from 'react';
import { Link, NavLink } from 'react-router-dom';
import { ArrowRight, Github, MessagesSquare } from 'lucide-react';
import { APP_LOGO } from '@/lib/branding';
import { useAuth } from '@/lib/auth';
import { usePrefs } from '@/lib/usePrefs';
import { LanguagePicker } from '@/features/me/LanguagePicker';
import { SITE, discussionsUrl } from '@/config/site';
import { LANDING, type Text } from '@/content/landing';

/** Tekst in de gekozen taal, met {name} ingevuld. */
export function useTx() {
  const { prefs } = usePrefs();
  return (t: Text, vars: Record<string, string> = {}) =>
    t[prefs.lang].replace(/\{(\w+)\}/g, (m, k: string) => vars[k] ?? m);
}

export function PublicLayout(props: { title?: string; children: ReactNode }) {
  const tx = useTx();
  const { session, profile } = useAuth();
  const signedIn = !!session && !!profile;

  useEffect(() => {
    document.title = props.title ? `${props.title} · ${SITE.name}` : SITE.name;
  }, [props.title]);

  return (
    <div className="public">
      <a className="skip-link" href="#public-main">
        Skip to content
      </a>
      <header className="public-header">
        <Link to="/" className="public-brand">
          <img src={APP_LOGO} alt="" width={36} height={36} />
          <span>{SITE.name}</span>
        </Link>
        <nav className="public-nav" aria-label={SITE.name}>
          <NavLink to="/help">{tx(LANDING.nav.help)}</NavLink>
          <NavLink to="/about">{tx(LANDING.nav.about)}</NavLink>
        </nav>
        <span className="spacer" />
        <LanguagePicker compact />
        <Link to={signedIn ? '/' : '/sign-in'} className="btn btn-primary btn-sm">
          {tx(signedIn ? LANDING.nav.openApp : LANDING.nav.signIn)}
          <ArrowRight aria-hidden size={16} />
        </Link>
      </header>

      <main id="public-main" tabIndex={-1}>
        {props.children}
      </main>

      <footer className="public-footer">
        <div className="public-brand">
          <img src={APP_LOGO} alt="" width={28} height={28} />
          <span>{SITE.name}</span>
        </div>
        <p className="sub" style={{ margin: 0 }}>
          {tx(LANDING.footer.madeBy, { name: SITE.creator.name })} · © {SITE.year} ·{' '}
          {tx(LANDING.footer.license, { license: SITE.license })}
        </p>
        <nav className="row" aria-label="Footer">
          <Link to="/help">{tx(LANDING.nav.help)}</Link>
          <Link to="/about">{tx(LANDING.nav.about)}</Link>
          <Link to="/privacy">{tx(LANDING.footer.privacy)}</Link>
          {SITE.repoUrl && (
            <a href={SITE.repoUrl} target="_blank" rel="noreferrer">
              <Github aria-hidden size={16} /> {tx(LANDING.footer.code)}
            </a>
          )}
          {discussionsUrl() && (
            <a href={discussionsUrl()} target="_blank" rel="noreferrer">
              <MessagesSquare aria-hidden size={16} /> {tx(LANDING.footer.forum)}
            </a>
          )}
        </nav>
      </footer>
    </div>
  );
}
