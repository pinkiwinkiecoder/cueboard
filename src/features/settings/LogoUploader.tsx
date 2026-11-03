import { useRef, useState, type ChangeEvent } from 'react';
import { ImagePlus, Trash2 } from 'lucide-react';
import { EventLogo, removeLogo, uploadLogo } from '@/lib/branding';
import { useT } from '@/lib/usePrefs';

export function LogoUploader(props: {
  path: string | null;
  eventName: string;
  onChanged: () => void;
}) {
  const { t, errText } = useT();
  const input = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<unknown>(null);

  async function run(fn: () => Promise<unknown>) {
    setBusy(true);
    setError(null);
    try {
      await fn();
      props.onChanged();
    } catch (e) {
      setError(e);
    } finally {
      setBusy(false);
    }
  }

  function onFile(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (file) void run(() => uploadLogo(file, props.path));
  }

  return (
    <div className="logo-uploader">
      <EventLogo
        path={props.path}
        size={88}
        alt={t('settings.logoAlt', { name: props.eventName })}
      />
      <div className="stack-sm grow">
        <strong>{t('settings.logo')}</strong>
        <span className="hint">{t('settings.logoHint')}</span>
        {error !== null && (
          <div className="alert alert-error" role="alert" style={{ margin: 0 }}>
            {errText(error)}
          </div>
        )}
        <div className="row">
          <button
            type="button"
            className="btn btn-sm"
            disabled={busy}
            onClick={() => input.current?.click()}
          >
            <ImagePlus aria-hidden size={18} />
            {busy
              ? t('common.busy')
              : t(props.path ? 'settings.replaceLogo' : 'settings.uploadLogo')}
          </button>
          {props.path && (
            <button
              type="button"
              className="btn btn-sm btn-ghost"
              disabled={busy}
              onClick={() => void run(() => removeLogo(props.path))}
            >
              <Trash2 aria-hidden size={18} />
              {t('settings.removeLogo')}
            </button>
          )}
        </div>
        <input
          ref={input}
          type="file"
          accept="image/png,image/jpeg,image/webp"
          hidden
          onChange={onFile}
        />
      </div>
    </div>
  );
}
