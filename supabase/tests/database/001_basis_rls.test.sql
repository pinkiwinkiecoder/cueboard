-- RLS-tests voor de basis: wat mag wel, en vooral wat mag NIET.
-- Draai met: npx supabase test db
begin;
create extension if not exists pgtap with schema extensions;
select plan(24);

-- Testgebruikers (los van de seed) ------------------------------------------
insert into public.departments (id, name) values
  ('10000000-0000-0000-0000-000000000001', 'T-Audio'),
  ('10000000-0000-0000-0000-000000000002', 'T-Licht');

insert into auth.users (id, email, raw_app_meta_data, raw_user_meta_data) values
  ('20000000-0000-0000-0000-00000000000a', 'admin@t.test',
   '{"role":"beheerder"}', '{"full_name":"Admin"}'),
  ('20000000-0000-0000-0000-00000000000b', 'hoofd@t.test',
   '{"role":"afdelingshoofd","department_id":"10000000-0000-0000-0000-000000000001"}', '{"full_name":"Hoofd"}'),
  ('20000000-0000-0000-0000-00000000000c', 'crew@t.test',
   '{"role":"crew","department_id":"10000000-0000-0000-0000-000000000001"}', '{"full_name":"Crew"}'),
  ('20000000-0000-0000-0000-00000000000d', 'gast@t.test',
   '{"role":"gast"}', '{"full_name":"Gast"}'),
  ('20000000-0000-0000-0000-00000000000e', 'weg@t.test',
   '{"role":"crew"}', '{"full_name":"Gedeactiveerd"}'),
  ('20000000-0000-0000-0000-00000000000f', 'stiekem@t.test',
   '{}', '{"full_name":"Zonder rol"}');
update public.profiles set active = false where id = '20000000-0000-0000-0000-00000000000e';

-- Trigger handle_new_user ---------------------------------------------------
select is((select role::text from public.profiles where id = '20000000-0000-0000-0000-00000000000a'),
  'beheerder', 'rol komt uit app_metadata');
select is((select role::text from public.profiles where id = '20000000-0000-0000-0000-00000000000f'),
  'crew', 'zonder rol wordt het crew');

-- Anoniem ------------------------------------------------------------------
set local role anon;
select throws_ok('select * from public.profiles', '42501', null, 'anon mag profielen niet lezen');
select throws_ok('select * from public.departments', '42501', null, 'anon mag afdelingen niet lezen');
select is(public.ping(), 'ok', 'anon mag ping aanroepen (keep-alive)');
reset role;

-- Crew ---------------------------------------------------------------------
set local role authenticated;
set local request.jwt.claims = '{"sub":"20000000-0000-0000-0000-00000000000c","role":"authenticated"}';
select ok((select count(*) from public.departments) >= 2, 'crew leest afdelingen');
select ok((select count(*) from public.profiles where id = '20000000-0000-0000-0000-00000000000a') = 1,
  'crew ziet collega''s (contact)');
select is((select count(*)::int from public.profiles where id = '20000000-0000-0000-0000-00000000000e'), 0,
  'crew ziet geen gedeactiveerde mensen');
select is((select count(*)::int from public.audit_log), 0, 'crew leest de auditlog niet');
select throws_ok($$insert into public.departments (name) values ('Hack')$$, '42501', null,
  'crew maakt geen afdeling aan');
select throws_ok($$update public.profiles set role = 'beheerder' where id = auth.uid()$$, '42501', null,
  'crew kan zijn eigen rol niet wijzigen');
select throws_ok($$update public.profiles set active = true where id = auth.uid()$$, '42501', null,
  'crew kan actief-vlag niet wijzigen');
select lives_ok($$update public.profiles set phone = '+32 470 00 00 00' where id = auth.uid()$$,
  'crew wijzigt eigen telefoon');
update public.profiles set full_name = 'Gehackt' where id = '20000000-0000-0000-0000-00000000000a';
reset role;
select is((select full_name from public.profiles where id = '20000000-0000-0000-0000-00000000000a'),
  'Admin', 'crew kan andermans naam niet wijzigen');
set local role authenticated;
set local request.jwt.claims = '{"sub":"20000000-0000-0000-0000-00000000000c","role":"authenticated"}';
select throws_ok($$select public.admin_update_profile('20000000-0000-0000-0000-00000000000c', 'beheerder', null, true)$$,
  '42501', null, 'crew kan admin_update_profile niet gebruiken');
select throws_ok($$insert into public.audit_log (table_name, action) values ('x', 'OTHER')$$, '42501', null,
  'crew kan niets in de auditlog schrijven');
reset role;

-- Gast ---------------------------------------------------------------------
set local role authenticated;
set local request.jwt.claims = '{"sub":"20000000-0000-0000-0000-00000000000d","role":"authenticated"}';
select is((select count(*)::int from public.profiles), 1, 'gast ziet enkel zichzelf');
reset role;

-- Gedeactiveerd: geldig JWT, maar geen toegang meer --------------------------
set local role authenticated;
set local request.jwt.claims = '{"sub":"20000000-0000-0000-0000-00000000000e","role":"authenticated"}';
select is((select count(*)::int from public.departments), 0, 'gedeactiveerd account leest niets');
select is(public.is_member(), false, 'gedeactiveerd account is geen lid');
reset role;

-- Beheerder ----------------------------------------------------------------
set local role authenticated;
set local request.jwt.claims = '{"sub":"20000000-0000-0000-0000-00000000000a","role":"authenticated"}';
select lives_ok($$insert into public.departments (name) values ('T-Video')$$, 'beheerder maakt afdeling aan');
select lives_ok($$select public.admin_update_profile('20000000-0000-0000-0000-00000000000c', 'crew',
  '10000000-0000-0000-0000-000000000002', true)$$, 'beheerder verplaatst iemand naar een andere afdeling');
select throws_ok($$select public.admin_update_profile('20000000-0000-0000-0000-00000000000a', 'crew', null, true)$$,
  '42501', null, 'beheerder kan zichzelf niet degraderen');
select ok((select count(*) from public.audit_log where table_name = 'profiles') > 0, 'beheerder leest auditlog');
select throws_ok($$delete from public.audit_log$$, '42501', null, 'zelfs beheerder wist de auditlog niet');
reset role;

select * from finish();
rollback;
