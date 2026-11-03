-- =============================================================================
-- Taken en takenpakketten.
-- Een pakket is een herbruikbaar sjabloon (bv. "Opbouw podium"). Toepassen maakt
-- een takengroep met echte taken, met deadlines relatief aan een ankertijd.
-- =============================================================================

create type public.task_status as enum ('open', 'in_progress', 'blocked', 'done');
create type public.task_priority as enum ('low', 'normal', 'high', 'critical');

-- -----------------------------------------------------------------------------
-- Pakketten (sjablonen)
-- -----------------------------------------------------------------------------
create table public.task_packages (
  id uuid primary key default gen_random_uuid(),
  name text not null unique check (char_length(name) between 1 and 80),
  description text check (char_length(description) <= 500),
  color text not null default 'mint' check (color ~ '^[a-z]{3,12}$'),
  department_id uuid references public.departments (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  updated_by uuid
);

create table public.package_items (
  id uuid primary key default gen_random_uuid(),
  package_id uuid not null references public.task_packages (id) on delete cascade,
  title text not null check (char_length(title) between 1 and 140),
  description text check (char_length(description) <= 2000),
  priority public.task_priority not null default 'normal',
  /** Minuten t.o.v. de ankertijd (negatief = ervoor). Leeg = geen deadline. */
  offset_minutes int check (offset_minutes between -10080 and 10080),
  requires_signoff boolean not null default false,
  sort_order int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  updated_by uuid
);
create index package_items_pkg_idx on public.package_items (package_id, sort_order);

-- -----------------------------------------------------------------------------
-- Takengroepen (een toegepast pakket) en taken
-- -----------------------------------------------------------------------------
create table public.task_groups (
  id uuid primary key default gen_random_uuid(),
  package_id uuid references public.task_packages (id) on delete set null,
  name text not null check (char_length(name) between 1 and 120),
  color text not null default 'mint' check (color ~ '^[a-z]{3,12}$'),
  day_id uuid references public.event_days (id) on delete set null,
  location_id uuid references public.locations (id) on delete set null,
  department_id uuid references public.departments (id) on delete set null,
  anchor_at timestamptz,
  created_by uuid default auth.uid(),
  created_at timestamptz not null default now()
);

create table public.tasks (
  id uuid primary key default gen_random_uuid(),
  group_id uuid references public.task_groups (id) on delete cascade,
  title text not null check (char_length(title) between 1 and 140),
  description text check (char_length(description) <= 2000),
  department_id uuid references public.departments (id) on delete set null,
  location_id uuid references public.locations (id) on delete set null,
  day_id uuid references public.event_days (id) on delete set null,
  due_at timestamptz,
  priority public.task_priority not null default 'normal',
  status public.task_status not null default 'open',
  blocked_reason text check (char_length(blocked_reason) <= 500),
  /** In de pool: iemand van de afdeling kan de taak zelf claimen. */
  pool boolean not null default false,
  requires_signoff boolean not null default false,
  signed_off_by uuid references public.profiles (id) on delete set null,
  signed_off_at timestamptz,
  sort_order int not null default 0,
  created_by uuid default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  updated_by uuid,
  check (status <> 'blocked' or coalesce(char_length(blocked_reason), 0) > 0)
);
create index tasks_group_idx on public.tasks (group_id);
create index tasks_department_idx on public.tasks (department_id);
create index tasks_due_idx on public.tasks (due_at);

create table public.task_assignees (
  task_id uuid not null references public.tasks (id) on delete cascade,
  profile_id uuid not null references public.profiles (id) on delete cascade,
  assigned_at timestamptz not null default now(),
  primary key (task_id, profile_id)
);
create index task_assignees_profile_idx on public.task_assignees (profile_id);

create table public.task_subtasks (
  id uuid primary key default gen_random_uuid(),
  task_id uuid not null references public.tasks (id) on delete cascade,
  title text not null check (char_length(title) between 1 and 140),
  done boolean not null default false,
  sort_order int not null default 0
);

-- -----------------------------------------------------------------------------
-- Helpers
-- -----------------------------------------------------------------------------
create function public.is_assigned(task uuid) returns boolean
language sql stable security definer set search_path = ''
as $$
  select exists (select 1 from public.task_assignees a where a.task_id = task and a.profile_id = auth.uid())
$$;

/** Mag de ingelogde persoon deze taak zien? */
create function public.can_see_task(task uuid) returns boolean
language sql stable security definer set search_path = ''
as $$
  select public.has_perm('view.tasks') and exists (
    select 1 from public.tasks t
     where t.id = task
       and (public.has_perm('tasks.manage_all')
            or public.can_manage_tasks(t.department_id)
            or public.is_assigned(t.id)
            or (t.department_id is not null and t.department_id = public.my_department()))
  )
$$;

create function public.task_department(task uuid) returns uuid
language sql stable security definer set search_path = ''
as $$ select department_id from public.tasks where id = task $$;

revoke all on function public.is_assigned(uuid), public.can_see_task(uuid), public.task_department(uuid)
  from public, anon;
grant execute on function public.is_assigned(uuid), public.can_see_task(uuid), public.task_department(uuid)
  to authenticated;

-- -----------------------------------------------------------------------------
-- Acties via RPC: status wijzigen, claimen, subtaak afvinken.
-- -----------------------------------------------------------------------------
create function public.set_task_status(task uuid, new_status public.task_status, reason text default null)
returns void
language plpgsql security definer set search_path = ''
as $$
declare
  t public.tasks;
begin
  select * into t from public.tasks where id = task;
  if t.id is null then raise exception 'AOF:unknown_task' using errcode = '22023'; end if;
  if not (public.can_manage_tasks(t.department_id) or public.is_assigned(task)) then
    raise exception 'AOF:no_permission' using errcode = '42501';
  end if;
  if new_status = 'blocked' and coalesce(btrim(reason), '') = '' then
    raise exception 'AOF:reason_required' using errcode = '22023';
  end if;
  update public.tasks
     set status = new_status,
         blocked_reason = case when new_status = 'blocked' then btrim(reason) end,
         signed_off_by = case when new_status = 'done' and t.requires_signoff then auth.uid() end,
         signed_off_at = case when new_status = 'done' and t.requires_signoff then now() end
   where id = task;
  if new_status = 'done' and t.requires_signoff then
    insert into public.audit_log (actor, table_name, row_id, action, detail)
    values (auth.uid(), 'tasks', task::text, 'SIGNOFF', jsonb_build_object('title', t.title));
  end if;
end;
$$;

create function public.claim_task(task uuid) returns void
language plpgsql security definer set search_path = ''
as $$
declare
  t public.tasks;
begin
  select * into t from public.tasks where id = task;
  if t.id is null or not t.pool or not public.has_perm('tasks.claim')
     or t.department_id is distinct from public.my_department()
     or exists (select 1 from public.task_assignees where task_id = task) then
    raise exception 'AOF:cannot_claim' using errcode = '42501';
  end if;
  insert into public.task_assignees (task_id, profile_id) values (task, auth.uid());
  update public.tasks set pool = false where id = task;
end;
$$;

create function public.toggle_subtask(subtask uuid, is_done boolean) returns void
language plpgsql security definer set search_path = ''
as $$
declare
  tid uuid;
begin
  select task_id into tid from public.task_subtasks where id = subtask;
  if tid is null or not (public.can_manage_tasks(public.task_department(tid)) or public.is_assigned(tid)) then
    raise exception 'AOF:no_permission' using errcode = '42501';
  end if;
  update public.task_subtasks set done = is_done where id = subtask;
end;
$$;

/** Past een pakket toe: maakt een groep met taken, deadlines t.o.v. de ankertijd. */
create function public.apply_package(
  package uuid,
  day uuid default null,
  location uuid default null,
  department uuid default null,
  assignee uuid default null,
  anchor timestamptz default null,
  group_name text default null
) returns uuid
language plpgsql security definer set search_path = ''
as $$
declare
  p public.task_packages;
  gid uuid;
  item record;
  new_task uuid;
  dept uuid;
begin
  select * into p from public.task_packages where id = package;
  if p.id is null then raise exception 'AOF:unknown_package' using errcode = '22023'; end if;
  dept := coalesce(department, p.department_id);
  if not public.can_manage_tasks(dept) then
    raise exception 'AOF:no_permission' using errcode = '42501';
  end if;
  insert into public.task_groups (package_id, name, color, day_id, location_id, department_id, anchor_at)
  values (p.id, coalesce(nullif(btrim(group_name), ''), p.name), p.color, day, location, dept, anchor)
  returning id into gid;

  for item in select * from public.package_items where package_id = p.id order by sort_order, created_at loop
    insert into public.tasks (group_id, title, description, department_id, location_id, day_id, due_at,
                              priority, requires_signoff, sort_order, pool)
    values (gid, item.title, item.description, dept, location, day,
            case when anchor is not null and item.offset_minutes is not null
                 then anchor + make_interval(mins => item.offset_minutes) end,
            item.priority, item.requires_signoff, item.sort_order, assignee is null and dept is not null)
    returning id into new_task;
    if assignee is not null then
      insert into public.task_assignees (task_id, profile_id) values (new_task, assignee);
    end if;
  end loop;
  return gid;
end;
$$;

revoke all on function public.set_task_status(uuid, public.task_status, text), public.claim_task(uuid),
  public.toggle_subtask(uuid, boolean), public.apply_package(uuid, uuid, uuid, uuid, uuid, timestamptz, text)
  from public, anon;
grant execute on function public.set_task_status(uuid, public.task_status, text), public.claim_task(uuid),
  public.toggle_subtask(uuid, boolean), public.apply_package(uuid, uuid, uuid, uuid, uuid, timestamptz, text)
  to authenticated;

-- -----------------------------------------------------------------------------
-- Triggers
-- -----------------------------------------------------------------------------
create trigger task_packages_touch before insert or update on public.task_packages
  for each row execute function public.touch_updated();
create trigger package_items_touch before insert or update on public.package_items
  for each row execute function public.touch_updated();
create trigger tasks_touch before insert or update on public.tasks
  for each row execute function public.touch_updated();

create trigger task_packages_audit after insert or update or delete on public.task_packages
  for each row execute function public.audit_row();
create trigger tasks_audit after insert or update or delete on public.tasks
  for each row execute function public.audit_row();
create trigger task_assignees_audit after insert or delete on public.task_assignees
  for each row execute function public.audit_row();

-- -----------------------------------------------------------------------------
-- RLS
-- -----------------------------------------------------------------------------
alter table public.task_packages enable row level security;
alter table public.package_items enable row level security;
alter table public.task_groups enable row level security;
alter table public.tasks enable row level security;
alter table public.task_assignees enable row level security;
alter table public.task_subtasks enable row level security;

revoke all on public.task_packages, public.package_items, public.task_groups, public.tasks,
  public.task_assignees, public.task_subtasks from anon, authenticated;
grant select, insert, update, delete on public.task_packages, public.package_items, public.task_groups,
  public.tasks, public.task_assignees, public.task_subtasks to authenticated;

-- Pakketten: lezen met view.tasks; beheren met een takenbeheerrecht.
create policy packages_read on public.task_packages for select to authenticated
  using (public.has_perm('view.tasks'));
create policy packages_write on public.task_packages for all to authenticated
  using (public.has_perm('tasks.manage_all') or public.has_perm('tasks.manage_department'))
  with check (public.has_perm('tasks.manage_all') or public.has_perm('tasks.manage_department'));

create policy items_read on public.package_items for select to authenticated
  using (public.has_perm('view.tasks'));
create policy items_write on public.package_items for all to authenticated
  using (public.has_perm('tasks.manage_all') or public.has_perm('tasks.manage_department'))
  with check (public.has_perm('tasks.manage_all') or public.has_perm('tasks.manage_department'));

-- Groepen: lezen met view.tasks; aanmaken enkel via apply_package; verwijderen
-- door wie de afdeling mag beheren (taken gaan mee).
create policy groups_read on public.task_groups for select to authenticated
  using (public.has_perm('view.tasks'));
create policy groups_update on public.task_groups for update to authenticated
  using (public.can_manage_tasks(department_id)) with check (public.can_manage_tasks(department_id));
create policy groups_delete on public.task_groups for delete to authenticated
  using (public.can_manage_tasks(department_id));

-- Taken
create policy tasks_read on public.tasks for select to authenticated
  using (
    public.has_perm('view.tasks') and (
      public.has_perm('tasks.manage_all')
      or public.can_manage_tasks(department_id)
      or public.is_assigned(id)
      or (department_id is not null and department_id = public.my_department())
    )
  );
create policy tasks_insert on public.tasks for insert to authenticated
  with check (public.can_manage_tasks(department_id));
create policy tasks_update on public.tasks for update to authenticated
  using (public.can_manage_tasks(department_id)) with check (public.can_manage_tasks(department_id));
create policy tasks_delete on public.tasks for delete to authenticated
  using (public.can_manage_tasks(department_id));

-- Toegewezen personen en subtaken volgen de taak.
create policy assignees_read on public.task_assignees for select to authenticated
  using (public.can_see_task(task_id));
create policy assignees_insert on public.task_assignees for insert to authenticated
  with check (public.can_manage_tasks(public.task_department(task_id)));
create policy assignees_delete on public.task_assignees for delete to authenticated
  using (public.can_manage_tasks(public.task_department(task_id)));

create policy subtasks_read on public.task_subtasks for select to authenticated
  using (public.can_see_task(task_id));
create policy subtasks_write on public.task_subtasks for all to authenticated
  using (public.can_manage_tasks(public.task_department(task_id)))
  with check (public.can_manage_tasks(public.task_department(task_id)));

-- Realtime
do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    alter publication supabase_realtime add table
      public.task_packages, public.package_items, public.task_groups, public.tasks,
      public.task_assignees, public.task_subtasks;
  end if;
end $$;

-- -----------------------------------------------------------------------------
-- Voorbeeldpakket (uit de huidige Trello-lijst). Vrij aan te passen of te wissen.
-- -----------------------------------------------------------------------------
with p as (
  insert into public.task_packages (name, description, color)
  values ('Main Stage cycle', 'Checks around each performance on the main stage.', 'mint')
  returning id
)
insert into public.package_items (package_id, title, priority, offset_minutes, requires_signoff, sort_order)
select p.id, v.title, v.priority::public.task_priority, v.offset_minutes, v.signoff, v.sort_order
from p, (values
  ('Inspect Main Stage Deck', 'high', -120, true, 1),
  ('Prepare Backline', 'normal', -90, false, 2),
  ('Prepare Microphones and DI Boxes', 'normal', -75, false, 3),
  ('Review Upcoming Artist Stage Plot', 'normal', -60, false, 4),
  ('Check Lighting Preparation', 'normal', -45, false, 5),
  ('Check Video Playback and Content', 'normal', -30, false, 6),
  ('Prepare Next Changeover', 'high', -15, false, 7),
  ('Clear Stage After Performance', 'normal', 60, false, 8),
  ('Check Stage Equipment Before Festival Close', 'high', 240, true, 9)
) as v(title, priority, offset_minutes, signoff, sort_order);
