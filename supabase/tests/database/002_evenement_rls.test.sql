-- RLS-tests voor evenement-instellingen en uitnodigingen.
begin;
create extension if not exists pgtap with schema extensions;
select plan(12);

insert into auth.users (id, email, raw_app_meta_data, raw_user_meta_data) values
  ('30000000-0000-0000-0000-00000000000a', 'admin2@t.test',
   jsonb_build_object('role_id', (select id from public.roles where is_admin)), '{"full_name":"Admin"}'),
  ('30000000-0000-0000-0000-00000000000c', 'crew2@t.test', '{}', '{"full_name":"Crew"}');
insert into public.invitations (user_id, invited_by, method) values
  ('30000000-0000-0000-0000-00000000000c', '30000000-0000-0000-0000-00000000000a', 'link');
insert into public.locations (name) values ('T-Main Stage');

select is((select count(*)::int from public.event), 1, 'er is precies één evenementrij');
select throws_ok($$insert into public.event (id) values (false)$$, '23514', null,
  'een tweede evenementrij kan niet');
select throws_ok($$update public.event set modules = array['bestaat_niet']$$, '23514', null,
  'onbekende modules worden geweigerd');

-- Crew
set local role authenticated;
set local request.jwt.claims = '{"sub":"30000000-0000-0000-0000-00000000000c","role":"authenticated"}';
select ok((select count(*) from public.locations) >= 1, 'crew leest locaties');
select throws_ok($$insert into public.locations (name) values ('Hack')$$, '42501', null,
  'crew maakt geen locatie aan');
select throws_ok($$insert into public.event_days (date, label) values ('2027-07-16', 'Friday')$$,
  '42501', null, 'crew maakt geen dag aan');
update public.event set name = 'Gehackt';
select is((select name from public.event), 'My event', 'crew wijzigt de evenementnaam niet');
select is((select count(*)::int from public.invitations), 0, 'crew ziet geen uitnodigingen');
reset role;

-- Een rol met settings.manage (geen beheerder) mag instellingen wijzigen.
update public.roles set permissions = permissions || array['settings.manage'] where is_default;
set local role authenticated;
set local request.jwt.claims = '{"sub":"30000000-0000-0000-0000-00000000000c","role":"authenticated"}';
select lives_ok($$insert into public.event_days (date, label) values ('2027-07-16', 'Friday')$$,
  'settings.manage maakt een dag aan');
reset role;

-- Beheerder
set local role authenticated;
set local request.jwt.claims = '{"sub":"30000000-0000-0000-0000-00000000000a","role":"authenticated"}';
select lives_ok($$update public.event set name = 'Art of Faith 2027', modules = array['schedule','tasks']$$,
  'beheerder wijzigt naam en modules');
select is((select modules from public.event), array['schedule','tasks'], 'modules zijn opgeslagen');
select is((select count(*)::int from public.invitations), 1, 'beheerder ziet uitnodigingen');
reset role;

select * from finish();
rollback;
