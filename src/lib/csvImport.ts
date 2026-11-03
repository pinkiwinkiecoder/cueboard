// Planning importeren uit Excel, Google Sheets of CSV (plakken of bestand).
// Herkent Engelse en Nederlandse kolomnamen en soorten.
import type { MsgKey } from '@/i18n';
import { itemTimes, type ScheduleKind } from './schedule';

/** Splitst tekst in rijen en cellen. Herkent tab, puntkomma of komma en "aanhalingstekens". */
export function parseDelimited(text: string): string[][] {
  const clean = text.replace(/^\uFEFF/, '').replace(/\r\n?/g, '\n');
  const firstLine = clean.split('\n', 1)[0] ?? '';
  const count = (ch: string) => firstLine.split(ch).length - 1;
  const delim = count('\t') > 0 ? '\t' : count(';') >= count(',') && count(';') > 0 ? ';' : ',';

  const rows: string[][] = [];
  let row: string[] = [];
  let cell = '';
  let quoted = false;
  for (let i = 0; i < clean.length; i++) {
    const ch = clean[i];
    if (quoted) {
      if (ch === '"' && clean[i + 1] === '"') {
        cell += '"';
        i++;
      } else if (ch === '"') quoted = false;
      else cell += ch;
    } else if (ch === '"' && cell === '') quoted = true;
    else if (ch === delim) {
      row.push(cell.trim());
      cell = '';
    } else if (ch === '\n') {
      row.push(cell.trim());
      if (row.some((c) => c !== '')) rows.push(row);
      row = [];
      cell = '';
    } else cell += ch;
  }
  row.push(cell.trim());
  if (row.some((c) => c !== '')) rows.push(row);
  return rows;
}

type Column = 'day' | 'start' | 'end' | 'title' | 'kind' | 'location' | 'teams' | 'notes';

const HEADERS: Record<Column, string[]> = {
  day: ['day', 'dag', 'date', 'datum'],
  start: ['start', 'begin', 'from', 'van', 'starttijd', 'start time'],
  end: ['end', 'einde', 'eind', 'to', 'tot', 'eindtijd', 'end time'],
  title: ['title', 'titel', 'what', 'wat', 'item', 'name', 'naam', 'act', 'artist', 'artiest'],
  kind: ['type', 'kind', 'soort'],
  location: ['location', 'locatie', 'stage', 'podium', 'zaal', 'room', 'plaats'],
  teams: ['teams', 'team', 'department', 'departments', 'afdeling', 'afdelingen'],
  notes: ['notes', 'note', 'notities', 'notitie', 'opmerkingen', 'opmerking', 'remarks'],
};

const KIND_WORDS: Record<ScheduleKind, string[]> = {
  arrival: ['arrival', 'aankomst', 'load-in', 'load in', 'get-in'],
  soundcheck: ['soundcheck', 'sound check', 'linecheck', 'line check'],
  interview: ['interview', 'press', 'pers', 'interview / press', 'interview / pers'],
  performance: ['performance', 'show', 'optreden', 'set', 'concert', 'act'],
  changeover: ['changeover', 'change over', 'ombouw', 'wissel'],
  briefing: ['briefing', 'meeting', 'vergadering'],
  other: ['other', 'overig', 'anders'],
};

export const TEMPLATE_HEADER = [
  'Day',
  'Start',
  'End',
  'Title',
  'Type',
  'Location',
  'Teams',
  'Notes',
];

export interface ImportContext {
  days: { id: string; date: string; label: string }[];
  locations: { id: string; name: string }[];
  departments: { id: string; name: string }[];
}

export interface ImportRow {
  line: number;
  day_id: string;
  starts_at: string;
  ends_at: string;
  title: string;
  kind: ScheduleKind;
  /** null = geen locatie; string = naam die (nog) niet bestaat */
  location_id: string | null;
  new_location: string | null;
  department_ids: string[];
  notes: string | null;
}

export interface ImportProblem {
  line: number;
  key: MsgKey;
  value: string;
}

const norm = (s: string) => s.trim().toLowerCase();

function findColumns(header: string[]): Partial<Record<Column, number>> | null {
  const out: Partial<Record<Column, number>> = {};
  header.forEach((h, idx) => {
    const n = norm(h);
    for (const col of Object.keys(HEADERS) as Column[]) {
      if (out[col] === undefined && HEADERS[col].includes(n)) out[col] = idx;
    }
  });
  return out.title !== undefined && out.start !== undefined ? out : null;
}

function parseTime(v: string): string | null {
  const m = v.trim().match(/^(\d{1,2})[:.hu](\d{2})/);
  if (!m) return null;
  const h = Number(m[1]);
  const min = Number(m[2]);
  if (h > 23 || min > 59) return null;
  return `${String(h).padStart(2, '0')}:${String(min).padStart(2, '0')}`;
}

