-- =============================================================================
-- Productie: foutlogging, systeemstatus, export per persoon.
-- =============================================================================

-- Fouten die in de app optreden, zodat de beheerder ziet wanneer iets misgaat.
-- Geen persoonsgegevens in de melding: enkel foutnaam, plaats en appversie.
create table public.client_errors (
  id bigint generated always as identity primary key,
  at timestamptz not null default now(),
  profile_id uuid references public.profiles (id) on delete set null,
  kind text not null check (kind in ('error', 'unhandled', 'render', 'network')),
  message text not null check (char_length(message) <= 300),
  location text check (char_length(location) <= 200),
  app_version text check (char_length(app_version) <= 40),
  user_agent text check (char_length(user_agent) <= 200)
);
create index client_errors_at_idx on public.client_errors (at desc);

/** Meldt een fout. Maximaal 20 per persoon per 10 minuten, oude meldingen (30 dagen) worden opgeruimd. */
create function public.log_client_error(
  kind text,
  message text,
  location text default null,
  app_version text default null,
  user_agent text default null
) returns void
language plpgsql security definer set search_path = ''
as $$
begin
  if not public.is_member() then return; end if;
  if (select count(*) from public.client_errors
       where profile_id = auth.uid() and at > now() - interval '10 minutes') >= 20 then
    return;
  end if;
  insert into public.client_errors (profile_id, kind, message, location, app_version, user_agent)
  values (auth.uid(),
          case when kind in ('error', 'unhandled', 'render', 'network') then kind else 'error' end,
          left(coalesce(message, '?'), 300), left(location, 200), left(app_version, 40), left(user_agent, 200));
  delete from public.client_errors where at < now() - interval '30 days';
end;
$$;
revoke all on function public.log_client_error(text, text, text, text, text) from public, anon;
grant execute on function public.log_client_error(text, text, text, text, text) to authenticated;

alter table public.client_errors enable row level security;
revoke all on public.client_errors from anon, authenticated;
grant select on public.client_errors to authenticated;
create policy client_errors_admin_read on public.client_errors for select to authenticated
  using (public.is_admin());

-- -----------------------------------------------------------------------------
-- Systeemstatus: gebruik t.o.v. de gratis limieten (enkel beheerder).
-- -----------------------------------------------------------------------------
create function public.system_health() returns jsonb
language plpgsql stable security definer set search_path = ''
as $$
declare
  storage_bytes bigint := 0;
begin
  if not public.is_admin() then
    raise exception 'AOF:not_admin' using errcode = '42501';
  end if;
  if exists (select 1 from pg_namespace where nspname = 'storage') then
    execute 'select coalesce(sum((metadata ->> ''size'')::bigint), 0) from storage.objects'
      into storage_bytes;
  end if;
  return jsonb_build_object(
    'checked_at', now(),
    'db_bytes', pg_database_size(current_database()),
    'storage_bytes', storage_bytes,
    'people_active', (select count(*) from public.profiles where active),
    'people_total', (select count(*) from public.profiles),
    'errors_24h', (select count(*) from public.client_errors where at > now() - interval '24 hours'),
    'last_backup_hint', null
  );
end;
$$;
revoke all on function public.system_health() from public, anon;
grant execute on function public.system_health() to authenticated;

-- -----------------------------------------------------------------------------
-- Inzage (AVG/GDPR): alles wat over één persoon bewaard wordt, als JSON.
-- Mag voor jezelf, of als beheerder voor iemand anders.
-- -----------------------------------------------------------------------------
create function public.export_person(target uuid default null) returns jsonb
language plpgsql stable security definer set search_path = ''
as $$
declare
  who uuid := coalesce(target, auth.uid());
begin
  if who is distinct from auth.uid() and not public.is_admin() then
    raise exception 'AOF:not_admin' using errcode = '42501';
  end if;
  if not public.is_member() then
    raise exception 'AOF:not_signed_in' using errcode = '42501';
  end if;
  return jsonb_build_object(
    'exported_at', now(),
    'profile', (select to_jsonb(p) - 'updated_by' from public.profiles p where p.id = who),
    'role', (select r.name from public.profiles p join public.roles r on r.id = p.role_id where p.id = who),
    'teams', coalesce((select jsonb_agg(jsonb_build_object('team', d.name, 'title', m.title, 'lead', m.is_lead))
                         from public.department_members m join public.departments d on d.id = m.department_id
                        where m.profile_id = who), '[]'),
    'assigned_tasks', coalesce((select jsonb_agg(jsonb_build_object('title', t.title, 'status', t.status,
                                  'due_at', t.due_at, 'signed_off_at', t.signed_off_at))
                                 from public.task_assignees a join public.tasks t on t.id = a.task_id
                                where a.profile_id = who), '[]'),
    'announcements_posted', coalesce((select jsonb_agg(jsonb_build_object('title', title, 'at', created_at))
                                        from public.announcements where created_by = who), '[]'),
    'announcements_read', coalesce((select jsonb_agg(jsonb_build_object('announcement', a.title,
                                      'read_at', r.read_at, 'acknowledged_at', r.acknowledged_at))
                                     from public.announcement_reads r join public.announcements a on a.id = r.announcement_id
                                    where r.profile_id = who), '[]'),
    'invitations', coalesce((select jsonb_agg(jsonb_build_object('method', method, 'at', created_at))
                               from public.invitations where user_id = who), '[]'),
    'change_log', coalesce((select jsonb_agg(jsonb_build_object('at', at, 'table', table_name,
                              'action', action, 'fields', changed_fields) order by at)
                             from public.audit_log where actor = who), '[]')
  );
end;
$$;
revoke all on function public.export_person(uuid) from public, anon;
grant execute on function public.export_person(uuid) to authenticated;
