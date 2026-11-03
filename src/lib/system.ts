import { FunctionsHttpError } from '@supabase/supabase-js';
import { AppError } from '@/i18n';
import { supabase } from './supabase';
import { dbError } from './query';

export const APP_VERSION = import.meta.env.VITE_APP_VERSION ?? 'dev';

// --------------------------------------------------------------------------
// Foutlogging: stuur fouten (zonder persoonsgegevens) naar de database.
// --------------------------------------------------------------------------
let installed = false;
let sentThisSession = 0;

export function reportError(
  kind: 'error' | 'unhandled' | 'render' | 'network',
  err: unknown,
  location?: string,
) {
  if (sentThisSession >= 30) return; // nooit een stortvloed vanaf één toestel
  sentThisSession++;
  const message =
    err instanceof Error
      ? `${err.name}: ${err.message}`
      : typeof err === 'string'
        ? err
        : 'Unknown error';
  void supabase
    .rpc('log_client_error', {
      kind,
      // E-mailadressen en lange cijferreeksen eruit halen voor de zekerheid.
      message: message
        .replace(/[\w.+-]+@[\w-]+\.[\w.]+/g, '[email]')
        .replace(/\d{6,}/g, '[n]')
        .slice(0, 300),
      location: (location ?? window.location.pathname).slice(0, 200),
      app_version: APP_VERSION,
      user_agent: navigator.userAgent.slice(0, 200),
    })
    .then(
      () => undefined,
      () => undefined,
    );
}

export function installErrorReporting() {
  if (installed || import.meta.env.DEV) return;
  installed = true;
  window.addEventListener('error', (e) => reportError('error', e.error ?? e.message));
  window.addEventListener('unhandledrejection', (e) => reportError('unhandled', e.reason));
}

// --------------------------------------------------------------------------
// Systeemstatus en foutenlijst voor beheerders
// --------------------------------------------------------------------------
export interface Health {
  checked_at: string;
  db_bytes: number;
  storage_bytes: number;
  people_active: number;
  people_total: number;
  errors_24h: number;
}

export async function fetchHealth(): Promise<Health> {
  const { data, error } = await supabase.rpc('system_health');
  if (error) throw dbError(error);
  return data as Health;
}

export interface ClientError {
  id: number;
  at: string;
  kind: string;
  message: string;
  location: string | null;
  app_version: string | null;
  user_agent: string | null;
}

export async function fetchErrors(): Promise<ClientError[]> {
  const { data, error } = await supabase
    .from('client_errors')
    .select('id, at, kind, message, location, app_version, user_agent')
    .order('at', { ascending: false })
    .limit(50);
  if (error) throw dbError(error);
  return data as ClientError[];
}

/** Gratis limieten van Supabase (gecontroleerd 03-11-2026). */
export const LIMITS = { db_bytes: 500 * 1024 * 1024, storage_bytes: 1024 * 1024 * 1024 };

// --------------------------------------------------------------------------
// Export en wissen
// --------------------------------------------------------------------------
export function downloadJson(filename: string, data: unknown) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}

export async function exportPerson(id?: string) {
  const { data, error } = await supabase.rpc('export_person', id ? { target: id } : {});
  if (error) throw dbError(error);
  return data as Record<string, unknown>;
}

const EXPORT_TABLES = [
  'event',
  'event_days',
  'locations',
  'departments',
  'department_members',
  'roles',
  'profiles',
  'schedule_items',
  'schedule_published',
  'schedule_publications',
  'tasks',
  'task_assignees',
  'task_subtasks',
  'task_groups',
  'task_packages',
  'package_items',
  'announcements',
  'announcement_reads',
] as const;

/** Alles wat de beheerder mag lezen, als één JSON-bestand. */
export async function exportEverything(onProgress?: (table: string) => void) {
  const out: Record<string, unknown> = {
    exported_at: new Date().toISOString(),
    app_version: APP_VERSION,
  };
  for (const table of EXPORT_TABLES) {
    onProgress?.(table);
    const rows: unknown[] = [];
    for (let from = 0; ; from += 1000) {
      const { data, error } = await supabase
        .from(table)
        .select('*')
        .range(from, from + 999);
      if (error) throw dbError(error);
      rows.push(...(data ?? []));
      if (!data || data.length < 1000) break;
    }
    out[table] = rows;
  }
  return out;
}

export async function purgePersonalData(): Promise<{ deleted: number; failed: number }> {
  const { data, error } = await supabase.functions.invoke<{ deleted: number; failed: number }>(
    'privacy',
    {
      body: { action: 'purge', confirm: 'DELETE' },
    },
  );
  if (error) {
    if (error instanceof FunctionsHttpError) throw new AppError('errors.purgeFailed');
    throw new AppError('errors.network');
  }
  return data ?? { deleted: 0, failed: 0 };
}
