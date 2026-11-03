import { describe, expect, it } from 'vitest';
import { generatePassword } from './invite';
import { passwordProblem } from './password';

describe('gegenereerd wachtwoord', () => {
  it('voldoet altijd aan de regels en is telkens anders', () => {
    const seen = new Set<string>();
    for (let i = 0; i < 200; i++) {
      const pw = generatePassword();
      expect(pw).toHaveLength(14);
      expect(passwordProblem(pw)).toBeNull();
      expect(pw).not.toMatch(/[0O1lI]/);
      seen.add(pw);
    }
    expect(seen.size).toBe(200);
  });
});
