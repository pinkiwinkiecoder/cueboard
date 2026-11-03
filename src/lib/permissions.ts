// Catalogus van rechten. Moet overeenkomen met public.permission_keys() in de database.
// Labels en uitleg staan in i18n onder perms.<sleutel met _ in plaats van .>.

export const PERMISSION_GROUPS = [
  {
    id: 'see',
    keys: [
      'view.schedule',
      'view.tasks',
      'view.artists',
      'view.documents',
      'view.people',
      'view.issues',
      'view.dashboard',
    ],
  },
  {
    id: 'manage',
    keys: [
      'people.manage',
      'settings.manage',
      'schedule.manage',
      'tasks.manage_all',
      'tasks.manage_department',
      'tasks.claim',
      'documents.manage',
      'artists.manage',
      'announcements.send',
      'issues.manage',
      'audit.view',
    ],
  },
] as const;

export type Permission = (typeof PERMISSION_GROUPS)[number]['keys'][number];

export const ALL_PERMISSIONS: readonly Permission[] = PERMISSION_GROUPS.flatMap((g) => g.keys);

/** i18n-sleutel voor een recht: 'view.tasks' → 'view_tasks'. */
export function permKey(p: Permission): string {
  return p.replace(/\./g, '_');
}

export const MODULES = [
  'schedule',
  'tasks',
  'artists',
  'documents',
  'people',
  'issues',
  'dashboard',
] as const;
export type ModuleKey = (typeof MODULES)[number];

/** Kleuren die rollen, afdelingen en locaties kunnen krijgen (zie tokens.css). */
export const PALETTE = [
  'violet',
  'gold',
  'mint',
  'sky',
  'pink',
  'peach',
  'rose',
  'lime',
  'teal',
] as const;
export type PaletteColor = (typeof PALETTE)[number];

export function isPaletteColor(v: unknown): v is PaletteColor {
  return typeof v === 'string' && (PALETTE as readonly string[]).includes(v);
}
