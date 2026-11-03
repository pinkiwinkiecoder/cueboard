-- RLS-tests voor mededelingen.
begin;
create extension if not exists pgtap with schema extensions;
select plan(11);

insert into public.departments (id, name) values
  ('61000000-0000-0000-0000-000000000001', 'T3-Audio'),
  ('61000000-0000-0000-0000-000000000002', 'T3-Licht');
insert into auth.users (id, email, raw_app_meta_data, raw_user_meta_data) values
  ('62000000-0000-0000-0000-00000000000a', 'a@t3.test',
   jsonb_build_object('role_id', (select id from public.roles where is_admin)), '{"full_name":"Admin"}'),
  ('62000000-0000-0000-0000-00000000000c', 'audio@t3.test',
   '{"department_id":"61000000-0000-0000-0000-000000000001"}', '{"full_name":"Audio"}'),
  ('62000000-0000-0000-0000-00000000000d', 'licht@t3.test',
   '{"department_id":"61000000-0000-0000-0000-000000000002"}', '{"full_name":"Licht"}');

insert into public.announcements (id, title, pinned, department_ids) values
  ('63000000-0000-0000-0000-000000000001', 'Radio channels', true, '{}'),
  ('63000000-0000-0000-0000-000000000002', 'Enkel audio', false, array['61000000-0000-0000-0000-000000000001'::uuid]);

-- Crew audio
set local role authenticated;
set local request.jwt.claims = '{"sub":"62000000-0000-0000-0000-00000000000c","role":"authenticated"}';
select is((select count(*)::int from public.announcements), 2, 'audio ziet algemeen + audio-bericht');
select throws_ok($$insert into public.announcements (title) values ('Hack')$$, '42501', null,
  'crew zonder announcements.send post niets');
update public.announcements set pinned = false;
select lives_ok($$select public.mark_announcement('63000000-0000-0000-0000-000000000001', true)$$,
  'crew bevestigt een mededeling');
select ok((select acknowledged_at is not null from public.announcement_reads
           where announcement_id = '63000000-0000-0000-0000-000000000001'), 'bevestiging is opgeslagen');
select throws_ok($$insert into public.announcement_reads (announcement_id, profile_id)
  values ('63000000-0000-0000-0000-000000000002', '62000000-0000-0000-0000-00000000000d')$$,
  '42501', null, 'niemand schrijft rechtstreeks leesstatus (ook niet voor een ander)');
reset role;
select is((select pinned from public.announcements where id = '63000000-0000-0000-0000-000000000001'), true,
  'crew kon het vastpinnen niet wijzigen');

-- Crew licht
set local role authenticated;
set local request.jwt.claims = '{"sub":"62000000-0000-0000-0000-00000000000d","role":"authenticated"}';
select is((select count(*)::int from public.announcements), 1, 'licht ziet het audio-bericht niet');
select throws_ok($$select public.mark_announcement('63000000-0000-0000-0000-000000000002')$$,
  '42501', null, 'licht kan een audio-bericht niet markeren');
select is((select count(*)::int from public.announcement_reads), 0, 'licht ziet andermans leesstatus niet');
reset role;

-- Beheerder
set local role authenticated;
set local request.jwt.claims = '{"sub":"62000000-0000-0000-0000-00000000000a","role":"authenticated"}';
select lives_ok($$insert into public.announcements (title, body, urgent, requires_ack)
  values ('Storm', 'Iedereen naar binnen', true, true)$$, 'beheerder post een dringende mededeling');
select is((select count(*)::int from public.announcement_reads), 1, 'beheerder ziet wie bevestigde');
reset role;

select * from finish();
rollback;
