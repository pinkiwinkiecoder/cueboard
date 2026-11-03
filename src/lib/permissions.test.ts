/// <reference types="node" />
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { ALL_PERMISSIONS, MODULES } from './permissions';

const sql = readFileSync('supabase/migrations/20261103120000_basis.sql', 'utf8');
const eventSql = readFileSync(
  'supabase/migrations/20261103130000_evenement_en_uitnodigingen.sql',
  'utf8',
);

function sqlArray(source: string, fn: string): string[] {
  const body = source.slice(source.indexOf(`function public.${fn}()`));
  const m = body.match(/array\[([\s\S]*?)\]::text\[\]/);
  return [...(m?.[1] ?? '').matchAll(/'([^']+)'/g)].map((x) => x[1] ?? '');
}

describe('rechten', () => {
  it('app en database kennen dezelfde rechten', () => {
    expect([...ALL_PERMISSIONS].sort()).toEqual(sqlArray(sql, 'permission_keys').sort());
  });
  it('app en database kennen dezelfde modules', () => {
    expect([...MODULES].sort()).toEqual(sqlArray(eventSql, 'module_keys').sort());
  });
});
