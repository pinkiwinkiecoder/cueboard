import type { MsgKey } from '@/i18n';

export const MIN_PASSWORD_LENGTH = 10;

/** Geeft de vertaalsleutel van het probleem terug, of null als het wachtwoord goed is. */
export function passwordProblem(pw: string): MsgKey | null {
  if (pw.length < MIN_PASSWORD_LENGTH) return 'auth.pwTooShort';
  if (!/[a-z]/.test(pw) || !/[A-Z]/.test(pw)) return 'auth.pwCase';
  if (!/[0-9]/.test(pw)) return 'auth.pwDigit';
  return null;
}
