-- Foutlogging, systeemstatus en inzage.
begin;
create extension if not exists pgtap with schema extensions;
select plan(10);

insert into auth.users (id, email, raw_app_meta_data, raw_user_meta_data) values
  ('c2000000-0000-0000-0000-00000000000a', 'a@t10.test',
   jsonb_build_object('role_id', (select id from public.roles where is_admin)), '{"full_name":"Admin"}'),
  ('c2000000-0000-0000-0000-00000000000c', 'c@t10.test', '{}', '{"full_name":"Crew"}'),
  ('c2000000-0000-0000-0000-00000000000d', 'd@t10.test', '{}', '{"full_name":"Ander"}');

set local role authenticated;
set local request.jwt.claims = '{"sub":"c2000000-0000-0000-0000-00000000000c","role":"authenticated"}';
select lives_ok($$select public.log_client_error('error', 'TypeError', 'TasksPage', '1.0', 'Safari')$$,
  'crew kan een fout melden');
select is((select count(*)::int from public.client_errors), 0, 'crew leest de foutmeldingen niet');
select throws_ok($$insert into public.client_errors (kind, message) values ('error', 'x')$$, '42501', null,
  'crew schrijft niet rechtstreeks in de tabel');
select throws_ok('select public.system_health()', '42501', null, 'crew ziet de systeemstatus niet');
select is((public.export_person() -> 'profile' ->> 'full_name'), 'Crew', 'je kunt je eigen gegevens opvragen');
select throws_ok($$select public.export_person('c2000000-0000-0000-0000-00000000000d')$$, '42501', null,
  'maar niet die van een ander');
do $$ begin for i in 1..25 loop perform public.log_client_error('error', 'spam'); end loop; end $$;
reset role;
select is((select count(*)::int from public.client_errors), 20, 'maximaal 20 meldingen per persoon per 10 minuten');

set local role authenticated;
set local request.jwt.claims = '{"sub":"c2000000-0000-0000-0000-00000000000a","role":"authenticated"}';
select ok((select count(*) from public.client_errors) = 20, 'beheerder leest de foutmeldingen');
select ok((public.system_health() ->> 'errors_24h')::int = 20, 'systeemstatus telt de fouten');
select is((public.export_person('c2000000-0000-0000-0000-00000000000d') -> 'profile' ->> 'full_name'), 'Ander',
  'beheerder kan de gegevens van iemand opvragen');
reset role;

select * from finish();
rollback;
