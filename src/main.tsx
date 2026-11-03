import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import '@fontsource-variable/bricolage-grotesque';
import '@fontsource-variable/figtree';
import './styles/tokens.css';
import './styles/base.css';
import './styles/layout.css';
import './styles/components.css';
import { App } from './app/App';
import { AuthProvider } from './lib/auth';
import { PrefsProvider } from './lib/usePrefs';
import { ErrorBoundary } from './app/ErrorBoundary';
import { UpdateBanner } from './app/UpdateBanner';
import { installErrorReporting } from './lib/system';

installErrorReporting();

const root = document.getElementById('root');
if (!root) throw new Error('#root ontbreekt in index.html');

createRoot(root).render(
  <StrictMode>
    <ErrorBoundary>
      <BrowserRouter>
        <PrefsProvider>
          <AuthProvider>
            <App />
            <UpdateBanner />
          </AuthProvider>
        </PrefsProvider>
      </BrowserRouter>
    </ErrorBoundary>
  </StrictMode>,
);
