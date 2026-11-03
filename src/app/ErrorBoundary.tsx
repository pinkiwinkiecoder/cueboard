import { Component, type ErrorInfo, type ReactNode } from 'react';
import { translate } from '@/i18n';
import { loadPrefs } from '@/lib/prefs';

interface State {
  failed: boolean;
}

/** Vangt elke fout op zodat er nooit een witte pagina verschijnt. */
export class ErrorBoundary extends Component<{ children: ReactNode }, State> {
  override state: State = { failed: false };

  static getDerivedStateFromError(): State {
    return { failed: true };
  }

  override componentDidCatch(error: Error, info: ErrorInfo) {
    // Geen persoonsgegevens loggen: enkel de foutnaam en de plaats.
    console.error(error.name, info.componentStack?.split('\n')[1]?.trim());
  }

  override render() {
    if (!this.state.failed) return this.props.children;
    // Buiten de providers: taal rechtstreeks uit de opgeslagen voorkeuren.
    const { lang } = loadPrefs();
    return (
      <div className="auth-page">
        <div className="auth-card panel" role="alert">
          <h1>{translate(lang, 'errors.boundaryTitle')}</h1>
          <p>{translate(lang, 'errors.boundaryBody')}</p>
          <button className="btn btn-primary btn-block" onClick={() => window.location.reload()}>
            {translate(lang, 'errors.reload')}
          </button>
        </div>
      </div>
    );
  }
}
