import { useRef, useState, type ChangeEvent } from 'react';
import { Check, Download, ImagePlus, Lightbulb, Trash2 } from 'lucide-react';
import { downloadJson, exportPerson } from '@/lib/system';
import { usePrefs } from '@/lib/usePrefs';
import { ACCENTS, type TextSize } from '@/lib/prefs';
import type { MsgKey } from '@/i18n';
import { LanguagePicker } from './LanguagePicker';

const TEXT_SIZES: TextSize[] = ['normaal', 'groot', 'extra'];

/** Personal appearance. Everything is stored on this device only. */
export function AppearancePage() {
  const { prefs, update, backgroundUrl, setBackground, clearBackground, wake, t } = usePrefs();
  const fileRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<MsgKey | null>(null);

  async function onFile(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    if (!file.type.startsWith('image/')) return setError('errors.photoInvalid');
    setBusy(true);
    setError(null);
    try {
      await setBackground(file);
    } catch {
      setError('errors.photoFailed');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="stack">
      <h1>{t('appearance.title')}</h1>
      <p className="muted">{t('appearance.deviceOnly')}</p>
      <section className="panel stack" aria-labelledby="h-lang">
        <h2 id="h-lang">{t('appearance.language')}</h2>
        <LanguagePicker />
      </section>
      <section className="panel stack" aria-labelledby="h-screen">
        <h2 id="h-screen">{t('appearance.screen')}</h2>
        <label className="switch-row">
          <span>
            <strong>{t('appearance.keepAwake')}</strong>
            <span className="hint">
              {t(
                wake === 'niet-ondersteund'
                  ? 'appearance.keepAwakeUnsupported'
                  : 'appearance.keepAwakeHint',
              )}
            </span>
          </span>
          <input
            type="checkbox"
            role="switch"
            checked={prefs.wakeLock}
            disabled={wake === 'niet-ondersteund'}
            onChange={(e) => update({ wakeLock: e.target.checked })}
          />
        </label>
        {prefs.wakeLock && wake === 'aan' && (
          <p className="hint">
            <Lightbulb aria-hidden size={16} /> {t('appearance.keepAwakeActive')}
          </p>
        )}
        <label className="switch-row">
          <span>
            <strong>{t('appearance.clock')}</strong>
            <span className="hint">{t('appearance.clockHint')}</span>
          </span>
          <input
            type="checkbox"
            role="switch"
            checked={prefs.clock24InHeader}
            onChange={(e) => update({ clock24InHeader: e.target.checked })}
          />
        </label>
      </section>
      <section className="panel stack" aria-labelledby="h-theme">
        <h2 id="h-theme">{t('appearance.themeAndColour')}</h2>
        <div className="segmented" role="radiogroup" aria-label={t('appearance.theme')}>
          {(['dark', 'light'] as const).map((th) => (
            <button
              key={th}
              type="button"
              role="radio"
              aria-checked={prefs.theme === th}
              className="btn"
              onClick={() => update({ theme: th })}
            >
              {t(th === 'dark' ? 'appearance.dark' : 'appearance.light')}
            </button>
          ))}
        </div>
        <div className="swatches" role="radiogroup" aria-label={t('appearance.accent')}>
          <Swatch
            label={t('appearance.accentDefault')}
            color={prefs.theme === 'dark' ? '#f0b84f' : '#4a3db5'}
            selected={prefs.accent === null}
            onSelect={() => update({ accent: null })}
          />
          {ACCENTS.map((a) => (
            <Swatch
              key={a.id}
              label={t(`appearance.accents.${a.id}` as MsgKey)}
              color={a[prefs.theme].accent}
              selected={prefs.accent === a.id}
              onSelect={() => update({ accent: a.id })}
            />
          ))}
        </div>
      </section>
      <section className="panel stack" aria-labelledby="h-bg">
        <h2 id="h-bg">{t('appearance.background')}</h2>
        <p className="hint">{t('appearance.backgroundHint')}</p>
        {error && (
          <div className="alert alert-error" role="alert">
            {t(error)}
          </div>
        )}
        {backgroundUrl && (
          <img className="bg-preview" src={backgroundUrl} alt={t('appearance.currentPhoto')} />
        )}
        <div className="row">
          <button
            type="button"
            className="btn btn-primary"
            disabled={busy}
            onClick={() => fileRef.current?.click()}
          >
            <ImagePlus aria-hidden size={20} />
            {busy
              ? t('common.busy')
              : t(backgroundUrl ? 'appearance.otherPhoto' : 'appearance.choosePhoto')}
          </button>
          {backgroundUrl && (
            <button type="button" className="btn" onClick={() => void clearBackground()}>
              <Trash2 aria-hidden size={20} />
              {t('appearance.removePhoto')}
            </button>
          )}
        </div>
        <input ref={fileRef} type="file" accept="image/*" hidden onChange={onFile} />
        {backgroundUrl && (
          <div className="segmented" role="radiogroup" aria-label={t('appearance.strength')}>
            {(['subtiel', 'zichtbaar'] as const).map((s) => (
              <button
                key={s}
                type="button"
                role="radio"
                aria-checked={prefs.background === s}
                className="btn"
                onClick={() => update({ background: s })}
              >
                {t(s === 'subtiel' ? 'appearance.subtle' : 'appearance.visible')}
              </button>
            ))}
          </div>
        )}
      </section>
      <section className="panel stack" aria-labelledby="h-text">
        <h2 id="h-text">{t('appearance.textSize')}</h2>
        <div className="segmented" role="radiogroup" aria-label={t('appearance.textSize')}>
          {TEXT_SIZES.map((s) => (
            <button
              key={s}
              type="button"
              role="radio"
              aria-checked={prefs.textSize === s}
              className="btn"
              onClick={() => update({ textSize: s })}
            >
              {t(`appearance.sizes.${s}`)}
            </button>
          ))}
        </div>
      </section>
      <section className="panel stack" aria-labelledby="h-mydata">
        <h2 id="h-mydata">{t('appearance.myData')}</h2>
        <p className="hint">{t('appearance.myDataHint')}</p>
        <div className="row">
          <button
            type="button"
            className="btn"
            onClick={() =>
              void exportPerson().then(
                (d) => downloadJson('my-data.json', d),
                () => setError('errors.network'),
              )
            }
          >
            <Download aria-hidden size={20} />
            {t('appearance.myDataButton')}
          </button>
        </div>
      </section>{' '}
    </div>
  );
}

function Swatch(props: { label: string; color: string; selected: boolean; onSelect: () => void }) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={props.selected}
      className="swatch"
      onClick={props.onSelect}
    >
      <span className="swatch-dot" style={{ background: props.color }}>
        {props.selected && <Check aria-hidden size={18} />}
      </span>
      <span>{props.label}</span>
    </button>
  );
}
