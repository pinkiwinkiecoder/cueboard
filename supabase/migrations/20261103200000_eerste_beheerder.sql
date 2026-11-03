-- =============================================================================
-- Eerste beheerder zonder SQL: zolang er geen actieve beheerder is, mag de
-- eerste ingelogde persoon zichzelf beheerder maken. Zelf registreren staat
-- uit, dus enkel accounts die jij in het Supabase-dashboard maakte kunnen dit.
-- =============================================================================

create function public.has_active_admin() returns boolean
language sql stable security definer set search_path = ''
as $$
  select exists (
    select 1 from public.profiles p join public.roles r on r.id = p.role_id
     where p.active and r.is_admin
  )
$$;

create function public.claim_first_admin() returns void
language plpgsql security definer set search_path = ''
as $$
begin
  if auth.uid() is null or not public.is_member() then
    raise exception 'AOF:not_signed_in' using errcode = '42501';
  end if;
  -- Slot op de rollen-tabel zodat twee mensen niet tegelijk beheerder worden.
  lock table public.roles in share row exclusive mode;
  if public.has_active_admin() then
    raise exception 'AOF:admin_exists' using errcode = '42501';
  end if;
  update public.profiles
     set role_id = (select id from public.roles where is_admin), active = true
   where id = auth.uid();
  insert into public.audit_log (actor, table_name, row_id, action, detail)
  values (auth.uid(), 'profiles', auth.uid()::text, 'OTHER', '{"first_admin": true}');
end;
$$;

revoke all on function public.has_active_admin(), public.claim_first_admin() from public, anon;
grant execute on function public.claim_first_admin() to authenticated;

-- Publieke branding vertelt ook of de opzet nog moet gebeuren (geen persoonsgegevens).
create or replace function public.public_branding() returns jsonb
language sql stable security definer set search_path = ''
as $$
  select jsonb_build_object('name', e.name, 'logo_path', e.logo_path,
                            'needs_setup', not public.has_active_admin())
    from public.event e limit 1
$$;
