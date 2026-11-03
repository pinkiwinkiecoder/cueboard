-- =============================================================================
-- Stage timer: per locatie een timer die de showcaller bedient, en een geheime
-- schermlink (zonder inloggen) voor het stagescherm van de artiest.
-- =============================================================================

create table public.stage_timers (
  location_id uuid primary key references public.locations (id) on delete cascade,
  item_id uuid references public.schedule_items (id) on delete set null,
  title text check (char_length(title) <= 140),
  state text not null default 'idle' check (state in ('idle', 'running', 'paused')),
  /** Seconden van de volledige timer. */
  duration_s int not null default 0 check (duration_s between 0 and 86400),
  /** Wanneer de timer (opnieuw) startte; samen met remaining_s bij start. */
  started_at timestamptz,
  /** Resterende seconden op het moment van starten of pauzeren. */
  remaining_s int not null default 0 check (remaining_s between -86400 and 86400),
  message text check (char_length(message) <= 200),
  message_on boolean not null default false,
  blackout boolean not null default false,
  warn_s int not null default 300 check (warn_s between 0 and 3600),
  danger_s int not null default 60 check (danger_s between 0 and 3600),
  /** Geheim deel van de schermlink. Nieuw token = oude links werken niet meer. */
  display_token text not null unique default replace(gen_random_uuid()::text, '-', ''),
  updated_at timestamptz not null default now(),
  updated_by uuid
);

create trigger stage_timers_touch before insert or update on public.stage_timers
  for each row execute function public.touch_updated();

alter table public.stage_timers enable row level security;
revoke all on public.stage_timers from anon, authenticated;
grant select on public.stage_timers to authenticated;
create policy stage_timers_read on public.stage_timers for select to authenticated
  using (public.has_perm('schedule.manage'));

/** Bediening door de showcaller. */
create function public.stage_control(location uuid, action text, value text default null)
returns void
language plpgsql security definer set search_path = ''
as $$
declare
  t public.stage_timers;
  left_s int;
  item public.schedule_items;
begin
  if not public.has_perm('schedule.manage') then
    raise exception 'AOF:no_permission' using errcode = '42501';
  end if;
  insert into public.stage_timers (location_id) values (location) on conflict do nothing;
  select * into t from public.stage_timers where location_id = location for update;
  left_s := case when t.state = 'running'
                 then t.remaining_s - floor(extract(epoch from now() - t.started_at))::int
                 else t.remaining_s end;

  case action
    when 'load' then
      select * into item from public.schedule_items where id = value::uuid;
      if item.id is null then raise exception 'AOF:unknown_item' using errcode = '22023'; end if;
      update public.stage_timers set item_id = item.id, title = item.title, state = 'idle',
        duration_s = greatest(0, floor(extract(epoch from item.ends_at - item.starts_at))::int),
        remaining_s = greatest(0, floor(extract(epoch from item.ends_at - item.starts_at))::int),
        started_at = null
      where location_id = location;
    when 'set' then
      update public.stage_timers set state = 'idle', started_at = null,
        duration_s = greatest(0, least(86400, value::int)), remaining_s = greatest(0, least(86400, value::int))
      where location_id = location;
    when 'start' then
      update public.stage_timers set state = 'running', started_at = now(), remaining_s = left_s
      where location_id = location and state <> 'running';
    when 'pause' then
      update public.stage_timers set state = 'paused', started_at = null, remaining_s = left_s
      where location_id = location and state = 'running';
    when 'add' then
      update public.stage_timers
         set remaining_s = greatest(-86400, least(86400, remaining_s + value::int)),
             duration_s = greatest(0, least(86400, duration_s + value::int))
       where location_id = location;
    when 'reset' then
      update public.stage_timers set state = 'idle', started_at = null, remaining_s = duration_s
      where location_id = location;
    when 'message' then
      update public.stage_timers set message = left(nullif(btrim(value), ''), 200),
        message_on = nullif(btrim(value), '') is not null
      where location_id = location;
    when 'message_off' then
      update public.stage_timers set message_on = false where location_id = location;
    when 'blackout' then
      update public.stage_timers set blackout = coalesce(value::boolean, not blackout)
      where location_id = location;
    when 'new_link' then
      update public.stage_timers set display_token = replace(gen_random_uuid()::text, '-', '')
      where location_id = location;
    else
      raise exception 'AOF:invalid_request' using errcode = '22023';
  end case;
end;
$$;
revoke all on function public.stage_control(uuid, text, text) from public, anon;
grant execute on function public.stage_control(uuid, text, text) to authenticated;

/**
 * Wat het stagescherm toont. Toegankelijk zonder inloggen, maar enkel met het
 * geheime token. Geeft ook de servertijd mee, zodat alle schermen gelijk lopen.
 */
create function public.stage_view(token text) returns jsonb
language sql stable security definer set search_path = ''
as $$
  select jsonb_build_object(
    'server_now', now(),
    'location', l.name,
    'title', t.title,
    'state', t.state,
    'duration_s', t.duration_s,
    'remaining_s', t.remaining_s,
    'started_at', t.started_at,
    'message', case when t.message_on then t.message end,
    'blackout', t.blackout,
    'warn_s', t.warn_s,
    'danger_s', t.danger_s,
    'next', (select jsonb_build_object('title', p.title, 'starts_at', p.starts_at)
               from public.schedule_published p
              where p.location_id = t.location_id and p.status not in ('done', 'live')
                and p.starts_at > coalesce(
                  (select s.starts_at from public.schedule_published s where s.id = t.item_id), now())
              order by p.starts_at limit 1)
  )
  from public.stage_timers t join public.locations l on l.id = t.location_id
  where t.display_token = token and char_length(token) >= 24
$$;
revoke all on function public.stage_view(text) from public;
grant execute on function public.stage_view(text) to anon, authenticated;

do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    alter publication supabase_realtime add table public.stage_timers;
  end if;
end $$;
