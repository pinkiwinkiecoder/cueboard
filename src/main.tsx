import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import '@fontsource-variable/bricolage-grotesque';
import '@fontsource-variable/figtree';
import './styles/tokens.css';
import './styles/base.css';
import './styles/layout.css';
import { App } from './app/App';
import { AuthProvider } from './lib/auth';
import { ErrorBoundary } from './app/ErrorBoundary';
import { registerSW } from 'virtual:pwa-register';

registerSW({ immediate: true });

const root = document.getElementById('root');
if (!root) throw new Error('#root ontbreekt in index.html');

createRoot(root).render(
  <StrictMode>
    <ErrorBoundary>
      <BrowserRouter>
        <AuthProvider>
          <App />
        </AuthProvider>
      </BrowserRouter>
    </ErrorBoundary>
  </StrictMode>,
);
