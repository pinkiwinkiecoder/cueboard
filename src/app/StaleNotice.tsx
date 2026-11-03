import { History } from 'lucide-react';
import { formatTime } from '@/lib/time';
import { useT } from '@/lib/usePrefs';

/** Klein label als we oude (opgeslagen) gegevens tonen. */
export function StaleNotice({
  fromCache,
  fetchedAt,
}: {
  fromCache: boolean;
  fetchedAt: number | null;
}) {
  const { t, locale } = useT();
  if (!fromCache || !fetchedAt) return null;
  return (
    <p className="hint" role="status">
      <History aria-hidden size={16} />
      {t('common.cachedData', { time: formatTime(new Date(fetchedAt), locale) })}
    </p>
  );
}
