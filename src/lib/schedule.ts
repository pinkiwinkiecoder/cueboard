import type { MsgKey } from '@/i18n';
import { supabase } from './supabase';
import { dbError, must, useCachedQuery } from './query';
import { localToIso } from './time';
import type { PaletteColor } from './permissions';

export type ScheduleKind =
  'arrival' | 'soundcheck' | 'interview' | 'performance' | 'changeover' | 'briefing' | 'other';
export type ScheduleStatus = 'planned' | 'confirmed' | 'live' | 'done' | 'delayed';

export interface ScheduleItem {
  id: string;
  day_id: string;
  location_id: string | null;
  title: string;
  kind: ScheduleKind;
  starts_at: string;
  ends_at: string;
  status: ScheduleStatus;
  notes: string | null;
  responsible_id: string | null;
  department_ids: string[];
  depends_on: string | null;
  actual_start: string | null;
  actual_end: string | null;
  /** Enkel in de gepubliceerde versie. */
  changed_at?: string;
}

export const KINDS: ScheduleKind[] = [
  'arrival',
  'soundcheck',
  'interview',
  'performance',
  'changeover',
  'briefing',
  'other',
];
export const KIND_COLOR: Record<ScheduleKind, PaletteColor> = {
  arrival: 'teal',
  soundcheck: 'violet',
  interview: 'pink',
  performance: 'gold',
  changeover: 'peach',
  briefing: 'sky',
  other: 'lime',
};
export const KIND_LABEL: Record<ScheduleKind, MsgKey> = {
  arrival: 'schedule.kindArrival',
  soundcheck: 'schedule.kindSoundcheck',
  interview: 'schedule.kindInterview',
  performance: 'schedule.kindPerformance',
  changeover: 'schedule.kindChangeover',
  briefing: 'schedule.kindBriefing',
  other: 'schedule.kindOther',
};
export const STATUSES: ScheduleStatus[] = ['planned', 'confirmed', 'live', 'done', 'delayed'];
export const SCHEDULE_STATUS_LABEL: Record<ScheduleStatus, MsgKey> = {
  planned: 'schedule.statusPlanned',
  confirmed: 'schedule.statusConfirmed',
  live: 'schedule.statusLive',
  done: 'schedule.statusDone',
  delayed: 'schedule.statusDelayed',
};
export const SCHEDULE_STATUS_COLOR: Record<ScheduleStatus, PaletteColor> = {
  planned: 'sky',
  confirmed: 'violet',
  live: 'mint',
  done: 'lime',
  delayed: 'rose',
};

const ms = (iso: string) => Date.parse(iso);

export function sortByStart(items: ScheduleItem[]): ScheduleItem[] {
  return [...items].sort(
    (a, b) => ms(a.starts_at) - ms(b.starts_at) || a.title.localeCompare(b.title),
  );
}

/** Begin- en eindtijd op een dag; een eindtijd vóór de begintijd valt de volgende dag. */
export function itemTimes(
  dayDate: string,
  start: string,
  end: string,
): { starts_at: string; ends_at: string } {
  const starts_at = localToIso(dayDate, start);
  let ends_at = localToIso(dayDate, end);
  if (ms(ends_at) < ms(starts_at)) ends_at = new Date(ms(ends_at) + 86_400_000).toISOString();
  return { starts_at, ends_at };
}

export interface ShiftPreview {
  item: ScheduleItem;
  starts_at: string;
  ends_at: string;
}

/** Zelfde regel als shift_schedule() in de database: vanaf een tijdstip, niet live/klaar. */
export function previewShift(
  items: ScheduleItem[],
  locationId: string | null,
  fromIso: string,
  minutes: number,
): ShiftPreview[] {
  const delta = minutes * 60_000;
  return sortByStart(items)
    .filter(
      (i) =>
        i.location_id === locationId &&
        ms(i.starts_at) >= ms(fromIso) &&
        i.status !== 'live' &&
        i.status !== 'done',
    )
    .map((item) => ({
      item,
      starts_at: new Date(ms(item.starts_at) + delta).toISOString(),
      ends_at: new Date(ms(item.ends_at) + delta).toISOString(),
    }));
}

export interface NowNext {
  locationId: string | null;
  current: ScheduleItem | null;
  next: ScheduleItem | null;
}

