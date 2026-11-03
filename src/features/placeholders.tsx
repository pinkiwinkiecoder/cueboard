import { NAV_ITEMS } from '@/app/nav';
import { EmptyState } from '@/app/EmptyState';
import { useT } from '@/lib/usePrefs';
import type { MsgKey } from '@/i18n';

// Temporary screens. Each one is replaced in a later phase.
const COMING: Record<string, MsgKey> = {
  '/schedule': 'placeholder.schedule',
  '/artists': 'placeholder.artists',
  '/documents': 'placeholder.documents',
  '/issues': 'placeholder.issues',
  '/dashboard': 'placeholder.dashboard',
};

export function PlaceholderPage({ path }: { path: string }) {
  const item = NAV_ITEMS.find((i) => i.to === path);
  const { t } = useT();
  const text = COMING[path];
  if (!item || !text) return null;
  const Icon = item.icon;
  return (
    <div className="stack">
      <div className="page-head">
        <span className="bubble bubble-lg" data-color={item.color} aria-hidden>
          <Icon size={24} />
        </span>
        <h1>{t(item.label)}</h1>
      </div>
      <EmptyState icon={item.icon} color={item.color} title={t('common.comingSoon')}>
        <p>{t(text)}</p>
      </EmptyState>
    </div>
  );
}
