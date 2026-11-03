// Tijden altijd in 24-uursnotatie en in de tijdzone van het festival.
export const FESTIVAL_TZ = 'Europe/Brussels';

const cache = new Map<string, Intl.DateTimeFormat>();
function fmt(locale: string, opts: Intl.DateTimeFormatOptions): Intl.DateTimeFormat {
  const key = locale + JSON.stringify(opts);
  let f = cache.get(key);
  if (!f) {
    f = new Intl.DateTimeFormat(locale, { ...opts, timeZone: FESTIVAL_TZ });
    cache.set(key, f);
  }
  return f;
}

const asDate = (d: Date | string) => (typeof d === 'string' ? new Date(d) : d);

export function formatTime(d: Date | string, locale = 'en-GB'): string {
  return fmt(locale, { hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).format(asDate(d));
}

export function formatDayLong(d: Date | string, locale = 'en-GB'): string {
  return fmt(locale, { weekday: 'long', day: 'numeric', month: 'long' }).format(asDate(d));
}

export function formatDayShort(d: Date | string, locale = 'en-GB'): string {
  return fmt(locale, { weekday: 'short', day: 'numeric', month: 'short' }).format(asDate(d));
}

/** Verschil in minuten (positief = in de toekomst). Tekst maken gebeurt in de UI. */
export function minutesUntil(target: Date, now: Date): number {
  return Math.round((target.getTime() - now.getTime()) / 60_000);
}

/** Zet "HH:MM" op een festivaldag (YYYY-MM-DD) om naar een ISO-tijdstip in Brussel. */
export function localToIso(day: string, hhmm: string): string {
  const [y, m, d] = day.split('-').map(Number) as [number, number, number];
  const [hh, mm] = hhmm.split(':').map(Number) as [number, number];
  const guess = new Date(Date.UTC(y, m - 1, d, hh, mm));
  const offset = tzOffsetMinutes(guess);
  return new Date(guess.getTime() - offset * 60_000).toISOString();
}

/** Lokale tijd "HH:MM" en dag "YYYY-MM-DD" in Brussel voor een tijdstip. */
export function isoToLocal(iso: string): { day: string; time: string } {
  const parts = fmt('en-CA', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(new Date(iso));
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? '00';
  return {
    day: `${get('year')}-${get('month')}-${get('day')}`,
    time: `${get('hour')}:${get('minute')}`,
  };
}

function tzOffsetMinutes(utc: Date): number {
  const { day, time } = isoToLocal(utc.toISOString());
  const asUtc = Date.parse(`${day}T${time}:00Z`);
  return Math.round((asUtc - utc.getTime()) / 60_000);
}
