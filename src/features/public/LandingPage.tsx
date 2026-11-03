import { Link } from 'react-router-dom';
import { startDemo } from '@/lib/demoMode';
import { useT } from '@/lib/usePrefs';
import {
  ArrowRight,
  BellRing,
  CalendarClock,
  Check,
  Circle,
  CircleDot,
  Clapperboard,
  FlaskConical,
  FileSpreadsheet,
  LayoutTemplate,
  ListChecks,
  Megaphone,
  MoveVertical,
  Music,
  Package,
  Pin,
  Repeat,
  Users,
  Wifi,
  type LucideIcon,
} from 'lucide-react';
import { SITE } from '@/config/site';
import { LANDING } from '@/content/landing';
import { PublicLayout, useTx } from './PublicLayout';

const FEATURE_ICON: Record<string, { icon: LucideIcon; color: string }> = {
  schedule: { icon: CalendarClock, color: 'violet' },
  shift: { icon: MoveVertical, color: 'sky' },
  showcaller: { icon: Clapperboard, color: 'pink' },
  tasks: { icon: ListChecks, color: 'mint' },
  teams: { icon: Users, color: 'teal' },
  news: { icon: Megaphone, color: 'peach' },
  templates: { icon: LayoutTemplate, color: 'gold' },
  import: { icon: FileSpreadsheet, color: 'lime' },
  offline: { icon: Wifi, color: 'rose' },
};

