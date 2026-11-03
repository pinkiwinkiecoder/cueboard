import { useRef, useState, type ChangeEvent } from 'react';
import { Check, ImagePlus, Lightbulb, Trash2 } from 'lucide-react';
import { usePrefs } from '@/lib/usePrefs';
import { ACCENTS, type TextSize } from '@/lib/prefs';

const TEXT_SIZES: { id: TextSize; label: string }[] = [
  { id: 'normaal', label: 'Normaal' },
  { id: 'groot', label: 'Groot' },
  { id: 'extra', label: 'Extra groot' },
];

/** Persoonlijke weergave. Alles wordt enkel op dit toestel bewaard. */
export function AppearancePage() {
  const { prefs, update, backgroundUrl, setBackground, clearBackground, wake } = usePrefs();
  const fileRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onFile(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    if (!file.type.startsWith('image/')) return setError('Kies een foto (JPG, PNG of HEIC).');
    setBusy(true);
    setError(null);
    try {
      await setBackground(file);
    } catch {
      setError('Deze foto kon niet gebruikt worden. Probeer een andere foto.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="stack">
      <h1>Weergave</h1>
      <p className="muted">Deze keuzes gelden enkel op dit toestel.</p>

      <section className="panel stack" aria-labelledby="h-screen">
        <h2 id="h-screen">Scherm</h2>
        <label className="switch-row">
          <span>
            <strong>Scherm blijft aan</strong>
            <span className="hint">
              {wake === 'niet-ondersteund'
                ? 'Dit toestel ondersteunt dit niet. Update iOS of gebruik Safari/Chrome.'
                : 'Het scherm gaat niet op slot zolang de app open is.'}
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
            <Lightbulb aria-hidden size={16} /> Actief. Tip: zet de helderheid wat lager om batterij
            te sparen.
          </p>
        )}
        <label className="switch-row">
          <span>
            <strong>Klok bovenaan</strong>
            <span className="hint">Grote 24-uursklok met de dag erbij.</span>
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
        <h2 id="h-theme">Thema en kleur</h2>
        <div className="segmented" role="radiogroup" aria-label="Thema">
          {(['dark', 'light'] as const).map((t) => (
            <button
              key={t}
              type="button"
              role="radio"
              aria-checked={prefs.theme === t}
              className="btn"
              onClick={() => update({ theme: t })}
            >
              {t === 'dark' ? 'Donker' : 'Licht'}
            </button>
          ))}
        </div>
        <div className="swatches" role="radiogroup" aria-label="Accentkleur">
          <Swatch
            label="Standaard"
            color={prefs.theme === 'dark' ? '#f0b84f' : '#4a3db5'}
            selected={prefs.accent === null}
            onSelect={() => update({ accent: null })}
          />
          {ACCENTS.map((a) => (
            <Swatch
              key={a.id}
              label={a.label}
              color={a[prefs.theme].accent}
              selected={prefs.accent === a.id}
              onSelect={() => update({ accent: a.id })}
            />
          ))}
        </div>
      </section>

      <section className="panel stack" aria-labelledby="h-bg">
        <h2 id="h-bg">Achtergrondfoto</h2>
        <p className="hint">
          De foto blijft gedimd achter de inhoud, zodat alles leesbaar blijft. Hij wordt verkleind
          en enkel op dit toestel bewaard.
        </p>
        {error && (
          <div className="alert alert-error" role="alert">
            {error}
          </div>
        )}
        {backgroundUrl && (
          <img className="bg-preview" src={backgroundUrl} alt="Huidige achtergrondfoto" />
        )}
        <div className="row">
          <button
            type="button"
            className="btn btn-primary"
            disabled={busy}
            onClick={() => fileRef.current?.click()}
          >
            <ImagePlus aria-hidden size={20} />
            {busy ? 'Bezig…' : backgroundUrl ? 'Andere foto kiezen' : 'Foto kiezen'}
          </button>
          {backgroundUrl && (
            <button type="button" className="btn" onClick={() => void clearBackground()}>
              <Trash2 aria-hidden size={20} />
              Foto verwijderen
            </button>
          )}
        </div>
        <input ref={fileRef} type="file" accept="image/*" hidden onChange={onFile} />
        {backgroundUrl && (
          <div className="segmented" role="radiogroup" aria-label="Sterkte van de foto">
            {(['subtiel', 'zichtbaar'] as const).map((s) => (
              <button
                key={s}
                type="button"
                role="radio"
                aria-checked={prefs.background === s}
                className="btn"
                onClick={() => update({ background: s })}
              >
                {s === 'subtiel' ? 'Subtiel' : 'Meer zichtbaar'}
              </button>
            ))}
          </div>
        )}
      </section>

      <section className="panel stack" aria-labelledby="h-text">
        <h2 id="h-text">Tekstgrootte</h2>
        <div className="segmented" role="radiogroup" aria-label="Tekstgrootte">
          {TEXT_SIZES.map((s) => (
            <button
              key={s.id}
              type="button"
              role="radio"
              aria-checked={prefs.textSize === s.id}
              className="btn"
              onClick={() => update({ textSize: s.id })}
            >
              {s.label}
            </button>
          ))}
        </div>
      </section>
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
