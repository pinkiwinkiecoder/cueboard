import { useState } from 'react';
import { Link } from 'react-router-dom';
import { BellRing, Check, Megaphone, X } from 'lucide-react';
import { markAnnouncement, useAnnouncements } from '@/lib/announcements';
import { useT } from '@/lib/usePrefs';

/**
 * Bovenaan elk scherm: dringende mededelingen die je nog moet bevestigen,
 * en een korte melding als er net iets nieuws binnenkomt.
 */
export function AnnouncementAlerts() {
  const { t, errText } = useT();
  const { pendingAck, fresh, dismissFresh, reload } = useAnnouncements();
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<unknown>(null);
  const urgent = pendingAck[0];

  async function ack(id: string) {
    setBusy(id);
    setError(null);
    try {
      await markAnnouncement(id, true);
      await reload();
    } catch (e) {
      setError(e);
    } finally {
      setBusy(null);
    }
  }

  return (
    <>
      {urgent && (
        <div className="urgent-banner" role="alert" data-color="rose">
          <span className="bubble" aria-hidden>
            <BellRing size={20} />
          </span>
          <div className="grow">
            <strong>{urgent.title}</strong>
            {urgent.body && <p className="pre">{urgent.body}</p>}
            {error !== null && <p className="sub">{errText(error)}</p>}
            {pendingAck.length > 1 && (
              <p className="sub">{t('announcements.moreUrgent', { n: pendingAck.length - 1 })}</p>
            )}
          </div>
          <button
            type="button"
            className="btn btn-primary"
            disabled={busy === urgent.id}
            onClick={() => void ack(urgent.id)}
          >
            <Check aria-hidden size={20} />
            {t('announcements.gotIt')}
          </button>
        </div>
      )}
      {fresh && !(urgent && urgent.id === fresh.id) && (
        <div className="toast" role="status" data-color={fresh.color}>
          <span className="bubble" aria-hidden>
            <Megaphone size={20} />
          </span>
          <Link to="/mededelingen" className="grow toast-link" onClick={dismissFresh}>
            <span className="sub">{t('announcements.newOne')}</span>
            <strong>{fresh.title}</strong>
          </Link>
          <button
            type="button"
            className="icon-btn"
            aria-label={t('common.close')}
            onClick={dismissFresh}
          >
            <X aria-hidden size={20} />
          </button>
        </div>
      )}
    </>
  );
}
