import { describe, expect, it } from 'vitest';
import { passwordProblem } from './password';

describe('passwordProblem', () => {
  it('weigert te korte wachtwoorden', () => {
    expect(passwordProblem('Abc12')).toMatch(/minstens 10/);
  });
  it('vraagt hoofd- en kleine letters', () => {
    expect(passwordProblem('abcdefgh12')).toMatch(/hoofdletters/);
  });
  it('vraagt een cijfer', () => {
    expect(passwordProblem('Abcdefghijk')).toMatch(/cijfer/);
  });
  it('aanvaardt een sterk wachtwoord', () => {
    expect(passwordProblem('Podium2026Main')).toBeNull();
  });
});
