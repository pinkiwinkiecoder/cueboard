import { describe, expect, it } from 'vitest';
import { en } from './en';
import { nl } from './nl';
import { translate } from './index';

function keys(obj: object, prefix = ''): string[] {
  return Object.entries(obj).flatMap(([k, v]) =>
    typeof v === 'string' ? [`${prefix}${k}`] : keys(v as object, `${prefix}${k}.`),
  );
}

function placeholders(s: string): string[] {
  return [...s.matchAll(/\{(\w+)\}/g)].map((m) => m[1] ?? '').sort();
}

describe('vertalingen', () => {
  it('Nederlands heeft precies dezelfde sleutels als Engels', () => {
    expect(keys(nl).sort()).toEqual(keys(en).sort());
  });

  it('gebruikt dezelfde plaatshouders in elke taal', () => {
    for (const k of keys(en)) {
      const e = translate('en', k as never);
      const n = translate('nl', k as never);
      expect(placeholders(n), k).toEqual(placeholders(e));
    }
  });

  it('vult plaatshouders in', () => {
    expect(translate('en', 'people.call', { name: 'Sam' })).toBe('Call Sam');
    expect(translate('nl', 'people.call', { name: 'Sam' })).toBe('Bel Sam');
  });

  it('Engels is standaard bij onbekende sleutel', () => {
    expect(translate('nl', 'bestaat.niet' as never)).toBe('bestaat.niet');
  });
});
