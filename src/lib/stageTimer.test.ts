import { describe, expect, it } from 'vitest';
import { clockOffset, formatClock, phaseFor, remainingSeconds } from './stageTimer';

describe('stage timer', () => {
  it('berekent het klokverschil met het midden van het verzoek', () => {
    // Server zegt 12:00:01.000; verzoek ging weg om 12:00:00.000 en kwam terug om 12:00:00.200 (lokale klok).
    const base = Date.parse('2027-07-16T12:00:00.000Z');
    expect(clockOffset('2027-07-16T12:00:01.000Z', base, base + 200)).toBe(900);
  });
  it('telt af terwijl hij loopt, en staat stil op pauze', () => {
    const started = '2027-07-16T20:00:00.000Z';
    const now = Date.parse('2027-07-16T20:10:30.000Z');
    expect(
      remainingSeconds({ state: 'running', remaining_s: 4500, started_at: started }, now),
    ).toBe(3870);
    expect(remainingSeconds({ state: 'paused', remaining_s: 4500, started_at: null }, now)).toBe(
      4500,
    );
  });
  it('gaat negatief bij uitloop', () => {
    const now = Date.parse('2027-07-16T20:01:05.000Z');
    expect(
      remainingSeconds(
        { state: 'running', remaining_s: 60, started_at: '2027-07-16T20:00:00.000Z' },
        now,
      ),
    ).toBe(-5);
  });
  it('kiest de kleurfase', () => {
    expect(phaseFor(600, 300, 60)).toBe('normal');
    expect(phaseFor(300, 300, 60)).toBe('warn');
    expect(phaseFor(30, 300, 60)).toBe('danger');
    expect(phaseFor(-1, 300, 60)).toBe('over');
  });
  it('toont de tijd leesbaar', () => {
    expect(formatClock(4500)).toBe('1:15:00');
    expect(formatClock(305)).toBe('05:05');
    expect(formatClock(-125)).toBe('+02:05');
    expect(formatClock(0)).toBe('00:00');
  });
});
