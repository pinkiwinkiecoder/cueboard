import { lazy, type ReactElement, type ReactNode } from 'react';
import { Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { useAuth } from '@/lib/auth';
import { useEvent } from '@/lib/refdata';
import { configMissing } from '@/lib/supabase';
import { useT } from '@/lib/usePrefs';
import { NAV_ITEMS, visibleNav, type NavItem } from './nav';
import { Layout } from './Layout';
import { PlaceholderPage } from '@/features/placeholders';
import { LoginPage } from '@/features/auth/LoginPage';
import { ForgotPasswordPage } from '@/features/auth/ForgotPasswordPage';
import { SetPasswordPage } from '@/features/auth/SetPasswordPage';
import { PrivacyPage } from '@/features/auth/PrivacyPage';

// Grotere schermen pas laden als je ze opent: de eerste lading blijft klein.
const AppearancePage = lazy(() =>
  import('@/features/me/AppearancePage').then((m) => ({ default: m.AppearancePage })),
);
const PeoplePage = lazy(() =>
  import('@/features/people/PeoplePage').then((m) => ({ default: m.PeoplePage })),
);
const SettingsPage = lazy(() =>
  import('@/features/settings/SettingsPage').then((m) => ({ default: m.SettingsPage })),
);
const TasksPage = lazy(() =>
  import('@/features/tasks/TasksPage').then((m) => ({ default: m.TasksPage })),
);
const TodayPage = lazy(() =>
  import('@/features/today/TodayPage').then((m) => ({ default: m.TodayPage })),
);

/** Echte schermen; de rest toont voorlopig een "in opbouw"-scherm. */
const PAGES: Record<string, ReactElement> = {
  '/': <TodayPage />,
  '/taken': <TasksPage />,
  '/mensen': <PeoplePage />,
  '/instellingen': <SettingsPage />,
};

function RequireAuth({ children }: { children: ReactNode }) {
  const { session, profile, loading } = useAuth();
  const { t } = useT();
  const location = useLocation();
  if (loading) return <div className="auth-page">{t('app.loading')}</div>;
  if (!session || !profile) return <Navigate to="/inloggen" replace state={{ from: location }} />;
  return children;
}

/** Wie een onderdeel niet mag zien (rol of module uit), gaat terug naar Vandaag. */
function RequireNav({ item, children }: { item: NavItem; children: ReactNode }) {
  const { can, isAdmin } = useAuth();
  const event = useEvent();
  if (!event.data) return children; // nog aan het laden: RLS beschermt de data toch
  const allowed = visibleNav(can, event.data.modules, isAdmin).includes(item);
  return allowed ? children : <Navigate to="/" replace />;
}

export function App() {
  const { session, profile, recovery } = useAuth();
  const { t } = useT();

  if (configMissing) {
    return (
      <div className="auth-page">
        <div className="auth-card panel" role="alert">
          <h1>{t('app.notConfiguredTitle')}</h1>
          <p>{t('app.notConfiguredBody')}</p>
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
              <RequireNav item={item}>
                {PAGES[item.to] ?? <PlaceholderPage path={item.to} />}
              </RequireNav>
            }
          />
        ))}
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
