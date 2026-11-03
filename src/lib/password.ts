export const MIN_PASSWORD_LENGTH = 10;

/** Geeft een Nederlandse uitleg terug als het wachtwoord niet voldoet, anders null. */
export function passwordProblem(pw: string): string | null {
  if (pw.length < MIN_PASSWORD_LENGTH) return `Gebruik minstens ${MIN_PASSWORD_LENGTH} tekens.`;
  if (!/[a-z]/.test(pw) || !/[A-Z]/.test(pw))
    return 'Gebruik zowel kleine letters als hoofdletters.';
  if (!/[0-9]/.test(pw)) return 'Gebruik minstens één cijfer.';
  return null;
}
