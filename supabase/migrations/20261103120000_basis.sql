-- =============================================================================
-- Basis: eigen rollen met rechten, afdelingen, profielen, helpers, auditlog, ping.
-- Principe: RLS staat aan op elke tabel, en zonder policy is alles geweigerd.
-- Rollen zijn data: de beheerder maakt ze zelf per evenement en kiest per rol
-- wat die ziet (view.*) en mag beheren (*.manage).
-- =============================================================================

-- Alle bestaande rechten. Nieuwe modules voegen hier een sleutel toe.
create function public.permission_keys() returns text[]
language sql immutable set search_path = ''
as $$
  select array[
    'view.schedule', 'view.tasks', 'view.artists', 'view.documents',
    'view.people', 'view.issues', 'view.dashboard',
    'people.manage', 'settings.manage', 'schedule.manage',
    'tasks.manage_all', 'tasks.manage_department', 'tasks.claim',
    'documents.manage', 'artists.manage', 'announcements.send',
    'issues.manage', 'audit.view'
  ]::text[]
$$;

-- -----------------------------------------------------------------------------
-- Rollen
-- -----------------------------------------------------------------------------
create table public.roles (
  id uuid primary key default gen_random_uuid(),
  name text not null unique check (char_length(name) between 1 and 40),
  description text check (char_length(description) <= 200),
  color text not null default 'violet' check (color ~ '^[a-z]{3,12}$'),
  /** Beheerder: mag alles, ook rollen beheren. Kan niet gewijzigd of verwijderd worden. */
  is_admin boolean not null default false,
  /** Rol voor nieuwe mensen als er geen rol gekozen wordt. */
  is_default boolean not null default false,
  permissions text[] not null default '{}'
    check (permissions <@ public.permission_keys()),
  sort_order int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  updated_by uuid,
  -- Nieuwe mensen mogen nooit automatisch beheerder worden.
  check (not (is_admin and is_default))
);
create unique index roles_one_admin on public.roles (is_admin) where is_admin;
create unique index roles_one_default on public.roles (is_default) where is_default;

-- Startrollen. Namen en rechten zijn vrij aan te passen in Instellingen → Rollen.
insert into public.roles (name, description, color, is_admin, is_default, permissions, sort_order) values
  ('Admin', 'Full access, including roles and settings.', 'gold', true, false, '{}', 1),
  ('Team lead', 'Manages tasks, schedule and documents for their own department.', 'violet', false, false,
   array['view.schedule','view.tasks','view.artists','view.documents','view.people','view.issues',
         'tasks.manage_department','tasks.claim','announcements.send','issues.manage'], 2),
  ('Crew', 'Sees the schedule and does their own tasks.', 'mint', false, true,
   array['view.schedule','view.tasks','view.documents','view.people','view.issues','tasks.claim'], 3),
  ('Guest', 'Read-only: only sees the schedule.', 'sky', false, false,
   array['view.schedule'], 4);

-- -----------------------------------------------------------------------------
-- Afdelingen (of teams)
-- -----------------------------------------------------------------------------
create table public.departments (
  id uuid primary key default gen_random_uuid(),
  name text not null unique check (char_length(name) between 1 and 60),
  color text not null default 'violet' check (color ~ '^[a-z]{3,12}$'),
  sort_order int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  updated_by uuid
);

-- -----------------------------------------------------------------------------
-- Profielen (1 per auth-gebruiker). Dataminimalisatie: naam, e-mail, telefoon, afdeling.
-- -----------------------------------------------------------------------------
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  full_name text not null check (char_length(full_name) between 1 and 120),
  email text not null,
  phone text check (phone is null or phone ~ '^\+?[0-9 ()-]{6,20}$'),
  department_id uuid references public.departments (id) on delete set null,
  role_id uuid not null references public.roles (id) on delete restrict,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  updated_by uuid
);
create index profiles_department_idx on public.profiles (department_id);
create index profiles_role_idx on public.profiles (role_id);

