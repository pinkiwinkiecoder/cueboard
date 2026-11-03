-- Artiesten, documenten en meldingen: wie mag wat.
begin;
create extension if not exists pgtap with schema extensions;
select plan(12);

insert into public.roles (name, permissions) values
  ('T13-Crew', array['view.artists', 'view.documents', 'view.issues']),
  ('T13-Gast', array['view.schedule']);
insert into public.departments (name) values ('T13-Audio'), ('T13-Licht');

insert into auth.users (id, email, raw_app_meta_data, raw_user_meta_data) values
  ('a4000000-0000-0000-0000-00000000000a', 'a@t13.test',
   jsonb_build_object('role_id', (select id from public.roles where is_admin)), '{"full_name":"Admin"}'),
  ('a4000000-0000-0000-0000-00000000000c', 'c@t13.test',
   jsonb_build_object('role_id', (select id from public.roles where name = 'T13-Crew'),
                      'department_id', (select id from public.departments where name = 'T13-Audio')),
   '{"full_name":"Crew"}'),
  ('a4000000-0000-0000-0000-00000000000e', 'g@t13.test',
   jsonb_build_object('role_id', (select id from public.roles where name = 'T13-Gast')), '{"full_name":"Gast"}');

-- Beheerder maakt inhoud aan
set local role authenticated;
set local request.jwt.claims = '{"sub":"a4000000-0000-0000-0000-00000000000a","role":"authenticated"}';
insert into public.artists (name) values ('T13-Band');
select is((select count(*)::int from public.artist_checklist c join public.artists a on a.id = c.artist_id
           where a.name = 'T13-Band'), 7, 'nieuwe artiest krijgt de standaardchecklist');
insert into public.documents (title, external_url) values ('T13-Iedereen', 'https://example.com/a');
insert into public.documents (title, external_url, department_ids)
  values ('T13-Licht', 'https://example.com/b', array[(select id from public.departments where name = 'T13-Licht')]);
reset role;

-- Crew
set local role authenticated;
set local request.jwt.claims = '{"sub":"a4000000-0000-0000-0000-00000000000c","role":"authenticated"}';
select is((select count(*)::int from public.artists where name = 'T13-Band'), 1, 'crew ziet artiesten');
select throws_ok($$insert into public.artists (name) values ('x')$$, '42501', null, 'crew maakt geen artiest');
select throws_ok(
  $$select public.toggle_artist_check((select id from public.artist_checklist limit 1), true)$$,
  '42501', null, 'crew vinkt geen artiestenchecklist af');
select is((select count(*)::int from public.documents where title like 'T13-%'), 1,
  'crew ziet enkel documenten voor iedereen of het eigen team');
select lives_ok($$select public.mark_document_read((select id from public.documents where title = 'T13-Iedereen'))$$,
  'crew bevestigt dat een document gelezen is');
select throws_ok(
  $$select public.mark_document_read((select id from public.documents where title = 'T13-Licht'))$$,
  '42501', null, 'een onzichtbaar document kan je niet als gelezen markeren');
insert into public.issues (title, severity) values ('T13-Kabel los', 'high');
select is((select reported_by from public.issues where title = 'T13-Kabel los'),
  'a4000000-0000-0000-0000-00000000000c'::uuid, 'crew meldt een probleem in eigen naam');
select throws_ok(
  $$select public.set_issue_status((select id from public.issues where title = 'T13-Kabel los'), 'resolved', 'ok')$$,
  '42501', null, 'crew sluit geen melding die niet aan hen is toegewezen');
reset role;

-- Gast zonder rechten
set local role authenticated;
set local request.jwt.claims = '{"sub":"a4000000-0000-0000-0000-00000000000e","role":"authenticated"}';
select is((select count(*)::int from public.artists) + (select count(*)::int from public.issues), 0,
  'gast ziet geen artiesten of meldingen');
reset role;

-- Beheerder lost op
set local role authenticated;
set local request.jwt.claims = '{"sub":"a4000000-0000-0000-0000-00000000000a","role":"authenticated"}';
select throws_ok(
  $$select public.set_issue_status((select id from public.issues where title = 'T13-Kabel los'), 'resolved', '')$$,
  '22023', null, 'oplossen vraagt een uitleg');
select public.set_issue_status((select id from public.issues where title = 'T13-Kabel los'), 'resolved', 'Kabel vervangen');
select is((select status::text || ':' || resolution from public.issues where title = 'T13-Kabel los'),
  'resolved:Kabel vervangen', 'beheerder lost een melding op met uitleg');
reset role;

select * from finish();
rollback;
