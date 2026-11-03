import { useEffect, useState, type FormEvent } from 'react';
import { CheckCheck, Link2, Save, Upload } from 'lucide-react';
import { Dialog } from '@/app/Dialog';
import { documentActions, formatBytes, useArtists, type DocumentRow } from '@/lib/festival';
import { useDepartments, useEvent } from '@/lib/refdata';
import { AppError } from '@/i18n';
import { useT } from '@/lib/usePrefs';

/** Nieuw document (bestand of link), of een bestaand bewerken / een nieuwe versie uploaden. */
export function DocumentDialog(props: {
  value: DocumentRow | 'new' | null;
  categories: string[];
  onClose: () => void;
  onDone: () => void;
}) {
  const { t, errText } = useT();
  const departments = useDepartments();
  const artists = useArtists();
  const event = useEvent();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('');
  const [mode, setMode] = useState<'file' | 'link'>('file');
  const [file, setFile] = useState<File | null>(null);
  const [url, setUrl] = useState('');
  const [depts, setDepts] = useState<string[]>([]);
  const [artistId, setArtistId] = useState('');
  const [mustRead, setMustRead] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<unknown>(null);
  const existing = props.value && typeof props.value === 'object' ? props.value : null;
  const maxMb = event.data?.max_pdf_mb ?? 15;

  useEffect(() => {
    if (!props.value) return;
    setError(null);
    setFile(null);
    const d = typeof props.value === 'object' ? props.value : null;
    setTitle(d?.title ?? '');
    setDescription(d?.description ?? '');
    setCategory(d?.category ?? '');
    setMode(d && d.external_url && !d.file_path ? 'link' : 'file');
    setUrl(d?.external_url ?? '');
    setDepts(d?.department_ids ?? []);
    setArtistId(d?.artist_id ?? '');
    setMustRead(d?.requires_read ?? false);
  }, [props.value]);

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!title.trim()) return;
    setBusy(true);
    setError(null);
    try {
      const row: Partial<DocumentRow> = {
        title: title.trim(),
        description: description.trim() || null,
        category: category.trim() || null,
        department_ids: depts,
        artist_id: artistId || null,
        requires_read: mustRead,
      };
      if (mode === 'link') {
        if (!/^https:\/\//.test(url.trim())) throw new AppError('documents.linkInvalid');
        row.external_url = url.trim();
        row.file_path = null;
        row.file_name = null;
        row.mime_type = null;
        row.size_bytes = null;
        if (existing && existing.external_url !== row.external_url) row.version = existing.version + 1;
      } else if (file) {
        if (file.size > maxMb * 1024 * 1024) throw new AppError('documents.tooBig', { mb: maxMb });
        row.file_path = await documentActions.upload(file);
        row.file_name = file.name;
        row.mime_type = file.type || null;
        row.size_bytes = file.size;
        row.external_url = null;
        if (existing) row.version = existing.version + 1;
      } else if (!existing?.file_path) {
        throw new AppError('documents.fileRequired');
      }
      await documentActions.save(existing?.id ?? null, row);
      // Oude versie opruimen als er een nieuw bestand is.
      if (existing?.file_path && row.file_path && row.file_path !== existing.file_path) {
        await documentActions.removeFile(existing.file_path).catch(() => undefined);
      }
      props.onDone();
      props.onClose();
    } catch (err) {
      setError(err);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog
      open={props.value !== null}
      title={t(existing ? 'documents.edit' : 'documents.new')}
      onClose={props.onClose}
    >
      <form onSubmit={(e) => void submit(e)}>
        {error !== null && (
          <div className="alert alert-error" role="alert">
            {errText(error)}
          </div>
        )}
        <div className="field">
          <label htmlFor="doc-title">{t('documents.titleLabel')}</label>
          <input
            id="doc-title"
            required
            maxLength={140}
            placeholder={t('documents.titlePlaceholder')}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
        </div>
        <div className="segmented" role="group" aria-label={t('documents.source')}>
          <button
            type="button"
            className="chip"
            aria-pressed={mode === 'file'}
            onClick={() => setMode('file')}
          >
            <Upload aria-hidden size={14} /> {t('documents.file')}
          </button>
          <button
            type="button"
            className="chip"
            aria-pressed={mode === 'link'}
            onClick={() => setMode('link')}
          >
            <Link2 aria-hidden size={14} /> {t('documents.link')}
          </button>
        </div>
        {mode === 'file' ? (
          <div className="field">
            <label htmlFor="doc-file">
              {existing?.file_path ? t('documents.replaceFile') : t('documents.chooseFile')}
            </label>
            <input
              id="doc-file"
              type="file"
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            />
            <p className="hint">
              {file
                ? `${file.name} · ${formatBytes(file.size)}`
                : existing?.file_name
                  ? t('documents.currentFile', { name: existing.file_name, v: existing.version })
                  : t('documents.maxSize', { mb: maxMb })}
            </p>
          </div>
        ) : (
          <div className="field">
            <label htmlFor="doc-url">{t('documents.linkLabel')}</label>
            <input
              id="doc-url"
              type="url"
              inputMode="url"
              placeholder="https://drive.google.com/…"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
            />
            <p className="hint">{t('documents.linkHint')}</p>
          </div>
        )}
        <div className="grid-2">
          <div className="field">
            <label htmlFor="doc-cat">{t('documents.category')}</label>
            <input
              id="doc-cat"
              list="doc-cats"
              maxLength={40}
              placeholder={t('documents.categoryPlaceholder')}
              value={category}
              onChange={(e) => setCategory(e.target.value)}
            />
            <datalist id="doc-cats">
              {[...new Set([...props.categories, ...t('documents.defaultCategories').split(',')])].map(
                (c) => (
                  <option key={c} value={c} />
                ),
              )}
            </datalist>
          </div>
          <div className="field">
            <label htmlFor="doc-artist">{t('documents.artist')}</label>
            <select id="doc-artist" value={artistId} onChange={(e) => setArtistId(e.target.value)}>
              <option value="">{t('common.none')}</option>
              {(artists.data ?? []).map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name}
                </option>
              ))}
            </select>
          </div>
        </div>
        <div className="field">
          <label htmlFor="doc-desc">
            {t('common.description')} <span className="hint">{t('common.optional')}</span>
          </label>
          <textarea
            id="doc-desc"
            rows={2}
            maxLength={1000}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </div>
        <div className="field">
          <span className="label">{t('documents.audience')}</span>
          <div className="segmented" role="group" aria-label={t('documents.audience')}>
            <button
              type="button"
              className="chip"
              aria-pressed={depts.length === 0}
              onClick={() => setDepts([])}
            >
              {t('people.everyone')}
            </button>
            {(departments.data ?? []).map((d) => (
              <button
                key={d.id}
                type="button"
                className="chip"
                data-color={d.color}
                aria-pressed={depts.includes(d.id)}
                onClick={() =>
                  setDepts(depts.includes(d.id) ? depts.filter((x) => x !== d.id) : [...depts, d.id])
                }
              >
                <span className="dot" aria-hidden />
                {d.name}
              </button>
            ))}
          </div>
        </div>
        <label className="switch-row" style={{ marginBottom: 'var(--space-4)' }}>
          <span>
            <strong>
              <CheckCheck aria-hidden size={16} /> {t('documents.requireRead')}
            </strong>
            <span className="hint">{t('documents.requireReadHint')}</span>
          </span>
          <input
            type="checkbox"
            role="switch"
            checked={mustRead}
            onChange={(e) => setMustRead(e.target.checked)}
          />
        </label>
        <div className="row">
          <button type="submit" className="btn btn-primary" disabled={busy || !title.trim()}>
            <Save aria-hidden size={20} />
            {busy ? t('common.saving') : t('common.save')}
          </button>
          <button type="button" className="btn" onClick={props.onClose}>
            {t('common.cancel')}
          </button>
        </div>
      </form>
    </Dialog>
  );
}
