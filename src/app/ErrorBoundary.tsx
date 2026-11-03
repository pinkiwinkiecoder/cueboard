import { Component, type ErrorInfo, type ReactNode } from 'react';

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
    return (
      <div className="auth-page">
        <div className="auth-card panel" role="alert">
          <h1>Er ging iets mis</h1>
          <p>
            Dit scherm kon niet getoond worden. Je gegevens zijn niet verloren. Herlaad de app.
            Blijft het misgaan, meld het dan aan de beheerder.
          </p>
          <button className="btn btn-primary btn-block" onClick={() => window.location.reload()}>
            App herladen
          </button>
        </div>
      </div>
    );
  }
}
