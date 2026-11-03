-- Presets toepassen.
begin;
create extension if not exists pgtap with schema extensions;
select plan(8);

insert into auth.users (id, email, raw_app_meta_data, raw_user_meta_data) values
  ('a2000000-0000-0000-0000-00000000000a', 'a@t8.test',
   jsonb_build_object('role_id', (select id from public.roles where is_admin)), '{"full_name":"Admin"}'),
  ('a2000000-0000-0000-0000-00000000000c', 'c@t8.test', '{}', '{"full_name":"Crew"}');

create temporary table setup on commit drop as select $json${
  "id": "test",
  "departments": [
    {"name": "P8-Productie", "color": "violet", "children": [{"name": "P8-Main Stage"}, {"name": "P8-Small Stage"}]},
    {"name": "P8-Hospitality", "color": "peach"}
  ],
  "roles": [
    {"name": "P8-Stage manager", "permissions": ["view.schedule", "schedule.manage", "bestaat.niet"]}
  ],
  "locations": [{"name": "P8-Main Stage"}],
  "packages": [{"name": "P8-Opbouw", "department": "P8-Productie",
                "items": [{"title": "Rigging", "priority": "high", "signoff": true}, {"title": "Stroom", "offset": -60}]}],
  "modules": ["schedule", "tasks"]
}$json$::jsonb as j;
grant select on setup to authenticated;

set local role authenticated;
set local request.jwt.claims = '{"sub":"a2000000-0000-0000-0000-00000000000c","role":"authenticated"}';
select throws_ok($$select public.apply_setup((select j from setup))$$, '42501', null, 'crew past geen preset toe');
reset role;

set local role authenticated;
set local request.jwt.claims = '{"sub":"a2000000-0000-0000-0000-00000000000a","role":"authenticated"}';
select is(public.apply_setup((select j from setup)),
  '{"teams": 4, "roles": 1, "locations": 1, "packages": 1}'::jsonb, 'preset voegt alles toe');
select is((select p.name from public.departments c join public.departments p on p.id = c.parent_id
           where c.name = 'P8-Small Stage'), 'P8-Productie', 'subteam hangt onder het hoofdteam');
select is((select permissions from public.roles where name = 'P8-Stage manager'),
  array['view.schedule', 'schedule.manage'], 'onbekende rechten worden genegeerd');
select is((select count(*)::int from public.package_items i join public.task_packages p on p.id = i.package_id
           where p.name = 'P8-Opbouw'), 2, 'pakket heeft zijn taken');
select is(public.apply_setup((select j from setup)),
  '{"teams": 0, "roles": 0, "locations": 0, "packages": 0}'::jsonb, 'twee keer toepassen dupliceert niets');
select ok((select modules from public.event) @> array['schedule', 'tasks', 'people'],
  'modules worden enkel aangezet, nooit uitgezet');
select is((select count(*)::int from public.roles where is_admin), 1, 'er komt nooit een tweede beheerdersrol');
reset role;

select * from finish();
rollback;
