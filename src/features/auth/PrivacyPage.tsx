import { Link } from 'react-router-dom';
import { useT } from '@/lib/usePrefs';

export function PrivacyPage() {
  const { t } = useT();
  return (
    <div className="auth-page">
      <article className="auth-card panel">
        <h1>{t('privacy.title')}</h1>
        <p>{t('privacy.p1')}</p>
        <p>{t('privacy.p2')}</p>
        <p>{t('privacy.p3')}</p>
        <Link to="/">{t('privacy.back')}</Link>
      </article>
    </div>
  );
}
