import { FlaskConical, LogOut } from 'lucide-react';
import { exitDemo, isDemo } from '@/lib/demoMode';
import { useT } from '@/lib/usePrefs';

/** Altijd zichtbaar in de demo, zodat niemand denkt dat het echte gegevens zijn. */
export function DemoBanner() {
  const { t } = useT();
  if (!isDemo()) return null;
  return (
    <div className="demo-banner" role="status">
      <FlaskConical aria-hidden size={18} />
      <span className="grow">{t('demo.banner')}</span>
      <button type="button" className="btn btn-sm" onClick={exitDemo}>
        <LogOut aria-hidden size={16} />
        {t('demo.exit')}
      </button>
    </div>
  );
}
