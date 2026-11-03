import { useState } from 'react';
import { Check, Copy, MessageCircle } from 'lucide-react';
import { whatsappUrl } from '@/lib/invite';
import { useT } from '@/lib/usePrefs';
import { useEvent } from '@/lib/refdata';

/** Shows a one-time link with buttons to copy it or share it via WhatsApp. */
export function ShareLink({ name, link }: { name: string; link: string }) {
  const { t } = useT();
  const event = useEvent();
  const [copied, setCopied] = useState(false);
  const message = t('people.whatsappText', {
    first: name.split(' ')[0] ?? name,
    event: event.data?.name ?? 'Cueboard',
    link,
  });

  async function copy() {
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2500);
    } catch {
      window.prompt(t('people.copyPrompt'), link);
    }
  }

  return (
    <div className="stack">
      <div className="alert alert-success">{t('people.linkReady', { name })}</div>
      <div className="row">
        <a className="btn btn-primary" href={whatsappUrl(message)} target="_blank" rel="noreferrer">
          <MessageCircle aria-hidden size={20} />
          {t('people.shareWhatsapp')}
        </a>
        <button type="button" className="btn" onClick={() => void copy()}>
          {copied ? <Check aria-hidden size={20} /> : <Copy aria-hidden size={20} />}
          {t(copied ? 'people.copied' : 'people.copyLink')}
        </button>
      </div>
    </div>
  );
}
