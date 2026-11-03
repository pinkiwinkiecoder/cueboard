// Tijden altijd in 24-uursnotatie en in de tijdzone van het festival.
export const FESTIVAL_TZ = 'Europe/Brussels';

const timeFmt = new Intl.DateTimeFormat('nl-BE', {
  hour: '2-digit',
  minute: '2-digit',
  hourCycle: 'h23',
  timeZone: FESTIVAL_TZ,
});
const dayLongFmt = new Intl.DateTimeFormat('nl-BE', {
  weekday: 'long',
  day: 'numeric',
  month: 'long',
  timeZone: FESTIVAL_TZ,
});
const dayShortFmt = new Intl.DateTimeFormat('nl-BE', {
  weekday: 'short',
  day: 'numeric',
  month: 'short',
  timeZone: FESTIVAL_TZ,
});

export function formatTime(d: Date | string): string {
  return timeFmt.format(typeof d === 'string' ? new Date(d) : d);
}

export function formatDayLong(d: Date | string): string {
  return dayLongFmt.format(typeof d === 'string' ? new Date(d) : d);
}

export function formatDayShort(d: Date | string): string {
  return dayShortFmt.format(typeof d === 'string' ? new Date(d) : d);
}

/** "nog 12 min", "nu bezig", "3 min geleden" */
export function relativeMinutes(target: Date, now: Date): string {
  const min = Math.round((target.getTime() - now.getTime()) / 60_000);
  if (min === 0) return 'nu';
  if (min > 0)
    return min >= 60 ? `over ${Math.floor(min / 60)} u ${min % 60} min` : `over ${min} min`;
  const past = -min;
  return past >= 60 ? `${Math.floor(past / 60)} u ${past % 60} min geleden` : `${past} min geleden`;
}

/** Zet "HH:MM" op een festivaldag (YYYY-MM-DD) om naar een ISO-tijdstip in Brussel. */
export function localToIso(day: string, hhmm: string): string {
  const [y, m, d] = day.split('-').map(Number) as [number, number, number];
  const [hh, mm] = hhmm.split(':').map(Number) as [number, number];
  // Zoek de UTC-offset van Brussel op dat moment (zomer/winter).
  const guess = new Date(Date.UTC(y, m - 1, d, hh, mm));
  const offset = tzOffsetMinutes(guess);
  return new Date(guess.getTime() - offset * 60_000).toISOString();
}

/** Lokale tijd "HH:MM" en dag "YYYY-MM-DD" in Brussel voor een tijdstip. */
export function isoToLocal(iso: string): { day: string; time: string } {
  const parts = new Intl.DateTimeFormat('en-CA', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
    timeZone: FESTIVAL_TZ,
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
