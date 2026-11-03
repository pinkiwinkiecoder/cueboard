import { contentLang } from '@/i18n';
import { useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import {
  ArrowLeft,
  CalendarClock,
  Info,
  ListChecks,
  Megaphone,
  MessagesSquare,
  Rocket,
  Search,
  Server,
  Smartphone,
  Users,
  type LucideIcon,
} from 'lucide-react';
import { usePrefs } from '@/lib/usePrefs';
import { discussionsUrl } from '@/config/site';
import { ARTICLES, CATEGORIES, findArticle, searchArticles, type Article } from '@/content/help';
import { PublicLayout, useTx } from './PublicLayout';
import { NotFoundPage } from './NotFoundPage';

const CAT_ICON: Record<string, LucideIcon> = {
  rocket: Rocket,
  users: Users,
  calendar: CalendarClock,
  tasks: ListChecks,
  megaphone: Megaphone,
  phone: Smartphone,
  server: Server,
};

const T = {
  title: { en: 'Help centre', nl: 'Helpcentrum' },
  subtitle: {
    en: 'Step-by-step explanations of every part of Cueboard.',
    nl: 'Stap-voor-stap uitleg over elk onderdeel van Cueboard.',
  },
  search: {
    en: 'Search, for example "import" or "radio"',
    nl: 'Zoek, bijvoorbeeld "importeren" of "portofoon"',
  },
  none: { en: 'Nothing found. Try another word.', nl: 'Niets gevonden. Probeer een ander woord.' },
  back: { en: 'All help articles', nl: 'Alle helpartikels' },
  forumTitle: { en: 'Still a question?', nl: 'Nog een vraag?' },
  forumBody: {
    en: 'Ask other stage managers and crews in the community forum, or ask your own event admin.',
    nl: 'Vraag het aan andere stage managers en crews in het community-forum, of aan de beheerder van je evenement.',
  },
  forumNoLink: {
    en: 'Ask the admin of your event. They can change roles, teams and settings.',
    nl: 'Vraag het aan de beheerder van je evenement. Die kan rollen, teams en instellingen aanpassen.',
  },
  forumButton: { en: 'Open the forum', nl: 'Naar het forum' },
  related: { en: 'More in this topic', nl: 'Meer over dit onderwerp' },
  audience: {
    everyone: { en: 'For everyone', nl: 'Voor iedereen' },
    managers: { en: 'For people who manage', nl: 'Voor wie beheert' },
    admins: { en: 'For admins', nl: 'Voor beheerders' },
  },
};

function ForumCard() {
  const tx = useTx();
  return (
    <aside className="card row" data-color="peach">
      <span className="bubble bubble-lg" aria-hidden>
        <MessagesSquare size={24} />
      </span>
      <div className="grow">
        <h2 style={{ margin: 0 }}>{tx(T.forumTitle)}</h2>
        <p className="sub" style={{ margin: '2px 0 0' }}>
          {tx(discussionsUrl() ? T.forumBody : T.forumNoLink)}
        </p>
      </div>
      {discussionsUrl() && (
        <a href={discussionsUrl()} className="btn btn-primary" target="_blank" rel="noreferrer">
          {tx(T.forumButton)}
        </a>
      )}
    </aside>
  );
}

function ArticleCard({ a }: { a: Article }) {
  const tx = useTx();
  const cat = CATEGORIES.find((c) => c.id === a.category);
  return (
    <Link to={`/help/${a.slug}`} className="card link-card help-card" data-color={cat?.color}>
      <strong>{tx(a.title)}</strong>
      <span className="sub">{tx(a.summary)}</span>
    </Link>
  );
}

export function HelpIndexPage() {
  const tx = useTx();
  const { prefs } = usePrefs();
  const [q, setQ] = useState('');
  const results = useMemo(() => searchArticles(q, contentLang(prefs.lang)), [q, prefs.lang]);

  return (
    <PublicLayout title={tx(T.title)}>
      <div className="public-article wide stack">
        <div>
          <h1>{tx(T.title)}</h1>
          <p className="lead" style={{ margin: 0 }}>
            {tx(T.subtitle)}
          </p>
        </div>
        <div className="search">
          <Search aria-hidden size={20} />
          <label htmlFor="help-search" className="visually-hidden">
            {tx(T.search)}
          </label>
          <input
            id="help-search"
            type="search"
            placeholder={tx(T.search)}
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
        </div>

        {q.trim() ? (
          results.length === 0 ? (
            <p className="muted">{tx(T.none)}</p>
          ) : (
            <div className="cards">
              {results.map((a) => (
                <ArticleCard key={a.slug} a={a} />
              ))}
            </div>
          )
        ) : (
          CATEGORIES.map((c) => {
            const Icon = CAT_ICON[c.icon] ?? Info;
            return (
              <section key={c.id} className="stack-sm" aria-labelledby={`hc-${c.id}`}>
                <h2 id={`hc-${c.id}`} className="row" style={{ margin: 0 }}>
                  <span className="bubble" data-color={c.color} aria-hidden>
                    <Icon size={20} />
                  </span>
                  {tx(c.title)}
                </h2>
                <div className="cards">
                  {ARTICLES.filter((a) => a.category === c.id).map((a) => (
                    <ArticleCard key={a.slug} a={a} />
                  ))}
                </div>
              </section>
            );
          })
        )}
        <ForumCard />
      </div>
    </PublicLayout>
  );
}

export function HelpArticlePage() {
  const tx = useTx();
  const { slug = '' } = useParams();
  const a = findArticle(slug);
  if (!a) return <NotFoundPage />;
  const cat = CATEGORIES.find((c) => c.id === a.category);
  const related = ARTICLES.filter((x) => x.category === a.category && x.slug !== a.slug);

  return (
    <PublicLayout title={tx(a.title)}>
      <article className="public-article help-article stack">
        <Link to="/help" className="row back-link">
          <ArrowLeft aria-hidden size={18} /> {tx(T.back)}
        </Link>
        <div>
          <div className="row">
            {cat && (
              <span className="badge" data-color={cat.color}>
                {tx(cat.title)}
              </span>
            )}
            <span className="badge">{tx(T.audience[a.audience])}</span>
          </div>
          <h1 style={{ marginTop: 'var(--space-3)' }}>{tx(a.title)}</h1>
          <p className="lead" style={{ margin: 0 }}>
            {tx(a.summary)}
          </p>
        </div>
        {a.blocks.map((b, i) => {
          switch (b.type) {
            case 'p':
              return <p key={i}>{tx(b.text)}</p>;
            case 'h':
              return <h2 key={i}>{tx(b.text)}</h2>;
            case 'steps':
              return (
                <ol key={i} className="help-steps">
                  {b.items.map((it) => (
                    <li key={it.en}>{tx(it)}</li>
                  ))}
                </ol>
              );
            case 'list':
              return (
                <ul key={i} className="help-list">
                  {b.items.map((it) => (
                    <li key={it.en}>{tx(it)}</li>
                  ))}
                </ul>
              );
            case 'tip':
              return (
                <div key={i} className="help-tip" data-color="gold">
                  <Info aria-hidden size={20} />
                  <p style={{ margin: 0 }}>{tx(b.text)}</p>
                </div>
              );
          }
        })}
        {related.length > 0 && (
          <section className="stack-sm">
            <h2>{tx(T.related)}</h2>
            <div className="cards">
              {related.map((r) => (
                <ArticleCard key={r.slug} a={r} />
              ))}
            </div>
          </section>
        )}
        <ForumCard />
      </article>
    </PublicLayout>
  );
}
