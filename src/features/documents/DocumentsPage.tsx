import { useMemo, useState } from 'react';
import {
  CheckCheck,
  ExternalLink,
  FileImage,
  FileSpreadsheet,
  FileText,
  Link2,
  Pencil,
  Plus,
  Search,
  Trash2,
} from 'lucide-react';
import { EmptyState } from '@/app/EmptyState';
import { StaleNotice } from '@/app/StaleNotice';
import { useAuth } from '@/lib/auth';
import {
  documentActions,
  formatBytes,
  hasRead,
  useArtists,
  useDocuments,
  type DocumentRow,
} from '@/lib/festival';
import { useDepartments, usePeople } from '@/lib/refdata';
import { formatDayShort } from '@/lib/time';
import { useT } from '@/lib/usePrefs';
import { DocumentDialog } from './DocumentDialog';

function iconFor(d: DocumentRow) {
  if (d.external_url && !d.file_path) return Link2;
  if (d.mime_type?.startsWith('image/')) return FileImage;
  if (/sheet|excel|csv/.test(d.mime_type ?? '')) return FileSpreadsheet;
  return FileText;
}

/** Riders, plattegronden, draaiboeken en veiligheidsplannen op één plek, per team zichtbaar. */
export function DocumentsPage() {
  const { t, errText, locale } = useT();
  const { can, profile } = useAuth();
  const docs = useDocuments();
  const departments = useDepartments();
  const artists = useArtists();
  const people = usePeople();
  const [category, setCategory] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [editing, setEditing] = useState<DocumentRow | 'new' | null>(null);
  const [error, setError] = useState<unknown>(null);
  const manager = can('documents.manage');
  const list = docs.data ?? [];
  const categories = useMemo(
    () => [...new Set(list.map((d) => d.category).filter((c): c is string => !!c))].sort(),
    [list],
  );
  const q = query.trim().toLowerCase();
  const shown = list.filter(
    (d) =>
      (!category || d.category === category) &&
      (!q ||
        d.title.toLowerCase().includes(q) ||
        (d.description ?? '').toLowerCase().includes(q) ||
        (d.file_name ?? '').toLowerCase().includes(q)),
  );
  const toRead = list.filter((d) => d.requires_read && !hasRead(d, profile?.id));
  const activePeople = (people.data ?? []).filter((p) => p.active).length;

  async function open(d: DocumentRow) {
    setError(null);
    // Venster meteen openen (anders blokkeert Safari de pop-up na een await).
    const win = window.open('', '_blank', 'noopener');
    try {
      const url = await documentActions.openUrl(d);
      if (win) win.location.href = url;
      else window.location.href = url;
      if (!hasRead(d, profile?.id)) await documentActions.markRead(d.id).catch(() => undefined);
      void docs.reload();
    } catch (e) {
      win?.close();
      setError(e);
    }
  }

  async function remove(d: DocumentRow) {
    if (!window.confirm(t('documents.confirmDelete', { name: d.title }))) return;
    setError(null);
    try {
      await documentActions.remove(d);
      void docs.reload();
    } catch (e) {
      setError(e);
    }
  }

  const audience = (d: DocumentRow) =>
    d.department_ids.length === 0
      ? t('people.everyone')
      : d.department_ids
          .map((id) => departments.data?.find((x) => x.id === id)?.name)
          .filter(Boolean)
          .join(', ');

  return (
    <div className="stack">
      <div className="page-head">
        <span className="bubble bubble-lg" data-color="sky" aria-hidden>
          <FileText size={24} />
        </span>
        <div className="grow">
          <h1>{t('documents.title')}</h1>
          <p className="sub">{t('documents.subtitle')}</p>
        </div>
        {manager && (
          <button type="button" className="btn btn-primary" onClick={() => setEditing('new')}>
            <Plus aria-hidden size={20} />
            {t('documents.new')}
          </button>
        )}
      </div>
      <StaleNotice fromCache={docs.fromCache} fetchedAt={docs.fetchedAt} />
      {(error !== null || (docs.error && !docs.data)) && (
        <div className="alert alert-error" role="alert">
          {errText(error ?? docs.error)}
        </div>
      )}

      {toRead.length > 0 && (
        <div className="card row" data-color="gold" role="status">
          <span className="bubble" aria-hidden>
            <CheckCheck size={20} />
          </span>
          <p className="grow" style={{ margin: 0 }}>
            {t('documents.toRead', { n: toRead.length })}
          </p>
        </div>
      )}

      {list.length > 0 && (
        <>
          {categories.length > 0 && (
            <div className="segmented" role="group" aria-label={t('documents.category')}>
              <button
                type="button"
                className="chip"
                aria-pressed={category === null}
                onClick={() => setCategory(null)}
              >
                {t('common.all')}
              </button>
              {categories.map((c) => (
                <button
                  key={c}
                  type="button"
                  className="chip"
                  aria-pressed={category === c}
                  onClick={() => setCategory(category === c ? null : c)}
                >
                  {c}
                </button>
              ))}
            </div>
          )}
          <label className="search">
            <Search aria-hidden size={18} />
            <input
              type="search"
              placeholder={t('documents.search')}
              aria-label={t('documents.search')}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </label>
        </>
      )}

      {docs.data && list.length === 0 ? (
        <EmptyState icon={FileText} color="sky" title={t('documents.emptyTitle')}>
          <p>{t(manager ? 'documents.emptyManager' : 'documents.empty')}</p>
        </EmptyState>
      ) : (
        <ul className="list">
          {shown.map((d) => {
            const Icon = iconFor(d);
            const read = hasRead(d, profile?.id);
            const readers = new Set(
              d.document_reads.filter((r) => r.version >= d.version).map((r) => r.profile_id),
            ).size;
            const artist = artists.data?.find((x) => x.id === d.artist_id);
            return (
              <li key={d.id} className="list-item">
                <button
                  type="button"
                  className="row grow"
                  style={{ background: 'none', border: 0, padding: 0, textAlign: 'start' }}
                  onClick={() => void open(d)}
                >
                  <span className="bubble" data-color="sky" aria-hidden>
                    <Icon size={20} />
                  </span>
                  <span className="grow">
                    <span className="title" style={{ display: 'block' }}>
                      {d.title}{' '}
                      {d.external_url && !d.file_path && <ExternalLink aria-hidden size={14} />}
                    </span>
                    <span className="sub">
                      {[
                        d.category,
                        artist?.name,
                        audience(d),
                        `v${d.version}`,
                        formatBytes(d.size_bytes),
                        formatDayShort(d.updated_at, locale),
                      ]
                        .filter(Boolean)
                        .join(' · ')}
                    </span>
                  </span>
                </button>
                {d.requires_read && !read && (
                  <span className="badge" data-color="gold">
                    {t('documents.mustRead')}
                  </span>
                )}
                {manager && d.requires_read && (
                  <span className="sub" title={t('documents.readBy')}>
                    {t('documents.readCount', { n: readers, total: activePeople })}
                  </span>
                )}
                {manager && (
                  <>
                    <button
                      type="button"
                      className="icon-btn"
                      aria-label={t('common.edit')}
                      onClick={() => setEditing(d)}
                    >
                      <Pencil aria-hidden size={18} />
                    </button>
                    <button
                      type="button"
                      className="icon-btn"
                      aria-label={t('common.delete')}
                      onClick={() => void remove(d)}
                    >
                      <Trash2 aria-hidden size={18} />
                    </button>
                  </>
                )}
              </li>
            );
          })}
        </ul>
      )}
      {list.length > 0 && shown.length === 0 && <p className="sub">{t('documents.noMatch')}</p>}

      <DocumentDialog
        value={editing}
        categories={categories}
        onClose={() => setEditing(null)}
        onDone={() => void docs.reload()}
      />
    </div>
  );
}
