import { Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { useAuth } from '@/lib/auth';
import { configMissing } from '@/lib/supabase';
import { NAV_ITEMS } from './nav';
import { Layout } from './Layout';
import { PlaceholderPage } from '@/features/placeholders';
import { LoginPage } from '@/features/auth/LoginPage';
import { ForgotPasswordPage } from '@/features/auth/ForgotPasswordPage';
import { SetPasswordPage } from '@/features/auth/SetPasswordPage';
import { PrivacyPage } from '@/features/auth/PrivacyPage';
import { AppearancePage } from '@/features/me/AppearancePage';
import type { ReactNode } from 'react';

function RequireAuth({ children, adminOnly }: { children: ReactNode; adminOnly?: boolean }) {
  const { session, profile, loading } = useAuth();
  const location = useLocation();
  if (loading) return <div className="auth-page">Bezig met laden…</div>;
  if (!session || !profile) return <Navigate to="/inloggen" replace state={{ from: location }} />;
  if (adminOnly && profile.role !== 'beheerder') return <Navigate to="/" replace />;
  return children;
}

export function App() {
  const { session, profile, recovery } = useAuth();

  if (configMissing) {
    return (
      <div className="auth-page">
        <div className="auth-card panel" role="alert">
          <h1>App nog niet gekoppeld</h1>
          <p>
            De app weet niet met welke Supabase-server ze moet praten. Volg in de README de stap
            “Supabase koppelen” en vul VITE_SUPABASE_URL en VITE_SUPABASE_ANON_KEY in.
          </p>
        </div>
      </div>
    );
  }

  return (
    <Routes>
      <Route
        path="/inloggen"
        element={
          session && profile ? (
            <Navigate to={recovery ? '/nieuw-wachtwoord' : '/'} replace />
          ) : (
            <LoginPage />
          )
        }
      />
      <Route path="/wachtwoord-vergeten" element={<ForgotPasswordPage />} />
      <Route path="/nieuw-wachtwoord" element={<SetPasswordPage />} />
      <Route path="/privacy" element={<PrivacyPage />} />
      <Route
        element={
          <RequireAuth>
            <Layout />
          </RequireAuth>
        }
      >
        <Route path="/weergave" element={<AppearancePage />} />
        {NAV_ITEMS.map((item) => (
          <Route
            key={item.to}
            path={item.to}
            element={
              item.adminOnly ? (
                <RequireAuth adminOnly>
                  <PlaceholderPage path={item.to} />
                </RequireAuth>
              ) : (
                <PlaceholderPage path={item.to} />
              )
            }
          />
        ))}
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
