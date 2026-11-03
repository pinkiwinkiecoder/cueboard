-- Eerste beheerder.
begin;
create extension if not exists pgtap with schema extensions;
select plan(6);

-- Begin zonder actieve beheerder (andere testbestanden draaien in eigen transacties).
update public.profiles set active = false
 where role_id = (select id from public.roles where is_admin);

insert into auth.users (id, email, raw_app_meta_data, raw_user_meta_data) values
  ('b2000000-0000-0000-0000-000000000001', 'eerste@t9.test', '{}', '{"full_name":"Eerste"}'),
  ('b2000000-0000-0000-0000-000000000002', 'tweede@t9.test', '{}', '{"full_name":"Tweede"}');

set local role anon;
select is((public.public_branding() ->> 'needs_setup')::boolean, true, 'zonder beheerder: opzet nodig');
reset role;

set local role authenticated;
set local request.jwt.claims = '{"sub":"b2000000-0000-0000-0000-000000000001","role":"authenticated"}';
select lives_ok('select public.claim_first_admin()', 'de eerste persoon wordt beheerder');
select ok(public.is_admin(), 'en is nu beheerder');
reset role;

set local role authenticated;
set local request.jwt.claims = '{"sub":"b2000000-0000-0000-0000-000000000002","role":"authenticated"}';
select throws_ok('select public.claim_first_admin()', '42501', null, 'een tweede persoon kan dat niet meer');
select ok(not public.is_admin(), 'de tweede persoon blijft gewoon crew');
reset role;

set local role anon;
select is((public.public_branding() ->> 'needs_setup')::boolean, false, 'met beheerder: geen opzet meer nodig');
reset role;

select * from finish();
rollback;
