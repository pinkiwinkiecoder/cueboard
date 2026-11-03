import { describe, expect, it } from 'vitest';
import { en } from './en';
import { nl } from './nl';
import { LANGUAGES, translate } from './index';
import type { Lang } from './types';

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
    for (const { id } of LANGUAGES) {
      for (const k of keys(en)) {
        const e = translate('en', k as never);
        const other = translate(id as Lang, k as never);
        expect(placeholders(other), `${id}: ${k}`).toEqual(placeholders(e));
      }
    }
  });

  it('elke taal vertaalt echt (geen lege teksten)', () => {
    for (const { id } of LANGUAGES) {
      for (const k of keys(en)) expect(translate(id as Lang, k as never).trim(), `${id}: ${k}`).not.toBe('');
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
