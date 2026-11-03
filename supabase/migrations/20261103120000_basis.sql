-- =============================================================================
-- Fase 0: basis. Rollen, afdelingen, profielen, helpers, auditlog, ping.
-- Principe: RLS staat aan op elke tabel, en zonder policy is alles geweigerd.
-- =============================================================================

create type public.app_role as enum ('beheerder', 'afdelingshoofd', 'crew', 'gast');

-- -----------------------------------------------------------------------------
-- Afdelingen
-- -----------------------------------------------------------------------------
create table public.departments (
  id uuid primary key default gen_random_uuid(),
  name text not null unique check (char_length(name) between 1 and 60),
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
  role public.app_role not null default 'crew',
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  updated_by uuid
);
create index profiles_department_idx on public.profiles (department_id);

-- -----------------------------------------------------------------------------
-- Helpers voor RLS. security definer zodat ze profiles mogen lezen zonder
-- recursie in de policies; search_path leeg tegen kaping.
-- Een gedeactiveerd profiel geeft overal null/false: toegang is meteen weg,
-- ook al is het JWT nog geldig.
-- -----------------------------------------------------------------------------
create function public.my_role() returns public.app_role
language sql stable security definer set search_path = ''
as $$
  select p.role from public.profiles p where p.id = auth.uid() and p.active
$$;

create function public.is_member() returns boolean
language sql stable security definer set search_path = ''
as $$
  select exists (select 1 from public.profiles p where p.id = auth.uid() and p.active)
$$;

create function public.is_admin() returns boolean
language sql stable security definer set search_path = ''
as $$
  select coalesce(public.my_role() = 'beheerder', false)
$$;

create function public.my_department() returns uuid
language sql stable security definer set search_path = ''
as $$
  select p.department_id from public.profiles p where p.id = auth.uid() and p.active
$$;

/** Beheerder, of afdelingshoofd van de opgegeven afdeling. */
create function public.can_manage_department(dept uuid) returns boolean
language sql stable security definer set search_path = ''
as $$
  select public.is_admin()
      or (public.my_role() = 'afdelingshoofd' and dept is not null and dept = public.my_department())
$$;

revoke all on function public.my_role(), public.is_member(), public.is_admin(),
  public.my_department(), public.can_manage_department(uuid) from public, anon;
grant execute on function public.my_role(), public.is_member(), public.is_admin(),
  public.my_department(), public.can_manage_department(uuid) to authenticated;

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

create trigger departments_touch before insert or update on public.departments
  for each row execute function public.touch_updated();
create trigger profiles_touch before insert or update on public.profiles
  for each row execute function public.touch_updated();

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

create trigger departments_audit after insert or update or delete on public.departments
  for each row execute function public.audit_row();
create trigger profiles_audit after insert or update or delete on public.profiles
  for each row execute function public.audit_row('no_values');

-- -----------------------------------------------------------------------------
-- Nieuw auth-account → profiel. Rol en afdeling komen uit app_metadata, die
-- enkel server-side (Edge Function met service-role) gezet kan worden.
-- Zonder rol wordt het 'crew'.
-- -----------------------------------------------------------------------------
create function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = ''
as $$
declare
  meta_role text := new.raw_app_meta_data ->> 'role';
begin
  insert into public.profiles (id, full_name, email, phone, department_id, role)
  values (
    new.id,
    coalesce(nullif(new.raw_user_meta_data ->> 'full_name', ''), split_part(new.email, '@', 1)),
    new.email,
    nullif(new.raw_user_meta_data ->> 'phone', ''),
    nullif(new.raw_app_meta_data ->> 'department_id', '')::uuid,
    case when meta_role in ('beheerder', 'afdelingshoofd', 'crew', 'gast')
         then meta_role::public.app_role else 'crew' end
  );
  return new;
end;
$$;

create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

-- -----------------------------------------------------------------------------
-- Beheerdersacties via RPC (rol/afdeling/actief zijn niet rechtstreeks schrijfbaar).
-- -----------------------------------------------------------------------------
create function public.admin_update_profile(
  target uuid,
  new_role public.app_role,
  new_department uuid,
  new_active boolean
) returns void
language plpgsql security definer set search_path = ''
as $$
begin
  if not public.is_admin() then
    raise exception 'AOF:not_admin' using errcode = '42501';
  end if;
  if target = auth.uid() and (new_role <> 'beheerder' or not new_active) then
    raise exception 'AOF:cannot_demote_self' using errcode = '42501';
  end if;
  update public.profiles
     set role = new_role, department_id = new_department, active = new_active
   where id = target;
end;
$$;
revoke all on function public.admin_update_profile(uuid, public.app_role, uuid, boolean) from public, anon;
grant execute on function public.admin_update_profile(uuid, public.app_role, uuid, boolean) to authenticated;

-- -----------------------------------------------------------------------------
-- Ping: lichte check voor de app (server bereikbaar?) en voor de keep-alive.
-- Raakt een echte tabel aan zodat het als database-activiteit telt.
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
alter table public.departments enable row level security;
alter table public.profiles enable row level security;
alter table public.audit_log enable row level security;

-- Supabase geeft anon/authenticated standaard alle rechten op nieuwe tabellen.
-- We trekken die in en geven gericht terug: dubbele bescherming naast RLS.
revoke all on public.departments, public.profiles, public.audit_log from anon, authenticated;

-- Afdelingen: elk actief lid leest, enkel beheerder schrijft.
grant select, insert, update, delete on public.departments to authenticated;
create policy departments_read on public.departments for select to authenticated
  using (public.is_member());
create policy departments_admin_insert on public.departments for insert to authenticated
  with check (public.is_admin());
create policy departments_admin_update on public.departments for update to authenticated
  using (public.is_admin()) with check (public.is_admin());
create policy departments_admin_delete on public.departments for delete to authenticated
  using (public.is_admin());

-- Profielen: crew/afdelingshoofd/beheerder zien elkaar (contactgegevens nodig op het
-- terrein); een gast ziet enkel zichzelf. Zelf mag je enkel naam en telefoon wijzigen.
grant select on public.profiles to authenticated;
grant update (full_name, phone) on public.profiles to authenticated;
create policy profiles_read on public.profiles for select to authenticated
  using (
    id = auth.uid()
    or (public.my_role() in ('beheerder', 'afdelingshoofd', 'crew') and active)
    or public.is_admin()
  );
create policy profiles_update_self on public.profiles for update to authenticated
  using (id = auth.uid() and public.is_member())
  with check (id = auth.uid());

-- Auditlog: enkel beheerder leest. Geen insert/update/delete-rechten voor wie dan ook.
grant select on public.audit_log to authenticated;
create policy audit_read_admin on public.audit_log for select to authenticated
  using (public.is_admin());
