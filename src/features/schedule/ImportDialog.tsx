import { useMemo, useState, type ChangeEvent } from 'react';
import { AlertTriangle, Download, FileUp, Upload } from 'lucide-react';
import { Dialog } from '@/app/Dialog';
import { useAuth } from '@/lib/auth';
import { mapRows, parseDelimited, templateCsv, type ImportRow } from '@/lib/csvImport';
import { dbError } from '@/lib/query';
import { useDepartments, useEventDays, useLocations } from '@/lib/refdata';
import { supabase } from '@/lib/supabase';
import { formatTime } from '@/lib/time';
import { useT } from '@/lib/usePrefs';
import { KindBadge } from './parts';

/** Planning in één keer importeren: plakken uit Excel/Sheets of een CSV-bestand kiezen. */
export function ImportDialog(props: {
  open: boolean;
  onClose: () => void;
  onDone: (n: number) => void;
}) {
  const { t, errText, locale } = useT();
  const { can } = useAuth();
  const days = useEventDays();
  const locations = useLocations();
  const departments = useDepartments();
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<unknown>(null);

  const result = useMemo(
    () =>
      text.trim()
        ? mapRows(parseDelimited(text), {
            days: days.data ?? [],
            locations: locations.data ?? [],
            departments: departments.data ?? [],
          })
        : null,
    [text, days.data, locations.data, departments.data],
  );
  const newLocations = [
    ...new Set((result?.items ?? []).map((i) => i.new_location).filter(Boolean)),
  ] as string[];
  const canCreateLocations = can('settings.manage');
  const dayLabel = (id: string) => days.data?.find((d) => d.id === id)?.label ?? '';

  async function onFile(e: ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    e.target.value = '';
    if (f) setText(await f.text());
  }

  function downloadTemplate() {
    const blob = new Blob([templateCsv((days.data ?? []).map((d) => d.label))], {
      type: 'text/csv;charset=utf-8',
    });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'schedule-template.csv';
    a.click();
    URL.revokeObjectURL(a.href);
  }

  async function doImport() {
    if (!result?.items.length) return;
    setBusy(true);
    setError(null);
    try {
      // Nieuwe locaties eerst aanmaken (als dat mag), daarna de items.
      const locIds = new Map<string, string>();
      if (newLocations.length && canCreateLocations) {
        const base = Math.max(0, ...(locations.data ?? []).map((l) => l.sort_order));
        const { data, error: err } = await supabase
          .from('locations')
          .insert(newLocations.map((name, i) => ({ name, sort_order: base + i + 1 })))
          .select('id, name');
        if (err) throw dbError(err);
        for (const l of (data ?? []) as { id: string; name: string }[]) locIds.set(l.name, l.id);
      }
      const rows = result.items.map((i: ImportRow) => ({
        day_id: i.day_id,
        starts_at: i.starts_at,
        ends_at: i.ends_at,
        title: i.title,
        kind: i.kind,
        location_id:
          i.location_id ?? (i.new_location ? (locIds.get(i.new_location) ?? null) : null),
        department_ids: i.department_ids,
        notes: i.notes,
      }));
      const { error: err } = await supabase.from('schedule_items').insert(rows);
      if (err) throw dbError(err);
      props.onDone(rows.length);
      setText('');
      props.onClose();
    } catch (e) {
      setError(e);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog open={props.open} title={t('import.title')} onClose={props.onClose}>
      <p className="hint">{t('import.hint')}</p>
      {error !== null && (
        <div className="alert alert-error" role="alert">
          {errText(error)}
        </div>
      )}
      <div className="row" style={{ marginBottom: 'var(--space-3)' }}>
        <button type="button" className="btn btn-sm" onClick={downloadTemplate}>
          <Download aria-hidden size={18} />
          {t('import.template')}
        </button>
        <label className="btn btn-sm">
          <FileUp aria-hidden size={18} />
          {t('import.chooseFile')}
          <input
            type="file"
            accept=".csv,.txt,.tsv,text/csv"
            hidden
            onChange={(e) => void onFile(e)}
          />
        </label>
      </div>
      <div className="field">
        <label htmlFor="imp-text">{t('import.paste')}</label>
        <textarea
          id="imp-text"
          rows={6}
          spellCheck={false}
          className="mono"
          placeholder={
            'Day;Start;End;Title;Type;Location;Teams;Notes\nFriday;20:00;21:00;The Lanterns;Performance;Main Stage;;'
          }
          value={text}
          onChange={(e) => setText(e.target.value)}
        />
        <span className="hint">{t('import.columns')}</span>
      </div>

      {result && !result.headerFound && (
        <div className="alert alert-warning">{t('import.noHeader')}</div>
      )}
      {result && result.headerFound && (
        <section className="stack-sm" style={{ marginBottom: 'var(--space-4)' }}>
          <strong>{t('import.preview', { n: result.items.length })}</strong>
          {result.problems.length > 0 && (
            <ul className="import-problems">
              {result.problems.map((p, i) => (
                <li key={i}>
                  <AlertTriangle aria-hidden size={15} />
                  {t('import.line', { n: p.line })}: {t(p.key, { value: p.value })}
                </li>
              ))}
            </ul>
          )}
          {newLocations.length > 0 && (
            <p className="hint">
              {t(canCreateLocations ? 'import.newLocations' : 'import.newLocationsNoRight', {
                list: newLocations.join(', '),
              })}
            </p>
          )}
          <ul className="list import-preview">
            {result.items.slice(0, 50).map((i) => (
              <li key={i.line} className="row">
                <span className="time">{formatTime(i.starts_at, locale)}</span>
                <span className="sub">{dayLabel(i.day_id)}</span>
                <span className="grow">{i.title}</span>
                <KindBadge kind={i.kind} />
              </li>
            ))}
          </ul>
        </section>
      )}

      <div className="row">
        <button
          type="button"
          className="btn btn-primary"
          disabled={busy || !result?.items.length}
          onClick={() => void doImport()}
        >
          <Upload aria-hidden size={20} />
          {busy ? t('common.busy') : t('import.apply', { n: result?.items.length ?? 0 })}
        </button>
        <button type="button" className="btn" onClick={props.onClose}>
          {t('common.cancel')}
        </button>
      </div>
      <p className="hint">{t('import.afterHint')}</p>
    </Dialog>
  );
}
