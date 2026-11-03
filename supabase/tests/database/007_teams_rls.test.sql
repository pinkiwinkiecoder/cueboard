-- Teams in teams, meerdere lidmaatschappen en bereik.
begin;
create extension if not exists pgtap with schema extensions;
select plan(14);

insert into public.departments (id, name) values
  ('91000000-0000-0000-0000-000000000001', 'T7-Productie'),
  ('91000000-0000-0000-0000-000000000009', 'T7-Kern'),
  ('91000000-0000-0000-0000-000000000005', 'T7-Hospitality');
insert into public.departments (id, name, parent_id) values
  ('91000000-0000-0000-0000-000000000002', 'T7-Main Stage', '91000000-0000-0000-0000-000000000001'),
  ('91000000-0000-0000-0000-000000000003', 'T7-Small Stage', '91000000-0000-0000-0000-000000000001');

select throws_ok($$insert into public.departments (name, parent_id)
  values ('T7-Te diep', '91000000-0000-0000-0000-000000000002')$$, '22023', null, 'maximaal twee niveaus');

insert into auth.users (id, email, raw_app_meta_data, raw_user_meta_data) values
  -- Head of Production: teamleider-rol, lid van Productie (hoofdteam) en Kern
  ('92000000-0000-0000-0000-00000000000a', 'geert@t7.test',
   jsonb_build_object('role_id', (select id from public.roles where name = 'Team lead'),
                      'department_id', '91000000-0000-0000-0000-000000000001'), '{"full_name":"Geert"}'),
  -- Stage crew Main Stage
  ('92000000-0000-0000-0000-00000000000b', 'ms@t7.test',
   '{"department_id":"91000000-0000-0000-0000-000000000002"}', '{"full_name":"MS Crew"}'),
  -- Hospitality
  ('92000000-0000-0000-0000-00000000000c', 'hosp@t7.test',
   '{"department_id":"91000000-0000-0000-0000-000000000005"}', '{"full_name":"Hosp"}');
insert into public.department_members (department_id, profile_id, title, is_lead) values
  ('91000000-0000-0000-0000-000000000009', '92000000-0000-0000-0000-00000000000a', 'Head of Production', true);

select is((select count(*)::int from public.department_members where profile_id = '92000000-0000-0000-0000-00000000000a'),
  2, 'hoofdafdeling wordt vanzelf een lidmaatschap');

insert into public.tasks (id, title, department_id) values
  ('93000000-0000-0000-0000-000000000001', 'Deck check', '91000000-0000-0000-0000-000000000002'),
  ('93000000-0000-0000-0000-000000000002', 'Small stage check', '91000000-0000-0000-0000-000000000003'),
  ('93000000-0000-0000-0000-000000000003', 'Rider fruit', '91000000-0000-0000-0000-000000000005');
insert into public.announcements (id, title, department_ids) values
  ('94000000-0000-0000-0000-000000000001', 'Voor productie', array['91000000-0000-0000-0000-000000000001'::uuid]),
  ('94000000-0000-0000-0000-000000000002', 'Voor main stage', array['91000000-0000-0000-0000-000000000002'::uuid]);

-- Geert (Productie + Kern, tasks.manage_department)
set local role authenticated;
set local request.jwt.claims = '{"sub":"92000000-0000-0000-0000-00000000000a","role":"authenticated"}';
select ok(public.team_scope() @> array['91000000-0000-0000-0000-000000000002'::uuid,
  '91000000-0000-0000-0000-000000000003'::uuid], 'bereik van Productie bevat de subteams');
select is((select count(*)::int from public.tasks), 2, 'Head of Production ziet taken van Main en Small Stage');
select lives_ok($$insert into public.tasks (title, department_id) values ('Nieuw', '91000000-0000-0000-0000-000000000003')$$,
  'Head of Production maakt taken in een subteam');
select throws_ok($$insert into public.tasks (title, department_id) values ('Nee', '91000000-0000-0000-0000-000000000005')$$,
  '42501', null, 'maar niet in Hospitality');
select is((select count(*)::int from public.announcements), 2, 'ziet berichten voor productie en voor subteams');
reset role;

-- Main Stage crew
set local role authenticated;
set local request.jwt.claims = '{"sub":"92000000-0000-0000-0000-00000000000b","role":"authenticated"}';
select is((select count(*)::int from public.tasks), 1, 'Main Stage crew ziet enkel Main Stage-taken');
select is((select count(*)::int from public.announcements), 2,
  'een bericht aan Productie bereikt ook Main Stage');
select throws_ok($$insert into public.department_members (department_id, profile_id)
  values ('91000000-0000-0000-0000-000000000009', auth.uid())$$, '42501', null,
  'crew zet zichzelf niet in het kernteam');
reset role;

-- Hospitality
set local role authenticated;
set local request.jwt.claims = '{"sub":"92000000-0000-0000-0000-00000000000c","role":"authenticated"}';
select is((select count(*)::int from public.tasks), 1, 'Hospitality ziet enkel eigen taken');
select is((select count(*)::int from public.announcements), 0, 'Hospitality ziet geen productieberichten');
select ok((select count(*) from public.department_members) >= 4, 'iedereen ziet de teamstructuur');
reset role;

-- Beheerder
insert into auth.users (id, email, raw_app_meta_data, raw_user_meta_data) values
  ('92000000-0000-0000-0000-0000000000ff', 'admin@t7.test',
   jsonb_build_object('role_id', (select id from public.roles where is_admin)), '{"full_name":"Admin"}');
set local role authenticated;
set local request.jwt.claims = '{"sub":"92000000-0000-0000-0000-0000000000ff","role":"authenticated"}';
select lives_ok($$insert into public.department_members (department_id, profile_id, title)
  values ('91000000-0000-0000-0000-000000000002', '92000000-0000-0000-0000-00000000000c', 'Runner')$$,
  'beheerder zet iemand in een extra team');
reset role;

select * from finish();
rollback;
