import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { MonitorSmartphone } from 'lucide-react';
import { usePrefs } from '@/lib/usePrefs';
import { formatDayLong, formatTime } from '@/lib/time';

function useNow(intervalMs = 15_000): Date {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const id = window.setInterval(() => setNow(new Date()), intervalMs);
    return () => window.clearInterval(id);
  }, [intervalMs]);
  return now;
}

/** Bovenbalk: grote klok en of het scherm wakker blijft. In één oogopslag. */
export function TopBar() {
  const { prefs, wake, t, locale } = usePrefs();
  const now = useNow();
  if (!prefs.clock24InHeader && !(prefs.wakeLock && wake === 'aan')) return null;
  return (
    <div className="topbar">
      {prefs.clock24InHeader && (
        <div className="topbar-clock">
          <span className="time topbar-time">{formatTime(now, locale)}</span>
          <span className="muted">{formatDayLong(now, locale)}</span>
        </div>
      )}
      {prefs.wakeLock && wake === 'aan' && (
        <Link to="/weergave" className="chip">
          <MonitorSmartphone aria-hidden size={16} />
          {t('appearance.keepAwakeChip')}
        </Link>
      )}
    </div>
  );
}
