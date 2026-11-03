import { useT } from '@/lib/usePrefs';
import { PublicLayout } from '@/features/public/PublicLayout';

export function PrivacyPage() {
  const { t } = useT();
  return (
    <PublicLayout title={t('privacy.title')}>
      <article className="public-article">
        <h1>{t('privacy.title')}</h1>
        <p className="lead">{t('privacy.p1')}</p>
        <p>{t('privacy.p2')}</p>
        <p>{t('privacy.p3')}</p>
      </article>
    </PublicLayout>
  );
}
