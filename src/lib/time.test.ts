import { describe, expect, it } from 'vitest';
import { formatTime, isoToLocal, localToIso, minutesUntil } from './time';

describe('tijd', () => {
  it('rekent zomertijd in Brussel juist om', () => {
    expect(localToIso('2027-07-16', '21:30')).toBe('2027-07-16T19:30:00.000Z');
  });
  it('rekent wintertijd in Brussel juist om', () => {
    expect(localToIso('2027-01-15', '09:00')).toBe('2027-01-15T08:00:00.000Z');
  });
  it('is omkeerbaar', () => {
    expect(isoToLocal(localToIso('2027-07-17', '00:15'))).toEqual({
      day: '2027-07-17',
      time: '00:15',
    });
  });
  it('toont 24-uursnotatie in Engels en Nederlands', () => {
    expect(formatTime('2027-07-16T19:30:00Z', 'en-GB')).toBe('21:30');
    expect(formatTime('2027-07-16T19:30:00Z', 'nl-BE')).toBe('21:30');
  });
  it('minuten tot een moment', () => {
    const now = new Date('2027-07-16T19:00:00Z');
    expect(minutesUntil(new Date('2027-07-16T19:12:00Z'), now)).toBe(12);
    expect(minutesUntil(new Date('2027-07-16T18:57:00Z'), now)).toBe(-3);
  });
});
