-- RLS- en functietests voor de planning.
begin;
create extension if not exists pgtap with schema extensions;
select plan(18);

insert into public.event_days (id, date, label) values ('81000000-0000-0000-0000-000000000001', '2027-07-16', 'Friday');
insert into public.locations (id, name) values ('82000000-0000-0000-0000-000000000001', 'T6-Main');
insert into auth.users (id, email, raw_app_meta_data, raw_user_meta_data) values
  ('83000000-0000-0000-0000-00000000000a', 'a@t6.test',
   jsonb_build_object('role_id', (select id from public.roles where is_admin)), '{"full_name":"Admin"}'),
  ('83000000-0000-0000-0000-00000000000c', 'crew@t6.test', '{}', '{"full_name":"Crew"}'),
  ('83000000-0000-0000-0000-00000000000e', 'gast@t6.test',
   jsonb_build_object('role_id', (select id from public.roles where name = 'Guest')), '{"full_name":"Gast"}');

insert into public.schedule_items (id, day_id, location_id, title, kind, starts_at, ends_at) values
  ('84000000-0000-0000-0000-000000000001', '81000000-0000-0000-0000-000000000001', '82000000-0000-0000-0000-000000000001',
   'Soundcheck A', 'soundcheck', '2027-07-16T14:00:00Z', '2027-07-16T14:30:00Z'),
  ('84000000-0000-0000-0000-000000000002', '81000000-0000-0000-0000-000000000001', '82000000-0000-0000-0000-000000000001',
   'Show A', 'performance', '2027-07-16T19:00:00Z', '2027-07-16T20:00:00Z'),
  ('84000000-0000-0000-0000-000000000003', '81000000-0000-0000-0000-000000000001', '82000000-0000-0000-0000-000000000001',
   'Show B', 'performance', '2027-07-16T20:30:00Z', '2027-07-16T21:30:00Z');

select throws_ok($$insert into public.schedule_items (day_id, title, starts_at, ends_at)
  values ('81000000-0000-0000-0000-000000000001', 'Fout', '2027-07-16T10:00:00Z', '2027-07-16T09:00:00Z')$$,
  '23514', null, 'einde voor begin kan niet');

-- Crew: geen werkversie, nog niets gepubliceerd
set local role authenticated;
set local request.jwt.claims = '{"sub":"83000000-0000-0000-0000-00000000000c","role":"authenticated"}';
select is((select count(*)::int from public.schedule_items), 0, 'crew ziet de werkversie niet');
select is((select count(*)::int from public.schedule_published), 0, 'nog niets gepubliceerd');
select throws_ok($$select public.publish_schedule('81000000-0000-0000-0000-000000000001')$$, '42501', null,
  'crew publiceert niet');
select throws_ok($$select public.shift_schedule('81000000-0000-0000-0000-000000000001',
  '82000000-0000-0000-0000-000000000001', '2027-07-16T00:00:00Z', 10)$$, '42501', null, 'crew verschuift niet');
select throws_ok($$insert into public.schedule_items (day_id, title, starts_at, ends_at)
  values ('81000000-0000-0000-0000-000000000001', 'x', now(), now())$$, '42501', null, 'crew maakt geen item');
reset role;

-- Beheerder publiceert
set local role authenticated;
set local request.jwt.claims = '{"sub":"83000000-0000-0000-0000-00000000000a","role":"authenticated"}';
select is((public.publish_schedule('81000000-0000-0000-0000-000000000001') ->> 'added')::int, 3,
  'eerste publicatie: 3 nieuwe items');
select is((select public.shift_schedule('81000000-0000-0000-0000-000000000001',
  '82000000-0000-0000-0000-000000000001', '2027-07-16T19:00:00Z', 15)), 2,
  'verschuiven raakt enkel items vanaf het gekozen tijdstip');
select is((select starts_at from public.schedule_items where id = '84000000-0000-0000-0000-000000000002'),
  '2027-07-16T19:15:00Z'::timestamptz, 'show A is 15 min later in de werkversie');
select is((select starts_at from public.schedule_items where id = '84000000-0000-0000-0000-000000000001'),
  '2027-07-16T14:00:00Z'::timestamptz, 'soundcheck vóór het tijdstip blijft staan');
reset role;

-- Crew ziet nog de oude gepubliceerde tijd
set local role authenticated;
set local request.jwt.claims = '{"sub":"83000000-0000-0000-0000-00000000000c","role":"authenticated"}';
select is((select starts_at from public.schedule_published where id = '84000000-0000-0000-0000-000000000002'),
  '2027-07-16T19:00:00Z'::timestamptz, 'crew ziet de wijziging pas na publiceren');
reset role;

set local role authenticated;
set local request.jwt.claims = '{"sub":"83000000-0000-0000-0000-00000000000a","role":"authenticated"}';
delete from public.schedule_items where id = '84000000-0000-0000-0000-000000000001';
select is(public.publish_schedule('81000000-0000-0000-0000-000000000001'),
  '{"added": 0, "changed": 2, "removed": 1}'::jsonb, 'tweede publicatie telt wijzigingen en verwijderingen');
select is((select removed_titles from public.schedule_publications order by published_at desc, removed desc limit 1),
  array['Soundcheck A'], 'verwijderde titels worden onthouden');
select lives_ok($$select public.set_schedule_live('84000000-0000-0000-0000-000000000002', 'start')$$,
  'beheerder start een item live');
reset role;

set local role authenticated;
set local request.jwt.claims = '{"sub":"83000000-0000-0000-0000-00000000000c","role":"authenticated"}';
select is((select starts_at from public.schedule_published where id = '84000000-0000-0000-0000-000000000002'),
  '2027-07-16T19:15:00Z'::timestamptz, 'na publiceren ziet crew de nieuwe tijd');
select is((select status::text from public.schedule_published where id = '84000000-0000-0000-0000-000000000002'),
  'live', 'live-status is meteen zichtbaar zonder publiceren');
select throws_ok($$select public.set_schedule_live('84000000-0000-0000-0000-000000000002', 'done')$$,
  '42501', null, 'crew zet niets live');
reset role;

set local role authenticated;
set local request.jwt.claims = '{"sub":"83000000-0000-0000-0000-00000000000e","role":"authenticated"}';
select is((select count(*)::int from public.schedule_published), 2, 'gast met view.schedule ziet de planning');
reset role;

select * from finish();
rollback;
