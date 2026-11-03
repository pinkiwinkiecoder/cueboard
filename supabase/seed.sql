-- Seed voor lokale ontwikkeling (supabase db reset). Wordt NIET naar productie gestuurd.

update public.event set name = 'Art of Faith';

insert into public.departments (name, color, sort_order) values
  ('Stage', 'violet', 1), ('Lighting', 'gold', 2), ('Audio', 'sky', 3), ('Video', 'pink', 4),
  ('Backline', 'peach', 5), ('Production', 'mint', 6), ('Artist liaison', 'rose', 7), ('Runners', 'lime', 8)
on conflict (name) do nothing;

insert into public.locations (name, sort_order) values ('Main Stage', 1)
on conflict (name) do nothing;

-- -- DEMO -------------------------------------------------------------------
-- Demo-accounts, enkel lokaal. Wachtwoord voor allemaal: DemoDemo2026
-- admin@demo.test, lead.audio@demo.test, crew.audio@demo.test,
-- crew.lighting@demo.test, guest@demo.test
do $$
declare
  u record;
begin
  for u in
    select * from (values
      ('00000000-0000-0000-0000-00000000000a'::uuid, 'admin@demo.test', 'Demo Admin', 'Admin', null),
      ('00000000-0000-0000-0000-00000000000b'::uuid, 'lead.audio@demo.test', 'Demo Lead Audio', 'Team lead', 'Audio'),
      ('00000000-0000-0000-0000-00000000000c'::uuid, 'crew.audio@demo.test', 'Demo Crew Audio', 'Crew', 'Audio'),
      ('00000000-0000-0000-0000-00000000000d'::uuid, 'crew.lighting@demo.test', 'Demo Crew Lighting', 'Crew', 'Lighting'),
      ('00000000-0000-0000-0000-00000000000e'::uuid, 'guest@demo.test', 'Demo Guest', 'Guest', null)
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
        'provider', 'email', 'providers', jsonb_build_array('email'),
        'role_id', (select id from public.roles where name = u.role),
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
