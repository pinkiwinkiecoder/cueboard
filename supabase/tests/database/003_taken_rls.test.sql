-- RLS-tests voor taken en pakketten.
begin;
create extension if not exists pgtap with schema extensions;
select plan(22);

insert into public.departments (id, name) values
  ('51000000-0000-0000-0000-000000000001', 'T2-Audio'),
  ('51000000-0000-0000-0000-000000000002', 'T2-Licht');

insert into auth.users (id, email, raw_app_meta_data, raw_user_meta_data) values
  ('52000000-0000-0000-0000-00000000000a', 'a@t2.test',
   jsonb_build_object('role_id', (select id from public.roles where is_admin)), '{"full_name":"Admin"}'),
  ('52000000-0000-0000-0000-00000000000b', 'lead@t2.test',
   jsonb_build_object('role_id', (select id from public.roles where name = 'Team lead'),
                      'department_id', '51000000-0000-0000-0000-000000000001'), '{"full_name":"Lead"}'),
  ('52000000-0000-0000-0000-00000000000c', 'crew@t2.test',
   '{"department_id":"51000000-0000-0000-0000-000000000001"}', '{"full_name":"Crew Audio"}'),
  ('52000000-0000-0000-0000-00000000000d', 'licht@t2.test',
   '{"department_id":"51000000-0000-0000-0000-000000000002"}', '{"full_name":"Crew Licht"}'),
  ('52000000-0000-0000-0000-00000000000e', 'gast@t2.test',
   jsonb_build_object('role_id', (select id from public.roles where name = 'Guest')), '{"full_name":"Gast"}');

insert into public.tasks (id, title, department_id) values
  ('53000000-0000-0000-0000-000000000001', 'Audio-taak', '51000000-0000-0000-0000-000000000001'),
  ('53000000-0000-0000-0000-000000000002', 'Licht-taak', '51000000-0000-0000-0000-000000000002');
insert into public.tasks (id, title, department_id, pool) values
  ('53000000-0000-0000-0000-000000000003', 'Pooltaak audio', '51000000-0000-0000-0000-000000000001', true);
insert into public.task_assignees (task_id, profile_id) values
  ('53000000-0000-0000-0000-000000000002', '52000000-0000-0000-0000-00000000000c');
insert into public.task_subtasks (id, task_id, title) values
  ('54000000-0000-0000-0000-000000000001', '53000000-0000-0000-0000-000000000002', 'Subtaak');

select ok((select count(*) from public.package_items) >= 9, 'voorbeeldpakket heeft 9 taken');

-- Crew audio
set local role authenticated;
set local request.jwt.claims = '{"sub":"52000000-0000-0000-0000-00000000000c","role":"authenticated"}';
select is((select count(*)::int from public.tasks), 3,
  'crew ziet taken van de eigen afdeling + wat aan hem toegewezen is');
select throws_ok($$insert into public.tasks (title, department_id) values ('x', '51000000-0000-0000-0000-000000000001')$$,
  '42501', null, 'crew maakt geen taken aan');
update public.tasks set title = 'Gehackt' where id = '53000000-0000-0000-0000-000000000001';
select lives_ok($$select public.set_task_status('53000000-0000-0000-0000-000000000002', 'in_progress')$$,
  'toegewezen crew wijzigt de status');
select throws_ok($$select public.set_task_status('53000000-0000-0000-0000-000000000001', 'done')$$,
  '42501', null, 'niet-toegewezen crew wijzigt de status niet');
select throws_ok($$select public.set_task_status('53000000-0000-0000-0000-000000000002', 'blocked', '  ')$$,
  '22023', null, 'geblokkeerd vraagt een reden');
select lives_ok($$select public.toggle_subtask('54000000-0000-0000-0000-000000000001', true)$$,
  'toegewezen crew vinkt een subtaak af');
select lives_ok($$select public.claim_task('53000000-0000-0000-0000-000000000003')$$,
  'crew claimt een pooltaak van de eigen afdeling');
select throws_ok($$select public.claim_task('53000000-0000-0000-0000-000000000003')$$,
  '42501', null, 'een geclaimde taak kan niet nog eens geclaimd worden');
select throws_ok($$select public.apply_package((select id from public.task_packages limit 1))$$,
  '42501', null, 'crew past geen pakket toe');
select throws_ok($$insert into public.task_packages (name) values ('Hack')$$, '42501', null,
  'crew maakt geen pakket');
reset role;
select is((select title from public.tasks where id = '53000000-0000-0000-0000-000000000001'), 'Audio-taak',
  'crew kon de titel niet wijzigen');

-- Crew licht ziet audio niet
set local role authenticated;
set local request.jwt.claims = '{"sub":"52000000-0000-0000-0000-00000000000d","role":"authenticated"}';
select is((select count(*)::int from public.tasks where department_id = '51000000-0000-0000-0000-000000000001'), 0,
  'andere afdeling ziet de audiotaken niet');
select throws_ok($$select public.claim_task('53000000-0000-0000-0000-000000000003')$$,
  '42501', null, 'iemand van een andere afdeling claimt niet');
reset role;

-- Gast zonder view.tasks
set local role authenticated;
set local request.jwt.claims = '{"sub":"52000000-0000-0000-0000-00000000000e","role":"authenticated"}';
select is((select count(*)::int from public.tasks), 0, 'gast zonder view.tasks ziet geen taken');
select is((select count(*)::int from public.task_packages), 0, 'gast ziet geen pakketten');
reset role;

-- Team lead audio (tasks.manage_department)
set local role authenticated;
set local request.jwt.claims = '{"sub":"52000000-0000-0000-0000-00000000000b","role":"authenticated"}';
select lives_ok($$insert into public.tasks (title, department_id) values ('Nieuw', '51000000-0000-0000-0000-000000000001')$$,
  'teamleider maakt taak in eigen afdeling');
select throws_ok($$insert into public.tasks (title, department_id) values ('Nee', '51000000-0000-0000-0000-000000000002')$$,
  '42501', null, 'teamleider maakt geen taak in een andere afdeling');
select lives_ok($$select public.apply_package((select id from public.task_packages where name = 'Main Stage cycle'),
  null, null, '51000000-0000-0000-0000-000000000001', '52000000-0000-0000-0000-00000000000c',
  '2027-07-16T20:00:00Z')$$, 'teamleider past pakket toe op eigen afdeling');
select is((select count(*)::int from public.tasks t join public.task_groups g on g.id = t.group_id
           where g.department_id = '51000000-0000-0000-0000-000000000001'), 9, 'pakket maakte 9 taken');
select is((select min(due_at) from public.tasks t join public.task_groups g on g.id = t.group_id
           where g.department_id = '51000000-0000-0000-0000-000000000001'), '2027-07-16T18:00:00Z'::timestamptz,
  'deadlines zijn relatief aan de ankertijd');
reset role;

-- Afgetekend
set local role authenticated;
set local request.jwt.claims = '{"sub":"52000000-0000-0000-0000-00000000000c","role":"authenticated"}';
select lives_ok($$select public.set_task_status((select t.id from public.tasks t where t.requires_signoff limit 1), 'done')$$,
  'toegewezen crew tekent een aftekentaak af');
reset role;

select * from finish();
rollback;
