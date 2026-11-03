import { describe, expect, it } from 'vitest';
import { passwordProblem } from './password';

describe('passwordProblem', () => {
  it('weigert te korte wachtwoorden', () => {
    expect(passwordProblem('Abc12')).toBe('auth.pwTooShort');
  });
  it('vraagt hoofd- en kleine letters', () => {
    expect(passwordProblem('abcdefgh12')).toBe('auth.pwCase');
  });
  it('vraagt een cijfer', () => {
    expect(passwordProblem('Abcdefghijk')).toBe('auth.pwDigit');
  });
  it('aanvaardt een sterk wachtwoord', () => {
    expect(passwordProblem('Podium2026Main')).toBeNull();
  });
});
