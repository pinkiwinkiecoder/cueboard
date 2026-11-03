import { describe, expect, it } from 'vitest';
import { ACCENTS, DEFAULT_PREFS, sanitize, type Prefs } from './prefs';

function contrast(hexA: string, hexB: string): number {
  const lum = (hex: string) => {
    const [r, g, b] = [1, 3, 5].map((i) => {
      const c = parseInt(hex.slice(i, i + 2), 16) / 255;
      return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
    }) as [number, number, number];
    return 0.2126 * r + 0.7152 * g + 0.0722 * b;
  };
  const [l1, l2] = [lum(hexA), lum(hexB)].sort((a, b) => b - a) as [number, number];
  return (l1 + 0.05) / (l2 + 0.05);
}

describe('sanitize', () => {
  it('valt terug op standaarden bij onzin', () => {
    const bad = { theme: 'neon', accent: 'regenboog', textSize: 'mega' } as unknown as Prefs;
    expect(sanitize({ ...DEFAULT_PREFS, ...bad })).toEqual(DEFAULT_PREFS);
  });
  it('houdt geldige keuzes', () => {
    const p: Prefs = { ...DEFAULT_PREFS, theme: 'light', accent: 'blauw', textSize: 'extra' };
    expect(sanitize(p)).toEqual(p);
  });
});

describe('accentkleuren', () => {
  // WCAG AA voor grote tekst/knoppen: 3:1 tegen de achtergrond, 4.5:1 voor tekst op de knop.
  for (const a of ACCENTS) {
    it(`${a.label} is leesbaar in donker en licht`, () => {
      expect(contrast(a.dark.accent, '#14112a')).toBeGreaterThanOrEqual(4.5);
      expect(contrast(a.dark.accent, a.dark.accentText)).toBeGreaterThanOrEqual(4.5);
      expect(contrast(a.light.accent, '#f6f3fc')).toBeGreaterThanOrEqual(4.5);
      expect(contrast(a.light.accent, a.light.accentText)).toBeGreaterThanOrEqual(4.5);
    });
  }
});
