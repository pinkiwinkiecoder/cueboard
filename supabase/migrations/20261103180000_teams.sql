-- =============================================================================
-- Teams in teams en lidmaatschappen.
-- Een afdeling kan een hoofdteam hebben (bv. Productie → Main Stage).
-- Iemand kan in meerdere teams zitten, met een functie en eventueel als lead.
-- De ROL bepaalt wat iemand mag; de TEAMS bepalen waar (het bereik).
-- =============================================================================

alter table public.departments
  add column parent_id uuid references public.departments (id) on delete set null,
  add column description text check (char_length(description) <= 300),
  add constraint departments_not_own_parent check (parent_id is distinct from id);
create index departments_parent_idx on public.departments (parent_id);

-- Maximaal twee niveaus: een subteam kan zelf geen subteams hebben.
create function public.check_department_depth() returns trigger
language plpgsql set search_path = ''
as $$
begin
  if new.parent_id is not null then
    if exists (select 1 from public.departments where id = new.parent_id and parent_id is not null) then
      raise exception 'AOF:team_too_deep' using errcode = '22023';
    end if;
    if exists (select 1 from public.departments where parent_id = new.id) then
      raise exception 'AOF:team_too_deep' using errcode = '22023';
    end if;
  end if;
  return new;
end;
$$;
create trigger departments_depth before insert or update of parent_id on public.departments
  for each row execute function public.check_department_depth();

create table public.department_members (
  department_id uuid not null references public.departments (id) on delete cascade,
  profile_id uuid not null references public.profiles (id) on delete cascade,
  /** Functie in dit team, bv. "Stage manager" of "Head of Production". */
  title text check (char_length(title) <= 60),
  is_lead boolean not null default false,
  created_at timestamptz not null default now(),
  primary key (department_id, profile_id)
);
create index department_members_profile_idx on public.department_members (profile_id);

-- De hoofdafdeling van een profiel is altijd ook een lidmaatschap.
create function public.sync_primary_membership() returns trigger
language plpgsql security definer set search_path = ''
as $$
begin
  if new.department_id is not null then
    insert into public.department_members (department_id, profile_id)
    values (new.department_id, new.id)
    on conflict do nothing;
  end if;
  return new;
end;
$$;
create trigger profiles_primary_membership after insert or update of department_id on public.profiles
  for each row execute function public.sync_primary_membership();

insert into public.department_members (department_id, profile_id)
select department_id, id from public.profiles where department_id is not null
on conflict do nothing;

create trigger department_members_audit after insert or update or delete on public.department_members
  for each row execute function public.audit_row();

-- -----------------------------------------------------------------------------
-- Bereik
-- -----------------------------------------------------------------------------
/** Teams waar ik rechtstreeks lid van ben (incl. hoofdafdeling). */
create function public.my_teams() returns uuid[]
language sql stable security definer set search_path = ''
as $$
  select coalesce(array_agg(distinct m.department_id), '{}')
    from public.department_members m
    join public.profiles p on p.id = m.profile_id and p.active
   where m.profile_id = auth.uid()
$$;

/** Mijn teams + hun subteams. Voor taken en beheer: wie in Productie zit, ziet ook Main Stage. */
create function public.team_scope() returns uuid[]
language sql stable security definer set search_path = ''
as $$
  select coalesce(array_agg(distinct d.id), '{}')
    from public.departments d
   where d.id = any (public.my_teams()) or d.parent_id = any (public.my_teams())
$$;

/** Bereik + hoofdteams. Voor mededelingen: een bericht aan Productie bereikt ook Main Stage. */
create function public.team_tree() returns uuid[]
language sql stable security definer set search_path = ''
as $$
  select coalesce(array_agg(distinct x), '{}') from (
    select unnest(public.team_scope()) as x
    union
    select d.parent_id from public.departments d
     where d.id = any (public.my_teams()) and d.parent_id is not null
  ) s
$$;

revoke all on function public.my_teams(), public.team_scope(), public.team_tree() from public, anon;
grant execute on function public.my_teams(), public.team_scope(), public.team_tree() to authenticated;

-- Bestaande regels gebruiken voortaan het teambereik in plaats van één afdeling.
create or replace function public.can_manage_tasks(dept uuid) returns boolean
language sql stable security definer set search_path = ''
as $$
  select public.has_perm('tasks.manage_all')
      or (public.has_perm('tasks.manage_department') and dept is not null
          and dept = any (public.team_scope()))
$$;

create or replace function public.can_see_task(task uuid) returns boolean
language sql stable security definer set search_path = ''
as $$
  select public.has_perm('view.tasks') and exists (
    select 1 from public.tasks t
     where t.id = task
       and (public.has_perm('tasks.manage_all')
            or public.can_manage_tasks(t.department_id)
            or public.is_assigned(t.id)
            or (t.department_id is not null and t.department_id = any (public.team_scope())))
  )
$$;

drop policy tasks_read on public.tasks;
create policy tasks_read on public.tasks for select to authenticated
  using (
    public.has_perm('view.tasks') and (
      public.has_perm('tasks.manage_all')
      or public.can_manage_tasks(department_id)
      or public.is_assigned(id)
      or (department_id is not null and department_id = any (public.team_scope()))
    )
  );

create or replace function public.claim_task(task uuid) returns void
language plpgsql security definer set search_path = ''
as $$
declare
  t public.tasks;
begin
  select * into t from public.tasks where id = task;
  if t.id is null or not t.pool or not public.has_perm('tasks.claim')
     or t.department_id is null or not (t.department_id = any (public.team_scope()))
     or exists (select 1 from public.task_assignees where task_id = task) then
    raise exception 'AOF:cannot_claim' using errcode = '42501';
  end if;
  insert into public.task_assignees (task_id, profile_id) values (task, auth.uid());
  update public.tasks set pool = false where id = task;
end;
$$;

create or replace function public.can_see_announcement(dept_ids uuid[]) returns boolean
language sql stable security definer set search_path = ''
as $$
  select public.is_member() and (
    cardinality(dept_ids) = 0
    or dept_ids && public.team_tree()
    or public.has_perm('announcements.send')
  )
$$;

-- -----------------------------------------------------------------------------
-- RLS lidmaatschappen: iedereen ziet de teamstructuur; beheren met
-- people.manage (mensen in teams zetten) of settings.manage.
-- -----------------------------------------------------------------------------
alter table public.department_members enable row level security;
revoke all on public.department_members from anon, authenticated;
grant select, insert, update, delete on public.department_members to authenticated;
create policy members_read on public.department_members for select to authenticated
  using (public.is_member());
create policy members_write on public.department_members for all to authenticated
  using (public.has_perm('people.manage') or public.has_perm('settings.manage'))
  with check (public.has_perm('people.manage') or public.has_perm('settings.manage'));

do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    alter publication supabase_realtime add table public.department_members;
  end if;
end $$;
