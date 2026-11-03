import { useState } from 'react';
import { NavLink, Outlet, useLocation } from 'react-router-dom';
import { LogOut, Menu, Moon, SunMedium, X } from 'lucide-react';
import { navFor } from './nav';
import { useAuth } from '@/lib/auth';
import { useTheme } from '@/lib/theme';
import { ConnectionBanner } from './ConnectionBanner';

export function Layout() {
  const { profile, signOut } = useAuth();
  const { theme, toggle } = useTheme();
  const [moreOpen, setMoreOpen] = useState(false);
  const location = useLocation();
  const items = navFor(profile?.role === 'beheerder');
  const tabItems = items.filter((i) => i.inTabbar);
  const moreItems = items.filter((i) => !i.inTabbar);
  const moreActive = moreItems.some((i) => location.pathname.startsWith(i.to));

  return (
    <div className="shell">
      <a className="skip-link" href="#main">
        Naar de inhoud
      </a>

      <aside className="sidebar" aria-label="Hoofdnavigatie">
        <div className="brand display">Art of Faith</div>
        <nav>
          {items.map(({ to, label, icon: Icon }) => (
            <NavLink key={to} to={to} end={to === '/'} className="nav-link">
              <Icon aria-hidden size={22} />
              <span>{label}</span>
            </NavLink>
          ))}
        </nav>
        <div className="sidebar-foot">
          <div className="muted small">{profile?.full_name}</div>
          <button type="button" className="btn btn-ghost" onClick={toggle}>
            {theme === 'dark' ? (
              <SunMedium aria-hidden size={20} />
            ) : (
              <Moon aria-hidden size={20} />
            )}
            {theme === 'dark' ? 'Licht thema' : 'Donker thema'}
          </button>
          <button type="button" className="btn btn-ghost" onClick={() => void signOut()}>
            <LogOut aria-hidden size={20} />
            Afmelden
          </button>
        </div>
      </aside>

      <div className="content">
        <ConnectionBanner />
        <main id="main" tabIndex={-1}>
          <Outlet />
        </main>
      </div>

      <nav className="tabbar" aria-label="Hoofdnavigatie">
        {tabItems.map(({ to, label, icon: Icon }) => (
          <NavLink key={to} to={to} end={to === '/'} className="tab-link">
            <Icon aria-hidden size={24} />
            <span>{label}</span>
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
          <span>Meer</span>
        </button>
      </nav>

      {moreOpen && (
        <div id="more-sheet" className="more-sheet" role="dialog" aria-label="Meer">
          {moreItems.map(({ to, label, icon: Icon }) => (
            <NavLink key={to} to={to} className="nav-link" onClick={() => setMoreOpen(false)}>
              <Icon aria-hidden size={22} />
              <span>{label}</span>
            </NavLink>
          ))}
          <button type="button" className="nav-link" onClick={toggle}>
            {theme === 'dark' ? (
              <SunMedium aria-hidden size={22} />
            ) : (
              <Moon aria-hidden size={22} />
            )}
            <span>{theme === 'dark' ? 'Licht thema' : 'Donker thema'}</span>
          </button>
          <button type="button" className="nav-link" onClick={() => void signOut()}>
            <LogOut aria-hidden size={22} />
            <span>Afmelden</span>
          </button>
        </div>
      )}
    </div>
  );
}
