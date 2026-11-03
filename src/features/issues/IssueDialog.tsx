import { useEffect, useState, type FormEvent } from 'react';
import { CheckCircle2, MessageSquare, Play, RotateCcw, Trash2 } from 'lucide-react';
import { Dialog } from '@/app/Dialog';
import { useAuth } from '@/lib/auth';
import {
  ISSUE_STATUS_LABEL,
  issueActions,
  SEVERITIES,
  SEVERITY_COLOR,
  SEVERITY_LABEL,
  type Issue,
} from '@/lib/festival';
import { useDepartments, useLocations, usePeople } from '@/lib/refdata';
import { formatDayShort, formatTime } from '@/lib/time';
import { useT } from '@/lib/usePrefs';

/** Eén melding: details, foto, opvolging en de knoppen om ze af te handelen. */
export function IssueDialog(props: { issue: Issue | null; onClose: () => void; onChanged: () => void }) {
  const { t, errText, locale } = useT();
  const { profile, can } = useAuth();
  const locations = useLocations();
  const departments = useDepartments();
  const people = usePeople();
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<unknown>(null);
  const i = props.issue;
  const manager = can('issues.manage');
  const handler =
    !!i && (manager || i.assigned_to === profile?.id || (!!i.department_id && i.department_id === profile?.department_id));

  useEffect(() => {
    setNote('');
    setError(null);
    setPhotoUrl(null);
    if (!i?.photo_path) return;
    let stop = false;
    void issueActions
      .photoUrl(i.photo_path)
      .then((u) => !stop && setPhotoUrl(u))
      .catch(() => undefined);
    return () => {
      stop = true;
    };
  }, [i?.id, i?.photo_path]);

  async function act(op: () => Promise<void>) {
    setBusy(true);
    setError(null);
    try {
      await op();
      props.onChanged();
    } catch (e) {
      setError(e);
    } finally {
      setBusy(false);
    }
  }

  async function addNote(e: FormEvent) {
    e.preventDefault();
    if (!i || !profile || !note.trim()) return;
    await act(() => issueActions.addNote(i.id, note.trim(), profile.id));
    setNote('');
  }

  const name = (id: string | null) => people.data?.find((p) => p.id === id)?.full_name ?? '—';
  const when = (iso: string) => `${formatDayShort(iso, locale)} ${formatTime(iso, locale)}`;

  return (
    <Dialog open={i !== null} title={i?.title ?? ''} onClose={props.onClose}>
      {i && (
        <div className="stack">
          {error !== null && (
            <div className="alert alert-error" role="alert">
              {errText(error)}
            </div>
          )}
          <div className="row" style={{ flexWrap: 'wrap' }}>
            <span className="badge" data-color={SEVERITY_COLOR[i.severity]}>
              {t(SEVERITY_LABEL[i.severity])}
            </span>
            <span className="badge">{t(ISSUE_STATUS_LABEL[i.status])}</span>
            <span className="sub">
              {t('issues.reportedBy', { name: name(i.reported_by), time: when(i.created_at) })}
            </span>
          </div>
          {i.description && (
            <p className="pre" style={{ margin: 0 }}>
              {i.description}
            </p>
          )}
          {photoUrl && (
            <a href={photoUrl} target="_blank" rel="noopener noreferrer">
              <img
                src={photoUrl}
                alt={t('issues.photo')}
                style={{ width: '100%', maxHeight: 320, objectFit: 'cover', borderRadius: 'var(--radius)' }}
              />
            </a>
          )}

          <div className="grid-2">
            <div className="field">
              <label htmlFor="id-loc">{t('issues.where')}</label>
              <select
                id="id-loc"
                disabled={!manager || busy}
                value={i.location_id ?? ''}
                onChange={(e) => void act(() => issueActions.update(i.id, { location_id: e.target.value || null }))}
              >
                <option value="">{t('common.none')}</option>
                {(locations.data ?? []).map((l) => (
                  <option key={l.id} value={l.id}>
                    {l.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="field">
              <label htmlFor="id-sev">{t('issues.severity')}</label>
              <select
                id="id-sev"
                disabled={!manager || busy}
                value={i.severity}
                onChange={(e) =>
                  void act(() => issueActions.update(i.id, { severity: e.target.value as Issue['severity'] }))
                }
              >
                {SEVERITIES.map((s) => (
                  <option key={s} value={s}>
                    {t(SEVERITY_LABEL[s])}
                  </option>
                ))}
              </select>
            </div>
            <div className="field">
              <label htmlFor="id-team">{t('issues.forTeam')}</label>
              <select
                id="id-team"
                disabled={!manager || busy}
                value={i.department_id ?? ''}
                onChange={(e) => void act(() => issueActions.update(i.id, { department_id: e.target.value || null }))}
              >
                <option value="">{t('common.none')}</option>
                {(departments.data ?? []).map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="field">
              <label htmlFor="id-who">{t('issues.assignedTo')}</label>
              <select
                id="id-who"
                disabled={!manager || busy}
                value={i.assigned_to ?? ''}
                onChange={(e) => void act(() => issueActions.update(i.id, { assigned_to: e.target.value || null }))}
              >
                <option value="">{t('common.nobody')}</option>
                {(people.data ?? [])
                  .filter((p) => p.active)
                  .map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.full_name}
                    </option>
                  ))}
              </select>
            </div>
          </div>

          {i.status === 'resolved' && i.resolution && (
            <div className="card" data-color="mint">
              <strong>
                <CheckCircle2 aria-hidden size={16} /> {t('issues.resolution')}
              </strong>
              <p className="pre" style={{ margin: '4px 0 0' }}>
                {i.resolution}
              </p>
              <p className="sub" style={{ margin: '4px 0 0' }}>
                {name(i.resolved_by)} · {i.resolved_at ? when(i.resolved_at) : ''}
              </p>
            </div>
          )}

          <section className="stack-sm" aria-labelledby="h-notes">
            <h3 id="h-notes" style={{ margin: 0 }}>
              <MessageSquare aria-hidden size={16} /> {t('issues.updates')}
            </h3>
            {i.issue_notes.length === 0 ? (
              <p className="sub" style={{ margin: 0 }}>
                {t('issues.noUpdates')}
              </p>
            ) : (
              <ul className="list">
                {i.issue_notes.map((n) => (
                  <li key={n.id} className="list-item" style={{ alignItems: 'flex-start' }}>
                    <span className="grow">
                      <span className="pre">{n.body}</span>
                      <span className="sub" style={{ display: 'block' }}>
                        {name(n.created_by)} · {when(n.created_at)}
                      </span>
                    </span>
                  </li>
                ))}
              </ul>
            )}
            <form className="stack-sm" onSubmit={(e) => void addNote(e)}>
              <textarea
                rows={2}
                maxLength={2000}
                placeholder={t('issues.notePlaceholder')}
                aria-label={t('issues.notePlaceholder')}
                value={note}
                onChange={(e) => setNote(e.target.value)}
              />
              <div className="row" style={{ flexWrap: 'wrap' }}>
                <button type="submit" className="btn btn-sm" disabled={busy || !note.trim()}>
                  <MessageSquare aria-hidden size={16} />
                  {t('issues.addNote')}
                </button>
                {handler && i.status === 'open' && (
                  <button
                    type="button"
                    className="btn btn-sm"
                    disabled={busy}
                    onClick={() => void act(() => issueActions.setStatus(i.id, 'in_progress', note.trim() || undefined)).then(() => setNote(''))}
                  >
                    <Play aria-hidden size={16} />
                    {t('issues.start')}
                  </button>
                )}
                {handler && i.status !== 'resolved' && (
                  <button
                    type="button"
                    className="btn btn-primary btn-sm"
                    disabled={busy || !note.trim()}
                    title={note.trim() ? undefined : t('issues.resolveHint')}
                    onClick={() => void act(() => issueActions.setStatus(i.id, 'resolved', note.trim())).then(() => setNote(''))}
                  >
                    <CheckCircle2 aria-hidden size={16} />
                    {t('issues.resolve')}
                  </button>
                )}
                {handler && i.status === 'resolved' && (
                  <button
                    type="button"
                    className="btn btn-sm"
                    disabled={busy}
                    onClick={() => void act(() => issueActions.setStatus(i.id, 'open', note.trim() || undefined))}
                  >
                    <RotateCcw aria-hidden size={16} />
                    {t('issues.reopen')}
                  </button>
                )}
              </div>
              {handler && i.status !== 'resolved' && (
                <p className="hint" style={{ margin: 0 }}>
                  {t('issues.resolveHint')}
                </p>
              )}
            </form>
          </section>

          {manager && (
            <button
              type="button"
              className="btn danger-btn btn-sm"
              disabled={busy}
              onClick={() => {
                if (!window.confirm(t('issues.confirmDelete'))) return;
                void act(() => issueActions.remove(i.id)).then(props.onClose);
              }}
            >
              <Trash2 aria-hidden size={16} />
              {t('common.delete')}
            </button>
          )}
        </div>
      )}
    </Dialog>
  );
}
