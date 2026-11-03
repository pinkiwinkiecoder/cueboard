import { Github, MessagesSquare } from 'lucide-react';
import { SITE, discussionsUrl, issuesUrl } from '@/config/site';
import { ABOUT, LANDING } from '@/content/landing';
import { PublicLayout, useTx } from './PublicLayout';

export function AboutPage() {
  const tx = useTx();
  const creator = SITE.creator.url ? (
    <a href={SITE.creator.url} target="_blank" rel="noreferrer">
      {SITE.creator.name}
    </a>
  ) : (
    SITE.creator.name
  );
  const [before, after] = tx(ABOUT.intro).split('{name}');

  return (
    <PublicLayout title={tx(ABOUT.title)}>
      <article className="public-article">
        <h1>{tx(ABOUT.title)}</h1>
        <p className="lead">
          {before}
          {creator}
          {after}
        </p>
        {ABOUT.sections.map((s) => (
          <section key={s.title.en}>
            <h2>{tx(s.title)}</h2>
            <p>{tx(s.body)}</p>
          </section>
        ))}
        {(SITE.repoUrl || discussionsUrl()) && (
          <div className="row">
            {discussionsUrl() && (
              <a
                href={discussionsUrl()}
                className="btn btn-primary"
                target="_blank"
                rel="noreferrer"
              >
                <MessagesSquare aria-hidden size={18} /> {tx(LANDING.footer.forum)}
              </a>
            )}
            {issuesUrl() && (
              <a href={issuesUrl()} className="btn" target="_blank" rel="noreferrer">
                <Github aria-hidden size={18} /> GitHub
              </a>
            )}
          </div>
        )}
        <p className="story-sign">— {SITE.creator.name}</p>
      </article>
    </PublicLayout>
  );
}
