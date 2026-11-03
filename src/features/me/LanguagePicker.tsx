import { Languages } from 'lucide-react';
import { LANGUAGES, isLang } from '@/i18n';
import { usePrefs } from '@/lib/usePrefs';

/** Taalkeuze. `compact` = klein keuzemenu (bv. op het inlogscherm). */
export function LanguagePicker({ compact = false }: { compact?: boolean }) {
  const { prefs, update, t } = usePrefs();

  if (compact) {
    return (
      <label className="lang-compact">
        <Languages aria-hidden size={18} />
        <span className="visually-hidden">{t('appearance.language')}</span>
        <select
          value={prefs.lang}
          onChange={(e) => isLang(e.target.value) && update({ lang: e.target.value })}
        >
          {LANGUAGES.map((l) => (
            <option key={l.id} value={l.id}>
              {l.label}
            </option>
          ))}
        </select>
      </label>
    );
  }

  return (
    <div className="segmented" role="radiogroup" aria-label={t('appearance.language')}>
      {LANGUAGES.map((l) => (
        <button
          key={l.id}
          type="button"
          role="radio"
          aria-checked={prefs.lang === l.id}
          lang={l.locale}
          className="btn"
          onClick={() => update({ lang: l.id })}
        >
          {l.label}
        </button>
      ))}
    </div>
  );
}
