-- RLS-tests voor rollen en rechten: wat mag wel, en vooral wat mag NIET.
-- Draai met: npx supabase test db   (of zonder Docker: npm run db:test:lite)
begin;
create extension if not exists pgtap with schema extensions;
select plan(34);

-- Testdata ------------------------------------------------------------------
insert into public.departments (id, name) values
  ('10000000-0000-0000-0000-000000000001', 'T-Audio'),
  ('10000000-0000-0000-0000-000000000002', 'T-Licht');
-- Eigen rol zoals een beheerder die zou maken: ziet enkel meldingen.
insert into public.roles (id, name, permissions) values
  ('40000000-0000-0000-0000-000000000001', 'T-Security', array['view.issues']);

create temporary table ids on commit drop as
  select (select id from public.roles where is_admin) as admin_role,
         (select id from public.roles where name = 'Team lead') as lead_role,
         (select id from public.roles where name = 'Crew') as crew_role,
         (select id from public.roles where name = 'Guest') as guest_role;
grant select on ids to authenticated, anon;

insert into auth.users (id, email, raw_app_meta_data, raw_user_meta_data)
select * from (values
  ('20000000-0000-0000-0000-00000000000a'::uuid, 'admin@t.test',
   jsonb_build_object('role_id', (select admin_role from ids)), '{"full_name":"Admin"}'::jsonb),
  ('20000000-0000-0000-0000-00000000000b'::uuid, 'lead@t.test',
   jsonb_build_object('role_id', (select lead_role from ids), 'department_id', '10000000-0000-0000-0000-000000000001'),
   '{"full_name":"Lead"}'::jsonb),
  ('20000000-0000-0000-0000-00000000000c'::uuid, 'crew@t.test',
   jsonb_build_object('department_id', '10000000-0000-0000-0000-000000000001'), '{"full_name":"Crew"}'::jsonb),
  ('20000000-0000-0000-0000-00000000000d'::uuid, 'gast@t.test',
   jsonb_build_object('role_id', (select guest_role from ids)), '{"full_name":"Gast"}'::jsonb),
  ('20000000-0000-0000-0000-00000000000e'::uuid, 'weg@t.test', '{}'::jsonb, '{"full_name":"Weg"}'::jsonb),
  ('20000000-0000-0000-0000-00000000000f'::uuid, 'sec@t.test',
   '{"role_id":"40000000-0000-0000-0000-000000000001"}'::jsonb, '{"full_name":"Security"}'::jsonb)
) v;
update public.profiles set active = false where id = '20000000-0000-0000-0000-00000000000e';

-- Nieuw account -------------------------------------------------------------
select is((select role_id from public.profiles where id = '20000000-0000-0000-0000-00000000000a'),
  (select admin_role from ids), 'rol komt uit app_metadata');
select is((select role_id from public.profiles where id = '20000000-0000-0000-0000-00000000000c'),
  (select crew_role from ids), 'zonder rol wordt het de standaardrol');
select throws_ok($$update public.roles set is_default = true where is_admin$$, '23514', null,
  'de beheerdersrol kan nooit standaardrol worden');

-- Anoniem ------------------------------------------------------------------
set local role anon;
select throws_ok('select * from public.profiles', '42501', null, 'anon mag profielen niet lezen');
select throws_ok('select * from public.roles', '42501', null, 'anon mag rollen niet lezen');
select is(public.ping(), 'ok', 'anon mag ping aanroepen (keep-alive)');
reset role;

-- Crew ---------------------------------------------------------------------
set local role authenticated;
set local request.jwt.claims = '{"sub":"20000000-0000-0000-0000-00000000000c","role":"authenticated"}';
select ok(public.has_perm('view.tasks'), 'crew heeft view.tasks');
select ok(not public.has_perm('people.manage'), 'crew heeft geen people.manage');
select ok((select count(*) from public.profiles where id = '20000000-0000-0000-0000-00000000000a') = 1,
  'crew ziet collega''s (view.people)');
select is((select count(*)::int from public.profiles where id = '20000000-0000-0000-0000-00000000000e'), 0,
  'crew ziet geen gedeactiveerde mensen');
select is((select count(*)::int from public.audit_log), 0, 'crew leest de auditlog niet');
select throws_ok($$insert into public.departments (name) values ('Hack')$$, '42501', null,
  'crew maakt geen afdeling aan');
select throws_ok($$insert into public.roles (name) values ('Hack')$$, '42501', null,
  'crew maakt geen rol aan');
