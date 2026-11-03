-- Stage timer en publieke schermlink.
begin;
create extension if not exists pgtap with schema extensions;
select plan(9);

insert into public.event_days (id, date, label) values ('d1000000-0000-0000-0000-000000000001', '2027-07-16', 'Fri');
insert into public.locations (id, name) values ('d2000000-0000-0000-0000-000000000001', 'T11-Main');
insert into public.schedule_items (id, day_id, location_id, title, starts_at, ends_at) values
  ('d3000000-0000-0000-0000-000000000001', 'd1000000-0000-0000-0000-000000000001',
   'd2000000-0000-0000-0000-000000000001', 'Headliner', '2027-07-16T20:00:00Z', '2027-07-16T21:15:00Z');
insert into auth.users (id, email, raw_app_meta_data, raw_user_meta_data) values
  ('d4000000-0000-0000-0000-00000000000a', 'a@t11.test',
   jsonb_build_object('role_id', (select id from public.roles where is_admin)), '{"full_name":"Admin"}'),
  ('d4000000-0000-0000-0000-00000000000c', 'c@t11.test', '{}', '{"full_name":"Crew"}');

set local role authenticated;
set local request.jwt.claims = '{"sub":"d4000000-0000-0000-0000-00000000000c","role":"authenticated"}';
select throws_ok($$select public.stage_control('d2000000-0000-0000-0000-000000000001', 'start')$$,
  '42501', null, 'crew bedient de timer niet');
select is((select count(*)::int from public.stage_timers), 0, 'crew ziet het geheime token niet');
reset role;

set local role authenticated;
set local request.jwt.claims = '{"sub":"d4000000-0000-0000-0000-00000000000a","role":"authenticated"}';
select lives_ok($$select public.stage_control('d2000000-0000-0000-0000-000000000001', 'load',
  'd3000000-0000-0000-0000-000000000001')$$, 'beheerder laadt een item');
select is((select duration_s from public.stage_timers), 4500, 'duur = lengte van het item (75 min)');
select lives_ok($$select public.stage_control('d2000000-0000-0000-0000-000000000001', 'add', '60')$$,
  'een minuut erbij');
select is((select remaining_s from public.stage_timers), 4560, 'resterende tijd + 60 s');
select lives_ok($$select public.stage_control('d2000000-0000-0000-0000-000000000001', 'message', 'Wrap up')$$,
  'bericht naar het podium');
reset role;

create temporary table tok on commit drop as select display_token from public.stage_timers;
grant select on tok to anon;
set local role anon;
select is((public.stage_view((select display_token from tok)) ->> 'message'), 'Wrap up',
  'het stagescherm werkt zonder inloggen met het token');
select is(public.stage_view('fout-token-fout-token-fout-token'), null, 'een verkeerd token toont niets');
reset role;

select * from finish();
rollback;
