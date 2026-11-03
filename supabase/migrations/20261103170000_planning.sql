-- =============================================================================
-- Planning (run of show).
-- Werkversie (schedule_items) is enkel zichtbaar voor schedule.manage.
-- De crew ziet enkel de gepubliceerde versie (schedule_published).
-- Live-acties (start/klaar) gaan meteen naar beide versies.
-- =============================================================================

create type public.schedule_kind as enum
  ('arrival', 'soundcheck', 'interview', 'performance', 'changeover', 'briefing', 'other');
create type public.schedule_status as enum ('planned', 'confirmed', 'live', 'done', 'delayed');

create table public.schedule_items (
  id uuid primary key default gen_random_uuid(),
  day_id uuid not null references public.event_days (id) on delete cascade,
  location_id uuid references public.locations (id) on delete set null,
  title text not null check (char_length(title) between 1 and 140),
  kind public.schedule_kind not null default 'other',
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  status public.schedule_status not null default 'planned',
  notes text check (char_length(notes) <= 2000),
  responsible_id uuid references public.profiles (id) on delete set null,
  department_ids uuid[] not null default '{}',
  depends_on uuid references public.schedule_items (id) on delete set null,
  actual_start timestamptz,
  actual_end timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  updated_by uuid,
  check (ends_at >= starts_at),
  check (depends_on is distinct from id)
);
create index schedule_items_day_idx on public.schedule_items (day_id, starts_at);

create table public.schedule_published (
  id uuid primary key, -- zelfde id als het werkitem
  day_id uuid not null references public.event_days (id) on delete cascade,
  location_id uuid references public.locations (id) on delete set null,
  title text not null,
  kind public.schedule_kind not null,
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  status public.schedule_status not null,
  notes text,
  responsible_id uuid references public.profiles (id) on delete set null,
  department_ids uuid[] not null default '{}',
  depends_on uuid,
  actual_start timestamptz,
  actual_end timestamptz,
  /** Laatste keer dat dit item inhoudelijk wijzigde bij een publicatie. */
  changed_at timestamptz not null default now(),
  published_at timestamptz not null default now()
);
create index schedule_published_day_idx on public.schedule_published (day_id, starts_at);

create table public.schedule_publications (
  id uuid primary key default gen_random_uuid(),
  day_id uuid not null references public.event_days (id) on delete cascade,
  published_at timestamptz not null default now(),
  published_by uuid references public.profiles (id) on delete set null,
  added int not null default 0,
  changed int not null default 0,
  removed int not null default 0,
  removed_titles text[] not null default '{}'
);
create index schedule_publications_day_idx on public.schedule_publications (day_id, published_at desc);

create trigger schedule_items_touch before insert or update on public.schedule_items
  for each row execute function public.touch_updated();
create trigger schedule_items_audit after insert or update or delete on public.schedule_items
  for each row execute function public.audit_row();

-- -----------------------------------------------------------------------------
-- Publiceren: werkversie van één dag → gepubliceerde versie, met telling.
-- -----------------------------------------------------------------------------
create function public.publish_schedule(day uuid) returns jsonb
language plpgsql security definer set search_path = ''
as $$
declare
  n_added int;
  n_changed int;
  gone text[];
begin
  if not public.has_perm('schedule.manage') then
    raise exception 'AOF:no_permission' using errcode = '42501';
  end if;

  select count(*) into n_added from public.schedule_items w
   where w.day_id = day and not exists (select 1 from public.schedule_published p where p.id = w.id);

  select count(*) into n_changed from public.schedule_items w join public.schedule_published p on p.id = w.id
   where w.day_id = day
     and (p.title, p.kind, p.starts_at, p.ends_at, p.status, p.location_id, p.notes, p.responsible_id,
          p.department_ids, p.depends_on, p.day_id)
         is distinct from
         (w.title, w.kind, w.starts_at, w.ends_at, w.status, w.location_id, w.notes, w.responsible_id,
          w.department_ids, w.depends_on, w.day_id);

  select coalesce(array_agg(p.title order by p.starts_at), '{}') into gone
    from public.schedule_published p
   where p.day_id = day and not exists (select 1 from public.schedule_items w where w.id = p.id);

  delete from public.schedule_published p
   where p.day_id = day and not exists (select 1 from public.schedule_items w where w.id = p.id);

  insert into public.schedule_published as p
    (id, day_id, location_id, title, kind, starts_at, ends_at, status, notes, responsible_id,
     department_ids, depends_on, actual_start, actual_end, changed_at, published_at)
  select w.id, w.day_id, w.location_id, w.title, w.kind, w.starts_at, w.ends_at, w.status, w.notes,
         w.responsible_id, w.department_ids, w.depends_on, w.actual_start, w.actual_end, now(), now()
    from public.schedule_items w where w.day_id = day
  on conflict (id) do update set
    day_id = excluded.day_id, location_id = excluded.location_id, title = excluded.title,
    kind = excluded.kind, starts_at = excluded.starts_at, ends_at = excluded.ends_at,
    status = excluded.status, notes = excluded.notes, responsible_id = excluded.responsible_id,
    department_ids = excluded.department_ids, depends_on = excluded.depends_on,
    actual_start = excluded.actual_start, actual_end = excluded.actual_end,
    published_at = now(),
    changed_at = case
      when (p.title, p.kind, p.starts_at, p.ends_at, p.status, p.location_id, p.notes, p.responsible_id,
            p.department_ids, p.depends_on)
           is distinct from
           (excluded.title, excluded.kind, excluded.starts_at, excluded.ends_at, excluded.status,
            excluded.location_id, excluded.notes, excluded.responsible_id, excluded.department_ids,
            excluded.depends_on)
      then now() else p.changed_at end;

  insert into public.schedule_publications (day_id, published_by, added, changed, removed, removed_titles)
  values (day, auth.uid(), n_added, n_changed, cardinality(gone), gone);

  insert into public.audit_log (actor, table_name, row_id, action, detail)
  values (auth.uid(), 'schedule_published', day::text, 'PUBLISH',
          jsonb_build_object('added', n_added, 'changed', n_changed, 'removed', cardinality(gone)));

  return jsonb_build_object('added', n_added, 'changed', n_changed, 'removed', cardinality(gone));
