-- Logo en publieke branding.
begin;
create extension if not exists pgtap with schema extensions;
select plan(4);

insert into auth.users (id, email, raw_app_meta_data, raw_user_meta_data) values
  ('72000000-0000-0000-0000-00000000000c', 'crew@t5.test', '{}', '{"full_name":"Crew"}');
update public.event set name = 'Test Fest', logo_path = 'logo-1.png';

set local role anon;
select is(public.public_branding() ->> 'name', 'Test Fest', 'naam is publiek (inlogscherm)');
select is(public.public_branding() ->> 'logo_path', 'logo-1.png', 'logo-pad is publiek');
select throws_ok('select * from public.event', '42501', null, 'de rest van het evenement blijft privé');
reset role;

set local role authenticated;
set local request.jwt.claims = '{"sub":"72000000-0000-0000-0000-00000000000c","role":"authenticated"}';
update public.event set logo_path = 'gehackt.png';
reset role;
select is((select logo_path from public.event), 'logo-1.png', 'crew kan het logo niet wijzigen');

select * from finish();
rollback;