/** Publieke showcase: wat is Cueboard, voor wie, en hoe begin je. */
export function LandingPage() {
  const tx = useTx();
  const { t } = useT();
  const s = LANDING.showcase;

  return (
    <PublicLayout>
      <section className="hero-public">
        <p className="kicker">{tx(LANDING.hero.kicker)}</p>
        <h1>{tx(LANDING.hero.title)}</h1>
        <p className="lead">{tx(LANDING.hero.body)}</p>
        <div className="row hero-ctas">
          <button type="button" className="btn btn-primary" onClick={startDemo}>
            <FlaskConical aria-hidden size={18} />
            {t('demo.start')}
          </button>
          <Link to="/help/own-copy" className="btn">
            {tx(LANDING.hero.ctaPrimary)}
            <ArrowRight aria-hidden size={18} />
          </Link>
          <a href="#features" className="btn">
            {tx(LANDING.hero.ctaSecondary)}
          </a>
        </div>
        <p className="sub">{tx(LANDING.hero.note)}</p>
      </section>

      {/* Voorbeeldschermen: statisch, enkel ter illustratie. */}
      <section className="showcase" aria-labelledby="h-showcase">
        <div className="showcase-text">
          <h2 id="h-showcase">{tx(s.title)}</h2>
          <p className="lead">{tx(s.body)}</p>
        </div>
        <div className="showcase-grid" aria-hidden>
          <div className="mock mock-wide card" data-color="rose">
            <div className="urgent-banner" data-color="rose" style={{ margin: 0 }}>
              <span className="bubble">
                <BellRing size={18} />
              </span>
              <strong className="grow">{tx(s.urgent)}</strong>
              <span className="btn btn-primary btn-sm">
                <Check size={16} /> {tx(s.gotIt)}
              </span>
            </div>
          </div>
          <div className="mock card">
            <div className="nn-block" data-color="mint">
              <span className="nn-label">{tx(s.now)}</span>
              <div className="row">
                <span className="bubble" data-color="gold">
                  <Music size={18} />
                </span>
                <strong className="nn-title">The Lanterns</strong>
              </div>
              <span className="sub">20:00–21:00 · {tx(s.endsIn)}</span>
              <div className="progress">
                <span style={{ width: '62%' }} />
              </div>
            </div>
            <div className="nn-block" data-color="sky" style={{ marginTop: 'var(--space-2)' }}>
              <span className="nn-label">{tx(s.next)}</span>
              <div className="row">
                <span className="bubble" data-color="peach">
                  <Repeat size={18} />
                </span>
                <strong>Changeover</strong>
              </div>
              <span className="sub">21:00 · {tx(s.startsIn)}</span>
            </div>
          </div>
          <div className="mock card pinned-card" data-color="sky">
            <div className="row" style={{ alignItems: 'flex-start' }}>
              <span className="bubble">
                <Pin size={18} />
              </span>
              <div>
                <h3 style={{ margin: '6px 0 4px' }}>{tx(s.radio)}</h3>
                <p className="pre pinned-body">{tx(s.radioBody)}</p>
              </div>
            </div>
          </div>
          <div className="mock card group-card" data-color="mint">
            <div className="row">
              <span className="bubble">
                <Package size={18} />
              </span>
              <span className="grow">
                <strong style={{ display: 'block' }}>{tx(s.pkg)}</strong>
                <span className="sub">Main Stage · {tx(s.pkgProgress)}</span>
              </span>
            </div>
            <div className="progress">
              <span style={{ width: '75%' }} />
            </div>
            <ul className="task-list">
              {[
                { t: s.taskA, icon: Check, c: 'mint', done: true },
                { t: s.taskB, icon: CircleDot, c: 'gold', done: false },
                { t: s.taskC, icon: Circle, c: 'sky', done: false },
              ].map((x) => (
                <li key={x.t.en} className={`task${x.done ? ' task-done' : ''}`}>
                  <div className="task-main" style={{ minHeight: 48 }}>
                    <span className="status-btn" data-color={x.c}>
                      <x.icon size={20} strokeWidth={2.5} />
                    </span>
                    <span className="task-title">{tx(x.t)}</span>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      <section id="features" className="public-section" aria-labelledby="h-features">
        <h2 id="h-features">{tx(LANDING.features.title)}</h2>
        <div className="feature-grid">
          {LANDING.features.items.map((f) => {
            const meta = FEATURE_ICON[f.icon] ?? { icon: Circle, color: 'violet' };
            const Icon = meta.icon;
            return (
              <article key={f.icon} className="card feature" data-color={meta.color}>
                <span className="bubble bubble-lg" aria-hidden>
                  <Icon size={24} />
                </span>
                <h3>{tx(f.title)}</h3>
                <p className="sub" style={{ margin: 0 }}>
                  {tx(f.body)}
                </p>
              </article>
            );
          })}
        </div>
      </section>

      <section className="public-section" aria-labelledby="h-how">
        <h2 id="h-how">{tx(LANDING.how.title)}</h2>
        <ol className="how-steps">
          {LANDING.how.steps.map((st, i) => (
            <li key={st.title.en} className="card">
              <span className="how-num time">{i + 1}</span>
              <h3>{tx(st.title)}</h3>
              <p className="sub" style={{ margin: 0 }}>
                {tx(st.body)}
              </p>
            </li>
          ))}
        </ol>
      </section>

      <section className="public-section free" aria-labelledby="h-free">
        <div>
          <h2 id="h-free">{tx(LANDING.free.title)}</h2>
          <p className="lead">{tx(LANDING.free.body)}</p>
        </div>
        <table className="cost-table card">
          <tbody>
            {LANDING.free.rows.map((r) => (
              <tr key={r.who}>
                <td>{tx(r.what)}</td>
                <td className="sub">{r.who}</td>
                <td className="time">{r.price}</td>
              </tr>
            ))}
            <tr className="cost-total">
              <td colSpan={2}>{tx(LANDING.free.total)}</td>
              <td className="time">€0</td>
            </tr>
          </tbody>
        </table>
      </section>

      <section className="public-section story card" data-color="gold" aria-labelledby="h-story">
        <h2 id="h-story">{tx(LANDING.story.title)}</h2>
        <p className="lead">{tx(LANDING.story.body, { name: SITE.creator.name })}</p>
        <p className="story-sign">— {SITE.creator.name}</p>
        <Link to="/about" className="btn">
          {tx(LANDING.story.more)}
          <ArrowRight aria-hidden size={18} />
        </Link>
      </section>

      <section className="public-section" aria-labelledby="h-faq">
        <h2 id="h-faq">{tx(LANDING.faq.title)}</h2>
        <div className="faq">
          {LANDING.faq.items.map((f) => (
            <details key={f.q.en} className="card">
              <summary>{tx(f.q)}</summary>
              <p style={{ margin: 'var(--space-3) 0 0' }}>{tx(f.a)}</p>
            </details>
          ))}
        </div>
      </section>

      <section className="public-section cta card" data-color="violet" aria-labelledby="h-cta">
        <h2 id="h-cta">{tx(LANDING.cta.title)}</h2>
        <p className="lead">{tx(LANDING.cta.body)}</p>
        <div className="row" style={{ justifyContent: 'center' }}>
          <button type="button" className="btn" onClick={startDemo}>
            <FlaskConical aria-hidden size={18} />
            {t('demo.start')}
          </button>
          <Link to="/help/own-copy" className="btn btn-primary">
            {tx(LANDING.hero.ctaPrimary)}
            <ArrowRight aria-hidden size={18} />
          </Link>
          <Link to="/help" className="btn">
            {tx(LANDING.nav.help)}
          </Link>
        </div>
      </section>
    </PublicLayout>
  );
}
