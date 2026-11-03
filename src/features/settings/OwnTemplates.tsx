import { useState } from 'react';
import { RefreshCw, Save, Star, Trash2 } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { dbError, must, useCachedQuery } from '@/lib/query';
import { useT } from '@/lib/usePrefs';
import type { PaletteColor } from '@/lib/permissions';

interface SetupJson {
  departments?: { children?: unknown[] }[];
  roles?: unknown[];
  locations?: unknown[];
  packages?: unknown[];
}

interface CustomTemplate {
  id: string;
  name: string;
  description: string | null;
  color: PaletteColor;
  setup: SetupJson;
  updated_at: string;
}

function counts(s: SetupJson) {
  return {
    teams: (s.departments ?? []).reduce((n, d) => n + 1 + (d.children?.length ?? 0), 0),
    roles: s.roles?.length ?? 0,
    locations: s.locations?.length ?? 0,
    packages: s.packages?.length ?? 0,
  };
}

async function capture(): Promise<SetupJson> {
  return must(await supabase.rpc('capture_setup')) as SetupJson;
}

/** Sjablonen die enkel in deze database bestaan (bv. de vaste opzet van één festival). */
export function OwnTemplates(props: { onApplied: () => void }) {
  const { t, errText } = useT();
  const list = useCachedQuery(
    'custom_templates',
    async () =>
      must(
        await supabase
          .from('custom_templates')
          .select('id, name, description, color, setup, updated_at')
          .order('name'),
      ) as CustomTemplate[],
    { realtime: ['custom_templates'] },
  );
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<unknown>(null);
  const [result, setResult] = useState<string | null>(null);

  async function run(id: string, op: () => Promise<string | null>) {
    setBusy(id);
    setError(null);
    setResult(null);
    try {
      setResult(await op());
      await list.reload();
    } catch (e) {
      setError(e);
    } finally {
      setBusy(null);
    }
  }

  const saveCurrent = () =>
    run('new', async () => {
      const name = window.prompt(t('templates.namePrompt'))?.trim();
      if (!name) return null;
      const description = window.prompt(t('templates.descriptionPrompt'))?.trim() || null;
      const { error: err } = await supabase
        .from('custom_templates')
        .insert({ name: name.slice(0, 60), description, setup: await capture() });
      if (err) throw dbError(err);
      return t('templates.saved');
    });

  const update = (tpl: CustomTemplate) =>
    run(tpl.id, async () => {
      if (!window.confirm(t('templates.confirmUpdate', { name: tpl.name }))) return null;
      const { error: err } = await supabase
        .from('custom_templates')
        .update({ setup: await capture() })
        .eq('id', tpl.id);
      if (err) throw dbError(err);
      return t('templates.saved');
    });

  const remove = (tpl: CustomTemplate) =>
    run(tpl.id, async () => {
      if (!window.confirm(t('templates.confirmDelete', { name: tpl.name }))) return null;
      const { error: err } = await supabase.from('custom_templates').delete().eq('id', tpl.id);
      if (err) throw dbError(err);
      return null;
    });

  const apply = (tpl: CustomTemplate) =>
    run(tpl.id, async () => {
      if (!window.confirm(t('presets.confirm', { name: tpl.name }))) return null;
      const { data, error: err } = await supabase.rpc('apply_setup', { setup: tpl.setup });
      if (err) throw dbError(err);
      props.onApplied();
      return t('presets.result', data as Record<string, number>);
    });

  return (
    <section className="stack" aria-labelledby="h-own">
      <div className="row" style={{ flexWrap: 'wrap' }}>
        <div className="grow">
          <h2 id="h-own" style={{ margin: 0 }}>
            {t('templates.ownTitle')}
          </h2>
          <p className="sub" style={{ margin: '2px 0 0' }}>
            {t('templates.ownHint')}
          </p>
        </div>
        <button
          type="button"
          className="btn"
          disabled={busy !== null}
          onClick={() => void saveCurrent()}
        >
          <Save aria-hidden size={18} />
          {t('templates.saveCurrent')}
        </button>
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
      {list.data && list.data.length === 0 ? (
        <p className="sub">{t('templates.empty')}</p>
      ) : (
        <div className="cards">
          {(list.data ?? []).map((tpl) => (
            <article key={tpl.id} className="card pkg-card stack-sm" data-color={tpl.color}>
              <div className="row" style={{ alignItems: 'flex-start' }}>
                <span className="bubble bubble-lg" aria-hidden>
                  <Star size={24} />
                </span>
                <span className="grow">
                  <h3 style={{ margin: '4px 0 2px' }}>{tpl.name}</h3>
                  <span className="sub">{t('presets.counts', counts(tpl.setup))}</span>
                </span>
              </div>
              {tpl.description && (
                <p className="sub" style={{ margin: 0 }}>
                  {tpl.description}
                </p>
              )}
              <button
                type="button"
                className="btn btn-primary btn-sm"
                disabled={busy !== null}
                onClick={() => void apply(tpl)}
              >
                {busy === tpl.id ? t('common.busy') : t('presets.apply')}
              </button>
              <div className="row">
                <button
                  type="button"
                  className="btn btn-sm grow"
                  disabled={busy !== null}
                  onClick={() => void update(tpl)}
                >
                  <RefreshCw aria-hidden size={16} />
                  {t('templates.update')}
                </button>
                <button
                  type="button"
                  className="icon-btn"
                  aria-label={t('common.delete')}
                  disabled={busy !== null}
                  onClick={() => void remove(tpl)}
                >
                  <Trash2 aria-hidden size={18} />
                </button>
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
