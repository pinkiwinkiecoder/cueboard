// Snelle databasetest zonder Docker: draait alle migraties en tests in PGlite
// (Postgres in Node), met een minimale nabootsing van Supabase-auth en pgTAP.
// De echte controle gebeurt in CI met `supabase test db`; dit is voor onderweg.
// Gebruik: npm run db:test:lite
import { PGlite } from '@electric-sql/pglite';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

const root = process.argv[2] ?? process.cwd();
const db = new PGlite();

const stub = `
create role anon nologin; create role authenticated nologin; create role service_role nologin bypassrls;
create schema auth; create schema extensions;
grant usage on schema public, auth to anon, authenticated, service_role;
alter default privileges in schema public grant all on tables to anon, authenticated, service_role;
alter default privileges in schema public grant all on sequences to anon, authenticated, service_role;
alter default privileges in schema public grant execute on functions to anon, authenticated, service_role;
create table auth.users (
  id uuid primary key, email text, raw_app_meta_data jsonb default '{}', raw_user_meta_data jsonb default '{}',
  created_at timestamptz default now()
);
create function auth.uid() returns uuid language sql stable as
  $$ select nullif(current_setting('request.jwt.claims', true)::jsonb ->> 'sub', '')::uuid $$;
grant execute on function auth.uid() to public;

-- Mini-pgTAP: enkel de functies die onze tests gebruiken.
create schema tap; grant usage on schema tap to public;
create table tap.r (n serial, ok boolean, descr text, info text); grant all on tap.r, tap.r_n_seq to public;
create function tap.rec(b boolean, d text, i text default null) returns text language sql as
  $$ insert into tap.r (ok, descr, info) values (coalesce(b,false), d, i) returning case when ok then 'ok' else 'NOT OK' end || ' - ' || d $$;
create function plan(int) returns text language sql as $$ select 'plan ' || $1 $$;
create function ok(boolean, text) returns text language sql as $$ select tap.rec($1, $2) $$;
create function is(anyelement, anyelement, text) returns text language sql as
  $$ select tap.rec($1 is not distinct from $2, $3, format('kreeg %s, verwacht %s', $1, $2)) $$;
create function is(text, text, text) returns text language sql as
  $$ select tap.rec($1 is not distinct from $2, $3, format('kreeg %s, verwacht %s', $1, $2)) $$;
create function throws_ok(q text, code text, msg text, d text) returns text language plpgsql as $$
begin
  execute q;
  return tap.rec(false, d, 'geen fout');
exception when others then
  return tap.rec(sqlstate = code, d, sqlstate || ' ' || sqlerrm);
end $$;
create function lives_ok(q text, d text) returns text language plpgsql as $$
begin
  execute q;
  return tap.rec(true, d);
exception when others then
  return tap.rec(false, d, sqlstate || ' ' || sqlerrm);
end $$;
create function finish() returns setof text language sql as
  $$ select format('%s %s - %s %s', n, case when ok then 'ok' else 'NOT OK' end, descr, coalesce('(' || info || ')', '')) from tap.r order by n $$;
grant execute on all functions in schema public to public;
`;

await db.exec(stub);
const migDir = join(root, 'supabase', 'migrations');
for (const f of readdirSync(migDir).sort()) {
  await db.exec(readFileSync(join(migDir, f), 'utf8'));
  console.log('migratie ok:', f);
}

const testDir = join(root, 'supabase', 'tests', 'database');
let failed = 0;
for (const f of readdirSync(testDir).sort()) {
  const sql = readFileSync(join(testDir, f), 'utf8')
    .replace(/create extension if not exists pgtap[^;]*;/i, '')
    .replace(/select \* from finish\(\);\s*rollback;\s*$/i, '');
  await db.exec(sql);
  const res = await db.query('select * from finish()');
  await db.exec('rollback');
  console.log(`\n# ${f}`);
  for (const row of res.rows) {
    const line = String(Object.values(row)[0]);
    if (line.includes('NOT OK')) failed++;
    console.log(line);
  }
}
console.log(failed ? `\n${failed} test(s) MISLUKT` : '\nAlle tests geslaagd');
process.exit(failed ? 1 : 0);
