import { Suspense, useEffect, useState } from 'react';
import { NavLink, Outlet, useLocation } from 'react-router-dom';
import { LifeBuoy, LogOut, Menu, Moon, Palette, SunMedium, X } from 'lucide-react';
import { APP_NAME, EventLogo } from '@/lib/branding';
import { visibleNav } from './nav';
import { useAuth } from '@/lib/auth';
import { useEvent } from '@/lib/refdata';
import { usePrefs } from '@/lib/usePrefs';
import { ConnectionBanner } from './ConnectionBanner';
import { TopBar } from './TopBar';
import { Avatar } from './Avatar';
import { AnnouncementAlerts } from './AnnouncementAlerts';
import { useAnnouncements } from '@/lib/announcements';

export function Layout() {
  const { profile, access, can, isAdmin, signOut } = useAuth();
  const event = useEvent();
  const { unread } = useAnnouncements();
  const badge = (to: string) =>
    to === '/mededelingen' && unread > 0 ? (
      <span className="count-badge" aria-label={t('announcements.unread', { n: unread })}>
        {unread > 9 ? '9+' : unread}
      </span>
    ) : null;
  const { prefs, toggleTheme, backgroundUrl, t } = usePrefs();
  const [moreOpen, setMoreOpen] = useState(false);
  const location = useLocation();
  const items = visibleNav(can, event.data?.modules, isAdmin);
  // Tabbalk: max. 4 vaste onderdelen + "Meer".
  const tabItems = items.filter((i) => i.inTabbar).slice(0, 4);
  const moreItems = items.filter((i) => !tabItems.includes(i));
  const moreActive =
    location.pathname === '/weergave' || moreItems.some((i) => location.pathname.startsWith(i.to));
  const ThemeIcon = prefs.theme === 'dark' ? SunMedium : Moon;
  const themeLabel = t(prefs.theme === 'dark' ? 'nav.lightTheme' : 'nav.darkTheme');
  const eventName = event.data?.name ?? t('app.name');
  useEffect(() => {
    document.title = event.data?.name ? `${event.data.name} · ${APP_NAME}` : APP_NAME;
  }, [event.data?.name]);

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
        <div className="brand">
          <EventLogo path={event.data?.logo_path} size={44} alt="" />
          <span className="grow">
            <span className="brand-name">{eventName}</span>
            <span className="brand-app">{APP_NAME}</span>
          </span>
        </div>
        <nav>
          {items.map(({ to, label, icon: Icon, color }) => (
            <NavLink key={to} to={to} end={to === '/'} className="nav-link">
              <span className="bubble" data-color={color} aria-hidden>
                <Icon size={20} />
              </span>
              <span className="grow">{t(label)}</span>
              {badge(to)}
            </NavLink>
          ))}
        </nav>
        <div className="sidebar-foot">
          {profile && (
            <div className="me-card">
              <Avatar name={profile.full_name} />
              <span className="grow">
                <span className="title" style={{ display: 'block' }}>
                  {profile.full_name}
                </span>
                <span className="sub">{access?.role_name}</span>
              </span>
            </div>
          )}
          <NavLink to="/help" className="nav-link">
            <span className="bubble" data-color="gold" aria-hidden>
              <LifeBuoy size={20} />
            </span>
            <span>{t('nav.help')}</span>
          </NavLink>
          <NavLink to="/weergave" className="nav-link">
            <span className="bubble" data-color="violet" aria-hidden>
              <Palette size={20} />
            </span>
            <span>{t('nav.appearance')}</span>
          </NavLink>
          <button type="button" className="nav-link" onClick={toggleTheme}>
            <span className="bubble" data-color="sky" aria-hidden>
              <ThemeIcon size={20} />
            </span>
            <span>{themeLabel}</span>
          </button>
          <button type="button" className="nav-link" onClick={() => void signOut()}>
            <span className="bubble" data-color="rose" aria-hidden>
              <LogOut size={20} />
            </span>
            <span>{t('nav.signOut')}</span>
          </button>
        </div>
      </aside>

      <div className="content">
        <TopBar />
        <ConnectionBanner />
        <AnnouncementAlerts />
        <main id="main" tabIndex={-1}>
          <Suspense fallback={<p className="muted">{t('app.loading')}</p>}>
            <Outlet />
          </Suspense>
        </main>
      </div>

      <nav className="tabbar" aria-label={t('nav.mainNav')}>
        {tabItems.map(({ to, label, icon: Icon, color }) => (
          <NavLink key={to} to={to} end={to === '/'} className="tab-link" data-color={color}>
            <span className="tab-icon" aria-hidden>
              <Icon size={22} />
            </span>
            {badge(to)}
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
          <span className="tab-icon" aria-hidden>
            {moreOpen ? <X size={22} /> : <Menu size={22} />}
          </span>
          <span>{t('nav.more')}</span>
        </button>
      </nav>

      {moreOpen && (
        <div id="more-sheet" className="more-sheet" role="dialog" aria-label={t('nav.more')}>
          {moreItems.map(({ to, label, icon: Icon, color }) => (
            <NavLink key={to} to={to} className="nav-link" onClick={() => setMoreOpen(false)}>
              <span className="bubble" data-color={color} aria-hidden>
                <Icon size={20} />
              </span>
              <span>{t(label)}</span>
            </NavLink>
          ))}
          <NavLink to="/help" className="nav-link" onClick={() => setMoreOpen(false)}>
            <span className="bubble" data-color="gold" aria-hidden>
              <LifeBuoy size={20} />
            </span>
            <span>{t('nav.help')}</span>
          </NavLink>
          <NavLink to="/weergave" className="nav-link" onClick={() => setMoreOpen(false)}>
            <span className="bubble" data-color="violet" aria-hidden>
              <Palette size={20} />
            </span>
            <span>{t('nav.appearance')}</span>
          </NavLink>
          <button type="button" className="nav-link" onClick={toggleTheme}>
            <span className="bubble" data-color="sky" aria-hidden>
              <ThemeIcon size={20} />
            </span>
            <span>{themeLabel}</span>
          </button>
          <button type="button" className="nav-link" onClick={() => void signOut()}>
            <span className="bubble" data-color="rose" aria-hidden>
              <LogOut size={20} />
            </span>
            <span>{t('nav.signOut')}</span>
          </button>
        </div>
      )}
    </div>
  );
}