end;
$$;

-- -----------------------------------------------------------------------------
-- Verschuiven: alle items op een locatie en dag vanaf een tijdstip N minuten.
-- -----------------------------------------------------------------------------
create function public.shift_schedule(day uuid, location uuid, from_time timestamptz, minutes int)
returns int
language plpgsql security definer set search_path = ''
as $$
declare
  n int;
begin
  if not public.has_perm('schedule.manage') then
    raise exception 'AOF:no_permission' using errcode = '42501';
  end if;
  if minutes = 0 or abs(minutes) > 720 then
    raise exception 'AOF:invalid_shift' using errcode = '22023';
  end if;
  update public.schedule_items
     set starts_at = starts_at + make_interval(mins => minutes),
         ends_at = ends_at + make_interval(mins => minutes)
   where day_id = day
     and location_id is not distinct from location
     and starts_at >= from_time
     and status not in ('live', 'done');
  get diagnostics n = row_count;
  insert into public.audit_log (actor, table_name, row_id, action, detail)
  values (auth.uid(), 'schedule_items', day::text, 'SHIFT',
          jsonb_build_object('location', location, 'from', from_time, 'minutes', minutes, 'items', n));
  return n;
end;
$$;

-- -----------------------------------------------------------------------------
-- Live: start / klaar / vertraagd. Meteen zichtbaar voor iedereen (beide versies).
-- -----------------------------------------------------------------------------
create function public.set_schedule_live(item uuid, action text) returns void
language plpgsql security definer set search_path = ''
as $$
declare
  new_status public.schedule_status;
begin
  if not public.has_perm('schedule.manage') then
    raise exception 'AOF:no_permission' using errcode = '42501';
  end if;
  new_status := case action
    when 'start' then 'live' when 'done' then 'done' when 'delayed' then 'delayed'
    when 'reset' then 'planned' end;
  if new_status is null then raise exception 'AOF:invalid_request' using errcode = '22023'; end if;

  update public.schedule_items set
    status = new_status,
    actual_start = case when action = 'start' then coalesce(actual_start, now())
                        when action = 'reset' then null else actual_start end,
    actual_end = case when action = 'done' then now() when action in ('start', 'reset') then null
                      else actual_end end
   where id = item;
  if not found then raise exception 'AOF:unknown_item' using errcode = '22023'; end if;

  update public.schedule_published p set
    status = w.status, actual_start = w.actual_start, actual_end = w.actual_end
    from public.schedule_items w where w.id = item and p.id = item;
end;
$$;

revoke all on function public.publish_schedule(uuid), public.shift_schedule(uuid, uuid, timestamptz, int),
  public.set_schedule_live(uuid, text) from public, anon;
grant execute on function public.publish_schedule(uuid), public.shift_schedule(uuid, uuid, timestamptz, int),
  public.set_schedule_live(uuid, text) to authenticated;

-- -----------------------------------------------------------------------------
-- RLS
-- -----------------------------------------------------------------------------
alter table public.schedule_items enable row level security;
alter table public.schedule_published enable row level security;
alter table public.schedule_publications enable row level security;
revoke all on public.schedule_items, public.schedule_published, public.schedule_publications
  from anon, authenticated;

grant select, insert, update, delete on public.schedule_items to authenticated;
create policy items_manage_read on public.schedule_items for select to authenticated
  using (public.has_perm('schedule.manage'));
create policy items_manage_write on public.schedule_items for all to authenticated
  using (public.has_perm('schedule.manage')) with check (public.has_perm('schedule.manage'));

-- Gepubliceerd: lezen met view.schedule; schrijven enkel via de functies hierboven.
grant select on public.schedule_published, public.schedule_publications to authenticated;
create policy published_read on public.schedule_published for select to authenticated
  using (public.has_perm('view.schedule'));
create policy publications_read on public.schedule_publications for select to authenticated
  using (public.has_perm('view.schedule'));

do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    alter publication supabase_realtime add table
      public.schedule_items, public.schedule_published, public.schedule_publications;
  end if;
end $$;
