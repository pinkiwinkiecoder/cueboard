import { Suspense, useState } from 'react';
import { NavLink, Outlet, useLocation } from 'react-router-dom';
import { LogOut, Menu, Moon, Palette, SunMedium, X } from 'lucide-react';
import { navFor } from './nav';
import { useAuth } from '@/lib/auth';
import { usePrefs } from '@/lib/usePrefs';
import { ConnectionBanner } from './ConnectionBanner';
import { TopBar } from './TopBar';

export function Layout() {
  const { profile, signOut } = useAuth();
  const { prefs, toggleTheme, backgroundUrl, t } = usePrefs();
  const [moreOpen, setMoreOpen] = useState(false);
  const location = useLocation();
  const items = navFor(profile?.role === 'beheerder');
  const tabItems = items.filter((i) => i.inTabbar);
  const moreItems = items.filter((i) => !i.inTabbar);
  const moreActive =
    location.pathname === '/weergave' || moreItems.some((i) => location.pathname.startsWith(i.to));
  const ThemeIcon = prefs.theme === 'dark' ? SunMedium : Moon;
  const themeLabel = t(prefs.theme === 'dark' ? 'nav.lightTheme' : 'nav.darkTheme');

  return (
    <div className="shell">
      {backgroundUrl && (
        <div
          className="bg-photo"
          aria-hidden
          style={{ backgroundImage: `url(${backgroundUrl})` }}
        />
      )}
      <a className="skip-link" href="#main">
        {t('app.skipToContent')}
      </a>

      <aside className="sidebar" aria-label={t('nav.mainNav')}>
        <div className="brand display">{t('app.name')}</div>
        <nav>
          {items.map(({ to, label, icon: Icon }) => (
            <NavLink key={to} to={to} end={to === '/'} className="nav-link">
              <Icon aria-hidden size={22} />
              <span>{t(label)}</span>
            </NavLink>
          ))}
        </nav>
        <div className="sidebar-foot">
          <div className="muted small">{profile?.full_name}</div>
          <NavLink to="/weergave" className="nav-link">
            <Palette aria-hidden size={20} />
            <span>{t('nav.appearance')}</span>
          </NavLink>
          <button type="button" className="nav-link" onClick={toggleTheme}>
            <ThemeIcon aria-hidden size={20} />
            <span>{themeLabel}</span>
          </button>
          <button type="button" className="nav-link" onClick={() => void signOut()}>
            <LogOut aria-hidden size={20} />
            <span>{t('nav.signOut')}</span>
          </button>
        </div>
      </aside>

      <div className="content">
        <TopBar />
        <ConnectionBanner />
        <main id="main" tabIndex={-1}>
          <Suspense fallback={<p className="muted">{t('app.loading')}</p>}>
            <Outlet />
          </Suspense>
        </main>
      </div>

      <nav className="tabbar" aria-label={t('nav.mainNav')}>
        {tabItems.map(({ to, label, icon: Icon }) => (
          <NavLink key={to} to={to} end={to === '/'} className="tab-link">
            <Icon aria-hidden size={24} />
            <span>{t(label)}</span>
          </NavLink>
        ))}
        <button
          type="button"
          className={`tab-link${moreActive ? ' active' : ''}`}
          aria-expanded={moreOpen}
          aria-controls="more-sheet"
          onClick={() => setMoreOpen((v) => !v)}
        >
          {moreOpen ? <X aria-hidden size={24} /> : <Menu aria-hidden size={24} />}
          <span>{t('nav.more')}</span>
        </button>
      </nav>

      {moreOpen && (
        <div id="more-sheet" className="more-sheet" role="dialog" aria-label={t('nav.more')}>
          {moreItems.map(({ to, label, icon: Icon }) => (
            <NavLink key={to} to={to} className="nav-link" onClick={() => setMoreOpen(false)}>
              <Icon aria-hidden size={22} />
              <span>{t(label)}</span>
            </NavLink>
          ))}
          <NavLink to="/weergave" className="nav-link" onClick={() => setMoreOpen(false)}>
            <Palette aria-hidden size={22} />
            <span>{t('nav.appearance')}</span>
          </NavLink>
          <button type="button" className="nav-link" onClick={toggleTheme}>
            <ThemeIcon aria-hidden size={22} />
            <span>{themeLabel}</span>
          </button>
          <button type="button" className="nav-link" onClick={() => void signOut()}>
            <LogOut aria-hidden size={22} />
            <span>{t('nav.signOut')}</span>
          </button>
        </div>
      )}
    </div>
  );
}
