// Artiesten, documenten en meldingen: types, ophalen (met offline-cache) en acties.
import { supabase } from './supabase';
import { dbError, must, useCachedQuery } from './query';
import type { MsgKey } from '@/i18n';
import type { PaletteColor } from './permissions';

type DbResult = PromiseLike<{ error: { message: string; code?: string } | null }>;

/** Voert een schrijfactie uit en gooit een vertaalbare fout. */
async function run(op: DbResult): Promise<void> {
  const { error } = await op;
  if (error) throw dbError(error);
}

// -----------------------------------------------------------------------------
// Artiesten
// -----------------------------------------------------------------------------
export type ArtistStatus = 'booked' | 'advancing' | 'ready' | 'on_site' | 'done';
export const ARTIST_STATUSES: ArtistStatus[] = ['booked', 'advancing', 'ready', 'on_site', 'done'];
export const ARTIST_STATUS_LABEL: Record<ArtistStatus, MsgKey> = {
  booked: 'artists.statusBooked',
  advancing: 'artists.statusAdvancing',
  ready: 'artists.statusReady',
  on_site: 'artists.statusOnSite',
  done: 'artists.statusDone',
};
export const ARTIST_STATUS_COLOR: Record<ArtistStatus, PaletteColor> = {
  booked: 'violet',
  advancing: 'gold',
  ready: 'mint',
  on_site: 'sky',
  done: 'teal',
};

export interface ArtistCheck {
  id: string;
  title: string;
  done: boolean;
  done_by: string | null;
  done_at: string | null;
  sort_order: number;
}

export interface Artist {
  id: string;
  name: string;
  genre: string | null;
  status: ArtistStatus;
  color: PaletteColor;
  day_id: string | null;
  location_id: string | null;
  schedule_item_id: string | null;
  contact_name: string | null;
  contact_phone: string | null;
  contact_email: string | null;
  arrival_at: string | null;
  departure_at: string | null;
  party_size: number | null;
  hospitality: string | null;
  technical: string | null;
  notes: string | null;
  liaison_id: string | null;
  artist_checklist: ArtistCheck[];
}

export type ArtistInput = Omit<Artist, 'id' | 'artist_checklist'>;

export function useArtists() {
  return useCachedQuery(
    'artists',
    async () => {
      const rows = must(
        await supabase
          .from('artists')
          .select('*, artist_checklist(id, title, done, done_by, done_at, sort_order)')
          .order('name'),
      ) as Artist[];
      for (const a of rows) a.artist_checklist.sort((x, y) => x.sort_order - y.sort_order);
      return rows;
    },
    { realtime: ['artists', 'artist_checklist'] },
  );
}

export function checklistProgress(a: Pick<Artist, 'artist_checklist'>) {
  const total = a.artist_checklist.length;
  const done = a.artist_checklist.filter((c) => c.done).length;
  return { done, total, pct: total ? Math.round((done / total) * 100) : 0 };
}

export const artistActions = {
  save: (id: string | null, row: ArtistInput) =>
    run(
      id
        ? supabase.from('artists').update(row).eq('id', id)
        : supabase.from('artists').insert(row),
    ),
  remove: (id: string) => run(supabase.from('artists').delete().eq('id', id)),
  setStatus: (id: string, status: ArtistStatus) =>
    run(supabase.from('artists').update({ status }).eq('id', id)),
  toggleCheck: (item: string, value: boolean) =>
    run(supabase.rpc('toggle_artist_check', { item, value })),
  addCheck: (artistId: string, title: string, sort: number) =>
    run(
      supabase.from('artist_checklist').insert({ artist_id: artistId, title, sort_order: sort }),
    ),
  removeCheck: (id: string) => run(supabase.from('artist_checklist').delete().eq('id', id)),
};

// -----------------------------------------------------------------------------
// Documenten
// -----------------------------------------------------------------------------
export interface DocumentRow {
  id: string;
  title: string;
  description: string | null;
  category: string | null;
  department_ids: string[];
  artist_id: string | null;
  file_path: string | null;
  file_name: string | null;
  mime_type: string | null;
  size_bytes: number | null;
  external_url: string | null;
  version: number;
  requires_read: boolean;
  created_by: string | null;
  updated_at: string;
  document_reads: { profile_id: string; version: number; read_at: string }[];
}

export function useDocuments() {
  return useCachedQuery(
    'documents',
    async () =>
      must(
        await supabase
          .from('documents')
          .select('*, document_reads(profile_id, version, read_at)')
          .order('updated_at', { ascending: false }),
      ) as DocumentRow[],
    { realtime: ['documents', 'document_reads'] },
  );
}

/** Heeft deze persoon de huidige versie gelezen? */
export function hasRead(d: DocumentRow, profileId: string | undefined): boolean {
  return d.document_reads.some((r) => r.profile_id === profileId && r.version >= d.version);
}

export function formatBytes(n: number | null): string {
  if (!n) return '';
  if (n < 1024 * 1024) return `${Math.max(1, Math.round(n / 1024))} KB`;
  return `${(n / 1024 / 1024).toFixed(1)} MB`;
}

/** Veilige bestandsnaam voor de opslag (geen spaties of rare tekens). */
export function storageName(name: string): string {
  const dot = name.lastIndexOf('.');
  const ext = dot > 0 ? name.slice(dot).toLowerCase().replace(/[^.a-z0-9]/g, '') : '';
  const base = (dot > 0 ? name.slice(0, dot) : name)
    .normalize('NFKD')
    .replace(/[^\w-]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60);
  return `${base || 'file'}${ext.slice(0, 10)}`;
}

