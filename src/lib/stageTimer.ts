// Stage timer: rekenen met servertijd zodat alle schermen gelijk lopen.

export interface StageView {
  server_now: string;
  location: string;
  title: string | null;
  state: 'idle' | 'running' | 'paused';
  duration_s: number;
  remaining_s: number;
  started_at: string | null;
  message: string | null;
  blackout: boolean;
  warn_s: number;
  danger_s: number;
  next: { title: string; starts_at: string } | null;
}

export type Phase = 'normal' | 'warn' | 'danger' | 'over';

/**
 * Verschil tussen servertijd en de klok van dit toestel, in ms.
 * Gebruikt het midden van het verzoek (zoals NTP), zodat netwerkvertraging uitvalt.
 */
export function clockOffset(serverIso: string, sentAt: number, receivedAt: number): number {
  return Date.parse(serverIso) - (sentAt + receivedAt) / 2;
}

/** Resterende seconden op servertijd `nowMs` (negatief = uitloop). */
export function remainingSeconds(
  v: Pick<StageView, 'state' | 'remaining_s' | 'started_at'>,
  nowMs: number,
): number {
  if (v.state !== 'running' || !v.started_at) return v.remaining_s;
  return v.remaining_s - Math.floor((nowMs - Date.parse(v.started_at)) / 1000);
}

export function phaseFor(left: number, warn: number, danger: number): Phase {
  if (left < 0) return 'over';
  if (left <= danger) return 'danger';
  if (left <= warn) return 'warn';
  return 'normal';
}

/** 75:00, 1:15:00, en bij uitloop +2:05. */
export function formatClock(seconds: number): string {
  const over = seconds < 0;
  const s = Math.abs(seconds);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  const body =
    h > 0
      ? `${h}:${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`
      : `${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
  return over ? `+${body}` : body;
}