update public.roles set permissions = public.permission_keys() where name = 'Crew';
select throws_ok($$update public.profiles set role_id = (select admin_role from ids) where id = auth.uid()$$,
  '42501', null, 'crew kan zijn eigen rol niet wijzigen');
select lives_ok($$update public.profiles set phone = '+32 470 00 00 00' where id = auth.uid()$$,
  'crew wijzigt eigen telefoon');
select throws_ok($$select public.admin_update_profile('20000000-0000-0000-0000-00000000000c',
  (select admin_role from ids), null, true)$$, '42501', null, 'crew kan admin_update_profile niet gebruiken');
select throws_ok($$insert into public.audit_log (table_name, action) values ('x', 'OTHER')$$, '42501', null,
  'crew kan niets in de auditlog schrijven');
reset role;
select ok(not ((select permissions from public.roles where name = 'Crew') @> array['people.manage']),
  'crew kon de rechten van zijn rol niet uitbreiden');

-- Gast ---------------------------------------------------------------------
set local role authenticated;
set local request.jwt.claims = '{"sub":"20000000-0000-0000-0000-00000000000d","role":"authenticated"}';
select is((select count(*)::int from public.profiles), 1, 'gast (zonder view.people) ziet enkel zichzelf');
reset role;

-- Eigen rol "Security" -------------------------------------------------------
set local role authenticated;
set local request.jwt.claims = '{"sub":"20000000-0000-0000-0000-00000000000f","role":"authenticated"}';
select ok(public.has_perm('view.issues'), 'eigen rol heeft het gekozen recht');
select ok(not public.has_perm('view.tasks'), 'eigen rol heeft geen ander recht');
select is((select count(*)::int from public.profiles), 1, 'eigen rol zonder view.people ziet enkel zichzelf');
select is((select (public.my_access() ->> 'role_name')), 'T-Security', 'my_access geeft de rolnaam');
reset role;

-- Gedeactiveerd: geldig JWT, maar geen toegang meer --------------------------
set local role authenticated;
set local request.jwt.claims = '{"sub":"20000000-0000-0000-0000-00000000000e","role":"authenticated"}';
select is((select count(*)::int from public.departments), 0, 'gedeactiveerd account leest niets');
select ok(not public.has_perm('view.schedule'), 'gedeactiveerd account heeft geen rechten');
reset role;

-- Team lead met people.manage mag geen beheerder maken -------------------------
update public.roles set permissions = permissions || array['people.manage'] where name = 'Team lead';
set local role authenticated;
set local request.jwt.claims = '{"sub":"20000000-0000-0000-0000-00000000000b","role":"authenticated"}';
select lives_ok($$select public.admin_update_profile('20000000-0000-0000-0000-00000000000c',
  (select guest_role from ids), null, true)$$, 'people.manage mag iemand een gewone rol geven');
select throws_ok($$select public.admin_update_profile('20000000-0000-0000-0000-00000000000c',
  (select admin_role from ids), null, true)$$, '42501', null, 'people.manage mag niemand beheerder maken');
select throws_ok($$select public.admin_update_profile('20000000-0000-0000-0000-00000000000a',
  (select crew_role from ids), null, true)$$, '42501', null, 'people.manage mag een beheerder niet aanpassen');
reset role;

-- Beheerder ----------------------------------------------------------------
set local role authenticated;
set local request.jwt.claims = '{"sub":"20000000-0000-0000-0000-00000000000a","role":"authenticated"}';
select lives_ok($$insert into public.roles (name, permissions) values ('T-Catering', array['view.schedule'])$$,
  'beheerder maakt een eigen rol');
select throws_ok($$insert into public.roles (name, permissions) values ('T-Fout', array['bestaat.niet'])$$,
  '23514', null, 'onbekende rechten worden geweigerd');
select throws_ok($$delete from public.roles where is_admin$$, '42501', null,
  'de beheerdersrol kan niet verwijderd worden');
select throws_ok($$select public.admin_update_profile('20000000-0000-0000-0000-00000000000a',
  (select crew_role from ids), null, true)$$, '42501', null, 'beheerder kan zichzelf niet degraderen');
select ok((select count(*) from public.audit_log where table_name = 'profiles') > 0, 'beheerder leest auditlog');
select throws_ok($$delete from public.audit_log$$, '42501', null, 'zelfs beheerder wist de auditlog niet');
reset role;

select * from finish();
rollback;
