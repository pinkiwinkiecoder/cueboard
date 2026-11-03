-- =============================================================================
-- Mededelingen en vastgepinde berichten (bv. portofoonkanalen, noodnummers).
-- Doelgroep: iedereen (lege lijst) of een of meer afdelingen.
-- Dringend + bevestigen: blijft bovenaan tot de persoon "Begrepen" tikt.
-- =============================================================================

create table public.announcements (
  id uuid primary key default gen_random_uuid(),
  title text not null check (char_length(title) between 1 and 120),
  body text not null default '' check (char_length(body) <= 4000),
  pinned boolean not null default false,
  urgent boolean not null default false,
  requires_ack boolean not null default false,
  color text not null default 'peach' check (color ~ '^[a-z]{3,12}$'),
  /** Leeg = iedereen. Anders enkel deze afdelingen (en wie mag versturen). */
  department_ids uuid[] not null default '{}',
  created_by uuid default auth.uid() references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  updated_by uuid
);
create index announcements_created_idx on public.announcements (created_at desc);

create table public.announcement_reads (
  announcement_id uuid not null references public.announcements (id) on delete cascade,
  profile_id uuid not null references public.profiles (id) on delete cascade,
  read_at timestamptz not null default now(),
  acknowledged_at timestamptz,
  primary key (announcement_id, profile_id)
);

create function public.can_see_announcement(dept_ids uuid[]) returns boolean
language sql stable security definer set search_path = ''
as $$
  select public.is_member() and (
    cardinality(dept_ids) = 0
    or public.my_department() = any (dept_ids)
    or public.has_perm('announcements.send')
  )
$$;
revoke all on function public.can_see_announcement(uuid[]) from public, anon;
grant execute on function public.can_see_announcement(uuid[]) to authenticated;

/** Markeer als gelezen, en eventueel als bevestigd ("Begrepen"). */
create function public.mark_announcement(announcement uuid, acknowledge boolean default false)
returns void
language plpgsql security definer set search_path = ''
as $$
declare
  depts uuid[];
begin
  select department_ids into depts from public.announcements where id = announcement;
  if depts is null or not public.can_see_announcement(depts) then
    raise exception 'AOF:no_permission' using errcode = '42501';
  end if;
  insert into public.announcement_reads (announcement_id, profile_id, acknowledged_at)
  values (announcement, auth.uid(), case when acknowledge then now() end)
  on conflict (announcement_id, profile_id) do update
    set acknowledged_at = coalesce(public.announcement_reads.acknowledged_at,
                                   case when acknowledge then now() end);
end;
$$;
revoke all on function public.mark_announcement(uuid, boolean) from public, anon;
grant execute on function public.mark_announcement(uuid, boolean) to authenticated;

create trigger announcements_touch before insert or update on public.announcements
  for each row execute function public.touch_updated();
create trigger announcements_audit after insert or update or delete on public.announcements
  for each row execute function public.audit_row();

alter table public.announcements enable row level security;
alter table public.announcement_reads enable row level security;
revoke all on public.announcements, public.announcement_reads from anon, authenticated;
grant select, insert, update, delete on public.announcements to authenticated;
grant select on public.announcement_reads to authenticated;

create policy announcements_read on public.announcements for select to authenticated
  using (public.can_see_announcement(department_ids));
create policy announcements_insert on public.announcements for insert to authenticated
  with check (public.has_perm('announcements.send'));
create policy announcements_update on public.announcements for update to authenticated
  using (public.has_perm('announcements.send')) with check (public.has_perm('announcements.send'));
create policy announcements_delete on public.announcements for delete to authenticated
  using (public.has_perm('announcements.send'));

-- Eigen leesstatus altijd; wie mag versturen ziet wie gelezen/bevestigd heeft.
create policy reads_read on public.announcement_reads for select to authenticated
  using (profile_id = auth.uid() or public.has_perm('announcements.send'));

do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    alter publication supabase_realtime add table public.announcements, public.announcement_reads;
  end if;
end $$;