function parseDay(v: string, days: ImportContext['days']) {
  const n = norm(v);
  const byLabel = days.find((d) => norm(d.label) === n);
  if (byLabel) return byLabel;
  const iso = n.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  const eu = n.match(/^(\d{1,2})[/.-](\d{1,2})[/.-](\d{4})$/);
  const date = iso
    ? `${iso[1]}-${iso[2]}-${iso[3]}`
    : eu
      ? `${eu[3]}-${(eu[2] ?? '').padStart(2, '0')}-${(eu[1] ?? '').padStart(2, '0')}`
      : null;
  return date ? days.find((d) => d.date === date) : undefined;
}

function parseKind(v: string): ScheduleKind {
  const n = norm(v);
  for (const k of Object.keys(KIND_WORDS) as ScheduleKind[]) {
    if (KIND_WORDS[k].includes(n)) return k;
  }
  return 'other';
}

/** Zet rijen om naar planningsitems. Fouten per regel, zodat je ze kunt verbeteren. */
export function mapRows(
  rows: string[][],
  ctx: ImportContext,
): { items: ImportRow[]; problems: ImportProblem[]; headerFound: boolean } {
  const [header, ...body] = rows;
  const cols = header ? findColumns(header) : null;
  if (!cols) return { items: [], problems: [], headerFound: false };

  const items: ImportRow[] = [];
  const problems: ImportProblem[] = [];
  const get = (r: string[], c: Column) => (cols[c] === undefined ? '' : (r[cols[c] ?? -1] ?? ''));
  const onlyDay = ctx.days.length === 1 ? ctx.days[0] : undefined;

  body.forEach((r, i) => {
    const line = i + 2; // regel 1 is de kop
    const title = get(r, 'title');
    if (!title) return problems.push({ line, key: 'import.errTitle', value: '' });
    const dayRaw = get(r, 'day');
    const day = dayRaw ? parseDay(dayRaw, ctx.days) : onlyDay;
    if (!day) return problems.push({ line, key: 'import.errDay', value: dayRaw });
    const start = parseTime(get(r, 'start'));
    if (!start) return problems.push({ line, key: 'import.errStart', value: get(r, 'start') });
    const endRaw = get(r, 'end');
    const end = endRaw ? parseTime(endRaw) : null;
    if (endRaw && !end) return problems.push({ line, key: 'import.errEnd', value: endRaw });

    const locRaw = get(r, 'location');
    const loc = locRaw ? ctx.locations.find((l) => norm(l.name) === norm(locRaw)) : undefined;
    const teams = get(r, 'teams')
      .split(/[,/|+]/)
      .map((x) => x.trim())
      .filter(Boolean);
    const department_ids: string[] = [];
    for (const name of teams) {
      const d = ctx.departments.find((x) => norm(x.name) === norm(name));
      if (d) department_ids.push(d.id);
      else problems.push({ line, key: 'import.warnTeam', value: name });
    }
    // Zonder eindtijd: 30 minuten.
    const endTime =
      end ??
      (() => {
        const [h, m] = start.split(':').map(Number) as [number, number];
        const t = h * 60 + m + 30;
        return `${String(Math.floor(t / 60) % 24).padStart(2, '0')}:${String(t % 60).padStart(2, '0')}`;
      })();

    items.push({
      line,
      day_id: day.id,
      ...itemTimes(day.date, start, endTime),
      title: title.slice(0, 140),
      kind: parseKind(get(r, 'kind')),
      location_id: loc?.id ?? null,
      new_location: locRaw && !loc ? locRaw.slice(0, 60) : null,
      department_ids,
      notes: get(r, 'notes') || null,
    });
  });
  return { items, problems, headerFound: true };
}

export function templateCsv(dayLabels: string[]): string {
  const d1 = dayLabels[0] ?? 'Friday';
  const lines = [
    TEMPLATE_HEADER,
    [d1, '14:00', '14:30', 'Arrival The Lanterns', 'Arrival', 'Main Stage', 'Hospitality', ''],
    [d1, '15:00', '15:45', 'Soundcheck The Lanterns', 'Soundcheck', 'Main Stage', 'Production', ''],
    [d1, '20:00', '21:00', 'The Lanterns', 'Performance', 'Main Stage', '', 'Pyro at the end'],
    [d1, '21:00', '21:30', 'Changeover', 'Changeover', 'Main Stage', 'Production', ''],
  ];
  return lines
    .map((l) => l.map((c) => (/[;"\n]/.test(c) ? `"${c.replace(/"/g, '""')}"` : c)).join(';'))
    .join('\n');
}
