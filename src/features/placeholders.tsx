import { NAV_ITEMS } from '@/app/nav';
import { EmptyState } from '@/app/EmptyState';
import { useAuth } from '@/lib/auth';
import { useT } from '@/lib/usePrefs';
import type { MsgKey } from '@/i18n';

// Temporary screens. Each one is replaced in a later phase.
const COMING: Record<string, MsgKey> = {
  '/': 'placeholder.today',
  '/planning': 'placeholder.schedule',
  '/taken': 'placeholder.tasks',
  '/artiesten': 'placeholder.artists',
  '/documenten': 'placeholder.documents',
  '/meldingen': 'placeholder.issues',
  '/dashboard': 'placeholder.dashboard',
};

export function PlaceholderPage({ path }: { path: string }) {
  const item = NAV_ITEMS.find((i) => i.to === path);
  const { profile } = useAuth();
  const { t } = useT();
  const text = COMING[path];
  if (!item || !text) return null;
  return (
    <>
      <h1>{t(item.label)}</h1>
      {path === '/' && profile && (
        <p className="muted">
          {t('placeholder.signedInAs', {
            name: profile.full_name,
            role: t(`roles.${profile.role}`),
          })}
        </p>
      )}
      <EmptyState icon={item.icon} title={t('common.comingSoon')}>
        <p>{t(text)}</p>
      </EmptyState>
    </>
  );
}
