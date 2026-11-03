import { useEffect, useState, type FormEvent } from 'react';
import { Camera, Send } from 'lucide-react';
import { Dialog } from '@/app/Dialog';
import { useAuth } from '@/lib/auth';
import { compressImage } from '@/lib/image';
import { issueActions, SEVERITIES, SEVERITY_COLOR, SEVERITY_LABEL, type IssueSeverity } from '@/lib/festival';
import { useDepartments, useLocations } from '@/lib/refdata';
import { useT } from '@/lib/usePrefs';

/** Snel een probleem melden: wat, waar, hoe erg, en eventueel een foto. */
export function ReportDialog(props: { open: boolean; onClose: () => void; onDone: () => void }) {
  const { t, errText } = useT();
  const { profile } = useAuth();
  const locations = useLocations();
  const departments = useDepartments();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [severity, setSeverity] = useState<IssueSeverity>('normal');
  const [locationId, setLocationId] = useState('');
  const [teamId, setTeamId] = useState('');
  const [photo, setPhoto] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<unknown>(null);

  useEffect(() => {
    if (!props.open) return;
    setTitle('');
    setDescription('');
    setSeverity('normal');
    setLocationId('');
    setTeamId('');
    setPhoto(null);
    setError(null);
  }, [props.open]);

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!title.trim() || !profile) return;
    setBusy(true);
    setError(null);
    try {
      const photo_path = photo
        ? await issueActions.uploadPhoto(profile.id, await compressImage(photo, 1600, 0.75))
        : null;
      await issueActions.report({
        title: title.trim(),
        description: description.trim() || null,
        severity,
        location_id: locationId || null,
        department_id: teamId || null,
        photo_path,
        reported_by: profile.id,
      });
      props.onDone();
      props.onClose();
    } catch (err) {
      setError(err);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog open={props.open} title={t('issues.report')} onClose={props.onClose}>
      <form onSubmit={(e) => void submit(e)}>
        {error !== null && (
          <div className="alert alert-error" role="alert">
            {errText(error)}
          </div>
        )}
        <div className="field">
          <label htmlFor="is-title">{t('issues.whatLabel')}</label>
          <input
            id="is-title"
            required
            maxLength={140}
            placeholder={t('issues.whatPlaceholder')}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
        </div>
        <div className="field">
          <span className="label">{t('issues.severity')}</span>
          <div className="segmented" role="group" aria-label={t('issues.severity')}>
            {SEVERITIES.map((s) => (
              <button
                key={s}
                type="button"
                className="chip"
                data-color={SEVERITY_COLOR[s]}
                aria-pressed={severity === s}
                onClick={() => setSeverity(s)}
              >
                <span className="dot" aria-hidden />
                {t(SEVERITY_LABEL[s])}
              </button>
            ))}
          </div>
          <p className="hint">{t('issues.severityHint')}</p>
        </div>
        <div className="grid-2">
          <div className="field">
            <label htmlFor="is-loc">{t('issues.where')}</label>
            <select id="is-loc" value={locationId} onChange={(e) => setLocationId(e.target.value)}>
              <option value="">{t('common.none')}</option>
              {(locations.data ?? []).map((l) => (
                <option key={l.id} value={l.id}>
                  {l.name}
                </option>
              ))}
            </select>
          </div>
          <div className="field">
            <label htmlFor="is-team">{t('issues.forTeam')}</label>
            <select id="is-team" value={teamId} onChange={(e) => setTeamId(e.target.value)}>
              <option value="">{t('common.none')}</option>
              {(departments.data ?? []).map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name}
                </option>
              ))}
            </select>
          </div>
        </div>
        <div className="field">
          <label htmlFor="is-desc">
            {t('issues.details')} <span className="hint">{t('common.optional')}</span>
          </label>
          <textarea
            id="is-desc"
            rows={3}
            maxLength={4000}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </div>
        <div className="field">
          <label htmlFor="is-photo">
            <Camera aria-hidden size={16} /> {t('issues.photo')}{' '}
            <span className="hint">{t('common.optional')}</span>
          </label>
          <input
            id="is-photo"
            type="file"
            accept="image/*"
            capture="environment"
            onChange={(e) => setPhoto(e.target.files?.[0] ?? null)}
          />
        </div>
        <div className="row">
          <button type="submit" className="btn btn-primary" disabled={busy || !title.trim()}>
            <Send aria-hidden size={20} />
            {busy ? t('common.busy') : t('issues.send')}
          </button>
          <button type="button" className="btn" onClick={props.onClose}>
            {t('common.cancel')}
          </button>
        </div>
      </form>
    </Dialog>
  );
}
