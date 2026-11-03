import { isDemo } from '@/lib/demoMode';
import { CloudOff, ServerCrash } from 'lucide-react';
import { useConnection } from '@/lib/connection';
import { useT } from '@/lib/usePrefs';

export function ConnectionBanner() {
  const state = useConnection();
  const { t } = useT();
  if (state === 'live' || isDemo()) return null;

  if (state === 'offline') {
    return (
      <div className="banner" role="status">
        <CloudOff aria-hidden size={20} />
        {t('connection.offline')}
      </div>
    );
  }
  return (
    <div className="banner banner-error" role="alert">
      <ServerCrash aria-hidden size={20} />
      {t('connection.serverDown')}
    </div>
  );
}
