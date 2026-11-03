import { describe, expect, it } from 'vitest';
import { ALL_PERMISSIONS, MODULES } from './permissions';
import { buildSetup, PRESETS, presetCounts } from './presets';

describe('presets', () => {
  it('hebben unieke ids', () => {
    expect(new Set(PRESETS.map((p) => p.id)).size).toBe(PRESETS.length);
  });

  for (const p of PRESETS) {
    describe(p.id, () => {
      for (const lang of ['en', 'nl'] as const) {
        const s = buildSetup(p, lang);
        const teamNames = s.departments.flatMap((d) => [d.name, ...d.children.map((c) => c.name)]);

        it(`(${lang}) teamnamen zijn uniek en niet leeg`, () => {
          expect(new Set(teamNames).size).toBe(teamNames.length);
          expect(teamNames.every((n) => n.trim().length > 0 && n.length <= 60)).toBe(true);
        });
        it(`(${lang}) rolnamen, locaties en pakketten zijn uniek`, () => {
          for (const list of [s.roles, s.locations, s.packages]) {
            const names = list.map((x) => x.name);
            expect(new Set(names).size).toBe(names.length);
          }
          expect(s.roles.every((r) => r.name.length <= 40)).toBe(true);
        });
        it(`(${lang}) pakketten verwijzen naar een bestaand team`, () => {
          for (const k of s.packages) {
            if (k.department !== null) expect(teamNames).toContain(k.department);
          }
        });
      }
      it('gebruikt enkel bestaande rechten en modules', () => {
        for (const r of p.roles)
          for (const perm of r.permissions) expect(ALL_PERMISSIONS).toContain(perm);
        for (const m of p.modules) expect(MODULES).toContain(m);
      });
      it('telt teams inclusief subteams', () => {
        expect(presetCounts(p).teams).toBeGreaterThanOrEqual(p.teams.length);
      });
    });
  }
});
