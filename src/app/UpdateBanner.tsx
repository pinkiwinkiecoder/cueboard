import { RefreshCw, X } from 'lucide-react';
import { useRegisterSW } from 'virtual:pwa-register/react';
import { translate } from '@/i18n';
import { loadPrefs } from '@/lib/prefs';

const CHECK_EVERY_MS = 30 * 60_000;

/**
 * Nieuwe versie online? Toon een melding met "Vernieuwen" in plaats van stil
 * op een oude versie te blijven. Controleert elk half uur en bij terugkeren.
 */
export function UpdateBanner() {
  const {
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    onRegisteredSW(_url, reg) {
      if (!reg) return;
      const check = () => {
        if (navigator.onLine && document.visibilityState === 'visible') void reg.update();
      };
      window.setInterval(check, CHECK_EVERY_MS);
      document.addEventListener('visibilitychange', check);
    },
  });
  if (!needRefresh) return null;
  // Buiten de PrefsProvider-afhankelijkheid: taal rechtstreeks uit de voorkeuren.
  const { lang } = loadPrefs();
  return (
    <div className="toast update-toast" role="status" data-color="violet">
      <span className="bubble" aria-hidden>
        <RefreshCw size={20} />
      </span>
      <span className="grow">
        <strong style={{ display: 'block' }}>{translate(lang, 'update.title')}</strong>
        <span className="sub">{translate(lang, 'update.body')}</span>
      </span>
      <button
        type="button"
        className="btn btn-primary btn-sm"
        onClick={() => void updateServiceWorker(true)}
      >
        {translate(lang, 'update.reload')}
      </button>
      <button
        type="button"
        className="icon-btn"
        aria-label={translate(lang, 'common.close')}
        onClick={() => setNeedRefresh(false)}
      >
        <X aria-hidden size={20} />
      </button>
    </div>
  );
}
