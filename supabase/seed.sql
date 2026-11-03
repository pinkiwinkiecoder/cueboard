-- Seed voor lokale ontwikkeling (supabase db reset). Wordt NIET naar productie gestuurd.

-- Standaardafdelingen (geen demo: ook in productie aan te maken via Instellingen).
insert into public.departments (name, sort_order) values
  ('Stage', 1), ('Licht', 2), ('Audio', 3), ('Video', 4),
  ('Backline', 5), ('Productie', 6), ('Artist liaison', 7), ('Runners', 8)
on conflict (name) do nothing;

-- -- DEMO -------------------------------------------------------------------
-- Demo-accounts, enkel lokaal. Wachtwoord voor allemaal: DemoDemo2026
-- beheerder@demo.test, hoofd.audio@demo.test, crew.audio@demo.test,
-- crew.licht@demo.test, gast@demo.test
do $$
declare
  u record;
begin
  for u in
    select * from (values
      ('00000000-0000-0000-0000-00000000000a'::uuid, 'beheerder@demo.test', 'Demo Beheerder', 'beheerder', null),
      ('00000000-0000-0000-0000-00000000000b'::uuid, 'hoofd.audio@demo.test', 'Demo Hoofd Audio', 'afdelingshoofd', 'Audio'),
      ('00000000-0000-0000-0000-00000000000c'::uuid, 'crew.audio@demo.test', 'Demo Crew Audio', 'crew', 'Audio'),
      ('00000000-0000-0000-0000-00000000000d'::uuid, 'crew.licht@demo.test', 'Demo Crew Licht', 'crew', 'Licht'),
      ('00000000-0000-0000-0000-00000000000e'::uuid, 'gast@demo.test', 'Demo Gast', 'gast', null)
    ) as t(id, email, name, role, dept)
  loop
    insert into auth.users (
      instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
      raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
      confirmation_token, recovery_token, email_change_token_new, email_change
    ) values (
      '00000000-0000-0000-0000-000000000000', u.id, 'authenticated', 'authenticated', u.email,
      crypt('DemoDemo2026', gen_salt('bf')), now(),
      jsonb_build_object(
        'provider', 'email', 'providers', jsonb_build_array('email'), 'role', u.role,
        'department_id', (select id from public.departments where name = u.dept)
      ),
      jsonb_build_object('full_name', u.name), now(), now(), '', '', '', ''
    ) on conflict (id) do nothing;

    insert into auth.identities (id, user_id, provider_id, identity_data, provider, created_at, updated_at, last_sign_in_at)
    values (gen_random_uuid(), u.id, u.id::text,
            jsonb_build_object('sub', u.id::text, 'email', u.email), 'email', now(), now(), now())
    on conflict do nothing;
  end loop;
end $$;
-- -- EINDE DEMO --------------------------------------------------------------