/** Per locatie: wat loopt er nu, en wat komt hierna. Live gaat altijd voor op de klok. */
export function nowAndNext(items: ScheduleItem[], now: Date): NowNext[] {
  const t = now.getTime();
  const byLocation = new Map<string | null, ScheduleItem[]>();
  for (const i of sortByStart(items)) {
    byLocation.set(i.location_id, [...(byLocation.get(i.location_id) ?? []), i]);
  }
  return [...byLocation.entries()].map(([locationId, list]) => {
    const current =
      list.find((i) => i.status === 'live') ??
      list.find((i) => i.status !== 'done' && ms(i.starts_at) <= t && ms(i.ends_at) > t) ??
      null;
    const next =
      list.find(
        (i) =>
          i !== current &&
          i.status !== 'done' &&
          i.status !== 'live' &&
          ms(i.starts_at) >= (current ? ms(current.starts_at) : t) &&
          (current ? true : ms(i.starts_at) > t),
      ) ?? null;
    return { locationId, current, next };
  });
}

/** Items die starten vóór het item waarvan ze afhangen klaar is. */
export function dependencyConflicts(items: ScheduleItem[]): Set<string> {
  const byId = new Map(items.map((i) => [i.id, i]));
  const out = new Set<string>();
  for (const i of items) {
    const dep = i.depends_on ? byId.get(i.depends_on) : undefined;
    if (dep && ms(i.starts_at) < ms(dep.ends_at)) out.add(i.id);
  }
  return out;
}

/** Items die op dezelfde locatie overlappen. */
export function overlaps(items: ScheduleItem[]): Set<string> {
  const out = new Set<string>();
  const sorted = sortByStart(items);
  for (let a = 0; a < sorted.length; a++) {
    for (let b = a + 1; b < sorted.length; b++) {
      const x = sorted[a];
      const y = sorted[b];
      if (!x || !y || x.location_id !== y.location_id) continue;
      if (ms(y.starts_at) >= ms(x.ends_at)) break;
      out.add(x.id);
      out.add(y.id);
    }
  }
  return out;
}

/** Gepubliceerde items die wijzigden na `seenAt`. */
export function changedSince(items: ScheduleItem[], seenAt: number | null): ScheduleItem[] {
  if (seenAt === null) return [];
  return items.filter((i) => i.changed_at !== undefined && ms(i.changed_at) > seenAt);
}

/** Verschil gepland vs werkelijk in minuten (positief = later begonnen). */
export function startDelay(i: ScheduleItem): number | null {
  if (!i.actual_start) return null;
  return Math.round((ms(i.actual_start) - ms(i.starts_at)) / 60_000);
}

// -----------------------------------------------------------------------------
// Data
// -----------------------------------------------------------------------------
const COLS =
  'id, day_id, location_id, title, kind, starts_at, ends_at, status, notes, responsible_id, department_ids, depends_on, actual_start, actual_end';

export function useScheduleDraft(enabled: boolean) {
  return useCachedQuery(
    'schedule_items',
    async () =>
      enabled
        ? (must(
            await supabase.from('schedule_items').select(COLS).order('starts_at'),
          ) as ScheduleItem[])
        : [],
    { realtime: enabled ? ['schedule_items'] : [] },
  );
}

export function useSchedulePublished() {
  return useCachedQuery(
    'schedule_published',
    async () =>
      must(
        await supabase.from('schedule_published').select(`${COLS}, changed_at`).order('starts_at'),
      ) as ScheduleItem[],
    { realtime: ['schedule_published'] },
  );
}

export interface Publication {
  id: string;
  day_id: string;
  published_at: string;
  added: number;
  changed: number;
  removed: number;
  removed_titles: string[];
}

export function usePublications() {
  return useCachedQuery(
    'schedule_publications',
    async () =>
      must(
        await supabase
          .from('schedule_publications')
          .select('id, day_id, published_at, added, changed, removed, removed_titles')
          .order('published_at', { ascending: false })
          .limit(50),
      ) as Publication[],
    { realtime: ['schedule_publications'] },
  );
}

async function rpc<T>(fn: string, args: Record<string, unknown>): Promise<T> {
  const { data, error } = await supabase.rpc(fn, args);
  if (error) throw dbError(error);
  return data as T;
}

export const scheduleActions = {
  publish: (day: string) =>
    rpc<{ added: number; changed: number; removed: number }>('publish_schedule', { day }),
  shift: (day: string, location: string | null, fromIso: string, minutes: number) =>
    rpc<number>('shift_schedule', { day, location, from_time: fromIso, minutes }),
  live: (item: string, action: 'start' | 'done' | 'delayed' | 'reset') =>
    rpc<null>('set_schedule_live', { item, action }),
};

/** Laatst gezien per dag, per toestel (voor "wat is er gewijzigd"). */
export function getSeen(dayId: string): number | null {
  try {
    const v = localStorage.getItem(`aof-seen-${dayId}`);
    return v ? Number(v) : null;
  } catch {
    return null;
  }
}
export function setSeen(dayId: string, at = Date.now()): void {
  try {
    localStorage.setItem(`aof-seen-${dayId}`, String(at));
  } catch {
    // privémodus: dan tonen we geen wijzigingen
  }
}