export const documentActions = {
  /** Uploadt een bestand en geeft het pad terug. */
  upload: async (file: File): Promise<string> => {
    const path = `${crypto.randomUUID()}/${storageName(file.name)}`;
    const { error } = await supabase.storage
      .from('documents')
      .upload(path, file, file.type ? { contentType: file.type, upsert: false } : { upsert: false });
    if (error) throw dbError(error);
    return path;
  },
  save: (id: string | null, row: Partial<DocumentRow>) =>
    run(
      id
        ? supabase.from('documents').update(row).eq('id', id)
        : supabase.from('documents').insert(row),
    ),
  remove: async (d: DocumentRow) => {
    await run(supabase.from('documents').delete().eq('id', d.id));
    if (d.file_path) await supabase.storage.from('documents').remove([d.file_path]);
  },
  removeFile: async (path: string) => {
    const { error } = await supabase.storage.from('documents').remove([path]);
    if (error) throw dbError(error);
  },
  markRead: (doc: string) => run(supabase.rpc('mark_document_read', { doc })),
  /** Tijdelijke link om een privébestand te openen (1 uur geldig). */
  openUrl: async (d: DocumentRow): Promise<string> => {
    if (d.external_url) return d.external_url;
    const { data, error } = await supabase.storage
      .from('documents')
      .createSignedUrl(d.file_path ?? '', 3600);
    if (error || !data) throw dbError(error ?? { message: 'missing' });
    return data.signedUrl;
  },
};

// -----------------------------------------------------------------------------
// Meldingen
// -----------------------------------------------------------------------------
export type IssueSeverity = 'low' | 'normal' | 'high' | 'critical';
export type IssueStatus = 'open' | 'in_progress' | 'resolved';
export const SEVERITIES: IssueSeverity[] = ['critical', 'high', 'normal', 'low'];
export const SEVERITY_LABEL: Record<IssueSeverity, MsgKey> = {
  low: 'issues.sevLow',
  normal: 'issues.sevNormal',
  high: 'issues.sevHigh',
  critical: 'issues.sevCritical',
};
export const SEVERITY_COLOR: Record<IssueSeverity, PaletteColor> = {
  low: 'teal',
  normal: 'sky',
  high: 'peach',
  critical: 'rose',
};
export const ISSUE_STATUS_LABEL: Record<IssueStatus, MsgKey> = {
  open: 'issues.statusOpen',
  in_progress: 'issues.statusInProgress',
  resolved: 'issues.statusResolved',
};

export interface Issue {
  id: string;
  title: string;
  description: string | null;
  severity: IssueSeverity;
  status: IssueStatus;
  location_id: string | null;
  department_id: string | null;
  assigned_to: string | null;
  photo_path: string | null;
  reported_by: string | null;
  resolution: string | null;
  resolved_at: string | null;
  resolved_by: string | null;
  created_at: string;
  issue_notes: { id: string; body: string; created_by: string | null; created_at: string }[];
}

const SEV_ORDER: Record<IssueSeverity, number> = { critical: 0, high: 1, normal: 2, low: 3 };

/** Open eerst, dan ernst, dan nieuwste. */
export function sortIssues(list: Issue[]): Issue[] {
  return [...list].sort(
    (a, b) =>
      Number(a.status === 'resolved') - Number(b.status === 'resolved') ||
      SEV_ORDER[a.severity] - SEV_ORDER[b.severity] ||
      b.created_at.localeCompare(a.created_at),
  );
}

export function useIssues() {
  return useCachedQuery(
    'issues',
    async () => {
      const rows = must(
        await supabase
          .from('issues')
          .select('*, issue_notes(id, body, created_by, created_at)')
          .order('created_at', { ascending: false })
          .limit(500),
      ) as Issue[];
      for (const i of rows) i.issue_notes.sort((x, y) => x.created_at.localeCompare(y.created_at));
      return rows;
    },
    { realtime: ['issues', 'issue_notes'] },
  );
}

export const issueActions = {
  uploadPhoto: async (userId: string, file: Blob): Promise<string> => {
    const path = `${userId}/${crypto.randomUUID()}.jpg`;
    const { error } = await supabase.storage
      .from('issues')
      .upload(path, file, { contentType: 'image/jpeg' });
    if (error) throw dbError(error);
    return path;
  },
  photoUrl: async (path: string): Promise<string> => {
    const { data, error } = await supabase.storage.from('issues').createSignedUrl(path, 3600);
    if (error || !data) throw dbError(error ?? { message: 'missing' });
    return data.signedUrl;
  },
  report: (row: Partial<Issue> & { reported_by: string }) =>
    run(supabase.from('issues').insert({ ...row, status: 'open' })),
  update: (id: string, row: Partial<Issue>) =>
    run(supabase.from('issues').update(row).eq('id', id)),
  setStatus: (issue: string, status: IssueStatus, note?: string) =>
    run(supabase.rpc('set_issue_status', { issue, new_status: status, note: note ?? null })),
  addNote: (issueId: string, body: string, createdBy: string) =>
    run(supabase.from('issue_notes').insert({ issue_id: issueId, body, created_by: createdBy })),
  remove: (id: string) => run(supabase.from('issues').delete().eq('id', id)),
};
