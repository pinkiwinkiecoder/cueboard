-- =============================================================================
-- Evenement-instellingen (generiek: festival, congres, concert, …), dagen,
-- locaties (podia, zalen, zones), modules aan/uit, uitnodigingen.
-- =============================================================================

create function public.module_keys() returns text[]
language sql immutable set search_path = ''
as $$
  select array['schedule', 'tasks', 'announcements', 'artists', 'documents', 'people', 'issues', 'dashboard']::text[]
$$;
grant execute on function public.module_keys() to authenticated;

-- Eén rij met de algemene gegevens van het evenement.
create table public.event (
  id boolean primary key default true check (id), -- garandeert precies één rij
  name text not null default 'My event' check (char_length(name) between 1 and 80),
  venue text check (char_length(venue) <= 120),
  /** Modules die in dit evenement aanstaan. Uit = voor niemand zichtbaar. */
  modules text[] not null default public.module_keys() check (modules <@ public.module_keys()),
  /** Na deze datum toont de app een herinnering om persoonsgegevens te wissen. */
  retention_until date,
  /** Max. grootte van een PDF in MB (documenten). */
  max_pdf_mb int not null default 15 check (max_pdf_mb between 1 and 50),
  updated_at timestamptz not null default now(),
  updated_by uuid
);
insert into public.event (id) values (true);

create table public.event_days (
  id uuid primary key default gen_random_uuid(),
  date date not null unique,
  label text not null check (char_length(label) between 1 and 40),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  updated_by uuid
);

create table public.locations (
  id uuid primary key default gen_random_uuid(),
  name text not null unique check (char_length(name) between 1 and 60),
  color text not null default 'violet' check (color ~ '^[a-z]{3,12}$'),
  sort_order int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  updated_by uuid
);

-- Logboek van uitnodigingen (ook voor rate limiting in de Edge Function).
create table public.invitations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles (id) on delete cascade,
  invited_by uuid references public.profiles (id) on delete set null,
  method text not null check (method in ('email', 'link')),
  created_at timestamptz not null default now()
);
create index invitations_by_time_idx on public.invitations (invited_by, created_at desc);

-- Triggers: laatst gewijzigd door + auditlog.
create trigger event_touch before insert or update on public.event
  for each row execute function public.touch_updated();
create trigger event_days_touch before insert or update on public.event_days
  for each row execute function public.touch_updated();
create trigger locations_touch before insert or update on public.locations
  for each row execute function public.touch_updated();

create trigger event_audit after insert or update or delete on public.event
  for each row execute function public.audit_row();
create trigger event_days_audit after insert or update or delete on public.event_days
  for each row execute function public.audit_row();
create trigger locations_audit after insert or update or delete on public.locations
  for each row execute function public.audit_row();
create trigger invitations_audit after insert on public.invitations
  for each row execute function public.audit_row('no_values');

-- RLS ------------------------------------------------------------------------
alter table public.event enable row level security;
alter table public.event_days enable row level security;
alter table public.locations enable row level security;
alter table public.invitations enable row level security;

revoke all on public.event, public.event_days, public.locations, public.invitations
  from anon, authenticated;

grant select, update on public.event to authenticated;
create policy event_read on public.event for select to authenticated using (public.is_member());
create policy event_update on public.event for update to authenticated
  using (public.has_perm('settings.manage')) with check (public.has_perm('settings.manage'));

grant select, insert, update, delete on public.event_days, public.locations to authenticated;

create policy days_read on public.event_days for select to authenticated using (public.is_member());
create policy days_insert on public.event_days for insert to authenticated
  with check (public.has_perm('settings.manage'));
create policy days_update on public.event_days for update to authenticated
  using (public.has_perm('settings.manage')) with check (public.has_perm('settings.manage'));
create policy days_delete on public.event_days for delete to authenticated
  using (public.has_perm('settings.manage'));

create policy locations_read on public.locations for select to authenticated using (public.is_member());
create policy locations_insert on public.locations for insert to authenticated
  with check (public.has_perm('settings.manage'));
create policy locations_update on public.locations for update to authenticated
  using (public.has_perm('settings.manage')) with check (public.has_perm('settings.manage'));
create policy locations_delete on public.locations for delete to authenticated
  using (public.has_perm('settings.manage'));

-- Uitnodigingen: lezen met people.manage; schrijven enkel door de Edge Function.
grant select on public.invitations to authenticated;
create policy invitations_read on public.invitations for select to authenticated
  using (public.has_perm('people.manage'));

-- Realtime: deze tabellen sturen wijzigingen live naar de app (RLS blijft gelden).
do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    alter publication supabase_realtime add table
      public.roles, public.departments, public.profiles, public.event,
      public.event_days, public.locations;
  end if;
end $$;
