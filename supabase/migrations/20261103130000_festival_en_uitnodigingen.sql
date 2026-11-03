-- =============================================================================
-- Fase 1.1/1.2: festivalinstellingen (dagen, podia) en uitnodigingen.
-- =============================================================================

-- Eén rij met de algemene festivalgegevens.
create table public.festival (
  id boolean primary key default true check (id), -- garandeert precies één rij
  name text not null default 'Art of Faith',
  venue text,
  /** Na deze datum toont de app een herinnering om persoonsgegevens te wissen. */
  retention_until date,
  /** Max. grootte van een PDF in MB (gebruikt in fase 2). */
  max_pdf_mb int not null default 15 check (max_pdf_mb between 1 and 50),
  updated_at timestamptz not null default now(),
  updated_by uuid
);
insert into public.festival (id) values (true);

create table public.festival_days (
  id uuid primary key default gen_random_uuid(),
  date date not null unique,
  label text not null check (char_length(label) between 1 and 40),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  updated_by uuid
);

create table public.stages (
  id uuid primary key default gen_random_uuid(),
  name text not null unique check (char_length(name) between 1 and 60),
  sort_order int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  updated_by uuid
);
insert into public.stages (name, sort_order) values ('Main Stage', 1);

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
create trigger festival_touch before insert or update on public.festival
  for each row execute function public.touch_updated();
create trigger festival_days_touch before insert or update on public.festival_days
  for each row execute function public.touch_updated();
create trigger stages_touch before insert or update on public.stages
  for each row execute function public.touch_updated();

create trigger festival_audit after insert or update or delete on public.festival
  for each row execute function public.audit_row();
create trigger festival_days_audit after insert or update or delete on public.festival_days
  for each row execute function public.audit_row();
create trigger stages_audit after insert or update or delete on public.stages
  for each row execute function public.audit_row();
create trigger invitations_audit after insert on public.invitations
  for each row execute function public.audit_row('no_values');

-- RLS ------------------------------------------------------------------------
alter table public.festival enable row level security;
alter table public.festival_days enable row level security;
alter table public.stages enable row level security;
alter table public.invitations enable row level security;

revoke all on public.festival, public.festival_days, public.stages, public.invitations
  from anon, authenticated;

grant select, update on public.festival to authenticated;
create policy festival_read on public.festival for select to authenticated using (public.is_member());
create policy festival_admin_update on public.festival for update to authenticated
  using (public.is_admin()) with check (public.is_admin());

grant select, insert, update, delete on public.festival_days, public.stages to authenticated;

create policy days_read on public.festival_days for select to authenticated using (public.is_member());
create policy days_admin_insert on public.festival_days for insert to authenticated
  with check (public.is_admin());
create policy days_admin_update on public.festival_days for update to authenticated
  using (public.is_admin()) with check (public.is_admin());
create policy days_admin_delete on public.festival_days for delete to authenticated
  using (public.is_admin());

create policy stages_read on public.stages for select to authenticated using (public.is_member());
create policy stages_admin_insert on public.stages for insert to authenticated
  with check (public.is_admin());
create policy stages_admin_update on public.stages for update to authenticated
  using (public.is_admin()) with check (public.is_admin());
create policy stages_admin_delete on public.stages for delete to authenticated
  using (public.is_admin());

-- Realtime: deze tabellen sturen wijzigingen live naar de app (RLS blijft gelden).
do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    alter publication supabase_realtime add table
      public.departments, public.profiles, public.festival, public.festival_days, public.stages;
  end if;
end $$;

-- Uitnodigingen: enkel beheerder leest; schrijven gebeurt enkel door de Edge Function
-- (service-role), dus geen insert-rechten voor gebruikers.
grant select on public.invitations to authenticated;
create policy invitations_admin_read on public.invitations for select to authenticated
  using (public.is_admin());
