import { Link } from 'react-router-dom';
import { Compass } from 'lucide-react';
import { PublicLayout, useTx } from './PublicLayout';

const T = {
  title: { en: 'Page not found', nl: 'Pagina niet gevonden' },
  body: {
    en: 'This page does not exist (anymore). Maybe the link is old.',
    nl: 'Deze pagina bestaat niet (meer). Misschien is de link oud.',
  },
  home: { en: 'To the start page', nl: 'Naar de startpagina' },
  help: { en: 'Help centre', nl: 'Helpcentrum' },
};

export function NotFoundPage() {
  const tx = useTx();
  return (
    <PublicLayout title={tx(T.title)}>
      <div className="public-article">
        <div className="empty">
          <span className="bubble bubble-lg" data-color="violet" aria-hidden>
            <Compass size={26} />
          </span>
          <h1 style={{ margin: 0 }}>{tx(T.title)}</h1>
          <p>{tx(T.body)}</p>
          <div className="row" style={{ justifyContent: 'center' }}>
            <Link to="/" className="btn btn-primary">
              {tx(T.home)}
            </Link>
            <Link to="/help" className="btn">
              {tx(T.help)}
            </Link>
          </div>
        </div>
      </div>
    </PublicLayout>
  );
}
