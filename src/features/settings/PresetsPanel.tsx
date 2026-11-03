import { useState } from 'react';
import { Building2, ChevronDown, Music, PartyPopper, Presentation, Sparkles } from 'lucide-react';
import { contentLang, LANGUAGES } from '@/i18n';
import { usePrefs } from '@/lib/usePrefs';
import { dbError } from '@/lib/query';
import { supabase } from '@/lib/supabase';
import { buildSetup, PRESETS, presetCounts, type Preset } from '@/lib/presets';

const ICONS = { festival: Sparkles, stage: Music, conference: Presentation, party: PartyPopper };

/** Sjablonen per soort evenement. Toepassen voegt enkel toe, verwijdert nooit. */
export function PresetsPanel(props: { onApplied: () => void }) {
  const { t, errText, prefs } = usePrefs();
  const lang = contentLang(prefs.lang);
  const [open, setOpen] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [result, setResult] = useState<string | null>(null);
  const [error, setError] = useState<unknown>(null);

  async function apply(p: Preset) {
    if (!window.confirm(t('presets.confirm', { name: p.name[lang] }))) return;
    setBusy(p.id);
    setError(null);
    setResult(null);
    const { data, error: err } = await supabase.rpc('apply_setup', { setup: buildSetup(p, lang) });
    setBusy(null);
    if (err) return setError(dbError(err));
    setResult(t('presets.result', data as Record<string, number>));
    props.onApplied();
  }

  return (
    <section className="stack" aria-labelledby="h-presets">
      <div>
        <h2 id="h-presets" style={{ margin: 0 }}>
          {t('presets.title')}
        </h2>
        <p className="sub" style={{ margin: '2px 0 0' }}>
          {t('presets.hint')}
        </p>
        <p className="hint">
          {t('presets.language', { lang: LANGUAGES.find((l) => l.id === lang)?.label ?? lang })}
        </p>
      </div>
      {error !== null && (
        <div className="alert alert-error" role="alert">
          {errText(error)}
        </div>
      )}
      {result && (
        <div className="alert alert-success" role="status">
          {result}
        </div>
      )}
      <div className="cards">
        {PRESETS.map((p) => {
          const Icon = ICONS[p.icon] ?? Building2;
          const counts = presetCounts(p);
          const isOpen = open === p.id;
          return (
            <article key={p.id} className="card pkg-card stack-sm" data-color={p.color}>
              <div className="row" style={{ alignItems: 'flex-start' }}>
                <span className="bubble bubble-lg" aria-hidden>
                  <Icon size={24} />
                </span>
                <span className="grow">
                  <h3 style={{ margin: '4px 0 2px' }}>{p.name[lang]}</h3>
                  <span className="sub">{t('presets.counts', counts)}</span>
                </span>
              </div>
              <p className="sub" style={{ margin: 0 }}>
                {p.description[lang]}
              </p>
              <button
                type="button"
                className="chip"
                aria-expanded={isOpen}
                onClick={() => setOpen(isOpen ? null : p.id)}
              >
                <ChevronDown
                  aria-hidden
                  size={14}
                  style={{ transform: isOpen ? 'rotate(180deg)' : undefined }}
                />
                {t('presets.previewTeams')} · {t('presets.previewRoles')}
              </button>
              {isOpen && (
                <div className="preset-preview stack-sm">
                  <strong>{t('presets.previewTeams')}</strong>
                  <ul>
                    {p.teams.map((team) => (
                      <li key={team.name.en}>
                        <span className="dot" data-color={team.color} aria-hidden />{' '}
                        {team.name[lang]}
                        {team.children && team.children.length > 0 && (
                          <span className="sub">
                            {' '}
                            → {team.children.map((c) => c.name[lang]).join(', ')}
                          </span>
                        )}
                      </li>
                    ))}
                  </ul>
                  <strong>{t('presets.previewRoles')}</strong>
                  <ul>
                    {p.roles.map((r) => (
                      <li key={r.name.en}>
                        {r.name[lang]} <span className="sub">· {r.description[lang]}</span>
                      </li>
                    ))}
                  </ul>
                  <strong>{t('presets.previewLocations')}</strong>
                  <p className="sub" style={{ margin: 0 }}>
                    {p.locations.map((l) => l.name[lang]).join(', ')}
                  </p>
                  <strong>{t('presets.previewPackages')}</strong>
                  <p className="sub" style={{ margin: 0 }}>
                    {p.packages.map((k) => k.name[lang]).join(', ')}
                  </p>
                </div>
              )}
              <button
                type="button"
                className="btn btn-primary btn-sm"
                disabled={busy !== null}
                onClick={() => void apply(p)}
              >
                {busy === p.id ? t('common.busy') : t('presets.apply')}
              </button>
            </article>
          );
        })}
      </div>
    </section>
  );
}