-- -----------------------------------------------------------------------------
-- Helpers voor RLS. security definer zodat ze profiles/roles mogen lezen zonder
-- recursie in de policies; search_path leeg tegen kaping.
-- Een gedeactiveerd profiel geeft overal false/null: toegang is meteen weg.
-- -----------------------------------------------------------------------------
create function public.is_member() returns boolean
language sql stable security definer set search_path = ''
as $$
  select exists (select 1 from public.profiles p where p.id = auth.uid() and p.active)
$$;

create function public.is_admin() returns boolean
language sql stable security definer set search_path = ''
as $$
  select exists (
    select 1 from public.profiles p join public.roles r on r.id = p.role_id
     where p.id = auth.uid() and p.active and r.is_admin
  )
$$;

/** Heeft de ingelogde persoon dit recht? Beheerder heeft altijd alles. */
create function public.has_perm(perm text) returns boolean
language sql stable security definer set search_path = ''
as $$
  select exists (
    select 1 from public.profiles p join public.roles r on r.id = p.role_id
     where p.id = auth.uid() and p.active and (r.is_admin or perm = any (r.permissions))
  )
$$;

create function public.my_department() returns uuid
language sql stable security definer set search_path = ''
as $$
  select p.department_id from public.profiles p where p.id = auth.uid() and p.active
$$;

/** Mag taken beheren in deze afdeling: alles, of enkel de eigen afdeling. */
create function public.can_manage_tasks(dept uuid) returns boolean
language sql stable security definer set search_path = ''
as $$
  select public.has_perm('tasks.manage_all')
      or (public.has_perm('tasks.manage_department') and dept is not null
          and dept = public.my_department())
$$;

/** Alles wat de app nodig heeft over de ingelogde persoon, in één aanroep. */
create function public.my_access() returns jsonb
language sql stable security definer set search_path = ''
as $$
  select jsonb_build_object(
    'role_id', r.id,
    'role_name', r.name,
    'is_admin', r.is_admin,
    'permissions', case when r.is_admin then to_jsonb(public.permission_keys())
                        else to_jsonb(r.permissions) end
  )
  from public.profiles p join public.roles r on r.id = p.role_id
  where p.id = auth.uid() and p.active
$$;

revoke all on function public.is_member(), public.is_admin(), public.has_perm(text),
  public.my_department(), public.can_manage_tasks(uuid), public.my_access() from public, anon;
grant execute on function public.is_member(), public.is_admin(), public.has_perm(text),
  public.my_department(), public.can_manage_tasks(uuid), public.my_access() to authenticated;
grant execute on function public.permission_keys() to authenticated;

-- -----------------------------------------------------------------------------
-- "Laatst gewijzigd door": elke tabel met updated_at/updated_by krijgt deze trigger.
-- -----------------------------------------------------------------------------
create function public.touch_updated() returns trigger
language plpgsql set search_path = ''
as $$
begin
  new.updated_at := now();
  new.updated_by := auth.uid();
  return new;
end;
$$;

create trigger roles_touch before insert or update on public.roles
  for each row execute function public.touch_updated();
create trigger departments_touch before insert or update on public.departments
  for each row execute function public.touch_updated();
create trigger profiles_touch before insert or update on public.profiles
  for each row execute function public.touch_updated();

-- De beheerdersrol is vast: niet verwijderen, niet "ontbeheerderen", geen tweede.
create function public.protect_admin_role() returns trigger
language plpgsql set search_path = ''
as $$
begin
  if tg_op = 'DELETE' and old.is_admin then
    raise exception 'AOF:admin_role_locked' using errcode = '42501';
  end if;
  if tg_op = 'UPDATE' and old.is_admin is distinct from new.is_admin then
    raise exception 'AOF:admin_role_locked' using errcode = '42501';
  end if;
  return coalesce(new, old);
end;
$$;
create trigger roles_protect before update or delete on public.roles
  for each row execute function public.protect_admin_role();

