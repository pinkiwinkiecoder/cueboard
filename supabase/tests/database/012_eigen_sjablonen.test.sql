-- Eigen sjablonen: enkel beheerders, en vastleggen + toepassen geeft dezelfde opzet.
begin;
create extension if not exists pgtap with schema extensions;
select plan(7);

insert into auth.users (id, email, raw_app_meta_data, raw_user_meta_data) values
  ('a3000000-0000-0000-0000-00000000000a', 'a@t12.test',
   jsonb_build_object('role_id', (select id from public.roles where is_admin)), '{"full_name":"Admin"}'),
  ('a3000000-0000-0000-0000-00000000000c', 'c@t12.test', '{}', '{"full_name":"Crew"}');

insert into public.departments (name, color) values ('T12-Productie', 'sky');
insert into public.departments (name, color, parent_id)
  values ('T12-Main Stage', 'pink', (select id from public.departments where name = 'T12-Productie'));
insert into public.task_packages (name, department_id)
  values ('T12-Opbouw', (select id from public.departments where name = 'T12-Productie'));
insert into public.package_items (package_id, title, offset_minutes, requires_signoff)
  values ((select id from public.task_packages where name = 'T12-Opbouw'), 'Rigging', -60, true);

set local role authenticated;
set local request.jwt.claims = '{"sub":"a3000000-0000-0000-0000-00000000000c","role":"authenticated"}';
select throws_ok($$select public.capture_setup()$$, '42501', null, 'crew kan de opzet niet vastleggen');
select is((select count(*)::int from public.custom_templates), 0, 'crew ziet geen eigen sjablonen');
select throws_ok($$insert into public.custom_templates (name, setup) values ('x', '{}')$$,
  '42501', null, 'crew maakt geen sjabloon');
reset role;

set local role authenticated;
set local request.jwt.claims = '{"sub":"a3000000-0000-0000-0000-00000000000a","role":"authenticated"}';
insert into public.custom_templates (name, setup) values ('T12', public.capture_setup());
select is((select count(*)::int from public.custom_templates), 1, 'beheerder bewaart een sjabloon');
select is(
  (select c ->> 'color' from public.custom_templates t,
          jsonb_array_elements(t.setup -> 'departments') d, jsonb_array_elements(d -> 'children') c
    where d ->> 'name' = 'T12-Productie'), 'pink', 'subteams worden mee vastgelegd');
select ok(
  (select setup -> 'roles' from public.custom_templates) @? '$[*] ? (@.name == "Admin")' is false,
  'de beheerdersrol zit niet in het sjabloon');
select is(public.apply_setup((select setup from public.custom_templates where name = 'T12')) ->> 'packages',
  '0', 'opnieuw toepassen dupliceert niets');
reset role;

select * from finish();
rollback;
