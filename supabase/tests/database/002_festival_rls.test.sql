-- RLS-tests voor festivalinstellingen en uitnodigingen.
begin;
create extension if not exists pgtap with schema extensions;
select plan(11);

insert into auth.users (id, email, raw_app_meta_data, raw_user_meta_data) values
  ('30000000-0000-0000-0000-00000000000a', 'admin2@t.test', '{"role":"beheerder"}', '{"full_name":"Admin"}'),
  ('30000000-0000-0000-0000-00000000000c', 'crew2@t.test', '{"role":"crew"}', '{"full_name":"Crew"}');
insert into public.invitations (user_id, invited_by, method) values
  ('30000000-0000-0000-0000-00000000000c', '30000000-0000-0000-0000-00000000000a', 'link');

select is((select count(*)::int from public.festival), 1, 'er is precies één festivalrij');
select throws_ok($$insert into public.festival (id) values (false)$$, '23514', null,
  'een tweede festivalrij kan niet');

-- Crew
set local role authenticated;
set local request.jwt.claims = '{"sub":"30000000-0000-0000-0000-00000000000c","role":"authenticated"}';
select ok((select count(*) from public.stages) >= 1, 'crew leest podia');
select throws_ok($$insert into public.stages (name) values ('Hack Stage')$$, '42501', null,
  'crew maakt geen podium aan');
select throws_ok($$insert into public.festival_days (date, label) values ('2027-07-16', 'Vrijdag')$$,
  '42501', null, 'crew maakt geen festivaldag aan');
update public.festival set name = 'Gehackt';
select is((select name from public.festival), 'Art of Faith', 'crew wijzigt de festivalnaam niet');
select is((select count(*)::int from public.invitations), 0, 'crew ziet geen uitnodigingen');
select throws_ok($$insert into public.invitations (method) values ('link')$$, '42501', null,
  'crew maakt zelf geen uitnodiging aan');
reset role;

-- Beheerder
set local role authenticated;
set local request.jwt.claims = '{"sub":"30000000-0000-0000-0000-00000000000a","role":"authenticated"}';
select lives_ok($$insert into public.festival_days (date, label) values ('2027-07-16', 'Vrijdag')$$,
  'beheerder maakt een festivaldag aan');
select lives_ok($$update public.festival set name = 'Art of Faith 2027'$$, 'beheerder wijzigt de festivalnaam');
select is((select count(*)::int from public.invitations), 1, 'beheerder ziet uitnodigingen');
reset role;

select * from finish();
rollback;