-- -----------------------------------------------------------------------------
-- Auditlog: append-only. Niemand (ook geen beheerder) krijgt UPDATE of DELETE.
-- Bij persoonsgegevens bewaren we enkel welke velden wijzigden, niet de waarden.
-- -----------------------------------------------------------------------------
create table public.audit_log (
  id bigint generated always as identity primary key,
  at timestamptz not null default now(),
  actor uuid,
  table_name text not null,
  row_id text,
  action text not null check (action in ('INSERT', 'UPDATE', 'DELETE', 'SIGNOFF', 'SHIFT', 'PUBLISH', 'OTHER')),
  changed_fields text[],
  detail jsonb
);
create index audit_log_at_idx on public.audit_log (at desc);
create index audit_log_row_idx on public.audit_log (table_name, row_id);

create function public.audit_row() returns trigger
language plpgsql security definer set search_path = ''
as $$
declare
  old_j jsonb;
  new_j jsonb;
  fields text[];
  keep_values boolean := tg_nargs = 0 or tg_argv[0] <> 'no_values';
  diff jsonb;
begin
  if tg_op in ('UPDATE', 'DELETE') then old_j := to_jsonb(old); end if;
  if tg_op in ('INSERT', 'UPDATE') then new_j := to_jsonb(new); end if;

  if tg_op = 'UPDATE' then
    select array_agg(k order by k), jsonb_object_agg(k, new_j -> k)
      into fields, diff
      from jsonb_object_keys(new_j) k
     where k not in ('updated_at', 'updated_by')
       and (old_j -> k) is distinct from (new_j -> k);
    if fields is null then
      return new; -- niets inhoudelijks gewijzigd
    end if;
  end if;

  insert into public.audit_log (actor, table_name, row_id, action, changed_fields, detail)
  values (
    auth.uid(),
    tg_table_name,
    coalesce(new_j ->> 'id', old_j ->> 'id'),
    tg_op,
    fields,
    case when keep_values then coalesce(diff, case when tg_op = 'INSERT' then new_j end) end
  );
  return coalesce(new, old);
end;
$$;

create trigger roles_audit after insert or update or delete on public.roles
  for each row execute function public.audit_row();
create trigger departments_audit after insert or update or delete on public.departments
  for each row execute function public.audit_row();
create trigger profiles_audit after insert or update or delete on public.profiles
  for each row execute function public.audit_row('no_values');

-- -----------------------------------------------------------------------------
-- Nieuw auth-account → profiel. Rol en afdeling komen uit app_metadata, die
-- enkel server-side (Edge Function met service-role) gezet kan worden.
-- Zonder (geldige) rol krijgt iemand de standaardrol, nooit de beheerdersrol.
-- -----------------------------------------------------------------------------
create function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = ''
as $$
declare
  wanted uuid := nullif(new.raw_app_meta_data ->> 'role_id', '')::uuid;
  chosen uuid;
begin
  select id into chosen from public.roles where id = wanted;
  if chosen is null then
    select id into chosen from public.roles where is_default;
  end if;
  if chosen is null then
    select id into chosen from public.roles where not is_admin order by sort_order limit 1;
  end if;
  insert into public.profiles (id, full_name, email, phone, department_id, role_id)
  values (
    new.id,
    coalesce(nullif(new.raw_user_meta_data ->> 'full_name', ''), split_part(new.email, '@', 1)),
    new.email,
    nullif(new.raw_user_meta_data ->> 'phone', ''),
    nullif(new.raw_app_meta_data ->> 'department_id', '')::uuid,
    chosen
  );
  return new;
end;
$$;

create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

-- -----------------------------------------------------------------------------
-- Mensen beheren via RPC (rol/afdeling/actief zijn niet rechtstreeks schrijfbaar).
-- people.manage mag mensen beheren, maar enkel een beheerder mag iemand
-- beheerder maken of een beheerder aanpassen (geen stille machtsgreep).
-- -----------------------------------------------------------------------------
create function public.admin_update_profile(
  target uuid,
  new_role uuid,
  new_department uuid,
  new_active boolean
) returns void
language plpgsql security definer set search_path = ''
as $$
declare
  target_is_admin boolean;
  new_role_is_admin boolean;
begin
  if not public.has_perm('people.manage') then
    raise exception 'AOF:no_permission' using errcode = '42501';
  end if;
  select r.is_admin into target_is_admin
    from public.profiles p join public.roles r on r.id = p.role_id where p.id = target;
  select is_admin into new_role_is_admin from public.roles where id = new_role;
  if new_role_is_admin is null then
    raise exception 'AOF:unknown_role' using errcode = '22023';
  end if;
  if (target_is_admin or new_role_is_admin) and not public.is_admin() then
    raise exception 'AOF:not_admin' using errcode = '42501';
  end if;
  if target = auth.uid() and (not new_role_is_admin or not new_active) and target_is_admin then
    raise exception 'AOF:cannot_demote_self' using errcode = '42501';
  end if;
  update public.profiles
     set role_id = new_role, department_id = new_department, active = new_active
   where id = target;
end;
$$;
revoke all on function public.admin_update_profile(uuid, uuid, uuid, boolean) from public, anon;
grant execute on function public.admin_update_profile(uuid, uuid, uuid, boolean) to authenticated;

-- -----------------------------------------------------------------------------
-- Ping: lichte check voor de app (server bereikbaar?) en voor de keep-alive.
-- -----------------------------------------------------------------------------
create function public.ping() returns text
language plpgsql stable security definer set search_path = ''
as $$
begin
  perform 1 from public.departments limit 1;
  return 'ok';
end;
$$;
revoke all on function public.ping() from public;
grant execute on function public.ping() to anon, authenticated;

-- =============================================================================
-- RLS
-- =============================================================================
alter table public.roles enable row level security;
alter table public.departments enable row level security;
alter table public.profiles enable row level security;
alter table public.audit_log enable row level security;

-- Supabase geeft anon/authenticated standaard alle rechten op nieuwe tabellen.
-- We trekken die in en geven gericht terug: dubbele bescherming naast RLS.
revoke all on public.roles, public.departments, public.profiles, public.audit_log
  from anon, authenticated;

-- Rollen: elk lid leest (namen tonen); enkel de beheerder schrijft.
grant select, insert, update, delete on public.roles to authenticated;
create policy roles_read on public.roles for select to authenticated using (public.is_member());
create policy roles_admin_insert on public.roles for insert to authenticated
  with check (public.is_admin() and not is_admin);
create policy roles_admin_update on public.roles for update to authenticated
  using (public.is_admin()) with check (public.is_admin());
create policy roles_admin_delete on public.roles for delete to authenticated
  using (public.is_admin());

-- Afdelingen: elk lid leest, settings.manage schrijft.
grant select, insert, update, delete on public.departments to authenticated;
create policy departments_read on public.departments for select to authenticated
  using (public.is_member());
create policy departments_insert on public.departments for insert to authenticated
  with check (public.has_perm('settings.manage'));
create policy departments_update on public.departments for update to authenticated
  using (public.has_perm('settings.manage')) with check (public.has_perm('settings.manage'));
create policy departments_delete on public.departments for delete to authenticated
  using (public.has_perm('settings.manage'));

-- Profielen: jezelf altijd; anderen enkel met view.people of people.manage
-- (en gedeactiveerden enkel voor people.manage). Zelf: enkel naam en telefoon.
grant select on public.profiles to authenticated;
grant update (full_name, phone) on public.profiles to authenticated;
create policy profiles_read on public.profiles for select to authenticated
  using (
    id = auth.uid()
    or (public.has_perm('view.people') and active)
    or public.has_perm('people.manage')
  );
create policy profiles_update_self on public.profiles for update to authenticated
  using (id = auth.uid() and public.is_member())
  with check (id = auth.uid());

-- Auditlog: enkel met audit.view. Geen insert/update/delete-rechten voor wie dan ook.
grant select on public.audit_log to authenticated;
create policy audit_read on public.audit_log for select to authenticated
  using (public.has_perm('audit.view'));
